import ExcelJS from 'exceljs'
import type { PpProgramSpRapor } from './pp-program-sp-rapor'

const MAVI = 'FF9DC3E6'
const YESIL = 'FFC6EFCE'
const GRI = 'FFF2F2F2'
const CIZGI = { style: 'thin' as const, color: { argb: 'FF94A3B8' } }

function dolgu(hucre: ExcelJS.Cell, argb: string) {
  hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function kenar(hucre: ExcelJS.Cell) {
  hucre.border = { top: CIZGI, left: CIZGI, bottom: CIZGI, right: CIZGI }
}

export async function ppProgramSpExcelOlustur(rapor: PpProgramSpRapor): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Program Alt Program SP', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })
  ws.getColumn(1).width = 10
  ws.getColumn(2).width = 28
  ws.getColumn(3).width = 28
  ws.getColumn(4).width = 40
  ws.getColumn(5).width = 40

  ws.mergeCells(1, 1, 1, 5)
  const baslik = ws.getCell(1, 1)
  baslik.value = `PROGRAM-ALT PROGRAM STRATEJİK PLAN TABLOSU — ${rapor.yil}`
  baslik.font = { bold: true, name: 'Calibri', size: 12 }
  baslik.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  for (let c = 1; c <= 5; c++) {
    dolgu(ws.getCell(1, c), MAVI)
    kenar(ws.getCell(1, c))
  }
  ws.getRow(1).height = 28

  const basliklar = ['Sıra No', 'Program Adı', 'Alt Program Adı', 'Performans Hedefi', 'Stratejik Amaç']
  for (let c = 0; c < basliklar.length; c++) {
    const h = ws.getCell(2, c + 1)
    h.value = basliklar[c]
    h.font = { bold: true, name: 'Calibri', size: 11 }
    h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    dolgu(h, MAVI)
    kenar(h)
  }

  for (let i = 0; i < rapor.satirlar.length; i++) {
    const s = rapor.satirlar[i]!
    const r = i + 3
    const zemin = i % 2 === 0 ? YESIL : GRI
    const degerler = [i + 1, s.programAdi, s.altProgramAdi, s.performansHedefi, s.stratejikAmac]
    for (let c = 0; c < degerler.length; c++) {
      const h = ws.getCell(r, c + 1)
      h.value = degerler[c] as string | number
      h.font = { name: 'Calibri', size: 11 }
      h.alignment = {
        horizontal: c === 0 ? 'center' : 'left',
        vertical: 'middle',
        wrapText: true,
      }
      dolgu(h, zemin)
      kenar(h)
    }
  }

  const son = Math.max(2 + rapor.satirlar.length, 2)
  ws.pageSetup.printArea = `A1:E${son}`
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}
