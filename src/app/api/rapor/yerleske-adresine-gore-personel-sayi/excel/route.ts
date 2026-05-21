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
import { hazirlaStatuSirali } from '@/lib/statu-liste-siralama'
import { fetchMudurlukYerleskeTanimSatirlari } from '@/lib/yerleske-adresi'
import { yerleskePersonelSayiSnapshot } from '@/lib/rapor-yerleske-adresine-gore-personel-sayi'

const AYLAR_TR = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]
const MIN_YIL = 2000
const MAX_YIL = 2035

/** Veri tablosu: A–F (Sıra No … Toplam) */
const COL_LAST = 5

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

function mergeAt(
  merges: XLSX.Range[] | undefined,
  r: number,
  c: number,
): XLSX.Range | null {
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
    const D = periyotSonGunu(yil, periyot)
    const label = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]

    const [
      { data: tanimStatuRaw },
      { data: kadroRaw },
      { data: calisanRaw },
      { data: firmaRaw },
      { data: phAyrRaw },
      { data: phIseRaw },
      tanimSatirlar,
    ] = await Promise.all([
      supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
      supabase
        .from('kadro_hareketleri')
        .select(
          'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, gorev_mudurlugu, kadro_mudurlugu, gorev_unvani',
        )
        .not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, yerleske_adresi_id'),
      supabase
        .from('firma_calisanlar')
        .select('id, ad_soyad, cinsiyet, kuruma_giris_tarihi, ayrilis_tarihi, gorev_mudurlugu, yerleske_adresi_id'),
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
      fetchMudurlukYerleskeTanimSatirlari(supabase),
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

    const { etiketler } = hazirlaStatuSirali(tanimStatuRaw ?? [])
    const kadro = (kadroRaw ?? []) as KadroRaporRow[]
    const firma = (firmaRaw ?? []) as FirmaRaporRow[]
    const calisanBySicil = new Map<string, CalisanRaporRow>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet })
    }
    const calisanYerleske = (calisanRaw ?? []).map(c => ({
      sicil_no: c.sicil_no,
      yerleske_adresi_id: (c as { yerleske_adresi_id?: number | null }).yerleske_adresi_id ?? null,
    }))

    const snap = yerleskePersonelSayiSnapshot({ D, tanimSatirlar, kadro, firma, calisanYerleske, etiketler })
    const { gelenler, ayrilanlar } = gelenlerAyrilanlar({
      periyot,
      yil,
      kadro,
      calisanBySicil,
      firma,
      personelHareketleri,
    })

    let toplamAdabel = 0
    let toplamBelediye = 0
    let toplamGenel = 0
    for (const s of snap.satirlar) {
      toplamAdabel += s.adabel
      toplamBelediye += s.belediye
      toplamGenel += s.toplam
    }

    const rows: (string | number)[][] = [
      padRow(COL_LAST + 1, ['Yerleşke Adresine Göre Personel Sayısı']),
      padRow(COL_LAST + 1, [`Yıl: ${yil} · Sekme: ${label}`]),
      padRow(COL_LAST + 1, [`Anlık görüntü tarihi: ${sonGunuMetin(D)}`]),
      padRow(COL_LAST + 1, ["ADABEL'de çalışanlar hariç"]),
      padRow(COL_LAST + 1, ['']),
      padRow(COL_LAST + 1, [
        'Sıra No',
        'Müdürlük Adı',
        'Yerleşke Adı',
        'ADABEL Personel Sayısı',
        'Belediye Personel Sayısı',
        'Toplam',
      ]),
      ...snap.satirlar.map((s, i) =>
        padRow(COL_LAST + 1, [i + 1, s.mudurlukAdi, s.yerleskeAdi, s.adabel, s.belediye, s.toplam]),
      ),
      padRow(COL_LAST + 1, ['Toplam', '', '', toplamAdabel, toplamBelediye, toplamGenel]),
      padRow(COL_LAST + 1, ['']),
    ]

    const noteRow = 3
    const headerRow = 5
    const totalRow = headerRow + 1 + snap.satirlar.length
    const nameBlockRows = new Set<number>()
    const nameListRows = new Set<number>()
    const tallRows = new Set<number>()
    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COL_LAST } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: COL_LAST } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: COL_LAST } },
      { s: { r: noteRow, c: 0 }, e: { r: noteRow, c: COL_LAST } },
      { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 2 } },
    ]

    const gelenlerTitleRow = rows.length
    rows.push(padRow(COL_LAST + 1, ['Gelenler']))
    const gelenlerContentRow = rows.length
    rows.push(padRow(COL_LAST + 1, [gelenler.length ? gelenler.join(', ') : '—']))
    rows.push(padRow(COL_LAST + 1, ['']))
    const ayrilanlarTitleRow = rows.length
    rows.push(padRow(COL_LAST + 1, ['Ayrılanlar']))
    const ayrilanlarContentRow = rows.length
    rows.push(padRow(COL_LAST + 1, [ayrilanlar.length ? ayrilanlar.join(', ') : '—']))

    merges.push({ s: { r: gelenlerTitleRow, c: 0 }, e: { r: gelenlerTitleRow, c: COL_LAST } })
    merges.push({ s: { r: gelenlerContentRow, c: 0 }, e: { r: gelenlerContentRow, c: COL_LAST } })
    merges.push({ s: { r: ayrilanlarTitleRow, c: 0 }, e: { r: ayrilanlarTitleRow, c: COL_LAST } })
    merges.push({ s: { r: ayrilanlarContentRow, c: 0 }, e: { r: ayrilanlarContentRow, c: COL_LAST } })
    nameBlockRows.add(gelenlerTitleRow)
    nameBlockRows.add(gelenlerContentRow)
    nameBlockRows.add(ayrilanlarTitleRow)
    nameBlockRows.add(ayrilanlarContentRow)
    nameListRows.add(gelenlerContentRow)
    nameListRows.add(ayrilanlarContentRow)
    tallRows.add(gelenlerContentRow)
    tallRows.add(ayrilanlarContentRow)

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = merges
    ws['!cols'] = [
      { wch: 8 },
      { wch: 28 },
      { wch: 24 },
      { wch: 22 },
      { wch: 24 },
      { wch: 10 },
    ]
    ws['!rows'] = []
    for (const r of tallRows) ws['!rows'][r] = { hpt: 150 }

    const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')

    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cell = ws[addr] as any
        const isTitle = r <= 2
        const isNote = r === noteRow
        const isHead = r === headerRow
        const isTotal = r === totalRow
        const inNameBlock = nameBlockRows.has(r)
        const numCols = c >= 3 && c <= 5

        let horizontal: 'left' | 'center' | 'right' = 'center'
        if (isTitle || isNote) horizontal = 'center'
        else if (isHead && (c === 1 || c === 2)) horizontal = 'left'
        else if (isTotal && c === 0) horizontal = 'left'
        else if (!isHead && (c === 1 || c === 2) && r >= headerRow && r <= totalRow) horizontal = 'left'
        else if (inNameBlock) horizontal = 'left'
        else if (numCols && r >= headerRow && r <= totalRow) horizontal = 'center'
        else if (c === 0 && r > headerRow && r < totalRow) horizontal = 'center'

        const vertical: 'top' | 'center' = nameListRows.has(r) ? 'top' : 'center'
        const useBorder = cellGetsBorder(ws, ws['!merges'], r, c)

        cell.s = {
          font: {
            name: 'Calibri',
            sz: 11,
            bold: isTitle || isNote || isHead || isTotal || (inNameBlock && !nameListRows.has(r)),
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
    XLSX.utils.book_append_sheet(wb, ws, 'Yerleske Personel')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Yerleske_Adresine_Gore_Personel_Sayisi_${yil}_${label}.xlsx`
    const encodedFilename = encodeURIComponent(filename)

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Yerleske_Personel_Sayisi.xlsx"; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (err) {
    console.error('YERLESKE_PERSONEL_SAYI_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel oluşturulamadı.' }, { status: 500 })
  }
}
