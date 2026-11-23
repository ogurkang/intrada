import ExcelJS from 'exceljs'
import {
  ppHarcamaYetkilileriSirala,
  type PpHarcamaYetkilileriRapor,
  type PpHarcamaYetkilileriSirala,
  type PpHarcamaYetkilileriYon,
} from './pp-harcama-yetkilileri-rapor'

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

export async function ppHarcamaYetkilileriExcelOlustur(
  rapor: PpHarcamaYetkilileriRapor,
  opts?: { sirala?: PpHarcamaYetkilileriSirala; yon?: PpHarcamaYetkilileriYon },
): Promise<Uint8Array> {
  const sirala = opts?.sirala === 'birim' ? 'birim' : 'yetkili'
  const yon = opts?.yon === 'desc' ? 'desc' : 'asc'
  const satirlar = ppHarcamaYetkilileriSirala(rapor.satirlar, sirala, yon)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Harcama Birim Yetkilileri', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })
  ws.getColumn(1).width = 10
  ws.getColumn(2).width = 32
  ws.getColumn(3).width = 42

  ws.mergeCells(1, 1, 1, 3)
  const baslik = ws.getCell(1, 1)
  baslik.value = 'HARCAMA BİRİM YETKİLİLERİ TABLOSU'
  baslik.font = { bold: true, name: 'Calibri', size: 12 }
  baslik.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  for (let c = 1; c <= 3; c++) {
    dolgu(ws.getCell(1, c), MAVI)
    kenar(ws.getCell(1, c))
  }
  ws.getRow(1).height = 28

  const basliklar = ['Sıra No', 'Harcama Yetkilisi', 'Harcama Birimi']
  for (let c = 0; c < basliklar.length; c++) {
    const h = ws.getCell(2, c + 1)
    h.value = basliklar[c]
    h.font = { bold: true, name: 'Calibri', size: 11 }
    h.alignment = { horizontal: 'center', vertical: 'middle' }
    dolgu(h, MAVI)
    kenar(h)
  }

  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i]!
    const r = i + 3
    const zemin = i % 2 === 0 ? YESIL : GRI
    ws.getCell(r, 1).value = s.siraNo || i + 1
    ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(r, 2).value = s.harcamaYetkilisi
    ws.getCell(r, 3).value = s.harcamaBirimi
    for (let c = 1; c <= 3; c++) {
      ws.getCell(r, c).font = { name: 'Calibri', size: 11 }
      dolgu(ws.getCell(r, c), zemin)
      kenar(ws.getCell(r, c))
    }
  }

  const son = Math.max(2 + satirlar.length, 2)
  ws.pageSetup.printArea = `A1:C${son}`
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}
