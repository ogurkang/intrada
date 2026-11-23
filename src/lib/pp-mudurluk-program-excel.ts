import path from 'path'
import ExcelJS from 'exceljs'
import type { PpMudSatir, PpMudurlukProgramSekme } from './pp-mudurluk-program-rapor'
import type { PpRaporSayi } from './pp-mudurluk-rapor'

const SABLON = path.join(process.cwd(), 'src/lib/pp/sablon/t6-mud-per.xlsx')
const TUTAR_FORMAT = '#.##0,00'
const CIZGI = { style: 'thin' as const, color: { argb: 'FF000000' } }

function kenarlik(ws: ExcelJS.Worksheet, r: number) {
  for (let c = 1; c <= 10; c++) {
    ws.getCell(r, c).border = { top: CIZGI, left: CIZGI, bottom: CIZGI, right: CIZGI }
  }
}

function yazi(h: ExcelJS.Cell, v: string | number | null) {
  h.value = v == null || v === '' ? null : v
}

function tutarYaz(h: ExcelJS.Cell, v: PpRaporSayi) {
  if (v == null) {
    h.value = null
    return
  }
  h.value = v
  h.numFmt = TUTAR_FORMAT
}

function stilOrta(h: ExcelJS.Cell, wrap = false) {
  h.font = { name: 'Calibri', size: 11 }
  h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: wrap }
}

function stilSol(h: ExcelJS.Cell, wrap = true) {
  h.font = { name: 'Calibri', size: 11 }
  h.alignment = { horizontal: 'left', vertical: 'middle', wrapText: wrap }
}

function satirYaz(ws: ExcelJS.Worksheet, r: number, s: PpMudSatir) {
  const row = ws.getRow(r)
  if (s.tur === 'amac_baslik' || s.tur === 'amac_metin') {
    ws.mergeCells(r, 1, r, 10)
    const h = ws.getCell(r, 1)
    yazi(h, s.aciklama || s.etiket)
    stilOrta(h, s.tur === 'amac_metin')
    kenarlik(ws, r)
    row.height = s.tur === 'amac_metin' ? 30 : 20
    return
  }

  if (s.tur === 'kolon_baslik') {
    yazi(ws.getCell(r, 1), 'Türü')
    for (let c = 2; c <= 8; c++) yazi(ws.getCell(r, c), 'Kodu')
    ws.mergeCells(r, 2, r, 8)
    yazi(ws.getCell(r, 9), 'Açıklama')
    yazi(ws.getCell(r, 10), 'Tutar')
    for (let c = 1; c <= 10; c++) stilOrta(ws.getCell(r, c), true)
    kenarlik(ws, r)
    row.height = 28
    return
  }

  if (s.tur === 'mudurluk') {
    yazi(ws.getCell(r, 1), 'Müdürlük')
    stilSol(ws.getCell(r, 1), false)
    ws.mergeCells(r, 2, r, 9)
    const h = ws.getCell(r, 2)
    yazi(h, s.aciklama)
    stilOrta(h)
    stilOrta(ws.getCell(r, 10))
    kenarlik(ws, r)
    row.height = 28
    return
  }

  if (s.tur === 'gosterge' || s.tur === 'butce') {
    // Çift satır birleştirmesi çağıran tarafta yapılır; burada tek satır içeriği.
    yazi(ws.getCell(r, 1), 'Gösterge')
    for (let c = 2; c <= 7; c++) yazi(ws.getCell(r, c), 'Gösterge')
    yazi(ws.getCell(r, 8), s.kod ?? '')
    yazi(ws.getCell(r, 9), s.aciklama)
    if (s.tur === 'butce') tutarYaz(ws.getCell(r, 10), s.tutar ?? null)
    else yazi(ws.getCell(r, 10), null)
    stilSol(ws.getCell(r, 1), false)
    for (let c = 2; c <= 7; c++) stilSol(ws.getCell(r, c), false)
    stilOrta(ws.getCell(r, 8))
    stilSol(ws.getCell(r, 9), true)
    stilOrta(ws.getCell(r, 10))
    kenarlik(ws, r)
    row.height = s.tur === 'gosterge' ? 22 : 18
    return
  }

  yazi(ws.getCell(r, 1), s.etiket)
  stilSol(ws.getCell(r, 1), false)
  for (let c = 2; c <= 8; c++) {
    const h = ws.getCell(r, c)
    if (s.kodCol === c) {
      yazi(h, s.kod ?? '')
      stilOrta(h)
    } else {
      yazi(h, null)
      stilOrta(h)
    }
  }
  yazi(ws.getCell(r, 9), s.aciklama)
  stilSol(ws.getCell(r, 9), true)
  stilOrta(ws.getCell(r, 10))
  kenarlik(ws, r)
  row.height = 28
}

export async function ppMudurlukProgramExcelOlustur(
  sekme: PpMudurlukProgramSekme,
  yil: number,
): Promise<Uint8Array> {
  const sablon = new ExcelJS.Workbook()
  await sablon.xlsx.readFile(SABLON)
  const kaynak = sablon.worksheets[0]
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Müdürlük PP', {
    properties: { ...kaynak.properties },
    pageSetup: { ...kaynak.pageSetup },
    views: kaynak.views?.map(v => ({ ...v })) ?? [],
  })
  for (let c = 1; c <= 10; c++) {
    const w = kaynak.getColumn(c).width
    if (w != null) ws.getColumn(c).width = w
  }

  let r = 1
  const satirlar = sekme.satirlar
  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i]
    if (s.tur === 'gosterge' && satirlar[i + 1]?.tur === 'butce') {
      const r1 = r
      satirYaz(ws, r1, s)
      r += 1
      const r2 = r
      satirYaz(ws, r2, satirlar[i + 1])
      try {
        ws.mergeCells(r1, 1, r2, 7)
      } catch {
        /* zaten birleşik */
      }
      r += 1
      i += 1
      continue
    }
    satirYaz(ws, r, s)
    r += 1
  }

  const son = Math.max(r - 1, 1)
  ws.pageSetup.printArea = `A1:J${son}`
  void yil

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}
