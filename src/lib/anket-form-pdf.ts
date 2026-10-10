import path from 'node:path'
import PDFDocument from 'pdfkit'
import { ANKET_PUAN_OLCEK, anketTipEtiket, type AnketSoruTipi } from '@/lib/anket'

const MARGIN = 42
const PAGE_W = 595.28
const PAGE_H = 841.89
const FONT_NORMAL = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
const FONT_BOLD = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')

type PdfDoc = InstanceType<typeof PDFDocument>

export type AnketFormPdfSoru = {
  sira: number
  metin: string
  tip: AnketSoruTipi
  secenekler: string[]
}

function pdfBuffer(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

function yerAc(doc: PdfDoc, y: number, ihtiyac: number): number {
  if (y + ihtiyac <= PAGE_H - MARGIN) return y
  doc.addPage()
  return MARGIN
}

export async function anketFormPdfBuffer(girdi: {
  baslik: string
  aciklama: string
  sorular: AnketFormPdfSoru[]
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN })
  const done = pdfBuffer(doc)
  const icW = PAGE_W - MARGIN * 2
  let y = MARGIN

  doc.font(FONT_BOLD).fontSize(11).fillColor('#0f172a').text('T.C.', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 2
  doc.fontSize(12).text('ADAPAZARI BELEDİYE BAŞKANLIĞI', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 2
  doc.font(FONT_NORMAL).fontSize(10).text('İnsan Kaynakları ve Eğitim Müdürlüğü', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 12
  doc.font(FONT_BOLD).fontSize(14).text(girdi.baslik, MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 6
  if (girdi.aciklama.trim()) {
    doc.font(FONT_NORMAL).fontSize(9).fillColor('#334155').text(girdi.aciklama.trim(), MARGIN, y, { width: icW })
    y = doc.y + 8
  }
  doc.font(FONT_NORMAL).fontSize(9).fillColor('#334155').text(
    'Bu form boştur. Cevap ad ve sicil olmadan anket bağlantısından gönderilir.',
    MARGIN,
    y,
    { width: icW },
  )
  y = doc.y + 14

  if (girdi.sorular.length === 0) {
    doc.font(FONT_NORMAL).fontSize(10).fillColor('#64748b').text('Bu ankette soru yok.', MARGIN, y, { width: icW })
  }

  for (const soru of girdi.sorular) {
    y = yerAc(doc, y, 48)
    doc.font(FONT_BOLD).fontSize(10).fillColor('#0f172a').text(
      `Soru ${soru.sira} · ${anketTipEtiket(soru.tip)}`,
      MARGIN,
      y,
      { width: icW },
    )
    y = doc.y + 2
    doc.font(FONT_NORMAL).fontSize(10).text(soru.metin, MARGIN, y, { width: icW })
    y = doc.y + 8

    if (soru.tip === 'metin') {
      for (let i = 0; i < 3; i += 1) {
        y = yerAc(doc, y, 18)
        doc.moveTo(MARGIN, y + 12).lineTo(MARGIN + icW, y + 12).strokeColor('#cbd5e1').stroke()
        y += 18
      }
    } else if (soru.tip === 'puan') {
      y = yerAc(doc, y, 36)
      ;[1, 2, 3, 4, 5].forEach((puan, i) => {
        const x = MARGIN + i * 36
        doc.circle(x + 8, y + 8, 7).strokeColor('#334155').stroke()
        doc.font(FONT_NORMAL).fontSize(9).fillColor('#0f172a').text(String(puan), x + 18, y + 4, { lineBreak: false })
      })
      y += 22
      doc.font(FONT_NORMAL).fontSize(8).fillColor('#64748b').text(ANKET_PUAN_OLCEK, MARGIN, y, { width: icW })
      y = doc.y + 8
    } else {
      const secenekler = soru.tip === 'evet_hayir' ? ['Evet', 'Hayır'] : soru.secenekler
      for (const secenek of secenekler) {
        y = yerAc(doc, y, 18)
        if (soru.tip === 'coklu_secim') {
          doc.rect(MARGIN, y, 10, 10).strokeColor('#334155').stroke()
        } else {
          doc.circle(MARGIN + 5, y + 5, 5).strokeColor('#334155').stroke()
        }
        doc.font(FONT_NORMAL).fontSize(10).fillColor('#0f172a').text(secenek, MARGIN + 18, y - 1, { width: icW - 18 })
        y = Math.max(y + 16, doc.y + 4)
      }
    }
    y += 8
  }

  doc.end()
  return done
}
