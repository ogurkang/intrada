import path from 'node:path'
import PDFDocument from 'pdfkit'
import { ANKET_GRAFIK_HEX, anketGenelYorum, anketSoruYorumu, anketTipEtiket, type AnketSoruSonuc } from '@/lib/anket'

const MARGIN = 42
const PAGE_W = 595.28
const PAGE_H = 841.89
const FONT_NORMAL = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
const FONT_BOLD = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')

type PdfDoc = InstanceType<typeof PDFDocument>

export type AnketRaporPdfSoru = {
  sira: number
  metin: string
  sonuc: AnketSoruSonuc
  kirilimlar: string[]
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

function pastaCiz(
  doc: PdfDoc,
  cx: number,
  cy: number,
  r: number,
  dilimler: { adet: number }[],
) {
  const toplam = dilimler.reduce((t, d) => t + d.adet, 0)
  if (toplam <= 0) {
    doc.circle(cx, cy, r).fill('#e2e8f0')
    return
  }
  let aci = -Math.PI / 2
  dilimler.forEach((dilim, i) => {
    if (dilim.adet <= 0) return
    const yay = (dilim.adet / toplam) * Math.PI * 2
    const renk = ANKET_GRAFIK_HEX[i % ANKET_GRAFIK_HEX.length]
    doc.save()
    doc.moveTo(cx, cy)
    const adim = Math.max(2, Math.ceil(yay / (Math.PI / 36)))
    for (let k = 0; k <= adim; k += 1) {
      const a = aci + (yay * k) / adim
      doc.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
    }
    doc.closePath().fill(renk)
    doc.restore()
    aci += yay
  })
}

export async function anketRaporPdfBuffer(girdi: {
  baslik: string
  katilim: number
  kurumMetin: string | null
  sorular: AnketRaporPdfSoru[]
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
  y = doc.y + 8
  doc.font(FONT_NORMAL).fontSize(9).fillColor('#334155').text(anketGenelYorum(girdi.katilim), MARGIN, y, { width: icW })
  y = doc.y + 8
  if (girdi.kurumMetin) {
    y = yerAc(doc, y, 40)
    doc.font(FONT_NORMAL).fontSize(9).fillColor('#334155').text(girdi.kurumMetin, MARGIN, y, { width: icW })
    y = doc.y + 8
  }
  y += 6

  for (const soru of girdi.sorular) {
    y = yerAc(doc, y, 70)
    doc.font(FONT_BOLD).fontSize(10).fillColor('#0f172a').text(
      `Soru ${soru.sira} · ${anketTipEtiket(soru.sonuc.tip)}`,
      MARGIN,
      y,
      { width: icW },
    )
    y = doc.y + 2
    doc.font(FONT_NORMAL).fontSize(10).text(soru.metin, MARGIN, y, { width: icW })
    y = doc.y + 8

    if (soru.sonuc.tip !== 'metin' && soru.sonuc.tip !== 'puan') {
      y = yerAc(doc, y, 120)
      pastaCiz(doc, MARGIN + 52, y + 52, 46, soru.sonuc.dagilim)
      let ly = y
      soru.sonuc.dagilim.forEach((dilim, i) => {
        const renk = ANKET_GRAFIK_HEX[i % ANKET_GRAFIK_HEX.length]
        doc.save()
        doc.rect(MARGIN + 120, ly + 2, 8, 8).fill(renk)
        doc.restore()
        doc.font(FONT_NORMAL).fontSize(9).fillColor('#0f172a').text(
          `${dilim.etiket}  ${dilim.adet} · %${dilim.yuzde}`,
          MARGIN + 134,
          ly,
          { width: icW - 134 },
        )
        ly = doc.y + 3
      })
      y = Math.max(y + 112, ly + 6)
    } else if (soru.sonuc.tip === 'metin') {
      if (soru.sonuc.metinler.length === 0) {
        doc.fontSize(9).fillColor('#64748b').text('Yazılı cevap yok.', MARGIN, y, { width: icW })
        y = doc.y + 6
      } else {
        soru.sonuc.metinler.forEach((metin, i) => {
          y = yerAc(doc, y, 24)
          doc.font(FONT_NORMAL).fontSize(9).fillColor('#0f172a').text(`${i + 1}. ${metin}`, MARGIN, y, { width: icW })
          y = doc.y + 4
        })
      }
    } else {
      const cubukW = 180
      soru.sonuc.dagilim.forEach((dilim, i) => {
        y = yerAc(doc, y, 18)
        const renk = ANKET_GRAFIK_HEX[i % ANKET_GRAFIK_HEX.length]
        doc.font(FONT_NORMAL).fontSize(9).fillColor('#0f172a').text(dilim.etiket, MARGIN, y, { width: 180, lineBreak: false })
        const barX = MARGIN + 190
        doc.save()
        doc.roundedRect(barX, y + 1, cubukW, 8, 2).fill('#e2e8f0')
        const dolu = Math.max(0, Math.min(cubukW, (dilim.yuzde / 100) * cubukW))
        if (dolu > 0) doc.roundedRect(barX, y + 1, dolu, 8, 2).fill(renk)
        doc.restore()
        doc.fillColor('#334155').text(`${dilim.adet} · %${dilim.yuzde}`, barX + cubukW + 8, y, { width: 80, lineBreak: false })
        y += 16
      })
    }

    y = yerAc(doc, y, 36)
    doc.font(FONT_BOLD).fontSize(9).fillColor('#475569').text('Yorum', MARGIN, y, { width: icW })
    y = doc.y + 2
    doc.font(FONT_NORMAL).fontSize(9).fillColor('#0f172a').text(anketSoruYorumu(soru.sonuc, soru.metin), MARGIN, y, { width: icW })
    y = doc.y + 6
    if (soru.kirilimlar.length > 0) {
      y = yerAc(doc, y, 28)
      doc.font(FONT_BOLD).fontSize(9).fillColor('#475569').text('Grup yorumu', MARGIN, y, { width: icW })
      y = doc.y + 2
      for (const satir of soru.kirilimlar) {
        y = yerAc(doc, y, 24)
        doc.font(FONT_NORMAL).fontSize(9).fillColor('#0f172a').text(satir, MARGIN, y, { width: icW })
        y = doc.y + 4
      }
    }
    y += 10
  }

  doc.end()
  return done
}
