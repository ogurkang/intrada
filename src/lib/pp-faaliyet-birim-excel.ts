import path from 'path'
import ExcelJS from 'exceljs'
import type { PpFaaliyetBirimRapor } from './pp-faaliyet-birim-rapor'

const SABLON = path.join(process.cwd(), 'src/lib/pp/sablon/t4-faaliyet-birim.xlsx')
const MAVI = 'FF9DC3E6'
const YESIL = 'FFC6EFCE'
const GRI = 'FFF2F2F2'
const CIZGI = { style: 'thin' as const, color: { argb: 'FF94A3B8' } }

function dolgu(hucre: ExcelJS.Cell, argb: string) {
  hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function kenarlik(ws: ExcelJS.Worksheet, r: number, cols = 5) {
  for (let c = 1; c <= cols; c++) {
    ws.getCell(r, c).border = { top: CIZGI, left: CIZGI, bottom: CIZGI, right: CIZGI }
  }
}

function baslikYaz(ws: ExcelJS.Worksheet, r: number) {
  const basliklar = [
    [1, 'PROGRAM'],
    [2, 'PERFORMANS HEDEFİ'],
    [3, 'PERFORMANS FAALİYETİ'],
    [5, 'SORUMLU BİRİMLER'],
  ] as const
  for (const [c, v] of basliklar) {
    ws.getCell(r, c).value = v
  }
  ws.getCell(r + 1, 3).value = 'Kodu'
  ws.getCell(r + 1, 4).value = 'Adı'
  ws.mergeCells(r, 1, r + 1, 1)
  ws.mergeCells(r, 2, r + 1, 2)
  ws.mergeCells(r, 3, r, 4)
  ws.mergeCells(r, 5, r + 1, 5)
  for (let rr = r; rr <= r + 1; rr++) {
    for (let c = 1; c <= 5; c++) {
      const h = ws.getCell(rr, c)
      dolgu(h, MAVI)
      h.font = { bold: true, name: 'Calibri', size: 11 }
      h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }
    kenarlik(ws, rr)
  }
}

function mergeAralik(ws: ExcelJS.Worksheet, col: number, start: number, end: number) {
  if (end > start) ws.mergeCells(start, col, end, col)
}

export async function ppFaaliyetBirimExcelOlustur(rapor: PpFaaliyetBirimRapor): Promise<Uint8Array> {
  const sablon = new ExcelJS.Workbook()
  await sablon.xlsx.readFile(SABLON)
  const kaynak = sablon.worksheets[0]
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Faaliyet Birimleri', {
    properties: { ...kaynak.properties },
    pageSetup: { ...kaynak.pageSetup },
    views: kaynak.views?.map(v => ({ ...v })) ?? [],
  })
  for (let c = 1; c <= 5; c++) {
    const w = kaynak.getColumn(c).width
    if (w != null) ws.getColumn(c).width = w
  }

  let satir = 1
  rapor.bloklar.forEach((blok, bi) => {
    if (bi > 0) satir += 1 // programlar arası boş satır
    baslikYaz(ws, satir)
    satir += 2
    const dataBas = satir
    for (const s of blok.satirlar) {
      ws.getCell(satir, 1).value = s.programAdi
      ws.getCell(satir, 2).value = s.hedefKodu
        ? `${s.hedefKodu} ${s.hedefAdi}`.trim()
        : s.hedefAdi
      ws.getCell(satir, 3).value = s.faaliyetKodu
      ws.getCell(satir, 4).value = s.faaliyetAdi
      ws.getCell(satir, 5).value = s.sorumluBirim || null
      for (let c = 1; c <= 5; c++) {
        const h = ws.getCell(satir, c)
        const zemin = c === 3 || c === 4 ? GRI : YESIL
        dolgu(h, zemin)
        h.font = { bold: c === 1 || c === 2 || c === 5, name: 'Calibri', size: 10 }
        h.alignment = {
          horizontal: c === 3 ? 'center' : 'left',
          vertical: 'middle',
          wrapText: true,
        }
      }
      kenarlik(ws, satir)
      satir += 1
    }
    const dataSon = satir - 1
    if (dataSon >= dataBas) {
      mergeAralik(ws, 1, dataBas, dataSon)
      // Aynı hedef satırlarını birleştir
      let i = dataBas
      while (i <= dataSon) {
        const hedef = String(ws.getCell(i, 2).value ?? '')
        let j = i
        while (j + 1 <= dataSon && String(ws.getCell(j + 1, 2).value ?? '') === hedef) j += 1
        mergeAralik(ws, 2, i, j)
        const mud = String(ws.getCell(i, 5).value ?? '')
        let k = i
        while (
          k + 1 <= j &&
          String(ws.getCell(k + 1, 5).value ?? '') === mud
        ) k += 1
        mergeAralik(ws, 5, i, k)
        i = j + 1
      }
    }
  })

  if (satir === 1) {
    baslikYaz(ws, 1)
    satir = 3
  }

  ws.pageSetup.printArea = `A1:E${Math.max(satir - 1, 2)}`
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}
