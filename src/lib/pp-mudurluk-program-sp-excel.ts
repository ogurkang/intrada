import ExcelJS from 'exceljs'
import type { PpMudurlukProgramSpRapor } from './pp-mudurluk-program-sp-rapor'

const MAVI = 'FF9DC3E6'
const TEAL = 'FF0F766E'
const YESIL = 'FFC6EFCE'
const GRI = 'FFF2F2F2'
const CIZGI = { style: 'thin' as const, color: { argb: 'FF94A3B8' } }
const ALT_CIZGI = { style: 'medium' as const, color: { argb: 'FF0F766E' } }

function dolgu(hucre: ExcelJS.Cell, argb: string) {
  hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function kenar(hucre: ExcelJS.Cell, altKalın = false) {
  hucre.border = {
    top: CIZGI,
    left: CIZGI,
    right: CIZGI,
    bottom: altKalın ? ALT_CIZGI : CIZGI,
  }
}

export async function ppMudurlukProgramSpExcelOlustur(
  rapor: PpMudurlukProgramSpRapor,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Mudurluk Program SP', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })

  const genislik = [8, 8, 10, 22, 28, 28, 32, 28, 28, 24]
  for (let i = 0; i < genislik.length; i++) ws.getColumn(i + 1).width = genislik[i]

  // 1 — başlık
  ws.mergeCells(1, 1, 1, 10)
  const ust = ws.getCell(1, 1)
  ust.value = `MÜDÜRLÜKLERİN PROGRAM-ALT PROGRAM STRATEJİK PLAN TABLOSU — ${rapor.yil}`
  ust.font = { bold: true, name: 'Calibri', size: 12, color: { argb: 'FF0F172A' } }
  ust.alignment = { horizontal: 'center', vertical: 'middle' }
  for (let c = 1; c <= 10; c++) {
    dolgu(ws.getCell(1, c), MAVI)
    kenar(ws.getCell(1, c))
  }
  ws.getRow(1).height = 26

  // 2 — sütun başlıkları (KOD 1–3 birleşik)
  ws.mergeCells(2, 1, 2, 3)
  const basliklar: Array<{ c: number; v: string }> = [
    { c: 1, v: 'KOD' },
    { c: 4, v: 'PROGRAM' },
    { c: 5, v: 'ALT PROGRAM' },
    { c: 6, v: 'FAALİYET' },
    { c: 7, v: 'STRATEJİK AMAÇ' },
    { c: 8, v: 'HEDEF' },
    { c: 9, v: 'PERFORMANS HEDEFİ' },
    { c: 10, v: 'İLGİLİ MÜDÜRLÜK' },
  ]
  for (const b of basliklar) {
    const h = ws.getCell(2, b.c)
    h.value = b.v
  }
  for (let c = 1; c <= 10; c++) {
    const h = ws.getCell(2, c)
    h.font = { bold: true, name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } }
    h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    dolgu(h, TEAL)
    kenar(h)
  }
  ws.getRow(2).height = 28

  for (let i = 0; i < rapor.satirlar.length; i++) {
    const s = rapor.satirlar[i]!
    const r = i + 3
    const zemin = i % 2 === 0 ? YESIL : GRI
    const degerler = [
      s.programKodu,
      s.altProgramKodu,
      s.faaliyetKodu,
      s.programAdi,
      s.altProgramAdi,
      s.faaliyetAdi,
      s.stratejikAmac,
      s.hedef,
      s.performansHedefi,
      s.mudurluk,
    ]
    const sonSatir = i === rapor.satirlar.length - 1
    for (let c = 0; c < degerler.length; c++) {
      const h = ws.getCell(r, c + 1)
      h.value = degerler[c]
      h.font = { name: 'Calibri', size: 10 }
      h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      dolgu(h, zemin)
      kenar(h, sonSatir)
    }
    ws.getRow(r).height = 52
  }

  const son = Math.max(2 + rapor.satirlar.length, 2)
  ws.pageSetup.printArea = `A1:J${son}`
  ws.pageSetup.orientation = 'landscape'
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}
