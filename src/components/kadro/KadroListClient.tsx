'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import KadroFormModal from './KadroForm'
import { kadroDetayHref } from '@/lib/kadro-link'
import { trNormalize } from '@/lib/turkce-search'
import type { Tables } from '@/types/database'

type Kadro   = Tables<'kadro_hareketleri'>
interface Personel { sicil_no: string; ad_soyad: string }
const trNumericCollator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' })
const EXCEL_YESIL = '#217346'

function kadroSiraNoSirala(a: string | null, b: string | null): number {
  const aa = (a ?? '').trim()
  const bb = (b ?? '').trim()
  if (!aa && !bb) return 0
  if (!aa) return 1
  if (!bb) return -1

  const aNum = Number.parseInt(aa, 10)
  const bNum = Number.parseInt(bb, 10)
  const aNumOk = Number.isFinite(aNum)
  const bNumOk = Number.isFinite(bNum)
  if (aNumOk && bNumOk && aNum !== bNum) return aNum - bNum

  return trNumericCollator.compare(aa, bb)
}

interface Props {
  data: Kadro[]
  personeller: Personel[]
  statuler: string[]
  mudurluler: string[]
  unvanlar: { id: number; unvan_adi: string; sinif_adi: string | null }[]
  gelisNedenleri?: string[]
  ayrilisNedenleri?: string[]
  onEkle:     (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
}

function kadroDurumEtiketi(k: Kadro): 'Asil' | 'Vekil' | 'Boş' | 'İptal' {
  if (k.iptal_karar_tarihi || k.iptal_karar_no) return 'İptal'
  if (k.durumu === 'Dolu' || Boolean(k.asil)) return 'Asil'
  if (k.durumu === 'Vekil' || Boolean(k.vekil)) return 'Vekil'
  return 'Boş'
}

function txt(v: string | null | undefined): string {
  return String(v ?? '').trim()
}

const DURUM_RENK: Record<string, string> = {
  Asil:  'bg-green-100 text-green-700',
  Dolu:  'bg-green-100 text-green-700',
  Vekil: 'bg-amber-100 text-amber-700',
  Boş:   'bg-slate-100 text-slate-500',
  İptal: 'bg-black text-white',
}
const DURUM_FILTRELER = ['Tümü', 'Dolu', 'Asil', 'Vekil', 'Boş', 'İptal'] as const
type DurumFiltre = (typeof DURUM_FILTRELER)[number]

type ColumnFilterKey =
  | 'kadro_derecesi'
  | 'sinif'
  | 'kadro_gorev_unvani'
  | 'mudurluk'
  | 'statu'
  | 'asil'
  | 'vekil'
  | 'durumu'

type ColumnFilters = Record<ColumnFilterKey, string[]>

const BOS_KOLON_FILTRE: ColumnFilters = {
  kadro_derecesi: [],
  sinif: [],
  kadro_gorev_unvani: [],
  mudurluk: [],
  statu: [],
  asil: [],
  vekil: [],
  durumu: [],
}

function HeaderMultiSelectFilter({
  title,
  options,
  selected,
  onToggle,
  onClear,
}: {
  title: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  onClear: () => void
}) {
  const [arama, setArama] = useState('')
  const aktif = selected.length > 0
  const filtreliOpsiyonlar = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return options
    return options.filter(v => trNormalize(v).includes(q))
  }, [options, arama])

  return (
    <details className="relative inline-block" onClick={e => e.stopPropagation()}>
      <summary className="list-none cursor-pointer inline-flex items-center gap-1 text-slate-500 hover:text-slate-700">
        <svg className={`h-3.5 w-3.5 ${aktif ? 'text-blue-600' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M3 5a1 1 0 0 1 1-1h12a1 1 0 0 1 .8 1.6L12 12v4a1 1 0 0 1-1.447.894l-2-1A1 1 0 0 1 8 15v-3L3.2 5.6A1 1 0 0 1 3 5Z" />
        </svg>
        {aktif && <span className="text-[10px] font-semibold">{selected.length}</span>}
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-[min(26rem,calc(100vw-2rem))] min-w-[18rem] rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-semibold text-slate-700">{title}</p>
          <button
            type="button"
            onClick={e => {
              e.preventDefault()
              onClear()
            }}
            className="text-[11px] text-slate-500 hover:text-slate-800"
          >
            Temizle
          </button>
        </div>
        <div className="mb-2 px-1">
          <input
            type="text"
            value={arama}
            onChange={e => setArama(e.target.value)}
            placeholder="Filtre içinde ara..."
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="max-h-64 overflow-auto pr-1">
          {filtreliOpsiyonlar.map(v => (
            <label key={v} className="flex items-start gap-2 rounded px-1 py-1 text-xs text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selected.includes(v)}
                onChange={() => onToggle(v)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
              />
              <span className="leading-4">{v}</span>
            </label>
          ))}
          {filtreliOpsiyonlar.length === 0 && (
            <p className="px-1 py-2 text-xs text-slate-400">Eşleşen seçenek bulunamadı.</p>
          )}
        </div>
      </div>
    </details>
  )
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function KadroListClient({ data, personeller, statuler, mudurluler, unvanlar, gelisNedenleri, ayrilisNedenleri, onEkle, onGuncelle }: Props) {
  const router = useRouter()
  const [durumFiltre, setDurumFiltre]  = useState<DurumFiltre>('Tümü')
  const [statuSekme, setStatuSekme]   = useState('Tümü')
  const [aramaQ, setAramaQ]           = useState('')
  const [modalAcik, setModalAcik]     = useState(false)
  const [secili, setSecili]           = useState<Kadro | null>(null)
  const [sunuciHata, setSunuciHata]   = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [kolonFiltre, setKolonFiltre] = useState<ColumnFilters>(BOS_KOLON_FILTRE)
  const [hizliFiltre, setHizliFiltre] = useState<'yok' | 'mudurler'>('yok')

  const statuSekmeler = useMemo(() => {
    const benzersiz = [...new Set(data.map(k => k.statu).filter(Boolean) as string[])].sort()
    return ['Tümü', ...benzersiz]
  }, [data])

  const adMap = useMemo(() => {
    const m: Record<string, string> = {}
    personeller.forEach(p => { m[p.sicil_no] = p.ad_soyad })
    return m
  }, [personeller])

  const unvanSinifMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const u of unvanlar) {
      const ad = txt(u.unvan_adi)
      const sinif = txt(u.sinif_adi)
      if (ad && sinif) m.set(ad, sinif)
    }
    return m
  }, [unvanlar])

  const kadroFallbackBySiraNo = useMemo(() => {
    const m = new Map<string, { unvan: string; gorevUnvan: string; mudurluk: string; gorevMudurluk: string }>()
    for (const k of data) {
      const sira = txt(k.kadro_sira_no)
      if (!sira || m.has(sira)) continue
      const unvan = txt(k.kadro_unvani)
      const gorevUnvan = txt(k.gorev_unvani)
      const mudurluk = txt(k.kadro_mudurlugu)
      const gorevMudurluk = txt(k.gorev_mudurlugu)
      if (!unvan && !gorevUnvan && !mudurluk && !gorevMudurluk) continue
      m.set(sira, { unvan, gorevUnvan, mudurluk, gorevMudurluk })
    }
    return m
  }, [data])

  function kadroUnvanMetni(k: Kadro): { unvan: string; gorevUnvan: string } {
    const unvan = txt(k.kadro_unvani)
    const gorevUnvan = txt(k.gorev_unvani)
    if (unvan || gorevUnvan) return { unvan, gorevUnvan }
    const fb = kadroFallbackBySiraNo.get(txt(k.kadro_sira_no))
    return { unvan: fb?.unvan ?? '', gorevUnvan: fb?.gorevUnvan ?? '' }
  }

  function kadroSinifMetni(k: Kadro): string {
    const unvan = kadroUnvanMetni(k)
    return unvanSinifMap.get(unvan.unvan) ?? unvanSinifMap.get(unvan.gorevUnvan) ?? '—'
  }

  function kadroMudurlukMetni(k: Kadro): { mudurluk: string; gorevMudurluk: string } {
    const mudurluk = txt(k.kadro_mudurlugu)
    const gorevMudurluk = txt(k.gorev_mudurlugu)
    if (mudurluk || gorevMudurluk) return { mudurluk, gorevMudurluk }
    const fb = kadroFallbackBySiraNo.get(txt(k.kadro_sira_no))
    return { mudurluk: fb?.mudurluk ?? '', gorevMudurluk: fb?.gorevMudurluk ?? '' }
  }

  const filtreOpsiyonlari = useMemo(() => {
    const degerler = {
      kadro_derecesi: new Set<string>(),
      sinif: new Set<string>(),
      kadro_gorev_unvani: new Set<string>(),
      mudurluk: new Set<string>(),
      statu: new Set<string>(),
      asil: new Set<string>(),
      vekil: new Set<string>(),
      durumu: new Set<string>(),
    }

    for (const k of data) {
      if (k.kadro_derecesi) degerler.kadro_derecesi.add(k.kadro_derecesi)

      degerler.sinif.add(kadroSinifMetni(k))

      const unvan = [k.kadro_unvani, k.gorev_unvani]
        .filter(Boolean)
        .map(x => String(x).trim())
        .filter(Boolean)
        .join(' / ')
      if (unvan) degerler.kadro_gorev_unvani.add(unvan)

      const mudurluk = [k.kadro_mudurlugu, k.gorev_mudurlugu]
        .filter(Boolean)
        .map(x => String(x).trim())
        .filter(Boolean)
        .join(' / ')
      if (mudurluk) degerler.mudurluk.add(mudurluk)

      if (k.statu) degerler.statu.add(k.statu)
      if (k.asil) degerler.asil.add(`${adMap[k.asil] ?? k.asil} (${k.asil})`)
      if (k.vekil) degerler.vekil.add(`${adMap[k.vekil] ?? k.vekil} (${k.vekil})`)
      degerler.durumu.add(kadroDurumEtiketi(k))
    }

    return {
      kadro_derecesi: [...degerler.kadro_derecesi].sort((a, b) => trNumericCollator.compare(a, b)),
      sinif: [...degerler.sinif].sort((a, b) => a.localeCompare(b, 'tr')),
      kadro_gorev_unvani: [...degerler.kadro_gorev_unvani].sort((a, b) => a.localeCompare(b, 'tr')),
      mudurluk: [...degerler.mudurluk].sort((a, b) => a.localeCompare(b, 'tr')),
      statu: [...degerler.statu].sort((a, b) => a.localeCompare(b, 'tr')),
      asil: [...degerler.asil].sort((a, b) => a.localeCompare(b, 'tr')),
      vekil: [...degerler.vekil].sort((a, b) => a.localeCompare(b, 'tr')),
      durumu: [...degerler.durumu].sort((a, b) => a.localeCompare(b, 'tr')),
    }
  }, [data, adMap, unvanSinifMap])

  function toggleKolonFiltre(key: ColumnFilterKey, value: string) {
    setKolonFiltre(prev => {
      const secili = prev[key]
      const varMi = secili.includes(value)
      return {
        ...prev,
        [key]: varMi ? secili.filter(v => v !== value) : [...secili, value],
      }
    })
  }

  const filtreli = useMemo(() => {
    let list = [...data]
    if (statuSekme !== 'Tümü') list = list.filter(k => k.statu === statuSekme)
    if (durumFiltre !== 'Tümü') {
      list = list.filter(k => {
        const etiket = kadroDurumEtiketi(k)
        if (durumFiltre === 'Dolu') return etiket === 'Asil' || etiket === 'Vekil'
        if (durumFiltre === 'Asil') return etiket === 'Asil'
        if (durumFiltre === 'Vekil') return etiket === 'Vekil'
        if (durumFiltre === 'İptal') return etiket === 'İptal'
        return etiket === 'Boş'
      })
    }
    if (aramaQ.trim()) {
      const q = trNormalize(aramaQ)
      list = list.filter(k =>
        trNormalize(k.kadro_sira_no).includes(q) ||
        trNormalize(k.kadro_unvani).includes(q) ||
        trNormalize(k.gorev_unvani).includes(q) ||
        trNormalize(k.kadro_mudurlugu).includes(q) ||
        (k.asil ? trNormalize(adMap[k.asil] ?? k.asil).includes(q) : false) ||
        (k.vekil ? trNormalize(adMap[k.vekil] ?? k.vekil).includes(q) : false) ||
        trNormalize(k.statu).includes(q)
      )
    }
    if (kolonFiltre.kadro_derecesi.length > 0) {
      list = list.filter(k => kolonFiltre.kadro_derecesi.includes(k.kadro_derecesi ?? ''))
    }
    if (kolonFiltre.sinif.length > 0) {
      list = list.filter(k => kolonFiltre.sinif.includes(kadroSinifMetni(k)))
    }
    if (kolonFiltre.kadro_gorev_unvani.length > 0) {
      list = list.filter(k => {
        const unvan = [k.kadro_unvani, k.gorev_unvani]
          .filter(Boolean)
          .map(x => String(x).trim())
          .filter(Boolean)
          .join(' / ')
        return kolonFiltre.kadro_gorev_unvani.includes(unvan)
      })
    }
    if (kolonFiltre.mudurluk.length > 0) {
      list = list.filter(k => {
        const mudurluk = [k.kadro_mudurlugu, k.gorev_mudurlugu]
          .filter(Boolean)
          .map(x => String(x).trim())
          .filter(Boolean)
          .join(' / ')
        return kolonFiltre.mudurluk.includes(mudurluk)
      })
    }
    if (kolonFiltre.statu.length > 0) {
      list = list.filter(k => kolonFiltre.statu.includes(k.statu ?? ''))
    }
    if (kolonFiltre.asil.length > 0) {
      list = list.filter(k => kolonFiltre.asil.includes(k.asil ? `${adMap[k.asil] ?? k.asil} (${k.asil})` : ''))
    }
    if (kolonFiltre.vekil.length > 0) {
      list = list.filter(k => kolonFiltre.vekil.includes(k.vekil ? `${adMap[k.vekil] ?? k.vekil} (${k.vekil})` : ''))
    }
    if (kolonFiltre.durumu.length > 0) {
      list = list.filter(k => kolonFiltre.durumu.includes(kadroDurumEtiketi(k)))
    }
    if (hizliFiltre === 'mudurler') {
      list = list.filter(k => trNormalize(k.kadro_unvani ?? '').includes('mudur'))
    }
    list.sort((a, b) => {
      const byKadroNo = kadroSiraNoSirala(a.kadro_sira_no, b.kadro_sira_no)
      if (byKadroNo !== 0) return byKadroNo
      return (a.kadro_unvani ?? '').localeCompare(b.kadro_unvani ?? '', 'tr')
    })
    return list
  }, [data, statuSekme, durumFiltre, aramaQ, adMap, kolonFiltre, hizliFiltre])

  async function excelIndir() {
    const XLSX = await import('xlsx-js-style')
    const baslik = 'Adapazarı Belediyesi - Norm Kadro Defteri'
    const FONT_PT = 12

    /** Excel: kadro ünvanı / müdürlük + personel; Statü ve Durum yok */
    const kolonBasliklari = [
      'Sıra No',
      'Kadro Sıra No',
      'Kadro Derecesi',
      'Sınıf',
      'Kadro Ünvanı',
      'Kadro Müdürlüğü',
      'Asil Personel',
      'Vekil Personel',
    ]

    const excelKayitlari = filtreli.filter(k => !(k.iptal_karar_tarihi || k.iptal_karar_no))
    const satirlar = excelKayitlari.map((k, idx) => {
      const kadroUnvani = (k.kadro_unvani ?? '').trim() || '—'
      const kadroMudurlugu = (k.kadro_mudurlugu ?? '').trim() || '—'
      const sinif = kadroSinifMetni(k)
      const asil = k.asil ? `${adMap[k.asil] ?? k.asil}\n${k.asil}` : '—'
      const vekil = k.vekil ? `${adMap[k.vekil] ?? k.vekil}\n${k.vekil}` : '—'

      return [
        idx + 1,
        k.kadro_sira_no ?? '—',
        k.kadro_derecesi ?? '—',
        sinif,
        kadroUnvani,
        kadroMudurlugu,
        asil,
        vekil,
      ]
    })

    const aoa: (string | number)[][] = [[baslik], kolonBasliklari, ...satirlar]

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }]
    ws['!cols'] = [
      { wch: 5 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 28 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
    ]
    ws['!pageSetup'] = {
      orientation: 'landscape',
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 0,
    }

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    const HEADER_ROW = 1
    for (let R = 0; R <= range.e.r; R++) {
      for (let C = 0; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[addr]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cell = ws[addr] as any
        const isTitle = R === 0
        const isHeader = R === HEADER_ROW
        const isData = R > HEADER_ROW
        const abcCenter = isData && C <= 2

        let horizontal: 'left' | 'center' | 'right' = 'left'
        if (isTitle) horizontal = 'center'
        else if (isHeader) horizontal = C <= 2 ? 'center' : 'left'
        else if (abcCenter) horizontal = 'center'

        cell.s = {
          alignment: {
            vertical: 'top',
            horizontal,
            wrapText: true,
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
            left: { style: 'thin', color: { rgb: 'D1D5DB' } },
            right: { style: 'thin', color: { rgb: 'D1D5DB' } },
          },
          font: {
            name: 'Calibri',
            sz: FONT_PT,
            bold: isTitle || isHeader,
            color: { rgb: '1F2937' },
          },
        }
        if (isHeader) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: 'E5E7EB' } }
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Norm Kadro')
    XLSX.writeFile(wb, `norm-kadro-defteri-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function yeniEkleAc()       { setSecili(null); setSunuciHata(null); setModalAcik(true) }
  function duzenleAc(k: Kadro){ setSecili(k);    setSunuciHata(null); setModalAcik(true) }
  function kapat()             { setModalAcik(false); setSecili(null); setSunuciHata(null) }

  async function handleSubmit(fd: FormData) {
    setSunuciHata(null)
    startTransition(async () => {
      const res = secili ? await onGuncelle(secili.id, fd) : await onEkle(fd)
      if (res.hata) setSunuciHata(res.hata)
      else kapat()
    })
  }

  const istatistik = useMemo(() => ({
    asil:  data.filter(k => !k.ayrilis_tarihi && kadroDurumEtiketi(k) === 'Asil').length,
    vekil: data.filter(k => !k.ayrilis_tarihi && kadroDurumEtiketi(k) === 'Vekil').length,
    bos:   data.filter(k => !k.ayrilis_tarihi && kadroDurumEtiketi(k) === 'Boş').length,
  }), [data])

  return (
    <div>
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Kadro Hareketleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pozisyon atama ve görev kayıtları</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input type="text" placeholder="Ara…" value={aramaQ} onChange={e => setAramaQ(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 w-44" />
          </div>
          <button
            type="button"
            onClick={excelIndir}
            className="flex items-center gap-2 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium whitespace-nowrap"
            style={{ backgroundColor: EXCEL_YESIL }}
          >
            Excel İndir
          </button>
          <button onClick={yeniEkleAc}
            className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium whitespace-nowrap">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Kayıt
          </button>
        </div>
      </div>

      {/* Statü Sekmeleri */}
      <div className="border-b border-slate-200 mb-5 overflow-x-auto">
        <div className="flex min-w-max gap-0">
          {statuSekmeler.map(s => (
            <button key={s} onClick={() => { setStatuSekme(s); setDurumFiltre('Tümü') }}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                statuSekme === s
                  ? 'border-slate-800 text-slate-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {s}
              <span className="ml-1.5 text-xs text-slate-400">
                ({s === 'Tümü'
                  ? data.length
                  : data.filter(k => k.statu === s).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{istatistik.asil}</p>
          <p className="text-xs text-slate-500 mt-0.5">Asil</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{istatistik.vekil}</p>
          <p className="text-xs text-slate-500 mt-0.5">Vekil</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-800">{istatistik.bos}</p>
          <p className="text-xs text-slate-500 mt-0.5">Boş</p>
        </div>
      </div>

      {/* Filtre çubuğu */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {DURUM_FILTRELER.map(d => (
          <button key={d} onClick={() => setDurumFiltre(d)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              durumFiltre === d ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}>
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setKolonFiltre(BOS_KOLON_FILTRE)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border bg-white text-slate-600 border-slate-300 hover:border-slate-400"
        >
          Sütun filtrelerini temizle
        </button>
        <div className="inline-flex items-center gap-2 text-xs text-slate-500 ml-1 border-l border-slate-300 pl-3">
          <button
            type="button"
            onClick={() => setHizliFiltre(prev => (prev === 'mudurler' ? 'yok' : 'mudurler'))}
            className={`px-2 py-1 rounded border ${
              hizliFiltre === 'mudurler'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            Müdürler
          </button>
        </div>
        <span className="text-xs text-slate-400 ml-1">{filtreli.length} kayıt</span>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-visible min-h-[420px]">
        <div className="overflow-x-auto overflow-y-visible min-h-[360px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">Kadro Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-24">
                  <div className="inline-flex items-center gap-1.5">
                    Kadro Derecesi
                    <HeaderMultiSelectFilter
                      title="Kadro Derecesi"
                      options={filtreOpsiyonlari.kadro_derecesi}
                      selected={kolonFiltre.kadro_derecesi}
                      onToggle={v => toggleKolonFiltre('kadro_derecesi', v)}
                      onClear={() => setKolonFiltre(prev => ({ ...prev, kadro_derecesi: [] }))}
                    />
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">
                  <div className="inline-flex items-center gap-1.5">
                    Sınıf
                    <HeaderMultiSelectFilter
                      title="Sınıf"
                      options={filtreOpsiyonlari.sinif}
                      selected={kolonFiltre.sinif}
                      onToggle={v => toggleKolonFiltre('sinif', v)}
                      onClear={() => setKolonFiltre(prev => ({ ...prev, sinif: [] }))}
                    />
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  <div className="inline-flex items-center gap-1.5">
                    Kadro / Görev Ünvanı
                    <HeaderMultiSelectFilter
                      title="Kadro / Görev Ünvanı"
                      options={filtreOpsiyonlari.kadro_gorev_unvani}
                      selected={kolonFiltre.kadro_gorev_unvani}
                      onToggle={v => toggleKolonFiltre('kadro_gorev_unvani', v)}
                      onClear={() => setKolonFiltre(prev => ({ ...prev, kadro_gorev_unvani: [] }))}
                    />
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  <div className="inline-flex items-center gap-1.5">
                    Müdürlük
                    <HeaderMultiSelectFilter
                      title="Müdürlük"
                      options={filtreOpsiyonlari.mudurluk}
                      selected={kolonFiltre.mudurluk}
                      onToggle={v => toggleKolonFiltre('mudurluk', v)}
                      onClear={() => setKolonFiltre(prev => ({ ...prev, mudurluk: [] }))}
                    />
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  <div className="inline-flex items-center gap-1.5">
                    Statü
                    <HeaderMultiSelectFilter
                      title="Statü"
                      options={filtreOpsiyonlari.statu}
                      selected={kolonFiltre.statu}
                      onToggle={v => toggleKolonFiltre('statu', v)}
                      onClear={() => setKolonFiltre(prev => ({ ...prev, statu: [] }))}
                    />
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  <div className="inline-flex items-center gap-1.5">
                    Asil Personel
                    <HeaderMultiSelectFilter
                      title="Asil Personel"
                      options={filtreOpsiyonlari.asil}
                      selected={kolonFiltre.asil}
                      onToggle={v => toggleKolonFiltre('asil', v)}
                      onClear={() => setKolonFiltre(prev => ({ ...prev, asil: [] }))}
                    />
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  <div className="inline-flex items-center gap-1.5">
                    Vekil Personel
                    <HeaderMultiSelectFilter
                      title="Vekil Personel"
                      options={filtreOpsiyonlari.vekil}
                      selected={kolonFiltre.vekil}
                      onToggle={v => toggleKolonFiltre('vekil', v)}
                      onClear={() => setKolonFiltre(prev => ({ ...prev, vekil: [] }))}
                    />
                  </div>
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">
                  <div className="inline-flex items-center gap-1.5">
                    Durum
                    <HeaderMultiSelectFilter
                      title="Durum"
                      options={filtreOpsiyonlari.durumu}
                      selected={kolonFiltre.durumu}
                      onToggle={v => toggleKolonFiltre('durumu', v)}
                      onClear={() => setKolonFiltre(prev => ({ ...prev, durumu: [] }))}
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtreli.length === 0 && (
                <tr><td colSpan={10} className="text-center py-16 text-slate-400">
                  {aramaQ ? 'Arama sonucu bulunamadı.' : 'Kadro kaydı yok.'}
                </td></tr>
              )}
              {filtreli.map((k, idx) => {
                const unvan = kadroUnvanMetni(k)
                const mudurluk = kadroMudurlukMetni(k)
                return (
                <tr
                  key={k.id}
                  onClick={() => router.push(kadroDetayHref(k))}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{k.kadro_sira_no ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs tabular-nums">{k.kadro_derecesi ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{kadroSinifMetni(k)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{unvan.unvan || '—'}</span>
                    {unvan.gorevUnvan && unvan.gorevUnvan !== unvan.unvan && (
                      <span className="block text-xs text-slate-400">→ {unvan.gorevUnvan}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {mudurluk.mudurluk || '—'}
                    {mudurluk.gorevMudurluk && mudurluk.gorevMudurluk !== mudurluk.mudurluk && (
                      <span className="block text-slate-400">→ {mudurluk.gorevMudurluk}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{k.statu ?? '—'}</td>
                  <td className="px-4 py-3">
                    {k.asil ? (
                      <>
                        <span className="font-medium text-slate-800">{adMap[k.asil] ?? k.asil}</span>
                        <span className="block text-xs text-slate-400 font-mono">{k.asil}</span>
                      </>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {k.vekil ? (
                      <>
                        <span className="font-medium text-slate-800">{adMap[k.vekil] ?? k.vekil}</span>
                        <span className="block text-xs text-slate-400 font-mono">{k.vekil}</span>
                      </>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${DURUM_RENK[kadroDurumEtiketi(k)] ?? ''}`}>
                      {kadroDurumEtiketi(k)}
                    </span>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtreli.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtreli.length} kayıt gösteriliyor
          </div>
        )}
      </div>

      <KadroFormModal
        open={modalAcik} onClose={kapat} onSubmit={handleSubmit}
        isPending={isPending} sunuciHata={sunuciHata}
        personeller={personeller} statuler={statuler} mudurluler={mudurluler}
        unvanlar={unvanlar}
        gelisNedenleri={gelisNedenleri}
        ayrilisNedenleri={ayrilisNedenleri}
        secili={secili}
      />
    </div>
  )
}
