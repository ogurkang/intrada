import ExcelJS from 'exceljs'
import {
  ppMudurlukFaaliyetMaliyetSirala,
  type PpMudurlukFaaliyetMaliyetRapor,
  type PpMudurlukFaaliyetMaliyetSirala,
  type PpMudurlukFaaliyetMaliyetYon,
} from './pp-mudurluk-faaliyet-maliyet-rapor'
import type { PpRaporSayi } from './pp-mudurluk-rapor'

/** ExcelJS invariant: binlik `,` ondalık `.` — TR Excel’de 1.234,56 görünür. */
const TUTAR_FORMAT = '#,##0.00'
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

function tutarYaz(hucre: ExcelJS.Cell, deger: PpRaporSayi) {
  hucre.value = deger ?? 0
  hucre.numFmt = TUTAR_FORMAT
  hucre.alignment = { horizontal: 'right', vertical: 'middle' }
}

export async function ppMudurlukFaaliyetMaliyetExcelOlustur(
  rapor: PpMudurlukFaaliyetMaliyetRapor,
  opts?: {
    sirala?: PpMudurlukFaaliyetMaliyetSirala
    yon?: PpMudurlukFaaliyetMaliyetYon
  },
): Promise<Uint8Array> {
  const sirala = opts?.sirala === 'butce' ? 'butce' : 'ad'
  const yon = opts?.yon === 'desc' ? 'desc' : 'asc'
  const satirlar = ppMudurlukFaaliyetMaliyetSirala(rapor.satirlar, sirala, yon)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Mudurluk Faaliyet Maliyeti', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })
  ws.getColumn(1).width = 10
  ws.getColumn(2).width = 42
  ws.getColumn(3).width = 22

  // Üst başlık
  ws.mergeCells(1, 1, 1, 3)
  const baslik = ws.getCell(1, 1)
  baslik.value = `MÜDÜRLÜKLERİN FAALİYET MALİYETLERİ TABLOSU — ${rapor.yil}`
  baslik.font = { bold: true, name: 'Calibri', size: 12, color: { argb: 'FF0F172A' } }
  baslik.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  dolgu(baslik, MAVI)
  for (let c = 1; c <= 3; c++) {
    dolgu(ws.getCell(1, c), MAVI)
    kenar(ws.getCell(1, c))
  }
  ws.getRow(1).height = 28

  const basliklar = ['Sıra No', 'Müdürlük Adı', 'Performans Bütçesi']
  for (let c = 0; c < basliklar.length; c++) {
    const h = ws.getCell(2, c + 1)
    h.value = basliklar[c]
    h.font = { bold: true, name: 'Calibri', size: 11 }
    h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    dolgu(h, MAVI)
    kenar(h)
  }
  ws.getRow(2).height = 22

  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i]!
    const r = i + 3
    const zemin = i % 2 === 0 ? YESIL : GRI

    const sira = ws.getCell(r, 1)
    sira.value = i + 1
    sira.alignment = { horizontal: 'center', vertical: 'middle' }
    sira.font = { name: 'Calibri', size: 11 }

    const ad = ws.getCell(r, 2)
    ad.value = s.mudurluk
    ad.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    ad.font = { name: 'Calibri', size: 11 }

    tutarYaz(ws.getCell(r, 3), s.tutar)
    ws.getCell(r, 3).font = { name: 'Calibri', size: 11 }

    for (let c = 1; c <= 3; c++) {
      dolgu(ws.getCell(r, c), zemin)
      kenar(ws.getCell(r, c))
    }
  }

  const toplam = satirlar.reduce((a, s) => a + (s.tutar ?? 0), 0)
  const toplamSatir = 3 + satirlar.length
  const t1 = ws.getCell(toplamSatir, 1)
  t1.value = ''
  const t2 = ws.getCell(toplamSatir, 2)
  t2.value = 'TOPLAM'
  t2.font = { bold: true, name: 'Calibri', size: 11 }
  t2.alignment = { horizontal: 'right', vertical: 'middle' }
  tutarYaz(ws.getCell(toplamSatir, 3), toplam)
  ws.getCell(toplamSatir, 3).font = { bold: true, name: 'Calibri', size: 11 }
  for (let c = 1; c <= 3; c++) {
    dolgu(ws.getCell(toplamSatir, c), MAVI)
    kenar(ws.getCell(toplamSatir, c))
  }

  const son = Math.max(toplamSatir, 2)
  ws.pageSetup.printArea = `A1:C${son}`
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}
