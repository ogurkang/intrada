'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import { ggAayyyyToIso } from '@/lib/tarih'
import { trNormalize } from '@/lib/turkce-search'
import type { Tables } from '@/types/database'
import type { TerfiSatir } from '@/app/(dashboard)/terfi/actions'
import TerfiGecmisPanel from '@/components/personel/TerfiGecmisPanel'
import { terfiIslemNo } from '@/lib/terfi-islem-no'

type TH = Tables<'terfi_hareketleri'>

interface Calisan { sicil_no: string; ad_soyad: string; unvan: string | null; mudurluk: string | null }

interface MemurSatir {
  liste_satir_id: string
  sicil_no: string
  ad_soyad: string
  gorev_unvani: string | null
  gorev_mudurlugu: string | null
  terfi: TH | null
  ogrenim_turu?: string | null
  kadro_rolu?: 'Asil' | 'Vekil' | null
  kadro_derecesi?: string | null
  kadro_sira_no?: string | null
  kadro_id?: number | null
}

interface KadroSecenek {
  id: number
  rol: 'Asil' | 'Vekil'
  kadro_sira_no: string | null
  kadro_derecesi: string | null
  label: string
}

interface Props {
  kayitlar:    TH[]
  calisanlar:  Calisan[]
  memurlar?:   MemurSatir[]
  eslesmemis?: TH[]
  kadroSecenekleriBySicil?: Record<string, KadroSecenek[]>
  onEkle:      (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle:  (id: number, fd: FormData) => Promise<{ hata?: string }>
  onSil:       (id: number, sicil_no: string) => Promise<{ hata?: string }>
  onTopluKaydet?: (satirlar: TerfiSatir[]) => Promise<{ hata?: string; kaydedilen?: number }>
  onKadroyaBagla?: (terfiId: number, kadroId: number) => Promise<{ hata?: string }>
  onKapsamDisiYap?: (terfiId: number, sicil_no: string) => Promise<{ hata?: string }>
  sabitSicil?: string
  auditLoglarByTerfiId?: Record<string, Tables<'personel_audit_log'>[]>
}

function fmt(v: string | null) { return v ?? '—' }

const INLINE_TERFI_ALANLARI = [
  'gorev_ayligi_derece', 'gorev_ayligi_kademe',
  'kha_derece', 'kha_kademe', 'kha_tarihi',
  'ekea_derece', 'ekea_kademe', 'ekea_tarihi',
  'kidem_yili', 'kidem_tarihi', 'iyi_hal_terfi_tarihi',
  'ek_gosterge', 'ek_odeme', 'oht', 'yan_odeme', 'sds_orani',
] as const

function normInlineTerfiDeger(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return ''
  if (alan.endsWith('_tarihi')) return String(deger).slice(0, 10)
  return String(deger).trim()
}

function inlineTerfiDegisiklikVarMi(r: TH, v: Record<string, string>): boolean {
  for (const alan of INLINE_TERFI_ALANLARI) {
    const eski = normInlineTerfiDeger(alan, (r as Record<string, unknown>)[alan])
    const yeni = normInlineTerfiDeger(alan, v[alan] ?? '')
    if (eski !== yeni) return true
  }
  return false
}

const KOLON_GRUPLAR = [
  {
    baslik: 'Görev Aylığı',
    alanlar: [
      { key: 'gorev_ayligi_derece', label: 'Derece', col: 1 },
      { key: 'gorev_ayligi_kademe', label: 'Kademe', col: 1 },
    ],
  },
  {
    baslik: 'KHA',
    alanlar: [
      { key: 'kha_derece',  label: 'Derece', col: 1 },
      { key: 'kha_kademe',  label: 'Kademe', col: 1 },
      { key: 'kha_tarihi',  label: 'Tarihi',  col: 1, tip: 'date' },
    ],
  },
  {
    baslik: 'EKEA',
    alanlar: [
      { key: 'ekea_derece', label: 'Derece', col: 1 },
      { key: 'ekea_kademe', label: 'Kademe', col: 1 },
      { key: 'ekea_tarihi', label: 'Tarihi',  col: 1, tip: 'date' },
    ],
  },
  {
    baslik: 'Kıdem',
    alanlar: [
      { key: 'kidem_yili',           label: 'Yıl',    col: 1 },
      { key: 'kidem_tarihi',         label: 'Tarihi', col: 1, tip: 'date' },
      { key: 'iyi_hal_terfi_tarihi', label: 'İyi Hal Terfi', col: 1, tip: 'date' },
    ],
  },
  {
    baslik: 'Diğer',
    alanlar: [
      { key: 'ek_gosterge', label: 'Ek Gösterge', col: 1 },
      { key: 'ek_odeme',    label: 'Ek Ödeme',    col: 1 },
      { key: 'oht',         label: 'ÖHT',          col: 1 },
      { key: 'yan_odeme',   label: 'Yan Ödeme',    col: 1 },
      { key: 'sds_orani',   label: 'SDS Oranı',    col: 1 },
    ],
  },
]

// combined D/K keys are prefixed with "dk_" — parsed to derece/kademe on save. D/K alanları dar (sayfaya sığması için)
// Liste satır düzenleme ile aynı yapı: D/K ayrı input (w-10), tarih w-24, diğerleri w-12
const TOPLU_ALANLAR = [
  { key: 'dk_ga',               label: 'G.A. D/K', w: 60,  tipo: 'dk' as const },
  { key: 'dk_kha',              label: 'KHA D/K',  w: 60,  tipo: 'dk' as const },
  { key: 'kha_tarihi',          label: 'KHA T',    w: 96,  tip: 'date' as const },
  { key: 'dk_ekea',             label: 'EKEA D/K', w: 60,  tipo: 'dk' as const },
  { key: 'ekea_tarihi',         label: 'EKEA T',   w: 96,  tip: 'date' as const },
  { key: 'kidem_yili',          label: 'Kıdem Y',  w: 48 },
  { key: 'kidem_tarihi',        label: 'Kıdem T',  w: 96,  tip: 'date' as const },
  { key: 'iyi_hal_terfi_tarihi', label: 'İyi Hal', w: 96,  tip: 'date' as const },
  { key: 'ek_gosterge',         label: 'Ek Göst',  w: 48 },
  { key: 'ek_odeme',            label: 'Ek Öd',    w: 48 },
  { key: 'oht',                 label: 'ÖHT',      w: 48 },
  { key: 'yan_odeme',           label: 'Yan Öd',   w: 48 },
  { key: 'sds_orani',           label: 'SDS',      w: 48 },
] as const

export default function TerfiClient({
  kayitlar,
  calisanlar,
  memurlar,
  eslesmemis = [],
  kadroSecenekleriBySicil = {},
  onEkle,
  onGuncelle,
  onSil,
  onTopluKaydet,
  onKadroyaBagla,
  onKapsamDisiYap,
  sabitSicil,
  auditLoglarByTerfiId = {},
}: Props) {
  const router = useRouter()
  const showMemurMeta = !sabitSicil && Array.isArray(memurlar) && memurlar.length > 0
  const showEslesmemis = !sabitSicil && eslesmemis.length > 0 && (!!onKadroyaBagla || !!onKapsamDisiYap)
  const listeKolonSayisi =
    (sabitSicil ? 0 : 3 + (showMemurMeta ? 2 : 0)) + 11 + 1
  const [sekme, setSekme]            = useState<'liste' | 'toplu'>('liste')
  const [arama, setArama]            = useState('')
  const [formAcik, setFormAcik]      = useState(false)
  const [secili, setSecili]          = useState<TH | null>(null)
  const [hata, setHata]              = useState<string | null>(null)
  const [topluHata, setTopluHata]    = useState<string | null>(null)
  const [topluBasari, setTopluBasari] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Toplu düzenleme state — her memur için düzenlenebilir satır
  const [topluVeri, setTopluVeri] = useState<Record<string, Partial<TerfiSatir>>>({})
  const [duzenlenenRowKey, setDuzenlenenRowKey] = useState<string | null>(null)
  const [inlineVeri, setInlineVeri] = useState<Record<string, Record<string, string>>>({})
  const [gecmisTerfi, setGecmisTerfi] = useState<{ id: number; ad_soyad: string } | null>(null)
  const [baglaKadroId, setBaglaKadroId] = useState<Record<number, string>>({})
  const [baglaHata, setBaglaHata] = useState<string | null>(null)
  const [baglaBasari, setBaglaBasari] = useState<string | null>(null)

  function handleKapsamDisiYap(terfiId: number, sicilNo: string, adSoyad: string) {
    if (!onKapsamDisiYap) return
    if (!confirm(`${adSoyad} (${terfiIslemNo(terfiId)}) kaydı geçmiş/ayrılmış olarak işaretlenecek. Eşleşmemiş listeden kaldırılır, veritabanında saklanır. Onaylıyor musunuz?`)) return
    setBaglaHata(null)
    setBaglaBasari(null)
    startTransition(async () => {
      const res = await onKapsamDisiYap(terfiId, sicilNo)
      if (res.hata) setBaglaHata(res.hata)
      else {
        setBaglaBasari('Kayıt kapsam dışı olarak işaretlendi.')
        router.refresh()
      }
    })
  }
  function handleKadroyaBagla(terfiId: number) {
    if (!onKadroyaBagla) return
    const khId = Number.parseInt(baglaKadroId[terfiId] ?? '', 10)
    if (!Number.isFinite(khId) || khId <= 0) {
      setBaglaHata('Lütfen kadro seçin.')
      return
    }
    setBaglaHata(null)
    setBaglaBasari(null)
    startTransition(async () => {
      const res = await onKadroyaBagla(terfiId, khId)
      if (res.hata) setBaglaHata(res.hata)
      else {
        setBaglaBasari('Kadro bağlantısı kaydedildi.')
        router.refresh()
      }
    })
  }

  function topluGuncelle(rowKey: string, alan: string, deger: string) {
    setTopluVeri(prev => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] ?? {}), [alan]: deger },
    }))
  }

  function topluDegerAl(m: MemurSatir, alan: string): string {
    const lokal = topluVeri[m.liste_satir_id] as Record<string, string> | undefined
    if (lokal && alan in lokal) return lokal[alan] ?? ''
    // Combined DK fields
    if (alan === 'dk_ga')   return [m.terfi?.gorev_ayligi_derece, m.terfi?.gorev_ayligi_kademe].filter(Boolean).join('/') 
    if (alan === 'dk_kha')  return [m.terfi?.kha_derece,  m.terfi?.kha_kademe ].filter(Boolean).join('/')
    if (alan === 'dk_ekea') return [m.terfi?.ekea_derece, m.terfi?.ekea_kademe].filter(Boolean).join('/')
    return (m.terfi as Record<string, unknown> | null)?.[alan] as string ?? ''
  }

  function parseDK(val: string): [string | null, string | null] {
    const parts = (val ?? '').split('/')
    return [parts[0]?.trim() || null, parts[1]?.trim() || null]
  }

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (sabitSicil) return kayitlar.filter(r => r.sicil_no === sabitSicil)
    if (!q) return kayitlar
    return kayitlar.filter(r =>
      trNormalize(r.ad_soyad).includes(q) ||
      trNormalize(r.sicil_no).includes(q)
    )
  }, [kayitlar, arama, sabitSicil])

  type ListRow = {
    liste_satir_id: string
    sicil_no: string
    ad_soyad: string
    terfi: TH | null
    ogrenim_turu?: string | null
    kadro_rolu?: 'Asil' | 'Vekil' | null
    kadro_derecesi?: string | null
    kadro_sira_no?: string | null
    kadro_id?: number | null
  }
  const listRows = useMemo((): ListRow[] => {
    if (sabitSicil) {
      return filtreli.map(r => ({
        liste_satir_id: `terfi-${r.id}`,
        sicil_no: r.sicil_no,
        ad_soyad: r.ad_soyad ?? '',
        terfi: r,
      }))
    }
    if (memurlar?.length) {
      const q = trNormalize(arama)
      const arr = !q ? memurlar : memurlar.filter(m =>
        trNormalize(m.ad_soyad).includes(q) || trNormalize(m.sicil_no).includes(q)
      )
      return arr.map(m => ({
        liste_satir_id: m.liste_satir_id,
        sicil_no: m.sicil_no,
        ad_soyad: m.ad_soyad ?? '',
        terfi: m.terfi,
        ogrenim_turu: m.ogrenim_turu ?? null,
        kadro_rolu: m.kadro_rolu ?? null,
        kadro_derecesi: m.kadro_derecesi ?? null,
        kadro_sira_no: m.kadro_sira_no ?? null,
        kadro_id: m.kadro_id ?? null,
      }))
    }
    return filtreli.map(r => ({
      liste_satir_id: `terfi-${r.id}`,
      sicil_no: r.sicil_no,
      ad_soyad: r.ad_soyad ?? '',
      terfi: r,
    }))
  }, [sabitSicil, filtreli, memurlar, arama])

  function yeniAc()        { setSecili(null); setHata(null); setFormAcik(true) }
  const [yeniSicilNo, setYeniSicilNo] = useState('')
  const [yeniAdSoyad, setYeniAdSoyad] = useState('')
  function duzenleAc(r: TH | null, row?: ListRow, idx?: number) {
    if (r && row) {
      setDuzenlenenRowKey(row.liste_satir_id)
      setInlineVeri({ [row.liste_satir_id]: {
        gorev_ayligi_derece: r.gorev_ayligi_derece ?? '',
        gorev_ayligi_kademe: r.gorev_ayligi_kademe ?? '',
        kha_derece: r.kha_derece ?? '',
        kha_kademe: r.kha_kademe ?? '',
        kha_tarihi: r.kha_tarihi ? new Date(r.kha_tarihi).toISOString().slice(0, 10) : '',
        ekea_derece: r.ekea_derece ?? '',
        ekea_kademe: r.ekea_kademe ?? '',
        ekea_tarihi: r.ekea_tarihi ? new Date(r.ekea_tarihi).toISOString().slice(0, 10) : '',
        kidem_yili: r.kidem_yili ?? '',
        kidem_tarihi: r.kidem_tarihi ? new Date(r.kidem_tarihi).toISOString().slice(0, 10) : '',
        iyi_hal_terfi_tarihi: r.iyi_hal_terfi_tarihi ? new Date(r.iyi_hal_terfi_tarihi).toISOString().slice(0, 10) : '',
        ek_gosterge: r.ek_gosterge ?? '',
        ek_odeme: r.ek_odeme ?? '',
        oht: r.oht ?? '',
        yan_odeme: r.yan_odeme ?? '',
        sds_orani: r.sds_orani ?? '',
      }})
      setFormAcik(false)
      return
    }
    if (row && typeof idx === 'number' && !r) {
      const key = row.liste_satir_id
      setDuzenlenenRowKey(key)
      setInlineVeri({ [key]: {
        gorev_ayligi_derece: '', gorev_ayligi_kademe: '',
        kha_derece: '', kha_kademe: '', kha_tarihi: '',
        ekea_derece: '', ekea_kademe: '', ekea_tarihi: '',
        kidem_yili: '', kidem_tarihi: '', iyi_hal_terfi_tarihi: '',
        ek_gosterge: '', ek_odeme: '', oht: '', yan_odeme: '', sds_orani: '',
      }})
      setFormAcik(false)
      return
    }
    if (r) { setSecili(r); setYeniSicilNo(''); setYeniAdSoyad('') }
    else if (row) { setSecili(null); setYeniSicilNo(row.sicil_no); setYeniAdSoyad(row.ad_soyad) }
    else { setSecili(null); setYeniSicilNo(''); setYeniAdSoyad('') }
    setHata(null); setFormAcik(true)
  }

  function inlineIptal(rowKey: string) {
    setDuzenlenenRowKey(prev => (prev === rowKey ? null : prev))
    setInlineVeri(prev => {
      const next = { ...prev }
      delete next[rowKey]
      return next
    })
    setHata(null)
  }

  async function handleInlineKaydet(row: ListRow) {
    const r = row.terfi
    if (r?.id) {
      const v = inlineVeri[row.liste_satir_id] ?? {}
      if (!inlineTerfiDegisiklikVarMi(r, v)) {
        inlineIptal(row.liste_satir_id)
        return
      }
      const fd = new FormData()
      fd.set('sicil_no', row.sicil_no)
      Object.entries(v).forEach(([k, val]) => fd.set(k, val))
      setHata(null)
      startTransition(async () => {
        const res = await onGuncelle(r.id, fd)
        if (res.hata) setHata(res.hata)
        else { setDuzenlenenRowKey(null); setInlineVeri({}); router.refresh() }
      })
      return
    }
    const rowKey = row.liste_satir_id
    const v = inlineVeri[rowKey] ?? {}
    const fd = new FormData()
    fd.set('sicil_no', row.sicil_no)
    fd.set('ad_soyad', row.ad_soyad)
    if (row.kadro_rolu) fd.set('rol', row.kadro_rolu)
    if (row.kadro_sira_no) fd.set('kadro_sira_no', row.kadro_sira_no)
    if (row.kadro_id) fd.set('kadro_id', String(row.kadro_id))
    Object.entries(v).forEach(([k, val]) => fd.set(k, val))
    setHata(null)
    startTransition(async () => {
      const res = await onEkle(fd)
      if (res.hata) setHata(res.hata)
      else { setDuzenlenenRowKey(null); setInlineVeri({}); router.refresh() }
    })
  }

  function inlineDeger(row: ListRow, key: string): string {
    const r = row.terfi
    const keyToUse = row.liste_satir_id
    const v = inlineVeri[keyToUse]
    if (v && key in v) return v[key] ?? ''
    if (!r) return ''
    const val = (r as Record<string, unknown>)[key]
    if (key.endsWith('_tarihi') && val) return new Date(val as string).toISOString().slice(0, 10)
    return (val as string) ?? ''
  }

  function inlineGuncelle(row: ListRow, key: string, deger: string) {
    const keyToUse = row.liste_satir_id
    setInlineVeri(prev => ({
      ...prev,
      [keyToUse]: { ...(prev[keyToUse] ?? {}), [key]: deger },
    }))
  }
  function kapat()         { setFormAcik(false); setSecili(null); setYeniSicilNo(''); setYeniAdSoyad(''); setHata(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setHata(null)
    const fd = new FormData(e.currentTarget)
    if (sabitSicil) fd.set('sicil_no', sabitSicil)
    const editing = secili
    startTransition(async () => {
      if (editing?.id != null) {
        const res = await onGuncelle(editing.id, fd)
        if (res.hata) setHata(res.hata)
        else { kapat(); router.refresh() }
        return
      }
      const res = await onEkle(fd)
      if (res.hata) setHata(res.hata)
      else { kapat(); router.refresh() }
    })
  }

  function handleSil(r: TH) {
    if (!confirm('Bu terfi kaydı silinecek. Onaylıyor musunuz?')) return
    startTransition(async () => { const res = await onSil(r.id, r.sicil_no); if (res.hata) alert(res.hata) })
  }

  function handleTopluKaydet() {
    if (!onTopluKaydet || !memurlar) return
    setTopluHata(null); setTopluBasari(null)
    const degistirilmis = memurlar
      .filter(m => topluVeri[m.liste_satir_id] && Object.keys(topluVeri[m.liste_satir_id]).length > 0)
    if (!degistirilmis.length) { setTopluHata('Değişiklik yapılmadı.'); return }
    const satirlar: TerfiSatir[] = degistirilmis.map(m => {
      const lokal = (topluVeri[m.liste_satir_id] ?? {}) as Record<string, string>
      const mevcut = m.terfi
      // Parse combined D/K inputs
      const [gaDer, gaKad]   = parseDK(lokal.dk_ga   ?? `${mevcut?.gorev_ayligi_derece ?? ''}/${mevcut?.gorev_ayligi_kademe ?? ''}`)
      const [khaDer, khaKad] = parseDK(lokal.dk_kha  ?? `${mevcut?.kha_derece  ?? ''}/${mevcut?.kha_kademe  ?? ''}`)
      const [ekDer, ekKad]   = parseDK(lokal.dk_ekea ?? `${mevcut?.ekea_derece ?? ''}/${mevcut?.ekea_kademe ?? ''}`)
      function v(key: string, fallback: string | null): string | null {
        return key in lokal ? (lokal[key] || null) : fallback
      }
      return {
        id:                   mevcut?.id,
        sicil_no:             m.sicil_no,
        ad_soyad:             m.ad_soyad,
        rol:                  m.kadro_rolu ?? mevcut?.rol ?? null,
        kadro_id:             m.kadro_id ?? mevcut?.kadro_id ?? null,
        kadro_sira_no:        m.kadro_sira_no ?? mevcut?.kadro_sira_no ?? null,
        gorev_ayligi_derece:  'dk_ga'   in lokal ? gaDer  : mevcut?.gorev_ayligi_derece ?? null,
        gorev_ayligi_kademe:  'dk_ga'   in lokal ? gaKad  : mevcut?.gorev_ayligi_kademe ?? null,
        kha_derece:           'dk_kha'  in lokal ? khaDer : mevcut?.kha_derece          ?? null,
        kha_kademe:           'dk_kha'  in lokal ? khaKad : mevcut?.kha_kademe          ?? null,
        kha_tarihi:           v('kha_tarihi',          mevcut?.kha_tarihi          ?? null),
        ekea_derece:          'dk_ekea' in lokal ? ekDer  : mevcut?.ekea_derece         ?? null,
        ekea_kademe:          'dk_ekea' in lokal ? ekKad  : mevcut?.ekea_kademe         ?? null,
        ekea_tarihi:          v('ekea_tarihi',         mevcut?.ekea_tarihi         ?? null),
        kidem_yili:           v('kidem_yili',          mevcut?.kidem_yili          ?? null),
        kidem_tarihi:         v('kidem_tarihi',        mevcut?.kidem_tarihi        ?? null),
        iyi_hal_terfi_tarihi: v('iyi_hal_terfi_tarihi', mevcut?.iyi_hal_terfi_tarihi ?? null),
        ek_gosterge:          v('ek_gosterge',         mevcut?.ek_gosterge         ?? null),
        ek_odeme:             v('ek_odeme',            mevcut?.ek_odeme            ?? null),
        oht:                  v('oht',                 mevcut?.oht                 ?? null),
        yan_odeme:            v('yan_odeme',           mevcut?.yan_odeme           ?? null),
        sds_orani:            v('sds_orani',           mevcut?.sds_orani           ?? null),
      }
    })
    startTransition(async () => {
      const res = await onTopluKaydet(satirlar)
      if (res.hata) setTopluHata(res.hata)
      else { setTopluBasari(`${res.kaydedilen} kayıt başarıyla güncellendi.`); setTopluVeri({}) }
    })
  }

  const s = secili
  const formSicilNo = s?.sicil_no ?? yeniSicilNo
  const formAdSoyad = s?.ad_soyad ?? yeniAdSoyad

  return (
    <div>
      {!sabitSicil && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link href="/terfi" className="text-sm text-slate-500 hover:text-slate-800 mb-1 inline-block">
              ← Dönemler
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">Terfi Bilgileri</h1>
            <p className="text-sm text-slate-500 mt-0.5">Toplam <span className="font-semibold">{kayitlar.length}</span> kayıt</p>
          </div>
          <div className="flex items-center gap-3">
            {memurlar && !sabitSicil && (
              <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                <button onClick={() => setSekme('liste')}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${sekme === 'liste' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
                  Kayıt Listesi
                </button>
                <button onClick={() => setSekme('toplu')}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${sekme === 'toplu' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'}`}>
                  Toplu Güncelle
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {sabitSicil && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Terfi Hareketleri ({listRows.length} kayıt)</h3>
        </div>
      )}

      {/* ─── Toplu Düzenle Ekranı ─── */}
      {sekme === 'toplu' && memurlar && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              Statüsü <strong>Memur</strong> olan personel için <strong>{memurlar.length}</strong> liste satırı (asil/vekil ayrı satır).
              Değiştirdiğiniz siciller mavi ile işaretlenir.
            </p>
            <button onClick={handleTopluKaydet} disabled={isPending}
              className="flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 font-medium">
              {isPending ? 'Kaydediliyor…' : 'Toplu Kaydet'}
            </button>
          </div>
          {topluHata && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{topluHata}</p>}
          {topluBasari && <p className="mb-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{topluBasari}</p>}
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-w-full">
            <table className="text-[10px] sm:text-xs min-w-[720px] w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 bg-slate-50 text-center px-1 py-2 font-semibold text-slate-600 w-8 z-10">
                    <span className="block leading-tight text-[9px]">Sıra</span>
                    <span className="block leading-tight text-[9px]">No</span>
                  </th>
                  <th className="sticky left-8 bg-slate-50 text-left px-1 py-2 font-semibold text-slate-600 w-[3.25rem] z-10">Sicil</th>
                  <th className="sticky left-[4.75rem] bg-slate-50 text-left px-1 py-2 font-semibold text-slate-600 min-w-[7rem] max-w-[9rem] z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                    Adı Soyadı
                  </th>
                  <th className="text-center px-1 py-2 font-semibold text-slate-600 w-[3.5rem]">
                    <span className="block leading-tight text-[9px]">Kadro</span>
                    <span className="block leading-tight text-[9px]">Durumu</span>
                  </th>
                  <th className="text-center px-1 py-2 font-semibold text-slate-600 w-[3.5rem]">
                    <span className="block leading-tight text-[9px]">Kadro</span>
                    <span className="block leading-tight text-[9px]">Derecesi</span>
                  </th>
                  {TOPLU_ALANLAR.map(a => (
                    <th key={a.key} className="text-center px-0.5 py-2 font-semibold text-slate-600 whitespace-nowrap text-[9px] sm:text-[10px]" style={{ minWidth: Math.min(a.w, 72) }}>
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {memurlar.map((m, i) => {
                  const degisti = !!topluVeri[m.liste_satir_id] && Object.keys(topluVeri[m.liste_satir_id]).length > 0
                  const ogTxt = m.ogrenim_turu?.trim()
                  return (
                    <tr key={m.liste_satir_id} className={degisti ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                      <td className="sticky left-0 px-1 py-1.5 text-slate-400 bg-inherit z-10 text-center tabular-nums">{i + 1}</td>
                      <td className="sticky left-8 px-1 py-1.5 font-mono text-slate-500 bg-inherit z-10 text-[10px]">{m.sicil_no}</td>
                      <td className="sticky left-[4.75rem] px-1 py-1.5 font-medium text-slate-800 bg-inherit z-10 min-w-[7rem] max-w-[9rem] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                        <span className="block leading-snug">{m.ad_soyad}</span>
                        <span className="block text-slate-600 font-medium text-[10px] mt-0.5 leading-snug">
                          {ogTxt || '—'}
                        </span>
                        {m.gorev_unvani && <span className="block text-slate-400 font-normal text-[10px]">{m.gorev_unvani}</span>}
                      </td>
                      <td className="px-1 py-1.5 align-top text-slate-700 text-center text-[10px]">
                        {m.kadro_rolu === 'Asil' || m.kadro_rolu === 'Vekil' ? m.kadro_rolu : '—'}
                      </td>
                      <td className="px-1 py-1.5 align-top text-slate-700 text-center tabular-nums text-[10px]">
                        {m.kadro_derecesi?.trim() ? m.kadro_derecesi : '—'}
                      </td>
                      {TOPLU_ALANLAR.map(a => {
                        const isDk = 'tipo' in a && a.tipo === 'dk'
                        const changed = !!(topluVeri[m.liste_satir_id] && a.key in (topluVeri[m.liste_satir_id] as Record<string, unknown>))
                        const baseCls = `px-2 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                          changed ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                        }`
                        if (isDk) {
                          const [der, kad] = parseDK(topluDegerAl(m, a.key))
                          return (
                            <td key={a.key} className="px-1 py-1">
                              <div className="flex gap-0.5 justify-center items-center">
                                <input type="text" value={der ?? ''} onChange={e => topluGuncelle(m.liste_satir_id, a.key, `${e.target.value}/${kad ?? ''}`)}
                                  className={`w-8 min-w-0 ${baseCls}`} placeholder="D" />
                                <span className="text-slate-400">/</span>
                                <input type="text" value={kad ?? ''} onChange={e => topluGuncelle(m.liste_satir_id, a.key, `${der ?? ''}/${e.target.value}`)}
                                  className={`w-8 min-w-0 ${baseCls}`} placeholder="K" />
                              </div>
                            </td>
                          )
                        }
                        const isDate = 'tip' in a && a.tip === 'date'
                        const val = topluDegerAl(m, a.key)
                        const dateVal = isDate && val ? (ggAayyyyToIso(val) ?? (val.includes('-') ? val : new Date(val).toISOString().slice(0, 10))) : (isDate ? '' : val)
                        return (
                          <td key={a.key} className="px-1 py-1">
                            <input
                              type={isDate ? 'date' : 'text'}
                              value={dateVal}
                              onChange={e => topluGuncelle(m.liste_satir_id, a.key, e.target.value)}
                              className={`w-full ${baseCls}`}
                              style={{ minWidth: a.w }}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sekme === 'liste' && (
      <>
      {!sabitSicil && (
        <div className="mb-4">
          <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ad veya sicil ara…"
            className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
      )}

      {hata && sekme === 'liste' && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-w-full">
        <table className="w-full min-w-0 table-auto text-[10px] sm:text-xs leading-tight">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {!sabitSicil && (
                <th className="text-center px-1 py-2 font-semibold text-slate-600 w-9">
                  <span className="block leading-tight text-[9px] sm:text-[10px]">Sıra</span>
                  <span className="block leading-tight text-[9px] sm:text-[10px]">No</span>
                </th>
              )}
              {!sabitSicil && <th className="text-left px-1 py-2 font-semibold text-slate-600 w-[4.5rem]">Sicil</th>}
              {!sabitSicil && (
                <th className="text-left px-1 py-2 font-semibold text-slate-600 w-[7.5rem] sm:w-36">Adı Soyadı</th>
              )}
              {showMemurMeta && (
                <th className="text-center px-1 py-2 font-semibold text-slate-600 w-[3.5rem] sm:w-16">
                  <span className="block leading-tight text-[9px] sm:text-[10px]">Kadro</span>
                  <span className="block leading-tight text-[9px] sm:text-[10px]">Durumu</span>
                </th>
              )}
              {showMemurMeta && (
                <th className="text-center px-1 py-2 font-semibold text-slate-600 w-[3.5rem] sm:w-16">
                  <span className="block leading-tight text-[9px] sm:text-[10px]">Kadro</span>
                  <span className="block leading-tight text-[9px] sm:text-[10px]">Derecesi</span>
                </th>
              )}
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">G.A. D/K</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">KHA D/K</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">KHA T</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">EKEA D/K</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">EKEA T</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">Kıd.Y</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">Kıd.T</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">İ.H.</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">Ek G.</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">Ek Ö.</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">ÖHT</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">Yan Ö.</th>
              <th className="text-center px-0.5 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs">SDS</th>
              <th className="text-right px-1 py-2 font-semibold text-slate-600 text-[9px] sm:text-xs w-[4.5rem]">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listRows.length === 0 && (
              <tr><td colSpan={listeKolonSayisi} className="text-center py-10 text-slate-400">Kayıt bulunamadı.</td></tr>
            )}
            {listRows.map((row, idx) => {
              const r = row.terfi
              const rowKey = row.liste_satir_id
              const duzenleniyor = duzenlenenRowKey === rowKey
              const ogTxt = row.ogrenim_turu?.trim()
              return (
                <tr key={row.liste_satir_id} className={duzenleniyor ? 'bg-blue-50' : 'hover:bg-slate-50'} style={{ transition: 'background 0.2s' }}>
                  {!sabitSicil && <td className="px-1 py-1.5 text-center text-slate-400 tabular-nums">{idx + 1}</td>}
                  {!sabitSicil && <td className="px-1 py-1.5 font-mono text-slate-500 text-[10px] sm:text-xs break-all">{row.sicil_no}</td>}
                  {!sabitSicil && (
                    <td className="px-1 py-1.5 align-top">
                      <span className="font-medium text-slate-800 block leading-snug">{row.ad_soyad || '—'}</span>
                      {showMemurMeta && (
                        <span className="block text-[10px] sm:text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
                          {ogTxt || '—'}
                        </span>
                      )}
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {terfiIslemNo(r?.id)}
                        {row.kadro_sira_no ? ` · Kadro ${row.kadro_sira_no}` : ''}
                      </span>
                    </td>
                  )}
                  {showMemurMeta && (
                    <td className="px-1 py-1.5 align-top text-slate-700 text-center">
                      {row.kadro_rolu === 'Asil' || row.kadro_rolu === 'Vekil'
                        ? row.kadro_rolu
                        : '—'}
                    </td>
                  )}
                  {showMemurMeta && (
                    <td className="px-1 py-1.5 align-top text-slate-700 text-center tabular-nums">
                      {row.kadro_derecesi?.trim() ? row.kadro_derecesi : '—'}
                    </td>
                  )}
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <div className="flex gap-0.5 justify-center">
                        <input type="text" value={inlineDeger(row, 'gorev_ayligi_derece')} onChange={e => inlineGuncelle(row, 'gorev_ayligi_derece', e.target.value)}
                          className="w-8 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" placeholder="D" />
                        <span className="text-slate-400">/</span>
                        <input type="text" value={inlineDeger(row, 'gorev_ayligi_kademe')} onChange={e => inlineGuncelle(row, 'gorev_ayligi_kademe', e.target.value)}
                          className="w-8 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" placeholder="K" />
                      </div>
                    ) : (
                      <span className="tabular-nums text-slate-600">{fmt(r?.gorev_ayligi_derece ?? null)}/{fmt(r?.gorev_ayligi_kademe ?? null)}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <div className="flex gap-0.5 justify-center">
                        <input type="text" value={inlineDeger(row, 'kha_derece')} onChange={e => inlineGuncelle(row, 'kha_derece', e.target.value)}
                          className="w-8 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                        <span className="text-slate-400">/</span>
                        <input type="text" value={inlineDeger(row, 'kha_kademe')} onChange={e => inlineGuncelle(row, 'kha_kademe', e.target.value)}
                          className="w-8 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                      </div>
                    ) : (
                      <span className="tabular-nums text-slate-600">{fmt(r?.kha_derece ?? null)}/{fmt(r?.kha_kademe ?? null)}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="date" value={inlineDeger(row, 'kha_tarihi')} onChange={e => inlineGuncelle(row, 'kha_tarihi', e.target.value)}
                        className="w-24 px-1 py-0.5 border border-slate-300 rounded text-xs" />
                    ) : (
                      <span className="text-slate-500">{r?.kha_tarihi ? new Date(r.kha_tarihi).toLocaleDateString('tr-TR') : '—'}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <div className="flex gap-0.5 justify-center">
                        <input type="text" value={inlineDeger(row, 'ekea_derece')} onChange={e => inlineGuncelle(row, 'ekea_derece', e.target.value)}
                          className="w-8 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                        <span className="text-slate-400">/</span>
                        <input type="text" value={inlineDeger(row, 'ekea_kademe')} onChange={e => inlineGuncelle(row, 'ekea_kademe', e.target.value)}
                          className="w-8 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                      </div>
                    ) : (
                      <span className="tabular-nums text-slate-600">{fmt(r?.ekea_derece ?? null)}/{fmt(r?.ekea_kademe ?? null)}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="date" value={inlineDeger(row, 'ekea_tarihi')} onChange={e => inlineGuncelle(row, 'ekea_tarihi', e.target.value)}
                        className="w-24 px-1 py-0.5 border border-slate-300 rounded text-xs" />
                    ) : (
                      <span className="text-slate-500">{r?.ekea_tarihi ? new Date(r.ekea_tarihi).toLocaleDateString('tr-TR') : '—'}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="text" value={inlineDeger(row, 'kidem_yili')} onChange={e => inlineGuncelle(row, 'kidem_yili', e.target.value)}
                        className="w-9 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                    ) : (
                      <span className="tabular-nums text-slate-600">{fmt(r?.kidem_yili ?? null)}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="date" value={inlineDeger(row, 'kidem_tarihi')} onChange={e => inlineGuncelle(row, 'kidem_tarihi', e.target.value)}
                        className="w-24 px-1 py-0.5 border border-slate-300 rounded text-xs" />
                    ) : (
                      <span className="text-slate-500">{r?.kidem_tarihi ? new Date(r.kidem_tarihi).toLocaleDateString('tr-TR') : '—'}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="date" value={inlineDeger(row, 'iyi_hal_terfi_tarihi')} onChange={e => inlineGuncelle(row, 'iyi_hal_terfi_tarihi', e.target.value)}
                        className="w-24 px-1 py-0.5 border border-slate-300 rounded text-xs" />
                    ) : (
                      <span className="text-slate-500">{r?.iyi_hal_terfi_tarihi ? new Date(r.iyi_hal_terfi_tarihi).toLocaleDateString('tr-TR') : '—'}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="text" value={inlineDeger(row, 'ek_gosterge')} onChange={e => inlineGuncelle(row, 'ek_gosterge', e.target.value)}
                        className="w-9 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                    ) : (
                      <span className="tabular-nums text-slate-600">{fmt(r?.ek_gosterge ?? null)}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="text" value={inlineDeger(row, 'ek_odeme')} onChange={e => inlineGuncelle(row, 'ek_odeme', e.target.value)}
                        className="w-9 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                    ) : (
                      <span className="tabular-nums text-slate-600">{fmt(r?.ek_odeme ?? null)}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="text" value={inlineDeger(row, 'oht')} onChange={e => inlineGuncelle(row, 'oht', e.target.value)}
                        className="w-9 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                    ) : (
                      <span className="tabular-nums text-slate-600">{fmt(r?.oht ?? null)}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="text" value={inlineDeger(row, 'yan_odeme')} onChange={e => inlineGuncelle(row, 'yan_odeme', e.target.value)}
                        className="w-9 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                    ) : (
                      <span className="tabular-nums text-slate-600">{fmt(r?.yan_odeme ?? null)}</span>
                    )}
                  </td>
                  <td className="px-0.5 py-1 text-center align-top">
                    {duzenleniyor ? (
                      <input type="text" value={inlineDeger(row, 'sds_orani')} onChange={e => inlineGuncelle(row, 'sds_orani', e.target.value)}
                        className="w-9 min-w-0 px-0.5 py-0.5 border border-slate-300 rounded text-[10px]" />
                    ) : (
                      <span className="tabular-nums text-slate-600">{fmt(r?.sds_orani ?? null)}</span>
                    )}
                  </td>
                  <td className="px-1 py-1 text-right align-top">
                    <div className="flex items-center justify-end gap-0.5">
                      {duzenleniyor ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleInlineKaydet(row)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                            title="Kaydet"
                            aria-label="Kaydet"
                          >
                            {isPending ? (
                              <span className="block w-4 h-4 text-center text-xs leading-4">…</span>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => inlineIptal(rowKey)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            title="İptal"
                            aria-label="İptal"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : r?.id ? (
                        <>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              setGecmisTerfi({ id: r.id, ad_soyad: row.ad_soyad })
                            }}
                            className="relative p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title="Değişiklik geçmişi"
                            aria-label="Değişiklik geçmişi"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.5 2" />
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M3.5 9.5A9 9 0 113 12m.5-2.5L1.75 7.25M3.5 9.5L6 8.75" />
                            </svg>
                            {(auditLoglarByTerfiId[String(r.id)]?.length ?? 0) > 0 && (
                              <span className="absolute -top-1 -right-1 inline-flex min-w-[0.9rem] h-[0.9rem] px-0.5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-medium">
                                {auditLoglarByTerfiId[String(r.id)]!.length}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => duzenleAc(r, row)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Düzenle"
                            aria-label="Düzenle"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487" />
                            </svg>
                          </button>
                        </>
                      ) : r ? (
                        <button
                          type="button"
                          onClick={() => duzenleAc(r, row)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Düzenle"
                          aria-label="Düzenle"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487" />
                          </svg>
                        </button>
                      ) : (
                        <button type="button" onClick={() => duzenleAc(null, row, idx)}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">Ekle</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <Modal open={formAcik} onClose={kapat} title={s ? 'Terfi Kaydı Düzenle' : 'Yeni Terfi Kaydı'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {!sabitSicil && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No *</label>
                <input name="sicil_no" required list="calisan-list" defaultValue={formSicilNo}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                <datalist id="calisan-list">
                  {calisanlar.map(c => <option key={c.sicil_no} value={c.sicil_no}>{c.ad_soyad}</option>)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
                <input name="ad_soyad" defaultValue={formAdSoyad}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>
          )}

          {KOLON_GRUPLAR.map(g => (
            <div key={g.baslik}>
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{g.baslik}</p>
              <div className="grid grid-cols-3 gap-3">
                {g.alanlar.map(a => (
                  <div key={a.key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{a.label}</label>
                    <input name={a.key} type={a.tip ?? 'text'}
                      defaultValue={(s as Record<string, unknown>)?.[a.key] as string ?? ''}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={kapat}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">İptal</button>
            <button type="submit" disabled={isPending}
              className="intrada-btn intrada-btn-kaydet">
              {isPending ? 'Kaydediliyor…' : s ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
      </>
      )}

      {showEslesmemis && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-amber-900 mb-1">
            Eşleşmemiş Terfi Kayıtları ({eslesmemis.length})
          </h2>
          <p className="text-xs text-amber-800 mb-4">
            Bu kayıtlar veritabanında duruyor ancak aktif kadro satırına otomatik bağlanamadı.
            Aktif görevi varsa kadro seçip &quot;Bağla&quot; deyin; ayrılmış veya geçmiş kayıtlar için &quot;Yok say&quot; kullanın.
          </p>
          {baglaHata && (
            <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{baglaHata}</p>
          )}
          {baglaBasari && (
            <p className="mb-3 text-sm text-green-800 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">{baglaBasari}</p>
          )}
          <div className="bg-white rounded-lg border border-amber-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-3 py-2 font-semibold text-slate-600">Kayıt</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Sicil</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Ad Soyad</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Mevcut Rol / Sıra</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">Kadro Seç</th>
                  <th className="px-3 py-2 font-semibold text-slate-600">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eslesmemis.map(t => {
                  const secenekler = kadroSecenekleriBySicil[t.sicil_no] ?? []
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-600">{terfiIslemNo(t.id)}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{t.sicil_no}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{t.ad_soyad ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {[t.rol, t.kadro_sira_no].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-3 py-2">
                        {secenekler.length === 0 ? (
                          <span className="text-xs text-slate-400">Aktif kadro bulunamadı</span>
                        ) : (
                          <select
                            value={baglaKadroId[t.id] ?? ''}
                            onChange={e => setBaglaKadroId(prev => ({ ...prev, [t.id]: e.target.value }))}
                            className="w-full min-w-[12rem] px-2 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          >
                            <option value="">Kadro seçin…</option>
                            {secenekler.map(s => (
                              <option key={s.id} value={String(s.id)}>{s.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isPending || secenekler.length === 0}
                            onClick={() => handleKadroyaBagla(t.id)}
                            className="px-3 py-1.5 text-xs font-medium text-amber-900 border border-amber-300 rounded-lg hover:bg-amber-50 disabled:opacity-50"
                          >
                            Bağla
                          </button>
                          {onKapsamDisiYap && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleKapsamDisiYap(t.id, t.sicil_no, t.ad_soyad ?? t.sicil_no)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                              Yok say
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TerfiGecmisPanel
        acik={gecmisTerfi != null}
        onKapat={() => setGecmisTerfi(null)}
        auditLoglar={gecmisTerfi ? (auditLoglarByTerfiId[String(gecmisTerfi.id)] ?? []) : []}
        baslik={gecmisTerfi ? `Terfi Geçmişi — ${gecmisTerfi.ad_soyad}` : undefined}
      />
    </div>
  )
}
