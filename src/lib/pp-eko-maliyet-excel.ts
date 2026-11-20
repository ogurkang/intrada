import path from 'path'
import ExcelJS from 'exceljs'
import type { PpEkoMaliyetRapor, PpEkoYilHucre } from './pp-eko-maliyet-rapor'
import type { PpRaporSayi } from './pp-mudurluk-rapor'

const SABLON = path.join(process.cwd(), 'src/lib/pp/sablon/t3-eko-pro.xlsx')
const TUTAR_FORMAT = '#.##0,00'
const MAVI = 'FF9DC3E6'
const YESIL = 'FFC6EFCE'
const GRI = 'FFF2F2F2'

function tutarYaz(hucre: ExcelJS.Cell, deger: PpRaporSayi) {
  if (deger == null) {
    hucre.value = null
    return
  }
  hucre.value = deger
  hucre.numFmt = TUTAR_FORMAT
  hucre.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
}

function dolgu(hucre: ExcelJS.Cell, argb: string) {
  hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function yilHucreYaz(ws: ExcelJS.Worksheet, satir: number, basCol: number, h: PpEkoYilHucre) {
  tutarYaz(ws.getCell(satir, basCol), h.hizmet)
  tutarYaz(ws.getCell(satir, basCol + 1), h.yonetim)
  tutarYaz(ws.getCell(satir, basCol + 2), h.genel)
}

export async function ppEkoMaliyetExcelOlustur(rapor: PpEkoMaliyetRapor): Promise<Uint8Array> {
  const sablon = new ExcelJS.Workbook()
  await sablon.xlsx.readFile(SABLON)
  const kaynak = sablon.worksheets[0]
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Ekonomik Maliyet', {
    properties: { ...kaynak.properties },
    pageSetup: { ...kaynak.pageSetup },
    views: kaynak.views?.map(v => ({ ...v })) ?? [],
  })

  for (let c = 1; c <= 10; c++) {
    const w = kaynak.getColumn(c).width
    if (w != null) ws.getColumn(c).width = w
  }

  // Başlık satırları
  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 10; c++) {
      const from = kaynak.getCell(r, c)
      const to = ws.getCell(r, c)
      to.value = from.value
      to.style = JSON.parse(JSON.stringify(from.style ?? {}))
      dolgu(to, MAVI)
      to.font = { ...(to.font ?? {}), bold: true, name: 'Calibri', size: 11 }
      to.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }
  }
  ws.mergeCells(1, 1, 2, 1)
  ws.mergeCells(1, 2, 1, 4)
  ws.mergeCells(1, 5, 1, 7)
  ws.mergeCells(1, 8, 1, 10)

  ws.getCell(1, 2).value = rapor.yil
  ws.getCell(1, 5).value = rapor.yil + 1
  ws.getCell(1, 8).value = rapor.yil + 2
  for (const col of [2, 5, 8]) {
    ws.getCell(2, col).value = 'HİZMET PROGRAMLARI TOPLAMI'
    ws.getCell(2, col + 1).value = 'YÖNETİM VE DESTEK PROGRAMI TOPLAMI'
    ws.getCell(2, col + 2).value = 'GENEL TOPLAM'
  }

  for (let i = 0; i < rapor.satirlar.length; i++) {
    const s = rapor.satirlar[i]!
    const r = i + 3
    const adHucre = ws.getCell(r, 1)
    adHucre.value = s.ad
    adHucre.font = {
      bold: s.tur !== 'ekonomik' && s.tur !== 'butce_disi_diger',
      name: 'Calibri',
      size: 11,
    }
    adHucre.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    const zemin = s.tur === 'ekonomik' || s.tur === 'butce_disi_diger' ? GRI : YESIL
    dolgu(adHucre, zemin)
    for (let c = 2; c <= 10; c++) dolgu(ws.getCell(r, c), zemin)
    yilHucreYaz(ws, r, 2, s.yillar[0])
    yilHucreYaz(ws, r, 5, s.yillar[1])
    yilHucreYaz(ws, r, 8, s.yillar[2])
    for (let c = 1; c <= 10; c++) {
      ws.getCell(r, c).border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      }
    }
  }

  const son = 2 + rapor.satirlar.length
  ws.pageSetup.printArea = `A1:J${son}`
  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}
