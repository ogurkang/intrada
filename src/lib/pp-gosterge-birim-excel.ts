import path from 'path'
import ExcelJS from 'exceljs'
import type { PpGostergeBirimRapor } from './pp-gosterge-birim-rapor'

const SABLON = path.join(process.cwd(), 'src/lib/pp/sablon/t5-gosterge-birim.xlsx')
const MAVI = 'FF9DC3E6'
const YESIL = 'FFC6EFCE'
const GRI = 'FFF2F2F2'
const CIZGI = { style: 'thin' as const, color: { argb: 'FF94A3B8' } }

function dolgu(hucre: ExcelJS.Cell, argb: string) {
  hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function kenarlik(ws: ExcelJS.Worksheet, r: number) {
  for (let c = 1; c <= 5; c++) {
    ws.getCell(r, c).border = { top: CIZGI, left: CIZGI, bottom: CIZGI, right: CIZGI }
  }
}

function mergeAralik(ws: ExcelJS.Worksheet, col: number, start: number, end: number) {
  if (end > start) ws.mergeCells(start, col, end, col)
}

export async function ppGostergeBirimExcelOlustur(rapor: PpGostergeBirimRapor): Promise<Uint8Array> {
  const sablon = new ExcelJS.Workbook()
  await sablon.xlsx.readFile(SABLON)
  const kaynak = sablon.worksheets[0]
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Gösterge Birimleri', {
    properties: { ...kaynak.properties },
    pageSetup: { ...kaynak.pageSetup },
    views: kaynak.views?.map(v => ({ ...v })) ?? [],
  })
  for (let c = 1; c <= 5; c++) {
    const w = kaynak.getColumn(c).width
    if (w != null) ws.getColumn(c).width = w
  }

  ws.getCell(1, 1).value = 'PROGRAM'
  ws.getCell(1, 2).value = 'ALT PROGRAM'
  ws.getCell(1, 3).value = 'PERFORMANS GÖSTERGELERİ'
  ws.getCell(1, 5).value = 'İLGİLİ MÜDÜRLÜK'
  ws.getCell(2, 3).value = 'Kodu'
  ws.getCell(2, 4).value = 'Adı'
  ws.mergeCells(1, 1, 2, 1)
  ws.mergeCells(1, 2, 2, 2)
  ws.mergeCells(1, 3, 1, 4)
  ws.mergeCells(1, 5, 2, 5)
  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 5; c++) {
      const h = ws.getCell(r, c)
      dolgu(h, MAVI)
      h.font = { bold: true, name: 'Calibri', size: 11 }
      h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }
    kenarlik(ws, r)
  }

  let satir = 3
  for (const s of rapor.satirlar) {
    ws.getCell(satir, 1).value = s.programAdi
    ws.getCell(satir, 2).value = s.altProgramAdi
    ws.getCell(satir, 3).value = s.gostergeKodu
    ws.getCell(satir, 4).value = s.gostergeAdi
    ws.getCell(satir, 5).value = s.ilgiliMudurluk || null
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

  const dataBas = 3
  const dataSon = satir - 1
  if (dataSon >= dataBas) {
    let i = dataBas
    while (i <= dataSon) {
      const program = String(ws.getCell(i, 1).value ?? '')
      let j = i
      while (j + 1 <= dataSon && String(ws.getCell(j + 1, 1).value ?? '') === program) j += 1
      mergeAralik(ws, 1, i, j)

      let a = i
      while (a <= j) {
        const alt = String(ws.getCell(a, 2).value ?? '')
        let b = a
        while (b + 1 <= j && String(ws.getCell(b + 1, 2).value ?? '') === alt) b += 1
        mergeAralik(ws, 2, a, b)

        let m = a
        while (m <= b) {
          const mud = String(ws.getCell(m, 5).value ?? '')
          let n = m
          while (n + 1 <= b && String(ws.getCell(n + 1, 5).value ?? '') === mud) n += 1
          mergeAralik(ws, 5, m, n)
          m = n + 1
        }
        a = b + 1
      }
      i = j + 1
    }
  }

  ws.pageSetup.printArea = `A1:E${Math.max(dataSon, 2)}`
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}
