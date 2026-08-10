import PDFDocument from 'pdfkit'
import {
  YZC_ACIKLAMALAR,
  YZC_BIRIM,
  YZC_GUNLER,
  YZC_MAKAM,
  YZC_SAATLER,
  type YzcBelgeAlanlari,
} from '@/lib/yari-zamanli-calisma-belge'

const MARGIN = 28
const PAGE_W = 595.28
const CONTENT_W = PAGE_W - MARGIN * 2

function pdfBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

function hucreCiz(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  opts?: { bold?: boolean; center?: boolean; size?: number },
) {
  doc.rect(x, y, w, h).stroke()
  const size = opts?.size ?? 6
  doc.font(opts?.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
  const pad = 1.5
  doc.text(text, x + pad, y + pad, {
    width: w - pad * 2,
    height: h - pad * 2,
    align: opts?.center ? 'center' : 'left',
    lineBreak: false,
  })
}

export async function yzcPdfBuffer(alanlar: YzcBelgeAlanlari): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: true })
  const bufPromise = pdfBuffer(doc)

  // —— Dilekçe ——
  doc.font('Helvetica').fontSize(9).text(alanlar.tarih, MARGIN, MARGIN, { width: CONTENT_W, align: 'right' })
  doc.moveDown(0.6)
  doc.font('Helvetica-Bold').fontSize(10).text(YZC_MAKAM, { width: CONTENT_W, align: 'center' })
  doc.font('Helvetica').fontSize(9).text(YZC_BIRIM, { width: CONTENT_W, align: 'center' })
  doc.moveDown(0.8)
  doc.font('Helvetica').fontSize(9).text(alanlar.metin, {
    width: CONTENT_W,
    align: 'justify',
    indent: 24,
    lineGap: 1,
  })
  doc.moveDown(1.2)
  const imzaY = doc.y
  doc.font('Helvetica').fontSize(9).text(alanlar.tckn, MARGIN + CONTENT_W * 0.55, imzaY, {
    width: CONTENT_W * 0.45,
    align: 'center',
  })
  doc.font('Helvetica-Bold').fontSize(9).text(alanlar.ad_soyad.toLocaleUpperCase('tr-TR'), {
    width: CONTENT_W * 0.45,
    align: 'center',
  })

  // —— Ek form (aynı sayfada, kompakt) ——
  doc.moveDown(1.4)
  doc.font('Helvetica-Bold').fontSize(8).text('EK — YARI ZAMANLI ÇALIŞMA FORMU', { width: CONTENT_W, align: 'center' })
  doc.moveDown(0.35)

  const bilgiSatirlar: [string, string][] = [
    ['Adı Soyadı', alanlar.ad_soyad],
    ['Görev Yaptığı Birim', alanlar.mudurluk],
    ['TCKN', alanlar.tckn],
    ['Çocuğun Doğum Tarihi', alanlar.cocuk_dogum_tarihi],
    ['Kadro Unvanı', alanlar.unvan],
    ['Yarı Zamanlı Başlangıç', alanlar.yari_zamanli_baslangic_tarihi],
    ['Sicil No', alanlar.sicil_no],
    ['Normal Zamanlı Dönüş', alanlar.normal_zamanli_donus_tarihi],
  ]

  const tabloX = MARGIN
  let tabloY = doc.y
  const etiketW = CONTENT_W * 0.38
  const degerW = CONTENT_W * 0.62
  const satirH = 11

  hucreCiz(doc, tabloX, tabloY, CONTENT_W, satirH, 'PERSONEL BİLGİLERİ', { bold: true, center: true, size: 7 })
  tabloY += satirH
  for (const [etiket, deger] of bilgiSatirlar) {
    hucreCiz(doc, tabloX, tabloY, etiketW, satirH, etiket, { bold: true, size: 6 })
    hucreCiz(doc, tabloX + etiketW, tabloY, degerW, satirH, deger, { size: 6 })
    tabloY += satirH
  }

  tabloY += 4
  const ogleIdx = YZC_SAATLER.indexOf('13:30')
  const saatBasliklari: string[] = ['Günler']
  YZC_SAATLER.forEach((saat, idx) => {
    saatBasliklari.push(saat)
    if (idx === ogleIdx - 1) saatBasliklari.push('ÖĞLE')
  })
  const colCount = saatBasliklari.length
  const colW = CONTENT_W / colCount
  const gridH = 9

  saatBasliklari.forEach((h, i) => {
    hucreCiz(doc, tabloX + i * colW, tabloY, colW, gridH, h, { bold: true, center: true, size: 4.5 })
  })
  tabloY += gridH

  for (const gun of YZC_GUNLER) {
    const secili = new Set(alanlar.calisma_programi[gun] ?? [])
    let col = 0
    hucreCiz(doc, tabloX, tabloY, colW, gridH, gun, { bold: true, size: 5 })
    col++
    YZC_SAATLER.forEach((saat, idx) => {
      hucreCiz(doc, tabloX + col * colW, tabloY, colW, gridH, secili.has(saat) ? 'X' : '', {
        center: true,
        size: 5,
      })
      col++
      if (idx === ogleIdx - 1) {
        hucreCiz(doc, tabloX + col * colW, tabloY, colW, gridH, '', { center: true, size: 5 })
        col++
      }
    })
    tabloY += gridH
  }

  tabloY += 3
  doc.y = tabloY
  doc.font('Helvetica-Bold').fontSize(6).text('AÇIKLAMALAR', MARGIN, tabloY)
  doc.moveDown(0.15)
  doc.font('Helvetica').fontSize(5.2)
  YZC_ACIKLAMALAR.forEach((metin, i) => {
    doc.text(`${i + 1}-${metin}`, { width: CONTENT_W, align: 'justify', lineGap: 0.2 })
  })
  doc.moveDown(0.2)
  doc.fontSize(5.2).text('*Yarı Zamanlı Çalışma Başkanlık Oluru ile yürürlüğe girer.', { width: CONTENT_W })
  doc.text(
    '** Mezkur yönetmeliğin "Yarı Zamanlı Çalışma hakkının sona erme halleri" başlıklı 15. maddesindeki hükümler saklıdır.',
    { width: CONTENT_W },
  )

  doc.end()
  return bufPromise
}
