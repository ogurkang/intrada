import path from 'path'
import ExcelJS from 'exceljs'
import type { PpFaaliyetMaliyetRapor, PpFaaliyetMaliyetSatirTur } from './pp-faaliyet-maliyet-rapor'
import type { PpRaporSayi } from './pp-mudurluk-rapor'

const SABLON = path.join(process.cwd(), 'src/lib/pp/sablon/faaliyet-maliyet.xlsx')
const TUTAR_FORMAT = '#.##0,00'

type Merge = { top: number; left: number; bottom: number; right: number }

function parseMerge(ref: string): Merge {
  const [a, b] = ref.split(':')
  const A = cellAdres(a)
  const B = cellAdres(b ?? a)
  return { top: A.r, left: A.c, bottom: B.r, right: B.c }
}

function cellAdres(ad: string): { r: number; c: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ad)
  if (!m) return { r: 1, c: 1 }
  let c = 0
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64)
  return { r: Number(m[2]), c }
}

function kopyalaSatir(kaynak: ExcelJS.Worksheet, kaynakNo: number, hedef: ExcelJS.Worksheet, hedefNo: number) {
  const src = kaynak.getRow(kaynakNo)
  const dst = hedef.getRow(hedefNo)
  dst.height = src.height
  for (let c = 1; c <= 9; c++) {
    const from = src.getCell(c)
    const to = dst.getCell(c)
    to.value = from.value && typeof from.value === 'object' ? JSON.parse(JSON.stringify(from.value)) : from.value
    to.style = JSON.parse(JSON.stringify(from.style ?? {}))
  }
}

function birlestir(hedef: ExcelJS.Worksheet, kaynakBirlestirmeler: Merge[], kaynakIlk: number, kaynakSon: number, hedefIlk: number) {
  for (const m of kaynakBirlestirmeler) {
    if (m.top < kaynakIlk || m.bottom > kaynakSon) continue
    const kayma = hedefIlk - kaynakIlk
    hedef.mergeCells(m.top + kayma, m.left, m.bottom + kayma, m.right)
  }
}

function yazi(hucre: ExcelJS.Cell, deger: string | number | null) {
  hucre.value = deger == null || deger === '' ? null : deger
}

function tutarYaz(hucre: ExcelJS.Cell, deger: PpRaporSayi) {
  hucre.value = deger ?? 0
  hucre.numFmt = TUTAR_FORMAT
  hucre.alignment = { ...(hucre.alignment ?? {}), horizontal: 'center', vertical: 'middle', wrapText: true }
}

const SABLON_SATIR: Record<PpFaaliyetMaliyetSatirTur, number> = {
  program: 3,
  alt_program: 4,
  faaliyet: 5,
}

export async function ppFaaliyetMaliyetExcelOlustur(rapor: PpFaaliyetMaliyetRapor): Promise<Uint8Array> {
  const sablon = new ExcelJS.Workbook()
  await sablon.xlsx.readFile(SABLON)
  const kaynak = sablon.worksheets[0]
  const birlestirmeler = ((kaynak.model.merges ?? []) as string[]).map(parseMerge)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Faaliyet Maliyeti', {
    properties: {
      defaultRowHeight: kaynak.properties.defaultRowHeight,
      tabColor: kaynak.properties.tabColor,
    },
    pageSetup: { ...kaynak.pageSetup },
    views: kaynak.views?.map(v => ({ ...v })) ?? [],
  })
  for (let c = 1; c <= 9; c++) {
    const w = kaynak.getColumn(c).width
    if (w != null) ws.getColumn(c).width = w
  }
  // Şablonda A/C genişliği tanımsız; görünür ölçü için makul varsayılan
  if (ws.getColumn(1).width == null) ws.getColumn(1).width = 12
  if (ws.getColumn(3).width == null) ws.getColumn(3).width = 18

  let satir = 1
  const damga = (ilk: number, son: number) => {
    const hedefIlk = satir
    for (let r = ilk; r <= son; r++) {
      kopyalaSatir(kaynak, r, ws, satir)
      satir += 1
    }
    birlestir(ws, birlestirmeler, ilk, son, hedefIlk)
    return hedefIlk
  }

  const bas = damga(1, 2)
  yazi(ws.getCell(bas, 7), rapor.yil)
  yazi(ws.getCell(bas, 8), rapor.yil + 1)
  yazi(ws.getCell(bas, 9), rapor.yil + 2)
  yazi(ws.getCell(bas + 1, 7), 'BÜTÇE İÇİ')
  yazi(ws.getCell(bas + 1, 8), 'BÜTÇE İÇİ')
  yazi(ws.getCell(bas + 1, 9), 'BÜTÇE İÇİ')

  for (const s of rapor.satirlar) {
    const kaynakSatir = SABLON_SATIR[s.tur]
    const r = damga(kaynakSatir, kaynakSatir)
    yazi(ws.getCell(r, 1), s.etiket)
    yazi(ws.getCell(r, 3), s.ad)
    tutarYaz(ws.getCell(r, 7), s.yilTutar)
    tutarYaz(ws.getCell(r, 8), s.sonrakiTutar)
    tutarYaz(ws.getCell(r, 9), s.sonraki2Tutar)
  }

  const son = Math.max(satir - 1, 2)
  ws.pageSetup.printArea = `A1:I${son}`

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}
