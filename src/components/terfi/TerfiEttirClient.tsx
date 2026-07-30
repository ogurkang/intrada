'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ExcelJS from 'exceljs'
import type { KazancPuan, TerfiEttirOnizlemeSatir, TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import {
  buildTerfiOgrenimOnizleme,
  kazancLookupFromEntries,
  TERFI_OGRENIM_OLAY_SECENEKLERI,
  type TerfiOgrenimOlayTipi,
} from '@/lib/terfi-ogrenim-ettir'
import { terfiEttirKaydet, type TerfiEttirKayitSatir } from '@/app/(dashboard)/terfi/donem/actions'
import Modal from '@/components/ui/Modal'
import PersonelAramaSecim, { type PersonelAramaOge } from '@/components/bildirim/PersonelAramaSecim'

interface Props {
  donemId: number
  donemAdi: string
  terfiBas: string
  terfiBit: string
  initialRows: TerfiEttirOnizlemeSatir[]
  /** Dönem içinde terfi ettirilmiş kişilerin onceki→sonraki snapshot satırları */
  terfiEttirilenRows?: TerfiEttirOnizlemeSatir[]
  kaynaklar: TerfiKaynak[]
  kazancEntries: Array<{ key: string; puan: KazancPuan }>
  tanimOgList: { id: number; isim: string }[]
  memurPersoneller: PersonelAramaOge[]
  islemLoglari: { id: number; sicil_no: string; islem_tarihi: string; geri_alindi: boolean }[]
  onGeriAlTek: (donemId: number, logId: number) => Promise<{ hata?: string }>
  onGeriAlToplu: (donemId: number, logIds: number[]) => Promise<{ hata?: string; geriAlinan?: number }>
}

function fmt(iso: string) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR')
  } catch {
    return iso
  }
}

/** Liste önizlemesi (locale) */
function fmtTarih(iso: string | null | undefined) {
  if (iso == null || !String(iso).trim()) return '—'
  const d = String(iso).slice(0, 10)
  return fmt(d)
}

/** Excel: gg.aa.yyyy */
function fmtTarihGGAA(iso: string | null | undefined): string {
  if (iso == null || !String(iso).trim() || String(iso).trim() === '—') return '—'
  const s = String(iso).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

function puanGoster(v: string | null | undefined) {
  return v ?? '—'
}

function durumHucreClass(durum: string, ogrenimTerfi?: boolean): string {
  if (ogrenimTerfi) return 'bg-purple-600 !text-white'
  if (durum.includes('Derece İlerledi')) return 'bg-green-100 text-green-800'
  if (durum.includes('Sadece Kademe')) return 'bg-slate-100 text-slate-700'
  if (durum.includes('Kıdem Yılı İlerledi')) return 'bg-blue-100 text-blue-700'
  if (durum.includes('İyi Hal İlerlemesi')) return 'bg-indigo-100 text-indigo-700'
  if (durum.includes('Tavan')) return 'bg-amber-100 text-amber-900'
  if (durum.includes('Eğitim Sınırında')) return 'bg-red-100 text-red-800'
  return 'bg-slate-50 text-slate-600'
}

function durumExcelStyle(durum: string, ogrenimTerfi?: boolean): Partial<ExcelJS.Style> {
  if (ogrenimTerfi)
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, font: { color: { argb: 'FF9333EA' } } }
  if (durum.includes('Derece İlerledi'))
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }, font: { color: { argb: 'FF166534' } } }
  if (durum.includes('Sadece Kademe'))
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, font: { color: { argb: 'FF334155' } } }
  if (durum.includes('Kıdem Yılı İlerledi'))
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }, font: { color: { argb: 'FF1D4ED8' } } }
  if (durum.includes('İyi Hal İlerlemesi'))
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }, font: { color: { argb: 'FF4338CA' } } }
  if (durum.includes('Tavan'))
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }, font: { color: { argb: 'FF78350F' } } }
  if (durum.includes('Eğitim Sınırında'))
    return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE2E2' } }, font: { color: { argb: 'FF991B1B' } } }
  return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }, font: { color: { argb: 'FF475569' } } }
}

function richOk(eski: string, yeni: string): ExcelJS.CellRichTextValue {
  return {
    richText: [
      { text: `${eski} → ` },
      { font: { bold: true }, text: yeni },
    ],
  }
}

export default function TerfiEttirClient({
  donemId,
  donemAdi,
  terfiBas,
  terfiBit,
  initialRows,
  terfiEttirilenRows = [],
  kaynaklar,
  kazancEntries,
  tanimOgList,
  memurPersoneller,
  islemLoglari,
  onGeriAlTek,
  onGeriAlToplu,
}: Props) {
  const router = useRouter()
  const [satirlar, setSatirlar] = useState<TerfiEttirOnizlemeSatir[]>(initialRows)
  const [secili, setSecili] = useState<Record<string, boolean>>({})
  const [seciliGeriAl, setSeciliGeriAl] = useState<Record<number, boolean>>({})
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [ogrenimModalAcik, setOgrenimModalAcik] = useState(false)
  const [ogrenimSeciliSicil, setOgrenimSeciliSicil] = useState('')
  const [ogrenimModalHata, setOgrenimModalHata] = useState<string | null>(null)

  const kaynakBySicil = useMemo(() => new Map(kaynaklar.map(k => [k.sicil_no, k])), [kaynaklar])
  const kazancLookup = useMemo(() => kazancLookupFromEntries(kazancEntries), [kazancEntries])

  const tumSecili = useMemo(() => {
    if (!satirlar.length) return false
    return satirlar.every((r) => secili[r.sicil_no])
  }, [satirlar, secili])

  function toggleHepsi() {
    const next = !tumSecili
    const m: Record<string, boolean> = {}
    for (const r of satirlar) m[r.sicil_no] = next
    setSecili(m)
  }

  function toggleOne(sicil: string) {
    setSecili((prev) => ({ ...prev, [sicil]: !prev[sicil] }))
  }

  const aktifLogBySicil = useMemo(() => {
    const m: Record<string, number> = {}
    for (const l of islemLoglari) {
      if (!l.geri_alindi && m[l.sicil_no] == null) m[l.sicil_no] = l.id
    }
    return m
  }, [islemLoglari])

  function guncelle(sicil: string, alan: keyof TerfiEttirOnizlemeSatir['payload'], deger: string) {
    setSatirlar((prev) =>
      prev.map((row) => {
        if (row.sicil_no !== sicil) return row
        const p = { ...row.payload, [alan]: deger || null }
        return {
          ...row,
          dk_kha_yeni: `${p.kha_derece}/${p.kha_kademe}`,
          dk_ekea_yeni: `${p.ekea_derece}/${p.ekea_kademe}`,
          ek_gosterge_yeni: puanGoster(p.ek_gosterge),
          ek_odeme_yeni: puanGoster(p.ek_odeme),
          oht_yeni: puanGoster(p.oht),
          yan_odeme_yeni: puanGoster(p.yan_odeme),
          sds_yeni: puanGoster(p.sds_orani),
          payload: p,
        }
      }),
    )
  }

  const ogrenimAdayPersoneller = useMemo(() => {
    const listede = new Set(satirlar.map(r => r.sicil_no))
    return memurPersoneller.filter(p => !listede.has(p.sicil_no))
  }, [memurPersoneller, satirlar])

  const geriAlinabilirLoglar = useMemo(
    () => islemLoglari.filter(l => !l.geri_alindi),
    [islemLoglari],
  )

  const tumGeriAlSecili = useMemo(() => {
    if (!geriAlinabilirLoglar.length) return false
    return geriAlinabilirLoglar.every(l => seciliGeriAl[l.id])
  }, [geriAlinabilirLoglar, seciliGeriAl])

  function toggleGeriAlHepsi() {
    const next = !tumGeriAlSecili
    setSeciliGeriAl(prev => {
      const m = { ...prev }
      for (const l of geriAlinabilirLoglar) m[l.id] = next
      return m
    })
  }

  function ogrenimOlayDegistir(sicil: string, olay: TerfiOgrenimOlayTipi) {
    const kaynak = kaynakBySicil.get(sicil)
    if (!kaynak) return
    const yeni = buildTerfiOgrenimOnizleme({ kaynak, olay, kazancLookup, tanimOgList })
    if (!yeni) return
    setSatirlar(prev => prev.map(r => (r.sicil_no === sicil ? yeni : r)))
  }

  function ogrenimListeyeEkle() {
    setOgrenimModalHata(null)
    if (!ogrenimSeciliSicil) {
      setOgrenimModalHata('Lütfen bir personel seçin.')
      return
    }
    if (satirlar.some(r => r.sicil_no === ogrenimSeciliSicil)) {
      setOgrenimModalHata('Bu personel zaten listede.')
      return
    }
    const kaynak = kaynakBySicil.get(ogrenimSeciliSicil)
    if (!kaynak?.terfi_id) {
      setOgrenimModalHata('Seçilen personelin terfi kaydı bulunamadı.')
      return
    }
    const yeni = buildTerfiOgrenimOnizleme({
      kaynak,
      olay: 'hazirlik',
      kazancLookup,
      tanimOgList,
    })
    if (!yeni) {
      setOgrenimModalHata('Önizleme oluşturulamadı (derece/kademe bilgisi eksik olabilir).')
      return
    }
    setSatirlar(prev => [...prev, yeni].sort((a, b) =>
      a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }),
    ))
    setSecili(prev => ({ ...prev, [ogrenimSeciliSicil]: true }))
    setOgrenimModalAcik(false)
    setOgrenimSeciliSicil('')
    setBasari(`${yeni.ad_soyad ?? yeni.sicil_no} öğrenim terfi listesine eklendi.`)
  }

  function ogrenimModalKapat() {
    setOgrenimModalAcik(false)
    setOgrenimSeciliSicil('')
    setOgrenimModalHata(null)
  }

  function ogrenimListedenCikar(sicil: string) {
    setSatirlar(prev => prev.filter(r => r.sicil_no !== sicil))
    setSecili(prev => {
      const next = { ...prev }
      delete next[sicil]
      return next
    })
  }

  async function excelIndir() {
    // Hem henüz terfi ettirilmemiş (önizleme) hem de bu dönemde terfi ettirilmiş satırları birleştir
    const tumSatirlar = [...satirlar, ...terfiEttirilenRows].sort((a, b) =>
      a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }),
    )

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Çalışanlar', {
      views: [{ showGridLines: true }],
    })
    ws.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      horizontalCentered: true,
      margins: {
        left: 1,
        right: 1,
        top: 1,
        bottom: 1,
        header: 1,
        footer: 1,
      },
    }

    const colCount = 18
    const titleStyle: Partial<ExcelJS.Style> = {
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      font: { bold: true, size: 12 },
    }

    ws.mergeCells(1, 1, 1, colCount)
    ws.getCell(1, 1).value = 'T.C. ADAPAZARI BELEDİYESİ'
    ws.getCell(1, 1).style = titleStyle

    ws.mergeCells(2, 1, 2, colCount)
    ws.getCell(2, 1).value = 'İnsan Kaynakları ve Eğitim Müdürlüğü'
    ws.getCell(2, 1).style = titleStyle

    ws.mergeCells(3, 1, 3, colCount)
    ws.getCell(3, 1).value = `${donemAdi} — Terfi Durumu`
    ws.getCell(3, 1).style = titleStyle

    ws.mergeCells(4, 1, 4, colCount)
    ws.getCell(4, 1).value = `Terfi dönemi: ${fmt(terfiBas)} — ${fmt(terfiBit)}  ·  Maaş dönemi: ${fmt(terfiBas)} — ${fmt(terfiBit)}`
    ws.getCell(4, 1).style = {
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      font: { size: 11 },
    }

    const headers = [
      'Sıra No',
      'Sicil',
      'Ad Soyad',
      'Öğrenim',
      'Ünvan',
      'Kadro derecesi',
      'KHA D/K (eski → yeni)',
      'KHA tarihi (eski → yeni)',
      'EKEA D/K (eski → yeni)',
      'EKEA tarihi (eski → yeni)',
      'Kıdem yılı (eski → yeni)',
      'Kıdem tarihi (eski → yeni)',
      'Ek Gösterge (eski → yeni)',
      'Ek Ödeme (eski → yeni)',
      'ÖHT (eski → yeni)',
      'Yan Ödeme (eski → yeni)',
      'SDS (eski → yeni)',
      'Durum / Uyarı',
    ]

    const headerRow = ws.getRow(5)
    headers.forEach((h, i) => {
      const c = headerRow.getCell(i + 1)
      c.value = h
      c.style = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      }
    })
    headerRow.height = 60

    tumSatirlar.forEach((r, idx) => {
      const row = ws.getRow(6 + idx)
      const khaEski = fmtTarihGGAA(r.kha_tarihi)
      const khaYeni = fmtTarihGGAA(r.payload.kha_tarihi)
      const ekeaEski = fmtTarihGGAA(r.ekea_tarihi)
      const ekeaYeni = fmtTarihGGAA(r.payload.ekea_tarihi)
      const kidemEski = fmtTarihGGAA(r.kidem_tarihi_eski === '—' ? null : r.kidem_tarihi_eski)
      const kidemYeni = fmtTarihGGAA(r.kidem_tarihi_yeni === '—' ? null : r.kidem_tarihi_yeni)
      const iyiHalEski = fmtTarihGGAA(r.iyi_hal_tarihi_eski === '—' ? null : r.iyi_hal_tarihi_eski)
      const iyiHalYeni = fmtTarihGGAA(r.iyi_hal_tarihi_yeni === '—' ? null : r.iyi_hal_tarihi_yeni)

      const cells: { v: number | string | ExcelJS.CellRichTextValue; style?: Partial<ExcelJS.Style> }[] = [
        { v: idx + 1 },
        { v: r.sicil_no },
        { v: r.ad_soyad ?? '' },
        { v: r.ogrenim_turu ?? '' },
        { v: r.unvan_adi ?? '' },
        { v: r.kadro_derecesi ?? '' },
        { v: richOk(r.dk_kha_eski, r.dk_kha_yeni) },
        { v: richOk(khaEski, khaYeni) },
        { v: richOk(r.dk_ekea_eski, r.dk_ekea_yeni) },
        { v: richOk(ekeaEski, ekeaYeni) },
        { v: richOk(String(r.kidem_yili_eski), String(r.kidem_yili_yeni)) },
        { v: richOk(`${kidemEski} / ${iyiHalEski}`, `${kidemYeni} / ${iyiHalYeni}`) },
        { v: richOk(r.ek_gosterge_eski, r.ek_gosterge_yeni) },
        { v: richOk(r.ek_odeme_eski, r.ek_odeme_yeni) },
        { v: richOk(r.oht_eski, r.oht_yeni) },
        { v: richOk(r.yan_odeme_eski, r.yan_odeme_yeni) },
        { v: richOk(r.sds_eski, r.sds_yeni) },
        { v: r.durum, style: durumExcelStyle(r.durum, r.ogrenim_terfi) },
      ]

      const centerCols = new Set([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
      cells.forEach((cell, i) => {
        const c = row.getCell(i + 1)
        c.value = cell.v
        c.style = {
          alignment: {
            vertical: 'middle',
            wrapText: true,
            ...(centerCols.has(i + 1) ? { horizontal: 'center' as const } : {}),
          },
          border: {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          },
          ...cell.style,
        }
      })
    })

    const excelWidth = (w: number) => Number((w + 0.71).toFixed(2))
    const colWidths: Record<number, number> = {
      1: excelWidth(5),   // A
      2: excelWidth(5),   // B
      3: 22,              // C
      4: excelWidth(8),   // D
      5: excelWidth(10),  // E
      6: excelWidth(8),   // F
      7: excelWidth(8),   // G
      8: excelWidth(12),  // H
      9: excelWidth(8),   // I
      10: excelWidth(12), // J
      11: excelWidth(8),  // K
      12: excelWidth(12), // L
      13: excelWidth(9),  // M
      14: excelWidth(8),  // N
      15: excelWidth(8),  // O
      16: excelWidth(8),  // P
      17: excelWidth(8),  // Q
      18: excelWidth(15), // R
    }
    for (let i = 1; i <= 18; i++) {
      ws.getColumn(i).width = colWidths[i] ?? 12
    }
    const centerCols = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
    for (const colIdx of centerCols) {
      ws.getColumn(colIdx).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terfi-ettir-donem-${donemId}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  function terfiEttirUygula() {
    setHata(null)
    setBasari(null)
    const yazilacak = satirlar.filter((r) => secili[r.sicil_no] && r.terfi_id != null)
    if (!yazilacak.length) {
      setHata('Önce tabloda kaydedilecek satırları işaretleyin (terfi kaydı olan siciller).')
      return
    }
    const payload: TerfiEttirKayitSatir[] = yazilacak.map((r) => ({
      terfi_id: r.terfi_id!,
      sicil_no: r.sicil_no,
      ...r.payload,
      ogrenim_terfi: r.ogrenim_terfi,
      ogrenim_olay: r.ogrenim_olay,
      yeni_ogrenim_turu: r.yeni_ogrenim_turu,
    }))
    startTransition(async () => {
      const res = await terfiEttirKaydet(donemId, payload)
      if (res.hata) setHata(res.hata)
      else {
        setBasari(`${payload.length} kayıt terfi ettirildi.`)
        setSecili({})
        router.refresh()
      }
    })
  }

  function handleGeriAlTek(logId: number) {
    if (!confirm('Bu terfi işlemi geri alınacak. Onaylıyor musunuz?')) return
    setHata(null)
    setBasari(null)
    startTransition(async () => {
      const res = await onGeriAlTek(donemId, logId)
      if (res.hata) setHata(res.hata)
      else {
        setBasari('Terfi kaydı geri alındı.')
        router.refresh()
      }
    })
  }

  function handleGeriAlToplu() {
    const logIds = Object.entries(seciliGeriAl)
      .filter(([, v]) => v)
      .map(([k]) => Number(k))
      .filter((x) => Number.isFinite(x))
    if (!logIds.length) {
      setHata('Önce tarihçe listesinden geri alınacak kayıtları seçin.')
      return
    }
    if (!confirm(`${logIds.length} terfi kaydı geri alınacak. Onaylıyor musunuz?`)) return
    setHata(null)
    setBasari(null)
    startTransition(async () => {
      const res = await onGeriAlToplu(donemId, logIds)
      if (res.hata) setHata(res.hata)
      else {
        setBasari(`${res.geriAlinan ?? logIds.length} kayıt geri alındı.`)
        setSeciliGeriAl({})
        router.refresh()
      }
    })
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Terfi Ettir — Önizleme</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            {donemAdi} · Terfi tarih penceresi: {fmt(terfiBas)} — {fmt(terfiBit)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void excelIndir()}
            className="text-sm font-medium border border-slate-300 bg-white px-4 py-2 rounded-lg hover:bg-slate-50 shadow-sm">
            Excel indir
          </button>
          <button
            type="button"
            onClick={() => {
              setOgrenimModalHata(null)
              setOgrenimSeciliSicil('')
              setOgrenimModalAcik(true)
            }}
            className="text-sm font-medium border border-purple-300 bg-purple-50 text-purple-800 px-4 py-2 rounded-lg hover:bg-purple-100 shadow-sm">
            Öğrenim
          </button>
          <button
            type="button"
            onClick={terfiEttirUygula}
            disabled={isPending}
            className="text-sm font-medium text-white bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 shadow-sm">
            {isPending ? 'İşleniyor…' : 'Terfi Ettir'}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Kurallar: <code className="bg-slate-200/80 px-1 rounded">docs/TERFI_ETTIR.md</code>. Satırları seçin, gerekirse değerleri düzenleyin,{' '}
        <strong>Terfi Ettir</strong> ile kaydedin.
      </p>

      {hata && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mb-4">{hata}</p>}
      {basari && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 px-3 py-2 rounded-lg mb-4">{basari}</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[1480px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-2 py-3 w-10" title="Seç">
                <input type="checkbox" checked={tumSecili} onChange={toggleHepsi} title="Tümünü seç" />
              </th>
              <th className="px-2 py-3 w-11 font-semibold text-slate-600 text-center">Sıra</th>
              <th className="px-2 py-3 font-semibold text-slate-600 min-w-[9rem]">Sicil — Ad Soyad</th>
              <th className="px-2 py-3 font-semibold text-slate-600 min-w-[7rem]">Ünvan</th>
              <th className="px-2 py-3 font-semibold text-slate-600 whitespace-nowrap">Kadro derecesi</th>
              <th className="px-2 py-3 font-semibold text-slate-600 min-w-[8rem]">Terfi tarihleri</th>
              <th className="px-2 py-3 font-semibold text-slate-600 whitespace-nowrap">Kıdem yılı</th>
              <th className="px-2 py-3 font-semibold text-slate-600">KHA D/K</th>
              <th className="px-2 py-3 font-semibold text-slate-600">EKEA D/K</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Ek Gösterge</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Ek Ödeme</th>
              <th className="px-2 py-3 font-semibold text-slate-600">ÖHT</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Yan Ödeme</th>
              <th className="px-2 py-3 font-semibold text-slate-600">SDS</th>
              <th className="px-2 py-3 font-semibold text-slate-600">Durum / Uyarı</th>
              <th className="px-2 py-3 font-semibold text-slate-600 text-center">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 && (
              <tr>
                <td colSpan={15} className="px-4 py-12 text-center text-slate-400">
                  Bu dönem penceresinde terfi tarihi (KHA/EKEA) bulunan memur yok.
                </td>
              </tr>
            )}
            {satirlar.map((r, idx) => (
              <tr key={r.sicil_no} className="hover:bg-slate-50/80">
                <td className="px-2 py-2 align-top">
                  <input
                    type="checkbox"
                    checked={!!secili[r.sicil_no]}
                    onChange={() => toggleOne(r.sicil_no)}
                    disabled={r.terfi_id == null}
                  />
                </td>
                <td className="px-2 py-2 align-top text-center text-slate-600 tabular-nums">{idx + 1}</td>
                <td className="px-2 py-2 align-top">
                  <span className="font-mono text-xs text-slate-500">{r.sicil_no}</span>
                  <br />
                  <span className="font-medium text-slate-800">{r.ad_soyad}</span>
                  {r.ogrenim_turu || r.yeni_ogrenim_turu ? (
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      Öğrenim: {r.ogrenim_turu ?? '—'}
                      {r.yeni_ogrenim_turu && r.yeni_ogrenim_turu !== r.ogrenim_turu
                        ? ` → ${r.yeni_ogrenim_turu}`
                        : ''}
                    </p>
                  ) : null}
                </td>
                <td className="px-2 py-2 align-top text-slate-700">{r.unvan_adi ?? '—'}</td>
                <td className="px-2 py-2 align-top text-slate-700 tabular-nums">{r.kadro_derecesi ?? '—'}</td>
                <td className="px-2 py-2 align-top text-[11px] leading-snug text-slate-700">
                  <div>
                    <span className="text-slate-400">KHA:</span> {fmtTarih(r.kha_tarihi)} → {fmtTarih(r.payload.kha_tarihi)}
                  </div>
                  <div className="mt-0.5">
                    <span className="text-slate-400">EKEA:</span> {fmtTarih(r.ekea_tarihi)} → {fmtTarih(r.payload.ekea_tarihi)}
                  </div>
                  <div className="mt-0.5">
                    <span className="text-slate-400">Kıdem:</span> {fmtTarih(r.kidem_tarihi_eski)} → {fmtTarih(r.kidem_tarihi_yeni)}
                  </div>
                  <div className="mt-0.5">
                    <span className="text-slate-400">İyi Hal:</span> {fmtTarih(r.iyi_hal_tarihi_eski)} → {fmtTarih(r.iyi_hal_tarihi_yeni)}
                  </div>
                </td>
                <td className="px-2 py-2 align-top text-slate-700 tabular-nums whitespace-nowrap">
                  {r.kidem_yili_eski} → {r.kidem_yili_yeni}
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400 mb-1 whitespace-nowrap">
                    {r.dk_kha_eski} → {r.dk_kha_yeni}
                  </div>
                  <div className="flex gap-0.5 items-center flex-wrap">
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.kha_derece ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'kha_derece', e.target.value)}
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.kha_kademe ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'kha_kademe', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400 mb-1 whitespace-nowrap">
                    {r.dk_ekea_eski} → {r.dk_ekea_yeni}
                  </div>
                  <div className="flex gap-0.5 items-center flex-wrap">
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.ekea_derece ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'ekea_derece', e.target.value)}
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      className="w-9 border border-slate-200 rounded px-1 py-0.5 text-xs"
                      value={r.payload.ekea_kademe ?? ''}
                      onChange={(e) => guncelle(r.sicil_no, 'ekea_kademe', e.target.value)}
                    />
                  </div>
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.ek_gosterge_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.ek_gosterge ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'ek_gosterge', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.ek_odeme_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.ek_odeme ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'ek_odeme', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.oht_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.oht ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'oht', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.yan_odeme_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.yan_odeme ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'yan_odeme', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="text-[11px] text-slate-400">{r.sds_eski}</div>
                  <input
                    className="w-[4.5rem] border border-slate-200 rounded px-1 py-0.5 text-xs mt-0.5"
                    value={r.payload.sds_orani ?? ''}
                    onChange={(e) => guncelle(r.sicil_no, 'sds_orani', e.target.value)}
                  />
                </td>
                <td className="px-2 py-2 align-top text-xs max-w-[10rem]">
                  {r.ogrenim_terfi ? (
                    <select
                      value={r.ogrenim_olay ?? 'hazirlik'}
                      onChange={e => ogrenimOlayDegistir(r.sicil_no, e.target.value as TerfiOgrenimOlayTipi)}
                      className={`w-full text-xs font-medium rounded-lg px-2 py-1.5 border-0 cursor-pointer ${durumHucreClass(r.durum, true)}`}
                      style={{ color: '#ffffff' }}
                    >
                      {TERFI_OGRENIM_OLAY_SECENEKLERI.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
                          {opt.kisaLabel}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${durumHucreClass(r.durum)}`}>
                      <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-current opacity-60" />
                      {r.durum}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 align-top text-center">
                  {r.ogrenim_terfi ? (
                    <button
                      type="button"
                      onClick={() => ogrenimListedenCikar(r.sicil_no)}
                      className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded hover:bg-slate-200"
                    >
                      İptal
                    </button>
                  ) : aktifLogBySicil[r.sicil_no] ? (
                    <button
                      type="button"
                      onClick={() => handleGeriAlTek(aktifLogBySicil[r.sicil_no])}
                      disabled={isPending}
                      className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded hover:bg-red-100 disabled:opacity-50"
                    >
                      Terfiyi Geri Al
                    </button>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={ogrenimModalAcik} onClose={ogrenimModalKapat} title="Öğrenim Terfi — Personel Seç" size="md">
        <p className="text-sm text-slate-600 mb-4">
          Statüsü memur olan aktif personel arasından seçim yapın. Seçilen personel terfi listesine eklenir; durum sütunundan
          öğrenim olayını belirleyebilirsiniz.
        </p>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Personel</label>
        <PersonelAramaSecim
          personeller={ogrenimAdayPersoneller}
          value={ogrenimSeciliSicil}
          onChange={setOgrenimSeciliSicil}
          placeholder="Sicil veya ad soyad ile ara…"
        />
        {ogrenimModalHata && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg mt-3">{ogrenimModalHata}</p>
        )}
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={ogrenimModalKapat}
            className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
            İptal
          </button>
          <button
            type="button"
            onClick={ogrenimListeyeEkle}
            className="text-sm font-medium text-white bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700">
            Listeye Ekle
          </button>
        </div>
      </Modal>

      <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Terfi Ettirilenler - Tarihçe</h3>
          <button
            type="button"
            onClick={handleGeriAlToplu}
            disabled={isPending}
            className="text-sm font-medium text-white bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 shadow-sm"
          >
            {isPending ? 'İşleniyor…' : 'Seçili Terfileri Geri Al'}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-2.5 text-left w-10">
                <input
                  type="checkbox"
                  checked={tumGeriAlSecili}
                  onChange={toggleGeriAlHepsi}
                  title="Tümünü seç"
                  disabled={!geriAlinabilirLoglar.length}
                />
              </th>
              <th className="px-4 py-2.5 text-left">Sicil</th>
              <th className="px-4 py-2.5 text-left">İşlem Tarihi</th>
              <th className="px-4 py-2.5 text-left">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {islemLoglari.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Bu dönem için terfi işlem geçmişi yok.
                </td>
              </tr>
            ) : (
              islemLoglari.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      disabled={l.geri_alindi}
                      checked={!!seciliGeriAl[l.id]}
                      onChange={() => setSeciliGeriAl((p) => ({ ...p, [l.id]: !p[l.id] }))}
                    />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{l.sicil_no}</td>
                  <td className="px-4 py-2.5 text-slate-700">{new Date(l.islem_tarihi).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-2.5">
                    {l.geri_alindi ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">Geri Alındı</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Aktif</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
