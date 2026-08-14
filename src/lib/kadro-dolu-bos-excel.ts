import type { Tables } from '@/types/database'

type Kadro = Tables<'kadro_hareketleri'>
export type KadroDbUnvan = {
  id: number
  unvan_adi: string
  unvan_kodu: string | null
  sinif_adi: string | null
}

type HucreDegeri = string | number
type Satir = HucreDegeri[]
type Kenarlik = { style: 'thin' | 'medium'; color: { rgb: string } }

type Ozet = {
  kod: string
  sinif: string
  unvan: string
  dolu: number
  bos: number
  derece: Record<number, { dolu: number; bos: number }>
}

const INCE: Kenarlik = { style: 'thin', color: { rgb: '000000' } }
const KALIN: Kenarlik = { style: 'medium', color: { rgb: '000000' } }
const FONT = 'Arial'

function temiz(v: unknown): string {
  return String(v ?? '').trim()
}

function aktifKadro(k: Kadro): boolean {
  return !(k.iptal_karar_tarihi || k.iptal_karar_no || k.durumu === 'İptal')
}

/** Vekâlet kadroyu hukuken doldurmaz; asaleten atama/Dolu kayıt dolu sayılır. */
function doluKadro(k: Kadro): boolean {
  return Boolean(temiz(k.asil)) || k.durumu === 'Dolu'
}

function statuEsit(k: Kadro, statu: 'Memur' | 'İşçi'): boolean {
  return temiz(k.statu).toLocaleLowerCase('tr-TR') === statu.toLocaleLowerCase('tr-TR')
}

function ozetle(kadrolar: Kadro[], unvanlar: KadroDbUnvan[], statu: 'Memur' | 'İşçi'): Ozet[] {
  const byId = new Map(unvanlar.map(u => [u.id, u]))
  const byAd = new Map(
    unvanlar.map(u => [temiz(u.unvan_adi).toLocaleLowerCase('tr-TR'), u]),
  )
  const map = new Map<string, Ozet>()

  for (const k of kadrolar) {
    if (!aktifKadro(k) || !statuEsit(k, statu)) continue
    const unvan =
      (k.kadro_unvan_id != null ? byId.get(k.kadro_unvan_id) : undefined) ??
      byAd.get(temiz(k.kadro_unvani).toLocaleLowerCase('tr-TR'))
    const unvanAdi = temiz(unvan?.unvan_adi || k.kadro_unvani) || 'Tanımsız Unvan'
    const kod = temiz(unvan?.unvan_kodu)
    const sinif = temiz(unvan?.sinif_adi)
    const key = `${kod}\u0000${sinif}\u0000${unvanAdi}`
    let row = map.get(key)
    if (!row) {
      row = { kod, sinif, unvan: unvanAdi, dolu: 0, bos: 0, derece: {} }
      map.set(key, row)
    }

    const dolu = doluKadro(k)
    if (dolu) row.dolu += 1
    else row.bos += 1

    const derece = Number.parseInt(temiz(k.kadro_derecesi), 10)
    if (Number.isFinite(derece) && derece >= 1 && derece <= 15) {
      if (!row.derece[derece]) row.derece[derece] = { dolu: 0, bos: 0 }
      if (dolu) row.derece[derece].dolu += 1
      else row.derece[derece].bos += 1
    }
  }

  return [...map.values()].sort((a, b) => {
    const kod = a.kod.localeCompare(b.kod, 'tr', { numeric: true })
    return kod || a.unvan.localeCompare(b.unvan, 'tr')
  })
}

function styleRange(
  XLSX: typeof import('xlsx-js-style'),
  ws: ReturnType<typeof XLSX.utils.aoa_to_sheet>,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  opts?: { bold?: boolean; fill?: string; center?: boolean; size?: number; border?: Kenarlik },
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) ws[addr] = { t: 's', v: '' }
      // xlsx-js-style hücre stili SheetJS temel tipinde tanımlı değildir.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell = ws[addr] as any
      const border = opts?.border ?? INCE
      cell.s = {
        font: { name: FONT, sz: opts?.size ?? 8, bold: opts?.bold ?? false, color: { rgb: '000000' } },
        alignment: {
          horizontal: opts?.center ? 'center' : 'left',
          vertical: 'center',
          wrapText: true,
        },
        border: { top: border, bottom: border, left: border, right: border },
      }
      if (opts?.fill) {
        cell.s.fill = { patternType: 'solid', fgColor: { rgb: opts.fill } }
      }
    }
  }
}

function ortakUstBilgi(): Satir[] {
  return [
    [],
    ['İLİ', ':', 'SAKARYA'],
    ['İLÇESİ', ':', 'ADAPAZARI'],
    ['KURUMU', ':', 'ADAPAZARI BELEDİYESİ'],
    [],
  ]
}

export async function memurDbExcelIndir(kadrolar: Kadro[], unvanlar: KadroDbUnvan[]) {
  const XLSX = await import('xlsx-js-style')
  const ozet = ozetle(kadrolar, unvanlar, 'Memur')
  const COLS = 36
  const rows: Satir[] = [
    ['(IV) SAYILI CETVEL: DOLU-BOŞ KADRO DURUMU (MEMUR)'],
    ...ortakUstBilgi(),
    ['MEMUR KADRO CETVELİ'],
    ['MEVCUT MEMUR KADROSUNUN'],
    ['UNVAN\nKODU', 'SINIFI', 'UNVANI', 'DERECESİ'],
    ['', '', ''],
    ['', '', ''],
  ]

  for (const item of ozet) {
    const row: Satir = [item.kod, item.sinif, item.unvan]
    for (let derece = 1; derece <= 15; derece++) {
      row.push(item.derece[derece]?.dolu ?? 0, item.derece[derece]?.bos ?? 0)
    }
    row.push(item.dolu, item.bos, item.dolu + item.bos)
    rows.push(row)
  }

  const toplam: Satir = ['KURUM TOPLAMI\n(Tüm Memur Unvanları)', '', '']
  for (let derece = 1; derece <= 15; derece++) {
    toplam.push(
      ozet.reduce((n, x) => n + (x.derece[derece]?.dolu ?? 0), 0),
      ozet.reduce((n, x) => n + (x.derece[derece]?.bos ?? 0), 0),
    )
  }
  const tumDolu = ozet.reduce((n, x) => n + x.dolu, 0)
  const tumBos = ozet.reduce((n, x) => n + x.bos, 0)
  toplam.push(tumDolu, tumBos, tumDolu + tumBos)
  rows.push(toplam, [], ['D: Dolu kadro sayısı'], ['B: Boş kadro sayısı'], ['T: Toplam kadro sayısı'])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const dataStart = 11
  const totalRow = dataStart + ozet.length
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: COLS - 1 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: COLS - 1 } },
    { s: { r: 8, c: 0 }, e: { r: 10, c: 0 } },
    { s: { r: 8, c: 1 }, e: { r: 10, c: 1 } },
    { s: { r: 8, c: 2 }, e: { r: 10, c: 2 } },
    { s: { r: 8, c: 3 }, e: { r: 8, c: 32 } },
    { s: { r: 8, c: 33 }, e: { r: 9, c: 35 } },
    { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 2 } },
    { s: { r: 2, c: 22 }, e: { r: 4, c: 27 } },
    { s: { r: 2, c: 28 }, e: { r: 2, c: 35 } },
    { s: { r: 3, c: 28 }, e: { r: 3, c: 30 } },
    { s: { r: 3, c: 31 }, e: { r: 3, c: 33 } },
    { s: { r: 3, c: 34 }, e: { r: 3, c: 35 } },
    { s: { r: 4, c: 28 }, e: { r: 4, c: 30 } },
    { s: { r: 4, c: 31 }, e: { r: 4, c: 33 } },
    { s: { r: 4, c: 34 }, e: { r: 4, c: 35 } },
  ]
  for (let derece = 1; derece <= 15; derece++) {
    const c = 3 + (derece - 1) * 2
    ws['!merges'].push({ s: { r: 9, c }, e: { r: 9, c: c + 1 } })
    ws[XLSX.utils.encode_cell({ r: 9, c })] = { t: 'n', v: derece }
    ws[XLSX.utils.encode_cell({ r: 10, c })] = { t: 's', v: 'D' }
    ws[XLSX.utils.encode_cell({ r: 10, c: c + 1 })] = { t: 's', v: 'B' }
  }
  ws['AH9'] = { t: 's', v: 'UNVAN TOPLAMI' }
  ws['AH11'] = { t: 's', v: 'D' }
  ws['AI11'] = { t: 's', v: 'B' }
  ws['AJ11'] = { t: 's', v: 'T' }
  ws['W3'] = { t: 's', v: 'NORM KADRO\nSTANDARDI TOPLAMI' }
  ws['AC3'] = { t: 's', v: 'MEVCUT KADRO' }
  ws['AC4'] = { t: 's', v: 'DOLU' }
  ws['AF4'] = { t: 's', v: 'BOŞ' }
  ws['AI4'] = { t: 's', v: 'TOPLAM' }
  ws['AC5'] = { t: 'n', v: tumDolu }
  ws['AF5'] = { t: 'n', v: tumBos }
  ws['AI5'] = { t: 'n', v: tumDolu + tumBos }

  styleRange(XLSX, ws, 0, 0, 0, 35, { bold: true, center: true, size: 11, border: KALIN })
  styleRange(XLSX, ws, 2, 4, 22, 35, { bold: true, center: true, fill: 'E7E6E6', border: KALIN })
  styleRange(XLSX, ws, 6, 10, 0, 35, { bold: true, center: true, fill: 'E7E6E6' })
  if (ozet.length) styleRange(XLSX, ws, dataStart, totalRow - 1, 0, 35, { center: true })
  styleRange(XLSX, ws, totalRow, totalRow, 0, 35, { bold: true, center: true, fill: 'E7E6E6', border: KALIN })
  styleRange(XLSX, ws, 1, 4, 0, 2, { bold: true, size: 8, border: KALIN })

  ws['!cols'] = [
    { wch: 9 }, { wch: 8 }, { wch: 24 },
    ...Array.from({ length: 30 }, () => ({ wch: 3 })),
    { wch: 5 }, { wch: 5 }, { wch: 5 },
  ]
  ws['!rows'] = rows.map((_, i) => ({ hpt: i === 0 ? 28 : i >= 8 && i <= 10 ? 24 : 20 }))
  ws['!pageSetup'] = {
    orientation: 'landscape',
    paperSize: 8,
    fitToWidth: 1,
    fitToHeight: 1,
  }
  ws['!margins'] = { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 }
  ws['!printArea'] = `A1:AJ${rows.length}`

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Memur Dolu-Boş')
  XLSX.writeFile(wb, `memur-dolu-bos-kadro-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function isciDbExcelIndir(kadrolar: Kadro[], unvanlar: KadroDbUnvan[]) {
  const XLSX = await import('xlsx-js-style')
  const ozet = ozetle(kadrolar, unvanlar, 'İşçi')
  const tumDolu = ozet.reduce((n, x) => n + x.dolu, 0)
  const tumBos = ozet.reduce((n, x) => n + x.bos, 0)
  const rows: Satir[] = [
    ['(VII) SAYILI CETVEL: SÜREKLİ İŞÇİ DOLU-BOŞ KADRO DURUMU'],
    [],
    ['SÜREKLİ İŞÇİ\nNORM KADRO\nSTANDARDI TOPLAMI', '', '', 'MEVCUT SÜREKLİ İŞÇİ KADROLARI'],
    ['', '', '', 'DOLU', 'BOŞ', 'TOPLAM'],
    ['', '', '', tumDolu, tumBos, tumDolu + tumBos],
    [],
    ['SÜREKLİ İŞÇİ KADRO CETVELİ'],
    ['MEVCUT SÜREKLİ İŞÇİ KADROSUNUN'],
    ['UNVAN\nKODU', 'UNVANI', 'ADEDİ'],
    ['', '', 'DOLU', 'BOŞ', 'TOPLAM'],
  ]
  for (const item of ozet) {
    rows.push([item.kod, item.unvan, item.dolu, item.bos, item.dolu + item.bos])
  }
  const totalRow = rows.length
  rows.push(
    ['KURUM TOPLAMI\n(Tüm İşçi Unvanları)', '', tumDolu, tumBos, tumDolu + tumBos],
    [],
    ['', '', 'ONAY', '', 'TARİH'],
  )

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 2, c: 3 }, e: { r: 2, c: 4 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 4 } },
    { s: { r: 8, c: 0 }, e: { r: 9, c: 0 } },
    { s: { r: 8, c: 1 }, e: { r: 9, c: 1 } },
    { s: { r: 8, c: 2 }, e: { r: 8, c: 4 } },
    { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 1 } },
  ]
  styleRange(XLSX, ws, 0, 0, 0, 4, { bold: true, center: true, size: 11, border: KALIN })
  styleRange(XLSX, ws, 2, 4, 0, 4, { bold: true, center: true, fill: 'E7E6E6', border: KALIN })
  styleRange(XLSX, ws, 6, 9, 0, 4, { bold: true, center: true, fill: 'E7E6E6', border: KALIN })
  if (ozet.length) styleRange(XLSX, ws, 10, totalRow - 1, 0, 4, { center: true })
  styleRange(XLSX, ws, totalRow, totalRow, 0, 4, { bold: true, center: true, fill: 'E7E6E6', border: KALIN })

  ws['!cols'] = [{ wch: 13 }, { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
  ws['!rows'] = rows.map((_, i) => ({ hpt: i === 0 ? 28 : i >= 10 && i < totalRow ? 24 : 22 }))
  ws['!pageSetup'] = {
    orientation: 'portrait',
    paperSize: 9,
    fitToWidth: 1,
    fitToHeight: 1,
  }
  ws['!margins'] = { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 }
  ws['!printArea'] = `A1:E${rows.length}`

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'İşçi Dolu-Boş')
  XLSX.writeFile(wb, `isci-dolu-bos-kadro-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
