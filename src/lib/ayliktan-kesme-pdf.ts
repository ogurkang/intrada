import path from 'node:path'
import PDFDocument from 'pdfkit'
import {
  katsayiTr,
  paraTr,
  YARIM_ZAMANLI_CUMLE,
  type AyliktanKesmeBordro,
} from '@/lib/ayliktan-kesme-hesap'

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

export async function ayliktanKesmePdfBuffer(bordro: AyliktanKesmeBordro): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN })
  const done = pdfBuffer(doc)
  const { kaynak, katsayi, satirlar, toplam, gosterge, yarim_zamanli } = bordro
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
  doc.fontSize(13).text('AYLIKTAN CEZA KESME BORDROSU', MARGIN, y, { width: icW, align: 'center' })
  y = doc.y + 14

  const solW = icW * 0.46
  const sagX = MARGIN + solW + 10
  const sagW = icW - solW - 10
  const satirH = 18
  const sol: Array<[string, string]> = [
    ['T.C. Kimlik No', kaynak.tckn || '—'],
    ['Adı ve Soyadı', kaynak.ad_soyad],
    ['Ünvanı', kaynak.unvan || '—'],
    ['Sicil No', kaynak.sicil_no],
    ['Derecesi', String(kaynak.derece)],
    ['Kademesi', String(kaynak.kademe)],
    ['Gösterge', String(gosterge)],
    ['Ödemeye Esas Ek Göstergesi', String(kaynak.ek_gosterge)],
    ['Özel Hizmet Tazminat Oranı', String(kaynak.oht_orani)],
    ['Yan Ödeme Göstergesi', String(kaynak.yan_odeme_gostergesi)],
    ['Kıdem Yılı', String(kaynak.kidem_yili)],
    ['Kesilecek Ceza Oranı', `1/${katsayi.payda}`],
  ]
  const etiketW = solW * 0.58
  sol.forEach(([etiket, deger], i) => {
    const yy = y + i * satirH
    hucre(doc, MARGIN, yy, etiketW, satirH, etiket, { size: 7.5, fill: '#f8fafc' })
    hucre(doc, MARGIN + etiketW, yy, solW - etiketW, satirH, deger, { size: 8, bold: true })
  })

  const katsayiSatir: Array<[string, string]> = [
    ['Maaş Katsayısı', katsayiTr(katsayi.maas)],
    ['Taban Aylık Katsayısı', katsayiTr(katsayi.tabanAylik)],
    ['Yan Ödeme Katsayısı', katsayiTr(katsayi.yanOdeme)],
  ]
  katsayiSatir.forEach(([etiket, deger], i) => {
    const yy = y + i * satirH
    hucre(doc, sagX, yy, sagW * 0.62, satirH, etiket, { size: 7.5, fill: '#f8fafc' })
    hucre(doc, sagX + sagW * 0.62, yy, sagW * 0.38, satirH, deger, { size: 8, bold: true, align: 'right' })
  })

  const tabloY = y + katsayiSatir.length * satirH + 8
  const col1 = sagW * 0.46
  const col2 = sagW * 0.27
  const col3 = sagW - col1 - col2
  hucre(doc, sagX, tabloY, col1, satirH, 'Maaş Unsurları', { bold: true, size: 7.5, fill: '#e2e8f0' })
  hucre(doc, sagX + col1, tabloY, col2, satirH, 'Maaş Tutarı', { bold: true, size: 7.5, align: 'right', fill: '#e2e8f0' })
  hucre(doc, sagX + col1 + col2, tabloY, col3, satirH, 'Kesinti', { bold: true, size: 7.5, align: 'right', fill: '#e2e8f0' })
  satirlar.forEach((s, i) => {
    const yy = tabloY + (i + 1) * satirH
    hucre(doc, sagX, yy, col1, satirH, s.ad, { size: 7.5 })
    hucre(doc, sagX + col1, yy, col2, satirH, paraTr(s.tutar), { size: 8, align: 'right' })
    hucre(doc, sagX + col1 + col2, yy, col3, satirH, paraTr(s.kesinti), { size: 8, align: 'right' })
  })
  const toplamY = tabloY + (satirlar.length + 1) * satirH
  const toplamH = satirH + 4
  hucre(doc, sagX, toplamY, col1 + col2, toplamH, 'Aylıktan ceza kesintisi', {
    bold: true,
    size: 7.5,
    fill: '#0f172a',
    color: '#ffffff',
  })
  hucre(doc, sagX + col1 + col2, toplamY, col3, toplamH, paraTr(toplam), {
    bold: true,
    size: 8,
    align: 'right',
    fill: '#0f172a',
    color: '#ffffff',
  })

  let imzaY = Math.max(y + sol.length * satirH, toplamY + satirH + 4) + 22
  if (yarim_zamanli) {
    font(doc, false)
    doc.fontSize(8).fillColor('#0f172a').text(YARIM_ZAMANLI_CUMLE, MARGIN, imzaY, { width: icW, align: 'left' })
    imzaY = doc.y + 22
  }
  const imzaW = (icW - 16) / 2
  font(doc, true)
  doc.fontSize(9).text('DÜZENLEYEN', MARGIN, imzaY, { width: imzaW, align: 'center' })
  doc.text('GERÇEKLEŞTİRME GÖREVLİSİ', MARGIN + imzaW + 16, imzaY, { width: imzaW, align: 'center' })
  font(doc, false)
  const yil = new Date().getFullYear()
  doc.fontSize(9).text(`…... / …... / ${yil}`, MARGIN, imzaY + 36, { width: imzaW, align: 'center' })
  doc.text(`…... / …... / ${yil}`, MARGIN + imzaW + 16, imzaY + 36, { width: imzaW, align: 'center' })

  doc.end()
  return done
}
