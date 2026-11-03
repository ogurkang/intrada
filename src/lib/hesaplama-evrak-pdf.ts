import path from 'node:path'
import PDFDocument from 'pdfkit'

const MARGIN = 40
const PAGE_W = 595.28
const FONT_NORMAL = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
const FONT_BOLD = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')

type PdfDoc = InstanceType<typeof PDFDocument>

function pdfBuffer(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

function font(doc: PdfDoc, bold = false) {
  doc.font(bold ? FONT_BOLD : FONT_NORMAL)
}

function hucre(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  opts?: { bold?: boolean; align?: 'left' | 'center' | 'right'; size?: number; fill?: string; color?: string },
) {
  if (opts?.fill) {
    doc.save()
    doc.rect(x, y, w, h).fill(opts.fill)
    doc.restore()
  }
  doc.rect(x, y, w, h).stroke()
  const size = opts?.size ?? 8
  font(doc, opts?.bold)
  doc.fontSize(size).fillColor(opts?.color ?? '#0f172a')
  const pad = 4
  doc.text(text, x + pad, y + (h - size) / 2 - 1, {
    width: w - pad * 2,
    align: opts?.align ?? 'left',
    lineBreak: false,
  })
}

export type BelgeHucre = { etiket: string; deger: string }
export type BelgeTablo = {
  basliklar: string[]
  satirlar: string[][]
  toplamEtiket?: string
  toplamDeger?: string
}

export type EvrakImzaAd = { duzenleyen?: string; gerceklestirme?: string }

export function evrakImzaCiz(doc: PdfDoc, y: number, imza?: EvrakImzaAd, sayfaGenislik = PAGE_W) {
  const icW = sayfaGenislik - MARGIN * 2
  const imzaW = (icW - 16) / 2
  const yil = new Date().getFullYear()
  const ciz = (etiket: string, ad: string, x: number) => {
    font(doc, true)
    doc.fontSize(9).fillColor('#0f172a').text(etiket, x, y, { width: imzaW, align: 'center' })
    font(doc, false)
    doc.fontSize(8).text(ad || ' ', x, y + 16, { width: imzaW, align: 'center' })
    doc.fontSize(9).text(`…... / …... / ${yil}`, x, y + 40, { width: imzaW, align: 'center' })
  }
  ciz('DÜZENLEYEN', imza?.duzenleyen ?? '', MARGIN)
  ciz('GERÇEKLEŞTİRME GÖREVLİSİ', imza?.gerceklestirme ?? '', MARGIN + imzaW + 16)
}

export async function hesaplamaBelgePdf(girdi: {
  baslik: string
  kimlik: BelgeHucre[]
  tablo: BelgeTablo
  not: string
  imza?: EvrakImzaAd
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN })
  const done = pdfBuffer(doc)
  const icW = PAGE_W - MARGIN * 2
  let y = MARGIN

  font(doc, true)
  doc.fontSize(11).fillColor('#0f172a').text('T.C.', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 2
  doc.fontSize(12).text('ADAPAZARI BELEDİYE BAŞKANLIĞI', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 2
  font(doc, false)
  doc.fontSize(10).text('İnsan Kaynakları ve Eğitim Müdürlüğü', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 10
  font(doc, true)
  doc.fontSize(13).text(girdi.baslik, MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 14

  const satirH = 18
  const etiketW = icW * 0.38
  girdi.kimlik.forEach((satir, i) => {
    const yy = y + i * satirH
    hucre(doc, MARGIN, yy, etiketW, satirH, satir.etiket, { size: 8, fill: '#f8fafc' })
    hucre(doc, MARGIN + etiketW, yy, icW - etiketW, satirH, satir.deger, { size: 8, bold: true })
  })
  y += girdi.kimlik.length * satirH + 12

  const kolon = girdi.tablo.basliklar.length
  const genislikler = kolon === 2
    ? [icW * 0.62, icW * 0.38]
    : kolon === 4
      ? [icW * 0.22, icW * 0.28, icW * 0.28, icW * 0.22]
      : Array.from({ length: kolon }, () => icW / kolon)
  const sagaYasla = new Set(kolon === 2 ? [1] : kolon === 4 ? [3] : [])

  girdi.tablo.basliklar.forEach((baslik, i) => {
    const x = MARGIN + genislikler.slice(0, i).reduce((a, b) => a + b, 0)
    hucre(doc, x, y, genislikler[i], satirH, baslik, {
      bold: true,
      size: 8,
      fill: '#e2e8f0',
      align: sagaYasla.has(i) ? 'right' : 'left',
    })
  })
  girdi.tablo.satirlar.forEach((satir, r) => {
    const yy = y + (r + 1) * satirH
    satir.forEach((hucreMetin, i) => {
      const x = MARGIN + genislikler.slice(0, i).reduce((a, b) => a + b, 0)
      hucre(doc, x, yy, genislikler[i], satirH, hucreMetin, {
        size: 8,
        align: sagaYasla.has(i) ? 'right' : 'left',
      })
    })
  })
  y += (girdi.tablo.satirlar.length + 1) * satirH
  if (girdi.tablo.toplamEtiket && girdi.tablo.toplamDeger) {
    const sol = genislikler.slice(0, -1).reduce((a, b) => a + b, 0)
    const sag = genislikler[genislikler.length - 1]
    hucre(doc, MARGIN, y, sol, satirH + 4, girdi.tablo.toplamEtiket, {
      bold: true,
      size: 8,
      fill: '#0f172a',
      color: '#ffffff',
    })
    hucre(doc, MARGIN + sol, y, sag, satirH + 4, girdi.tablo.toplamDeger, {
      bold: true,
      size: 8,
      align: 'right',
      fill: '#0f172a',
      color: '#ffffff',
    })
    y += satirH + 4
  }

  y += 14
  font(doc, false)
  doc.fontSize(8).fillColor('#0f172a').text(girdi.not, MARGIN, y, { width: icW, align: 'left', lineGap: 2 })
  evrakImzaCiz(doc, doc.y + 22, girdi.imza)

  doc.end()
  return done
}

const YATAY_W = 841.89
const YATAY_H = 595.28

export async function kisiBorcuFormPdf(girdi: {
  kimlik: BelgeHucre[]
  satirlar: string[][]
  not: string
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: MARGIN })
  const done = pdfBuffer(doc)
  const icW = YATAY_W - MARGIN * 2
  const basliklar = ['Sıra', 'Vade', 'Gün', 'Oran', 'Faiz', 'Anapara', 'Ödeme', 'Kalan']
  const pay = [0.06, 0.12, 0.07, 0.16, 0.145, 0.145, 0.15, 0.15]
  const genislikler = pay.map(p => icW * p)
  const saga = new Set([2, 4, 5, 6, 7])
  const satirH = 16

  const tabloBaslik = (y: number) => {
    basliklar.forEach((baslik, i) => {
      const x = MARGIN + genislikler.slice(0, i).reduce((a, b) => a + b, 0)
      hucre(doc, x, y, genislikler[i], satirH, baslik, {
        bold: true,
        size: 7,
        fill: '#e2e8f0',
        align: saga.has(i) ? 'right' : 'left',
      })
    })
    return y + satirH
  }

  let y = MARGIN
  font(doc, true)
  doc.fontSize(11).fillColor('#0f172a').text('T.C.', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 2
  doc.fontSize(12).text('ADAPAZARI BELEDİYE BAŞKANLIĞI', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 2
  font(doc, false)
  doc.fontSize(10).text('İnsan Kaynakları ve Eğitim Müdürlüğü', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 8
  font(doc, true)
  doc.fontSize(13).text('KİŞİ BORCU ÖDEME PLANI', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 12

  const kimlikH = 16
  const kolonW = icW / 2
  const etiketW = kolonW * 0.38
  const degerW = kolonW - etiketW
  const kimlikSatir = Math.ceil(girdi.kimlik.length / 2)
  for (let r = 0; r < kimlikSatir; r += 1) {
    const yy = y + r * kimlikH
    const cift = [girdi.kimlik[r * 2], girdi.kimlik[r * 2 + 1]]
    cift.forEach((satir, c) => {
      if (!satir) return
      const x = MARGIN + c * kolonW
      hucre(doc, x, yy, etiketW, kimlikH, satir.etiket, { size: 8, fill: '#f8fafc' })
      hucre(doc, x + etiketW, yy, degerW, kimlikH, satir.deger, { size: 8, bold: true })
    })
  }
  y += kimlikSatir * kimlikH + 10
  y = tabloBaslik(y)

  girdi.satirlar.forEach(satir => {
    if (y + satirH > YATAY_H - MARGIN) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: MARGIN })
      y = tabloBaslik(MARGIN)
    }
    satir.forEach((metin, i) => {
      const x = MARGIN + genislikler.slice(0, i).reduce((a, b) => a + b, 0)
      hucre(doc, x, y, genislikler[i], satirH, metin, {
        size: 7,
        align: saga.has(i) ? 'right' : 'left',
      })
    })
    y += satirH
  })

  y += 12
  font(doc, false)
  doc.fontSize(8)
  const notH = doc.heightOfString(girdi.not, { width: icW, lineGap: 2 })
  if (y + notH + 8 > YATAY_H - MARGIN) {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: MARGIN })
    y = MARGIN
  }
  doc.fillColor('#0f172a').text(girdi.not, MARGIN, y, { width: icW, align: 'left', lineGap: 2 })
  doc.end()
  return done
}
