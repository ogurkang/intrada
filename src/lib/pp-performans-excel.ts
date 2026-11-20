import path from 'path'
import ExcelJS from 'exceljs'
import {
  ppGostergeBaslik,
  ppMaliyetBaslik,
  type PpFaaliyetMaliyetTablo,
  type PpPerformansBlok,
  type PpRaporSayi,
} from './pp-mudurluk-rapor'

const SABLON = path.join(process.cwd(), 'src/lib/pp/sablon/ornek.xlsx')
const CIZGI = { style: 'medium' as const, color: { argb: 'FF5B9BD5' } }
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
  for (let c = 1; c <= 12; c++) {
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

function sayiYaz(hucre: ExcelJS.Cell, deger: PpRaporSayi) {
  hucre.value = deger == null ? null : deger
}

function tutarYaz(hucre: ExcelJS.Cell, deger: PpRaporSayi) {
  hucre.value = deger ?? 0
  hucre.numFmt = TUTAR_FORMAT
  hucre.alignment = { ...(hucre.alignment ?? {}), horizontal: 'center', vertical: 'middle', wrapText: true }
}

function tutarVeyaKurumIci(hucre: ExcelJS.Cell, deger: PpRaporSayi, kurumIci?: boolean) {
  if (kurumIci) {
    hucre.value = 'Kurum İçi'
    hucre.numFmt = undefined
    hucre.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    return
  }
  tutarYaz(hucre, deger)
}

const TUTAR_KOLON = [3, 4, 5, 6, 7, 9]

function kenarlik9(ws: ExcelJS.Worksheet, satirNo: number) {
  for (let c = 1; c <= 9; c++) {
    ws.getCell(satirNo, c).border = { top: CIZGI, left: CIZGI, bottom: CIZGI, right: CIZGI }
  }
}

export async function ppPerformansExcelOlustur(
  bloklar: PpPerformansBlok[],
  yil: number,
  opts?: { tabloBaslik?: string },
): Promise<Uint8Array> {
  const tabloBaslik = opts?.tabloBaslik ?? 'İDARE PERFORMANS BİLGİSİ'
  const sablon = new ExcelJS.Workbook()
  await sablon.xlsx.readFile(SABLON)
  const kaynak = sablon.worksheets[0]
  const birlestirmeler = ((kaynak.model.merges ?? []) as string[]).map(parseMerge)
  const gBaslik = ppGostergeBaslik(yil)
  const mBaslik = ppMaliyetBaslik(yil)

  const wb = new ExcelJS.Workbook()
  bloklar.forEach((blok, index) => {
    const ad = `${index + 1} ${blok.altProgramAdi || 'Sayfa'}`.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31)
    const ws = wb.addWorksheet(ad || `Sayfa ${index + 1}`, {
      properties: {
        defaultRowHeight: kaynak.properties.defaultRowHeight,
        tabColor: kaynak.properties.tabColor,
      },
      pageSetup: { ...kaynak.pageSetup },
      views: kaynak.views?.map(v => ({ ...v })) ?? [],
    })
    for (let c = 1; c <= 12; c++) ws.getColumn(c).width = kaynak.getColumn(c).width

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

    const bas = damga(1, 11)
    yazi(ws.getCell(bas, 1), tabloBaslik)
    yazi(ws.getCell(bas + 1, 3), yil)
    yazi(ws.getCell(bas + 2, 3), blok.programAdi)
    yazi(ws.getCell(bas + 3, 3), blok.veriKaynagi)
    yazi(ws.getCell(bas + 4, 3), blok.altProgramAdi)
    yazi(ws.getCell(bas + 5, 3), blok.gerekce)
    yazi(ws.getCell(bas + 6, 3), blok.hedef)
    yazi(ws.getCell(bas + 7, 1), null)
    yazi(ws.getCell(bas + 8, 3), blok.veriKaynagi)
    gBaslik.forEach((b, i) => yazi(ws.getCell(bas + 10, 4 + i), b))

    if (!blok.gostergeler.length) {
      const bos = damga(12, 15)
      yazi(ws.getCell(bos, 1), null)
      yazi(ws.getCell(bos, 2), null)
      yazi(ws.getCell(bos, 3), null)
      for (let c = 4; c <= 9; c++) yazi(ws.getCell(bos, c), null)
      yazi(ws.getCell(bos + 1, 3), null)
      yazi(ws.getCell(bos + 2, 3), null)
      yazi(ws.getCell(bos + 3, 3), null)
    }
    for (const g of blok.gostergeler) {
      const r = damga(12, 15)
      yazi(ws.getCell(r, 1), g.kod)
      yazi(ws.getCell(r, 2), g.ad)
      yazi(ws.getCell(r, 3), g.birim)
      g.degerler.forEach((d, i) => sayiYaz(ws.getCell(r, 4 + i), d))
      for (let ek = 1; ek <= 3; ek++) {
        for (let c = 4; c <= 9; c++) yazi(ws.getCell(r + ek, c), null)
      }
      yazi(ws.getCell(r + 1, 3), g.aciklama)
      yazi(ws.getCell(r + 2, 3), g.hesaplama)
      yazi(ws.getCell(r + 3, 3), g.sorumlu)
    }

    damga(76, 78)
    mBaslik.forEach((b, i) => {
      const col = i < 4 ? 3 + i : i === 4 ? 7 : 9
      yazi(ws.getCell(satir - 1, col), b)
    })

    const toplam: PpRaporSayi[] = [null, null, null, null, null, null]
    for (const f of blok.faaliyetler) {
      const r = damga(79, 80)
      yazi(ws.getCell(r, 1), `${f.kod} ${f.ad}`.trim())
      yazi(ws.getCell(r + 1, 1), 'Bütçe İçi')
      f.tutarlar.forEach((t, i) => {
        if (!f.kurumIci && t != null) toplam[i] = (toplam[i] ?? 0) + t
        const col = TUTAR_KOLON[i]
        tutarVeyaKurumIci(ws.getCell(r, col), t, f.kurumIci)
        tutarVeyaKurumIci(ws.getCell(r + 1, col), t, f.kurumIci)
      })
    }
    const toplamSatir = damga(93, 94)
    yazi(ws.getCell(toplamSatir, 1), 'Toplam')
    yazi(ws.getCell(toplamSatir + 1, 1), 'Bütçe İçi Toplam')
    toplam.forEach((t, i) => {
      const col = TUTAR_KOLON[i]
      tutarYaz(ws.getCell(toplamSatir, col), t)
      tutarYaz(ws.getCell(toplamSatir + 1, col), t)
    })
    damga(95, 95)
    if (!blok.faaliyetler.length) damga(96, 96)
    blok.faaliyetler.forEach((f, i) => {
      const r = damga(96, 96)
      yazi(ws.getCell(r, 1), `${i + 1}- Faaliyet Adı:`)
      for (let c = 4; c <= 9; c++) yazi(ws.getCell(r, c), null)
      yazi(ws.getCell(r, 3), `PH ${f.kod} ${f.ad}`.trim())
    })

    for (const mt of blok.maliyetTablolari ?? []) {
      satir += 1
      satir = faaliyetMaliyetYaz(ws, satir, blok, mt, mBaslik)
    }

    const son = satir - 1
    for (let r = 1; r <= son; r++) {
      for (let c = 1; c <= 9; c++) {
        const h = ws.getCell(r, c)
        if (!h.border?.top) {
          h.border = { top: CIZGI, left: CIZGI, bottom: CIZGI, right: CIZGI }
        }
      }
    }
    ws.pageSetup.printArea = `A1:I${son}`
  })

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}

/**
 * Referans Excel (satır 61–70): A:I birleştirmeleri, mavi kenarlık,
 * bilgi satırları A:B | C:I, açıklama yüksek, tutar #.##0,00.
 */
const MALIYET_MAVI = 'FF9DC3E6'
const MALIYET_YESIL = 'FFC6EFCE'
const MALIYET_GRI = 'FFF2F2F2'

function dolgu(hucre: ExcelJS.Cell, argb: string) {
  hucre.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function faaliyetMaliyetYaz(
  ws: ExcelJS.Worksheet,
  basSatir: number,
  blok: PpPerformansBlok,
  tablo: PpFaaliyetMaliyetTablo,
  mBaslik: string[],
): number {
  let r = basSatir

  // Başlık — A:I, yükseklik ~19.5
  ws.mergeCells(r, 1, r, 9)
  const baslik = ws.getCell(r, 1)
  baslik.value = 'FAALİYET MALİYETLERİ TABLOSU'
  baslik.font = { bold: true, size: 11, name: 'Calibri' }
  dolgu(baslik, MALIYET_MAVI)
  baslik.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 19.5
  kenarlik9(ws, r)
  for (let c = 1; c <= 9; c++) dolgu(ws.getCell(r, c), MALIYET_MAVI)
  r += 1

  const bilgi = (etiket: string, deger: string) => {
    ws.mergeCells(r, 1, r, 2)
    ws.mergeCells(r, 3, r, 9)
    const e = ws.getCell(r, 1)
    const d = ws.getCell(r, 3)
    e.value = etiket
    d.value = deger || null
    e.font = { bold: true, size: 10, name: 'Calibri' }
    d.font = { size: 10, name: 'Calibri' }
    e.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    d.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    for (let c = 1; c <= 2; c++) dolgu(ws.getCell(r, c), MALIYET_YESIL)
    for (let c = 3; c <= 9; c++) dolgu(ws.getCell(r, c), MALIYET_GRI)
    ws.getRow(r).height = 13.5
    kenarlik9(ws, r)
    r += 1
  }
  bilgi('İdare Adı', blok.veriKaynagi)
  bilgi('Program Adı', blok.programAdi)
  bilgi('Alt Program Adı', blok.altProgramAdi)
  bilgi('Alt Program Hedefi', blok.hedef)
  bilgi('Faaliyet Adı', `PH ${tablo.kod} ${tablo.ad}`.trim())

  // Açıklama — tam birleşik, ~3 satır yüksekliği
  ws.mergeCells(r, 1, r, 9)
  const acik = ws.getCell(r, 1)
  acik.value = tablo.aciklama || null
  acik.font = { size: 10, name: 'Calibri' }
  acik.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
  for (let c = 1; c <= 9; c++) dolgu(ws.getCell(r, c), MALIYET_GRI)
  ws.getRow(r).height = Math.max(45, Math.min(120, 15 + Math.ceil((tablo.aciklama || '').length / 80) * 15))
  kenarlik9(ws, r)
  r += 1

  // Sütun başlıkları: Ekonomik Ad A:B, tutarlar C D E F G:H I
  ws.mergeCells(r, 1, r, 2)
  ws.mergeCells(r, 7, r, 8)
  yazi(ws.getCell(r, 1), 'Ekonomik Ad')
  mBaslik.forEach((b, i) => {
    const col = TUTAR_KOLON[i]
    yazi(ws.getCell(r, col), b)
  })
  for (let c = 1; c <= 9; c++) {
    const h = ws.getCell(r, c)
    dolgu(h, MALIYET_MAVI)
    h.font = { bold: true, size: 9, name: 'Calibri' }
    h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  }
  ws.getCell(r, 1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  ws.getRow(r).height = 27.75
  kenarlik9(ws, r)
  r += 1

  const toplam: PpRaporSayi[] = [null, null, null, null, null, null]
  for (const s of tablo.satirlar) {
    ws.mergeCells(r, 1, r, 2)
    ws.mergeCells(r, 7, r, 8)
    yazi(ws.getCell(r, 1), s.ekonomikAd)
    s.tutarlar.forEach((t, i) => {
      tutarYaz(ws.getCell(r, TUTAR_KOLON[i]), t)
      if (t != null) toplam[i] = (toplam[i] ?? 0) + t
    })
    for (let c = 1; c <= 2; c++) {
      dolgu(ws.getCell(r, c), MALIYET_YESIL)
      ws.getCell(r, c).font = { bold: true, size: 10, name: 'Calibri' }
    }
    for (let c = 3; c <= 9; c++) dolgu(ws.getCell(r, c), MALIYET_GRI)
    ws.getCell(r, 1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    ws.getRow(r).height = 13.5
    kenarlik9(ws, r)
    r += 1
  }

  ws.mergeCells(r, 1, r, 2)
  ws.mergeCells(r, 7, r, 8)
  yazi(ws.getCell(r, 1), 'FAALİYET MALİYETİ TOPLAMI')
  toplam.forEach((t, i) => tutarYaz(ws.getCell(r, TUTAR_KOLON[i]), t))
  for (let c = 1; c <= 9; c++) {
    const h = ws.getCell(r, c)
    dolgu(h, MALIYET_YESIL)
    h.font = { bold: true, size: 10, name: 'Calibri' }
  }
  ws.getCell(r, 1).alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(r).height = 13.5
  kenarlik9(ws, r)
  r += 1

  return r
}
