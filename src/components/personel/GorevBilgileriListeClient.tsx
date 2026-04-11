'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/types/database'
import { personelDetayHref } from '@/lib/personel-link'
import { firmaCalisanDetayHref } from '@/lib/firma-calisan-link'
import { trNormalize } from '@/lib/turkce-search'
import {
  GOREV_DURUMU_OPTIONS,
  GOREV_TURU_OPTIONS,
  gorevTuruAciklamaGoster,
  gorevTuruTarihZorunlu,
  gorevTuruBitisGoster,
  gorevTuruYemekHakkiGoster,
  gorevDurumuEngellimi,
} from '@/lib/gorev-bilgileri'
import type { GorevBilgiSatir } from '@/app/(dashboard)/personel/gorev-bilgileri/actions'
import { karsilastirStatuSonraSicilAd } from '@/lib/statu-liste-siralama'

export type GorevListeKadroSatir = {
  kind: 'kadro'
  statuEtiket: string
} & Pick<
  Tables<'calisan'>,
  | 'sicil_no'
  | 'public_id'
  | 'ad_soyad'
  | 'gorev_yeri'
  | 'gorev_turu'
  | 'gorev_turu_tarihi'
  | 'gorev_turu_aciklama'
  | 'gorev_durumu'
> & {
  gorev_turu_bitis_tarihi?: string | null
  gorev_turu_yemek_hakki?: boolean | null
  engelli_oran?: number | null
  engelli_baslangic?: string | null
  engelli_bitis?: string | null
}

export type GorevListeFirmaSatir = {
  kind: 'firma'
  statuEtiket: string
  id: number
  public_id: string
  sicil_no: string | null
  ad_soyad: string
  gorev_yeri: string | null
}

export type GorevListeSatir = GorevListeKadroSatir | GorevListeFirmaSatir

function isKadro(p: GorevListeSatir): p is GorevListeKadroSatir {
  return p.kind === 'kadro'
}

type GorevAlanlari =
  | 'gorev_yeri'
  | 'gorev_turu'
  | 'gorev_turu_tarihi'
  | 'gorev_turu_bitis_tarihi'
  | 'gorev_turu_aciklama'
  | 'gorev_turu_yemek_hakki'
  | 'gorev_durumu'
  | 'engelli_oran'
  | 'engelli_baslangic'
  | 'engelli_bitis'

function tarihFormatla(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

interface Props {
  data: GorevListeSatir[]
  statuSirali: string[]
  onSatirKaydet: (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
  onTopluKaydet: (satirlar: GorevBilgiSatir[]) => Promise<{ hata?: string; kaydedilen?: number }>
}

export default function GorevBilgileriListeClient({
  data,
  statuSirali,
  onSatirKaydet,
  onTopluKaydet,
}: Props) {
  const router = useRouter()
  const [sekme, setSekme] = useState<'liste' | 'toplu'>('liste')
  const [arama, setArama] = useState('')
  const [duzenlenenSicil, setDuzenlenenSicil] = useState<string | null>(null)
  const [inlineVeri, setInlineVeri] = useState<Record<string, Record<string, string>>>({})
  const [topluVeri, setTopluVeri] = useState<Record<string, Partial<Record<GorevAlanlari, string>>>>({})
  const [hata, setHata] = useState<string | null>(null)
  const [topluHata, setTopluHata] = useState<string | null>(null)
  const [topluBasari, setTopluBasari] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sirali = useMemo(() => {
    return [...data].sort((a, b) =>
      karsilastirStatuSonraSicilAd(
        {
          statuEtiket: a.statuEtiket,
          sicil_no: isKadro(a) ? a.sicil_no : a.sicil_no,
          ad_soyad: a.ad_soyad,
        },
        {
          statuEtiket: b.statuEtiket,
          sicil_no: isKadro(b) ? b.sicil_no : b.sicil_no,
          ad_soyad: b.ad_soyad,
        },
        statuSirali,
      ),
    )
  }, [data, statuSirali])

  const kadroSirali = useMemo(() => sirali.filter(isKadro), [sirali])

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return sirali
    return sirali.filter(p => {
      if (
        trNormalize(p.ad_soyad).includes(q) ||
        trNormalize(p.statuEtiket).includes(q) ||
        trNormalize(p.gorev_yeri ?? '').includes(q)
      ) {
        return true
      }
      const sicStr = isKadro(p) ? p.sicil_no : p.sicil_no ?? ''
      return trNormalize(sicStr).includes(q)
    })
  }, [sirali, arama])

  function duzenleAc(p: GorevListeKadroSatir) {
    setHata(null)
    setDuzenlenenSicil(p.sicil_no)
    setInlineVeri({
      [p.sicil_no]: {
        gorev_yeri: p.gorev_yeri ?? '',
        gorev_turu: (p.gorev_turu ?? 'Çalışan').trim() || 'Çalışan',
        gorev_turu_tarihi: p.gorev_turu_tarihi ? String(p.gorev_turu_tarihi).slice(0, 10) : '',
        gorev_turu_bitis_tarihi: p.gorev_turu_bitis_tarihi ? String(p.gorev_turu_bitis_tarihi).slice(0, 10) : '',
        gorev_turu_aciklama: p.gorev_turu_aciklama ?? '',
        gorev_turu_yemek_hakki: p.gorev_turu_yemek_hakki === true ? 'true' : p.gorev_turu_yemek_hakki === false ? 'false' : '',
        gorev_durumu: p.gorev_durumu ?? 'Diğer',
        engelli_oran: p.engelli_oran != null ? String(p.engelli_oran) : '',
        engelli_baslangic: p.engelli_baslangic ? String(p.engelli_baslangic).slice(0, 10) : '',
        engelli_bitis: p.engelli_bitis ? String(p.engelli_bitis).slice(0, 10) : '',
      },
    })
  }

  function inlineDeger(p: GorevListeKadroSatir, key: string): string {
    const v = inlineVeri[p.sicil_no]
    if (v && key in v) return v[key] ?? ''
    if (key === 'gorev_yeri') return p.gorev_yeri ?? ''
    if (key === 'gorev_turu') return (p.gorev_turu ?? 'Çalışan').trim() || 'Çalışan'
    if (key === 'gorev_turu_tarihi') return p.gorev_turu_tarihi ? String(p.gorev_turu_tarihi).slice(0, 10) : ''
    if (key === 'gorev_turu_bitis_tarihi') return p.gorev_turu_bitis_tarihi ? String(p.gorev_turu_bitis_tarihi).slice(0, 10) : ''
    if (key === 'gorev_turu_aciklama') return p.gorev_turu_aciklama ?? ''
    if (key === 'gorev_turu_yemek_hakki') return p.gorev_turu_yemek_hakki === true ? 'true' : p.gorev_turu_yemek_hakki === false ? 'false' : ''
    if (key === 'gorev_durumu') return p.gorev_durumu ?? 'Diğer'
    if (key === 'engelli_oran') return p.engelli_oran != null ? String(p.engelli_oran) : ''
    if (key === 'engelli_baslangic') return p.engelli_baslangic ? String(p.engelli_baslangic).slice(0, 10) : ''
    if (key === 'engelli_bitis') return p.engelli_bitis ? String(p.engelli_bitis).slice(0, 10) : ''
    return ''
  }

  function inlineGuncelle(p: GorevListeKadroSatir, key: string, deger: string) {
    setInlineVeri(prev => {
      const cur = { ...(prev[p.sicil_no] ?? {}) }
      cur[key] = deger
      if (key === 'gorev_turu' && deger === 'Çalışan') {
        cur.gorev_turu_tarihi = ''
        cur.gorev_turu_bitis_tarihi = ''
        cur.gorev_turu_aciklama = ''
        cur.gorev_turu_yemek_hakki = ''
      }
      if (key === 'gorev_turu' && deger !== 'Geçici Görevlendirme') {
        cur.gorev_turu_aciklama = ''
        cur.gorev_turu_yemek_hakki = ''
      }
      if (key === 'gorev_durumu' && deger !== 'Engelli') {
        cur.engelli_oran = ''
        cur.engelli_baslangic = ''
        cur.engelli_bitis = ''
      }
      return { ...prev, [p.sicil_no]: cur }
    })
  }

  function inlineTarihGoster(p: GorevListeKadroSatir): boolean {
    const t = inlineDeger(p, 'gorev_turu')
    return gorevTuruTarihZorunlu(t)
  }

  function inlineBitisGoster(p: GorevListeKadroSatir): boolean {
    return gorevTuruBitisGoster(inlineDeger(p, 'gorev_turu'))
  }

  function inlineAciklamaGoster(p: GorevListeKadroSatir): boolean {
    return gorevTuruAciklamaGoster(inlineDeger(p, 'gorev_turu'))
  }

  function inlineYemekHakkiGoster(p: GorevListeKadroSatir): boolean {
    return gorevTuruYemekHakkiGoster(inlineDeger(p, 'gorev_turu'))
  }

  function inlineEngelliGoster(p: GorevListeKadroSatir): boolean {
    return gorevDurumuEngellimi(inlineDeger(p, 'gorev_durumu'))
  }

  async function handleInlineKaydet(p: GorevListeKadroSatir) {
    const v = inlineVeri[p.sicil_no]
    if (!v) return
    setHata(null)
    const fd = new FormData()
    fd.set('gorev_yeri', v.gorev_yeri ?? '')
    fd.set('gorev_turu', v.gorev_turu ?? 'Çalışan')
    fd.set('gorev_turu_tarihi', inlineTarihGoster(p) ? (v.gorev_turu_tarihi ?? '') : '')
    fd.set('gorev_turu_bitis_tarihi', inlineBitisGoster(p) ? (v.gorev_turu_bitis_tarihi ?? '') : '')
    fd.set('gorev_turu_aciklama', inlineAciklamaGoster(p) ? (v.gorev_turu_aciklama ?? '') : '')
    fd.set('gorev_turu_yemek_hakki', inlineYemekHakkiGoster(p) ? (v.gorev_turu_yemek_hakki ?? '') : '')
    fd.set('gorev_durumu', v.gorev_durumu ?? 'Diğer')
    fd.set('engelli_oran', inlineEngelliGoster(p) ? (v.engelli_oran ?? '') : '')
    fd.set('engelli_baslangic', inlineEngelliGoster(p) ? (v.engelli_baslangic ?? '') : '')
    fd.set('engelli_bitis', inlineEngelliGoster(p) ? (v.engelli_bitis ?? '') : '')
    startTransition(async () => {
      const res = await onSatirKaydet(p.sicil_no, fd)
      if (res.hata) setHata(res.hata)
      else {
        setDuzenlenenSicil(null)
        setInlineVeri({})
        router.refresh()
      }
    })
  }

  function topluGuncelle(sicil_no: string, alan: GorevAlanlari, deger: string) {
    setTopluVeri(prev => {
      const next = { ...(prev[sicil_no] ?? {}), [alan]: deger }
      if (alan === 'gorev_turu' && deger === 'Çalışan') {
        next.gorev_turu_tarihi = ''
        next.gorev_turu_aciklama = ''
      }
      return { ...prev, [sicil_no]: next }
    })
  }

  function topluDegerAl(p: GorevListeKadroSatir, key: GorevAlanlari): string {
    const l = topluVeri[p.sicil_no]
    if (l && key in l && l[key] !== undefined) return l[key] ?? ''
    if (key === 'gorev_yeri') return p.gorev_yeri ?? ''
    if (key === 'gorev_turu') return (p.gorev_turu ?? 'Çalışan').trim() || 'Çalışan'
    if (key === 'gorev_turu_tarihi') return p.gorev_turu_tarihi ? String(p.gorev_turu_tarihi).slice(0, 10) : ''
    if (key === 'gorev_turu_bitis_tarihi') return p.gorev_turu_bitis_tarihi ? String(p.gorev_turu_bitis_tarihi).slice(0, 10) : ''
    if (key === 'gorev_turu_aciklama') return p.gorev_turu_aciklama ?? ''
    if (key === 'gorev_turu_yemek_hakki') return p.gorev_turu_yemek_hakki === true ? 'true' : p.gorev_turu_yemek_hakki === false ? 'false' : ''
    if (key === 'gorev_durumu') return p.gorev_durumu ?? 'Diğer'
    return ''
  }

  function topluTarihGoster(p: GorevListeKadroSatir): boolean {
    return gorevTuruTarihZorunlu(topluDegerAl(p, 'gorev_turu'))
  }

  function topluBitisGoster(p: GorevListeKadroSatir): boolean {
    return gorevTuruBitisGoster(topluDegerAl(p, 'gorev_turu'))
  }

  function topluAciklamaGoster(p: GorevListeKadroSatir): boolean {
    return gorevTuruAciklamaGoster(topluDegerAl(p, 'gorev_turu'))
  }

  function topluYemekHakkiGoster(p: GorevListeKadroSatir): boolean {
    return gorevTuruYemekHakkiGoster(topluDegerAl(p, 'gorev_turu'))
  }

  function handleTopluKaydet() {
    setTopluHata(null)
    setTopluBasari(null)
    const degistirilmis = kadroSirali.filter(
      x => topluVeri[x.sicil_no] && Object.keys(topluVeri[x.sicil_no]!).length > 0,
    )
    if (!degistirilmis.length) {
      setTopluHata('Değişiklik yapılmadı.')
      return
    }
    const satirlar: GorevBilgiSatir[] = degistirilmis.map(p => {
      const l = topluVeri[p.sicil_no]!
      const gorev_turu = (l.gorev_turu ?? p.gorev_turu ?? 'Çalışan').trim() || 'Çalışan'
      const gorev_yeri = l.gorev_yeri !== undefined ? (l.gorev_yeri.trim() || null) : (p.gorev_yeri?.trim() || null)
      const gorev_durumu = (l.gorev_durumu ?? p.gorev_durumu ?? 'Diğer').trim() || 'Diğer'
      let gorev_turu_tarihi: string | null = null
      let gorev_turu_bitis_tarihi: string | null = null
      let gorev_turu_aciklama: string | null = null
      let gorev_turu_yemek_hakki: boolean | null = null
      if (gorev_turu !== 'Çalışan') {
        const raw = l.gorev_turu_tarihi !== undefined ? l.gorev_turu_tarihi : p.gorev_turu_tarihi ? String(p.gorev_turu_tarihi).slice(0, 10) : ''
        gorev_turu_tarihi = raw.trim() || null
        const rawBit = l.gorev_turu_bitis_tarihi !== undefined ? l.gorev_turu_bitis_tarihi : p.gorev_turu_bitis_tarihi ? String(p.gorev_turu_bitis_tarihi).slice(0, 10) : ''
        gorev_turu_bitis_tarihi = rawBit.trim() || null
        if (gorev_turu === 'Geçici Görevlendirme') {
          const metin = l.gorev_turu_aciklama !== undefined ? l.gorev_turu_aciklama : (p.gorev_turu_aciklama ?? '')
          gorev_turu_aciklama = metin.trim() || null
          const rawY = l.gorev_turu_yemek_hakki !== undefined ? l.gorev_turu_yemek_hakki : (p.gorev_turu_yemek_hakki === true ? 'true' : p.gorev_turu_yemek_hakki === false ? 'false' : '')
          gorev_turu_yemek_hakki = rawY === 'true' ? true : rawY === 'false' ? false : null
        }
      }
      return {
        sicil_no: p.sicil_no,
        gorev_yeri,
        gorev_turu,
        gorev_turu_tarihi,
        gorev_turu_bitis_tarihi,
        gorev_turu_aciklama,
        gorev_turu_yemek_hakki,
        gorev_durumu,
        engelli_oran: null,
        engelli_baslangic: null,
        engelli_bitis: null,
      }
    })
    startTransition(async () => {
      const res = await onTopluKaydet(satirlar)
      if (res.hata) setTopluHata(res.hata)
      else {
        setTopluBasari(`${res.kaydedilen ?? satirlar.length} kayıt güncellendi.`)
        setTopluVeri({})
        router.refresh()
      }
    })
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Görev Bilgileri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Görev yeri, türü, tür tarihi, görevlendirme açıklaması ve durum. Terfi ekranındaki gibi satır düzenleyebilir veya toplu güncelleyebilirsiniz.
          </p>
          <p className="text-xs text-amber-700 mt-2">
            Görev türü <strong>Aylıksız İzin</strong> olduğu sürece hizmet süresi ilerlemesi durur; tekrar
            <strong> Çalışan</strong> olarak kaydedildiğinde ilerleme devam eder.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Sıra: Tanımlar → Statü sırası; ardından firma personel (yalnızca ayrılış tarihi boş). Firma satırları bu ekrandan düzenlenmez.
          </p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSekme('liste')
              setTopluHata(null)
              setTopluBasari(null)
            }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              sekme === 'liste' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Kayıt Listesi
          </button>
          <button
            type="button"
            onClick={() => {
              setSekme('toplu')
              setHata(null)
            }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              sekme === 'toplu' ? 'bg-white shadow text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Toplu Güncelle
          </button>
        </div>
      </div>

      {sekme === 'liste' && (
        <>
          <div className="mb-4">
            <input
              value={arama}
              onChange={e => setArama(e.target.value)}
              placeholder="Ad, sicil, statü veya görev yeri ara…"
              className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          {hata && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
        </>
      )}

      {sekme === 'toplu' && (
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <p className="text-sm text-slate-600">
              Yalnızca kadro personeli listelenir. Değiştirdiğiniz satırlar mavi ile işaretlenir;{' '}
              <strong>Toplu Kaydet</strong> yalnızca değişen sicilleri yazar.
            </p>
            <button
              type="button"
              onClick={handleTopluKaydet}
              disabled={isPending}
              className="flex items-center justify-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 font-medium shrink-0"
            >
              {isPending ? 'Kaydediliyor…' : 'Toplu Kaydet'}
            </button>
          </div>
          {topluHata && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{topluHata}</p>}
          {topluBasari && (
            <p className="mb-3 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{topluBasari}</p>
          )}
        </div>
      )}

      {sekme === 'liste' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-center px-3 py-3 font-semibold text-slate-600 w-14">Sıra No</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Sicil No</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[140px]">Adı Soyadı</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[120px]">Statü</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[120px]">Görev yeri</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-44">Görev türü</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 w-36">Başlangıç</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 w-36">Bitiş</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 min-w-[160px]">Görevlendirme metni</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 w-28">Yemek</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-40">Görev durumu</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtreli.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16 text-slate-400">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtreli.map((p, idx) => {
                    if (!isKadro(p)) {
                      return (
                        <tr key={`firma-${p.id}`} className="bg-slate-50/80 hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                            {p.sicil_no?.trim() || '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <Link
                              href={firmaCalisanDetayHref(p)}
                              className="font-medium text-slate-800 hover:text-blue-700 hover:underline"
                            >
                              {p.ad_soyad}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">{p.statuEtiket}</td>
                          <td className="px-4 py-2.5 text-slate-600 max-w-[220px] truncate" title={p.gorev_yeri ?? ''}>
                            {p.gorev_yeri?.trim() || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400">—</td>
                          <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                          <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                          <td className="px-4 py-2.5 text-slate-400">—</td>
                          <td className="px-4 py-2.5 text-center text-slate-400">—</td>
                          <td className="px-4 py-2.5 text-slate-400">—</td>
                          <td className="px-4 py-2.5 text-right text-xs text-slate-500">Firma</td>
                        </tr>
                      )
                    }
                    const duz = duzenlenenSicil === p.sicil_no
                    return (
                      <tr key={p.sicil_no} className={duz ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                        <td className="px-3 py-2.5 text-center text-slate-600 tabular-nums font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sicil_no}</td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={personelDetayHref(p)}
                            className="font-medium text-slate-800 hover:text-blue-700 hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            {p.ad_soyad}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{p.statuEtiket}</td>
                        <td className="px-4 py-2.5">
                          {duz ? (
                            <input
                              type="text"
                              value={inlineDeger(p, 'gorev_yeri')}
                              onChange={e => inlineGuncelle(p, 'gorev_yeri', e.target.value)}
                              className="w-full min-w-[100px] px-2 py-1 border border-slate-300 rounded text-sm"
                              placeholder="Görev yeri"
                            />
                          ) : (
                            <span className="text-slate-600 max-w-[220px] truncate block" title={p.gorev_yeri ?? ''}>
                              {p.gorev_yeri?.trim() || '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {duz ? (
                            <select
                              value={inlineDeger(p, 'gorev_turu')}
                              onChange={e => inlineGuncelle(p, 'gorev_turu', e.target.value)}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm bg-white"
                            >
                              {GOREV_TURU_OPTIONS.map(t => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-700">{p.gorev_turu ?? 'Çalışan'}</span>
                          )}
                        </td>
                        {/* Başlangıç tarihi */}
                        <td className="px-4 py-2.5 text-center">
                          {duz ? (
                            inlineTarihGoster(p) ? (
                              <input
                                type="date"
                                value={inlineDeger(p, 'gorev_turu_tarihi')}
                                onChange={e => inlineGuncelle(p, 'gorev_turu_tarihi', e.target.value)}
                                className="w-full max-w-[140px] px-1 py-1 border border-slate-300 rounded text-xs"
                              />
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )
                          ) : (
                            <span className="text-slate-600 tabular-nums text-xs">
                              {(p.gorev_turu ?? 'Çalışan') === 'Çalışan'
                                ? '—'
                                : tarihFormatla(p.gorev_turu_tarihi)}
                            </span>
                          )}
                        </td>
                        {/* Bitiş tarihi */}
                        <td className="px-4 py-2.5 text-center">
                          {duz ? (
                            inlineBitisGoster(p) ? (
                              <input
                                type="date"
                                value={inlineDeger(p, 'gorev_turu_bitis_tarihi')}
                                onChange={e => inlineGuncelle(p, 'gorev_turu_bitis_tarihi', e.target.value)}
                                className="w-full max-w-[140px] px-1 py-1 border border-slate-300 rounded text-xs"
                              />
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )
                          ) : (
                            <span className="text-slate-600 tabular-nums text-xs">
                              {(p.gorev_turu ?? 'Çalışan') === 'Çalışan'
                                ? '—'
                                : tarihFormatla(p.gorev_turu_bitis_tarihi ?? null)}
                            </span>
                          )}
                        </td>
                        {/* Görevlendirme metni */}
                        <td className="px-4 py-2.5">
                          {duz ? (
                            inlineAciklamaGoster(p) ? (
                              <input
                                type="text"
                                value={inlineDeger(p, 'gorev_turu_aciklama')}
                                onChange={e => inlineGuncelle(p, 'gorev_turu_aciklama', e.target.value)}
                                className="w-full min-w-[140px] px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Görevlendirme açıklaması"
                              />
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )
                          ) : (
                            <span className="text-slate-600">{p.gorev_turu_aciklama?.trim() || '—'}</span>
                          )}
                        </td>
                        {/* Yemek hakkı */}
                        <td className="px-4 py-2.5 text-center">
                          {duz ? (
                            inlineYemekHakkiGoster(p) ? (
                              <select
                                value={inlineDeger(p, 'gorev_turu_yemek_hakki')}
                                onChange={e => inlineGuncelle(p, 'gorev_turu_yemek_hakki', e.target.value)}
                                className="px-1 py-1 border border-slate-300 rounded text-xs bg-white"
                              >
                                <option value="">—</option>
                                <option value="true">Evet</option>
                                <option value="false">Hayır</option>
                              </select>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )
                          ) : (
                            <span className="text-slate-600 text-xs">
                              {p.gorev_turu === 'Geçici Görevlendirme'
                                ? p.gorev_turu_yemek_hakki === true
                                  ? 'Evet'
                                  : p.gorev_turu_yemek_hakki === false
                                    ? 'Hayır'
                                    : '—'
                                : '—'}
                            </span>
                          )}
                        </td>
                        {/* Görev durumu + Engelli detay */}
                        <td className="px-4 py-2.5">
                          {duz ? (
                            <div className="flex flex-col gap-1">
                              <select
                                value={inlineDeger(p, 'gorev_durumu')}
                                onChange={e => inlineGuncelle(p, 'gorev_durumu', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm bg-white"
                              >
                                {GOREV_DURUMU_OPTIONS.map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                              {inlineEngelliGoster(p) && (
                                <div className="flex flex-col gap-1 mt-1">
                                  <input
                                    type="number"
                                    min={0} max={100}
                                    value={inlineDeger(p, 'engelli_oran')}
                                    onChange={e => inlineGuncelle(p, 'engelli_oran', e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                                    placeholder="Oran %"
                                  />
                                  <input
                                    type="date"
                                    value={inlineDeger(p, 'engelli_baslangic')}
                                    onChange={e => inlineGuncelle(p, 'engelli_baslangic', e.target.value)}
                                    className="w-full px-1 py-1 border border-slate-300 rounded text-xs"
                                    title="Engelli başlangıç"
                                  />
                                  <input
                                    type="date"
                                    value={inlineDeger(p, 'engelli_bitis')}
                                    onChange={e => inlineGuncelle(p, 'engelli_bitis', e.target.value)}
                                    className="w-full px-1 py-1 border border-slate-300 rounded text-xs"
                                    title="Engelli bitiş"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-slate-600 text-sm">
                              <span>{p.gorev_durumu ?? 'Diğer'}</span>
                              {p.gorev_durumu === 'Engelli' && p.engelli_oran != null && (
                                <span className="text-xs text-slate-400 ml-1">%{p.engelli_oran}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {duz ? (
                            <button
                              type="button"
                              onClick={() => handleInlineKaydet(p)}
                              disabled={isPending}
                              className="text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                            >
                              {isPending ? '…' : 'Kaydet'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => duzenleAc(p)}
                              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                            >
                              Düzenle
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sekme === 'toplu' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto max-w-full">
          <table className="w-full text-xs sm:text-sm min-w-[980px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center px-2 py-2 font-semibold text-slate-600 w-14">Sıra No</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 w-24">Sicil</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 min-w-[7rem]">Adı Soyadı</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 min-w-[6rem]">Statü</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 min-w-[8rem]">Görev yeri</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 w-40">Görev türü</th>
                <th className="text-center px-2 py-2 font-semibold text-slate-600 w-32">Başlangıç</th>
                <th className="text-center px-2 py-2 font-semibold text-slate-600 w-32">Bitiş</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 min-w-[10rem]">Görevlendirme metni</th>
                <th className="text-center px-2 py-2 font-semibold text-slate-600 w-24">Yemek</th>
                <th className="text-left px-2 py-2 font-semibold text-slate-600 w-36">Görev durumu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kadroSirali.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                kadroSirali.map((p, i) => {
                  const degisti =
                    !!topluVeri[p.sicil_no] && Object.keys(topluVeri[p.sicil_no]!).length > 0
                  return (
                    <tr key={p.sicil_no} className={degisti ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                      <td className="px-2 py-1.5 text-center text-slate-400 tabular-nums">{i + 1}</td>
                      <td className="px-2 py-1.5 font-mono text-slate-500">{p.sicil_no}</td>
                      <td className="px-2 py-1.5 font-medium text-slate-800">{p.ad_soyad}</td>
                      <td className="px-2 py-1.5 text-slate-600">{p.statuEtiket}</td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={topluDegerAl(p, 'gorev_yeri')}
                          onChange={e => topluGuncelle(p.sicil_no, 'gorev_yeri', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            degisti ? 'border-blue-300 bg-blue-50/80' : 'border-slate-200 bg-white'
                          }`}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={topluDegerAl(p, 'gorev_turu')}
                          onChange={e => topluGuncelle(p.sicil_no, 'gorev_turu', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            degisti ? 'border-blue-300 bg-blue-50/80' : 'border-slate-200'
                          }`}
                        >
                          {GOREV_TURU_OPTIONS.map(t => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {topluTarihGoster(p) ? (
                          <input
                            type="date"
                            value={topluDegerAl(p, 'gorev_turu_tarihi')}
                            onChange={e => topluGuncelle(p.sicil_no, 'gorev_turu_tarihi', e.target.value)}
                            className={`w-full max-w-[9rem] px-1 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                              degisti ? 'border-blue-300 bg-blue-50/80' : 'border-slate-200 bg-white'
                            }`}
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {topluBitisGoster(p) ? (
                          <input
                            type="date"
                            value={topluDegerAl(p, 'gorev_turu_bitis_tarihi')}
                            onChange={e => topluGuncelle(p.sicil_no, 'gorev_turu_bitis_tarihi', e.target.value)}
                            className={`w-full max-w-[9rem] px-1 py-1 border rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                              degisti ? 'border-blue-300 bg-blue-50/80' : 'border-slate-200 bg-white'
                            }`}
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {topluAciklamaGoster(p) ? (
                          <input
                            type="text"
                            value={topluDegerAl(p, 'gorev_turu_aciklama')}
                            onChange={e => topluGuncelle(p.sicil_no, 'gorev_turu_aciklama', e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                              degisti ? 'border-blue-300 bg-blue-50/80' : 'border-slate-200 bg-white'
                            }`}
                            placeholder="Görevlendirme açıklaması"
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {topluYemekHakkiGoster(p) ? (
                          <select
                            value={topluDegerAl(p, 'gorev_turu_yemek_hakki')}
                            onChange={e => topluGuncelle(p.sicil_no, 'gorev_turu_yemek_hakki', e.target.value)}
                            className={`px-1 py-1 border rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                              degisti ? 'border-blue-300 bg-blue-50/80' : 'border-slate-200'
                            }`}
                          >
                            <option value="">—</option>
                            <option value="true">Evet</option>
                            <option value="false">Hayır</option>
                          </select>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={topluDegerAl(p, 'gorev_durumu')}
                          onChange={e => topluGuncelle(p.sicil_no, 'gorev_durumu', e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs sm:text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            degisti ? 'border-blue-300 bg-blue-50/80' : 'border-slate-200'
                          }`}
                        >
                          {GOREV_DURUMU_OPTIONS.map(d => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
