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

export function evrakImzaCiz(doc: PdfDoc, y: number, imza?: EvrakImzaAd) {
  const icW = PAGE_W - MARGIN * 2
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
