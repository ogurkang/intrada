import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  gelenlerAyrilanlar,
  periyotSonGunu,
  type CalisanRaporRow,
  type FirmaRaporRow,
  type KadroRaporRow,
  type PersonelHareketRaporRow,
  type RaporPeriyot,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { meslekSahibiListeSnapshot, type MeslekSahibiListeSatir } from '@/lib/rapor-meslek-sahibi-liste'
import type { CalisanOgrenimRaporSatir } from '@/lib/rapor-statuye-gore-ogrenim-meslek'

const AYLAR_TR = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik']
const MIN_YIL = 2000
const MAX_YIL = 2035

function parseYil(v: string | null): number {
  const parsed = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(parsed)) return new Date().getFullYear()
  return Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
}

function parsePeriyot(v: string | null): RaporPeriyot {
  if (v === 'yillik') return 'yillik'
  const n = Number.parseInt(v ?? '', 10)
  if (Number.isFinite(n) && n >= 1 && n <= 12) return n as RaporPeriyot
  return 'yillik'
}

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function padRow(cols: number, cells: (string | number)[]): (string | number)[] {
  const r = [...cells]
  while (r.length < cols) r.push('')
  return r
}

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  left: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  right: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasCellData(cell: any): boolean {
  if (!cell) return false
  const v = cell.v
  if (v === null || v === undefined) return false
  if (typeof v === 'string' && v.trim() === '') return false
  return true
}

function mergeAt(merges: XLSX.Range[] | undefined, r: number, c: number): XLSX.Range | null {
  if (!merges) return null
  for (const m of merges) {
    if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) return m
  }
  return null
}

function cellGetsBorder(
  ws: XLSX.WorkSheet,
  merges: XLSX.Range[] | undefined,
  r: number,
  c: number,
): boolean {
  const m = mergeAt(merges, r, c)
  if (m) {
    const a = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })
    return hasCellData(ws[a])
  }
  return hasCellData(ws[XLSX.utils.encode_cell({ r, c })])
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const periyot = parsePeriyot(searchParams.get('p'))
    const meslekFilter = String(searchParams.get('m') ?? '').trim()
    const ids = String(searchParams.get('ids') ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    const [
      { data: kadroRaw },
      { data: calisanRaw },
      { data: firmaRaw },
      { data: calisanOgrenimRaw },
      { data: phAyrRaw },
      { data: phIseRaw },
    ] = await Promise.all([
      supabase
        .from('kadro_hareketleri')
        .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
        .not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet'),
      supabase
        .from('firma_calisanlar')
        .select('id, ad_soyad, sicil_no, cinsiyet, kuruma_giris_tarihi, ayrilis_tarihi, ogrenim, meslegi'),
      supabase
        .from('calisan_ogrenim')
        .select('sicil_no, ogrenim_turu, varsayilan, aktif, meslegi'),
      supabase
        .from('personel_hareketleri')
        .select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi')
        .not('ayrilis_tarihi', 'is', null)
        .gte('ayrilis_tarihi', `${yil}-01-01`)
        .lte('ayrilis_tarihi', `${yil}-12-31`),
      supabase
        .from('personel_hareketleri')
        .select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi')
        .not('ise_baslama_tarihi', 'is', null)
        .gte('ise_baslama_tarihi', `${yil}-01-01`)
        .lte('ise_baslama_tarihi', `${yil}-12-31`),
    ])

    const phSeen = new Set<string>()
    const personelHareketleri: PersonelHareketRaporRow[] = []
    for (const r of [...(phAyrRaw ?? []), ...(phIseRaw ?? [])]) {
      const key = `${r.sicil_no}|${String(r.ayrilis_tarihi ?? '')}|${String(r.ise_baslama_tarihi ?? '')}`
      if (phSeen.has(key)) continue
      phSeen.add(key)
      personelHareketleri.push({
        sicil_no: r.sicil_no,
        ayrilis_tarihi: r.ayrilis_tarihi,
        ise_baslama_tarihi: r.ise_baslama_tarihi,
      })
    }

    const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
    const firma: FirmaRaporRow[] = (firmaRaw ?? []) as FirmaRaporRow[]

    const calisanBySicil = new Map<string, CalisanRaporRow>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, {
        sicil_no: c.sicil_no,
        ad_soyad: c.ad_soyad,
        cinsiyet: c.cinsiyet,
      })
    }

    const ogrenimBySicil = new Map<string, CalisanOgrenimRaporSatir[]>()
    for (const r of calisanOgrenimRaw ?? []) {
      const list = ogrenimBySicil.get(r.sicil_no) ?? []
      list.push({
        sicil_no: r.sicil_no,
        ogrenim_turu: r.ogrenim_turu,
        varsayilan: r.varsayilan,
        aktif: r.aktif,
        meslegi: r.meslegi,
      })
      ogrenimBySicil.set(r.sicil_no, list)
    }

    const D = periyotSonGunu(yil, periyot)
    let satirlar = meslekSahibiListeSnapshot({
      D,
      kadro,
      calisanBySicil,
      firma,
      ogrenimBySicil,
    })
    if (meslekFilter) {
      satirlar = satirlar.filter(r => r.meslek_adi.trim() === meslekFilter)
    }
    if (ids.length) {
      satirlar = satirlar.filter(r => ids.includes(r.sicil_no))
    }
    const { gelenler, ayrilanlar } = gelenlerAyrilanlar({
      periyot,
      yil,
      kadro,
      calisanBySicil,
      firma,
      personelHareketleri,
    })
    const label = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]

    const rows: (string | number)[][] = [
      padRow(4, ['Meslek Sahibi Personel Listesi']),
      padRow(4, [`Yıl: ${yil} · Sekme: ${label}`]),
      padRow(4, [`Anlık görüntü tarihi: ${sonGunuMetin(D)}`]),
      padRow(4, [meslekFilter ? `Meslek filtresi: ${meslekFilter}` : 'Meslek filtresi: Tümü']),
      padRow(4, ['']),
      padRow(4, ['Sıra No', 'Sicil No', 'Ad Soyad', 'Meslek Adı']),
      ...satirlar.map((s: MeslekSahibiListeSatir, i: number) => padRow(4, [i + 1, s.sicil_no, s.ad_soyad, s.meslek_adi])),
      padRow(4, ['Toplam', '', '', satirlar.length]),
      padRow(4, ['']),
      padRow(4, ['Gelenler']),
      padRow(4, [gelenler.length ? gelenler.join(', ') : '—']),
      padRow(4, ['']),
      padRow(4, ['Ayrılanlar']),
      padRow(4, [ayrilanlar.length ? ayrilanlar.join(', ') : '—']),
    ]

    const headerRow = 5
    const totalRow = headerRow + 1 + satirlar.length
    const gelenlerTitleRow = totalRow + 2
    const gelenlerContentRow = totalRow + 3
    const ayrilanlarTitleRow = totalRow + 5
    const ayrilanlarContentRow = totalRow + 6
    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
      { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 2 } },
      { s: { r: gelenlerTitleRow, c: 0 }, e: { r: gelenlerTitleRow, c: 3 } },
      { s: { r: gelenlerContentRow, c: 0 }, e: { r: gelenlerContentRow, c: 3 } },
      { s: { r: ayrilanlarTitleRow, c: 0 }, e: { r: ayrilanlarTitleRow, c: 3 } },
      { s: { r: ayrilanlarContentRow, c: 0 }, e: { r: ayrilanlarContentRow, c: 3 } },
    ]

    const nameBlockRows = new Set([gelenlerTitleRow, gelenlerContentRow, ayrilanlarTitleRow, ayrilanlarContentRow])
    const nameListRows = new Set([gelenlerContentRow, ayrilanlarContentRow])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = merges
    ws['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 30 }]
    ws['!rows'] = []
    ws['!rows'][gelenlerContentRow] = { hpt: 150 }
    ws['!rows'][ayrilanlarContentRow] = { hpt: 150 }

    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cell = ws[addr] as any
        const isTitle = r <= 3
        const isHead = r === headerRow
        const isTotal = r === totalRow
        const inNameBlock = nameBlockRows.has(r)

        let horizontal: 'left' | 'center' | 'right' = 'center'
        if (isTitle) horizontal = 'center'
        else if (isHead && c >= 1) horizontal = 'left'
        else if (c === 0 && r > headerRow && r < totalRow) horizontal = 'center'
        else if (inNameBlock) horizontal = 'left'
        else if (c >= 1) horizontal = 'left'
        else if (isTotal && c === 0) horizontal = 'left'

        const vertical: 'top' | 'center' = nameListRows.has(r) ? 'top' : 'center'
        const useBorder = cellGetsBorder(ws, ws['!merges'], r, c)
        cell.s = {
          font: {
            name: 'Calibri',
            sz: 11,
            bold: isTitle || isHead || isTotal || (inNameBlock && !nameListRows.has(r)),
          },
          alignment: {
            vertical,
            horizontal,
            wrapText: true,
          },
          ...(useBorder ? { border: THIN_BORDER } : {}),
        }
        if (isHead || isTotal) {
          cell.s.fill = { patternType: 'solid', fgColor: { rgb: isHead ? 'E5E7EB' : 'F1F5F9' } }
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Meslek Sahibi Liste')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Meslek_Sahibi_Personel_Listesi_${yil}_${label}.xlsx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Meslek_Sahibi_Personel_Listesi.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('MESLEK_LISTE_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
