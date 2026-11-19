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

const TUTAR_KOLON = [3, 4, 5, 6, 7, 9]

function sutunHarf(col: number): string {
  return String.fromCharCode(64 + col)
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
    const faaliyetSatirlari: number[] = []
    for (const f of blok.faaliyetler) {
      const r = damga(79, 80)
      faaliyetSatirlari.push(r)
      yazi(ws.getCell(r, 1), `${f.kod} ${f.ad}`.trim())
      f.tutarlar.forEach((t, i) => {
        toplam[i] = t == null ? toplam[i] : (toplam[i] ?? 0) + t
        const col = TUTAR_KOLON[i]
        sayiYaz(ws.getCell(r, col), t)
        sayiYaz(ws.getCell(r + 1, col), t)
      })
    }
    const toplamSatir = damga(93, 94)
    toplam.forEach((t, i) => {
      const col = TUTAR_KOLON[i]
      const harf = sutunHarf(col)
      const kaynaklar = faaliyetSatirlari.map(r => `${harf}${r}`)
      const hucre = ws.getCell(toplamSatir, col)
      if (!kaynaklar.length || t == null) {
        hucre.value = null
      } else {
        hucre.value = { formula: kaynaklar.join('+'), result: t }
      }
      const alt = ws.getCell(toplamSatir + 1, col)
      if (t == null) alt.value = null
      else alt.value = { formula: `${harf}${toplamSatir}`, result: t }
    })
    yazi(ws.getCell(toplamSatir + 1, 8), null)
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
      satir = faaliyetMaliyetYaz(ws, satir, blok, mt, yil, mBaslik)
    }

    const son = satir - 1
    const cizgi = { style: 'medium' as const, color: { argb: 'FF5B9BD5' } }
    for (let r = 1; r <= son; r++) {
      for (let c = 1; c <= 9; c++) {
        const h = ws.getCell(r, c)
        if (!h.border?.top) {
          h.border = { top: cizgi, left: cizgi, bottom: cizgi, right: cizgi }
        }
      }
    }
    ws.pageSetup.printArea = `A1:I${son}`
  })

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}

function faaliyetMaliyetYaz(
  ws: ExcelJS.Worksheet,
  basSatir: number,
  blok: PpPerformansBlok,
  tablo: PpFaaliyetMaliyetTablo,
  yil: number,
  mBaslik: string[],
): number {
  let r = basSatir
  const cizgi = { style: 'medium' as const, color: { argb: 'FF5B9BD5' } }
  const boya = (satirNo: number, baslikMi = false, toplamMi = false) => {
    for (let c = 1; c <= 7; c++) {
      const h = ws.getCell(satirNo, c)
      h.border = { top: cizgi, left: cizgi, bottom: cizgi, right: cizgi }
      if (baslikMi) {
        h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } }
        h.font = { ...(h.font ?? {}), bold: true, color: { argb: 'FFFFFFFF' } }
        h.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      } else if (toplamMi) {
        h.font = { ...(h.font ?? {}), bold: true }
        h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
      }
    }
  }

  ws.mergeCells(r, 1, r, 7)
  yazi(ws.getCell(r, 1), 'FAALİYET MALİYETLERİ TABLOSU')
  boya(r, true)
  r += 1

  const bilgi = (etiket: string, deger: string) => {
    yazi(ws.getCell(r, 1), etiket)
    ws.mergeCells(r, 2, r, 7)
    yazi(ws.getCell(r, 2), deger)
    boya(r)
    r += 1
  }
  bilgi('İdare Adı', blok.veriKaynagi)
  bilgi('Program Adı', blok.programAdi)
  bilgi('Alt Program Adı', blok.altProgramAdi)
  bilgi('Alt Program Hedefi', blok.hedef)
  bilgi('Faaliyet Adı', `PH ${tablo.kod} ${tablo.ad}`.trim())

  ws.mergeCells(r, 1, r, 7)
  yazi(ws.getCell(r, 1), tablo.aciklama || null)
  boya(r)
  r += 1

  yazi(ws.getCell(r, 1), 'Ekonomik Ad')
  mBaslik.forEach((b, i) => yazi(ws.getCell(r, 2 + i), b))
  for (let c = 1; c <= 7; c++) {
    const h = ws.getCell(r, c)
    h.border = { top: cizgi, left: cizgi, bottom: cizgi, right: cizgi }
    h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } }
    h.font = { ...(h.font ?? {}), bold: true }
    h.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle', wrapText: true }
  }
  r += 1

  const toplam: PpRaporSayi[] = [null, null, null, null, null, null]
  if (!tablo.satirlar.length) {
    ws.mergeCells(r, 1, r, 7)
    yazi(ws.getCell(r, 1), 'Bu faaliyet için 1. düzey ekonomik ödenek teklifi yok.')
    boya(r)
    r += 1
  } else {
    for (const s of tablo.satirlar) {
      yazi(ws.getCell(r, 1), s.ekonomikAd)
      s.tutarlar.forEach((t, i) => {
        sayiYaz(ws.getCell(r, 2 + i), t)
        if (t != null) toplam[i] = (toplam[i] ?? 0) + t
      })
      boya(r)
      r += 1
    }
  }

  yazi(ws.getCell(r, 1), 'FAALİYET MALİYETİ TOPLAMI')
  toplam.forEach((t, i) => sayiYaz(ws.getCell(r, 2 + i), t))
  boya(r, false, true)
  r += 1
  return r
}
