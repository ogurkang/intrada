import path from 'node:path'
import PDFDocument from 'pdfkit'
import {
  YZC_ACIKLAMALAR,
  YZC_BIRIM,
  YZC_GUNLER,
  YZC_MAKAM,
  YZC_SAATLER,
  type YzcBelgeAlanlari,
} from '@/lib/yari-zamanli-calisma-belge'

const MARGIN = 18
const PAGE_W = 595.28
const PAGE_H = 841.89
const CONTENT_W = PAGE_W - MARGIN * 2

const FONT_NORMAL = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
const FONT_BOLD = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')

const GUN_KISA: Record<string, string> = {
  Pazartesi: 'Pzt',
  Salı: 'Sal',
  Çarşamba: 'Çar',
  Perşembe: 'Per',
  Cuma: 'Cum',
}

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

function hucreCiz(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  opts?: { bold?: boolean; center?: boolean; size?: number },
) {
  doc.rect(x, y, w, h).stroke()
  const size = opts?.size ?? 5.5
  font(doc, opts?.bold)
  doc.fontSize(size)
  const pad = 1
  doc.text(text, x + pad, y + (h - size) / 2 - 1, {
    width: w - pad * 2,
    align: opts?.center ? 'center' : 'left',
    lineBreak: false,
  })
}

function ikiKolonMetin(
  doc: PdfDoc,
  items: string[],
  x: number,
  y: number,
  width: number,
  gap: number,
  opts: { size: number; lineGap: number },
): number {
  const colW = (width - gap) / 2
  const rightX = x + colW + gap
  let leftY = y
  let rightY = y

  items.forEach((metin, i) => {
    font(doc, false)
    doc.fontSize(opts.size)
    if (i % 2 === 0) {
      doc.text(metin, x, leftY, { width: colW, align: 'justify', lineGap: opts.lineGap })
      leftY = doc.y
    } else {
      doc.text(metin, rightX, rightY, { width: colW, align: 'justify', lineGap: opts.lineGap })
      rightY = doc.y
    }
  })

  return Math.max(leftY, rightY)
}

export async function yzcPdfBuffer(alanlar: YzcBelgeAlanlari): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: true })
  const bufPromise = pdfBuffer(doc)

  let y = MARGIN

  // —— Dilekçe (kompakt) ——
  font(doc, false)
  doc.fontSize(8).text(alanlar.tarih, MARGIN, y, { width: CONTENT_W, align: 'right', lineGap: 0 })
  y = doc.y + 4
  font(doc, true)
  doc.fontSize(9).text(YZC_MAKAM, MARGIN, y, { width: CONTENT_W, align: 'center', lineGap: 0 })
  y = doc.y + 2
  font(doc, false)
  doc.fontSize(8).text(YZC_BIRIM, MARGIN, y, { width: CONTENT_W, align: 'center', lineGap: 0 })
  y = doc.y + 6
  doc.text(alanlar.metin, MARGIN, y, { width: CONTENT_W, align: 'justify', indent: 16, lineGap: 0.5 })
  y = doc.y + 10

  const imzaX = MARGIN + CONTENT_W * 0.58
  const imzaW = CONTENT_W * 0.42
  font(doc, false)
  doc.fontSize(8).text(alanlar.tckn, imzaX, y, { width: imzaW, align: 'center', lineGap: 0 })
  font(doc, true)
  doc.fontSize(8).text(alanlar.ad_soyad.toLocaleUpperCase('tr-TR'), imzaX, doc.y + 1, {
    width: imzaW,
    align: 'center',
    lineGap: 0,
  })
  y = doc.y + 8

  // —— Ek form ——
  font(doc, true)
  doc.fontSize(7.5).text('EK — YARI ZAMANLI ÇALIŞMA FORMU', MARGIN, y, { width: CONTENT_W, align: 'center' })
  y = doc.y + 4

  const bilgiSatirlar: [string, string][] = [
    ['Adı Soyadı', alanlar.ad_soyad],
    ['Görev Birimi', alanlar.mudurluk],
    ['TCKN', alanlar.tckn],
    ['Çocuk Doğum', alanlar.cocuk_dogum_tarihi],
    ['Kadro Unvanı', alanlar.unvan],
    ['YZ Başlangıç', alanlar.yari_zamanli_baslangic_tarihi],
    ['Sicil No', alanlar.sicil_no],
    ['Normal Dönüş', alanlar.normal_zamanli_donus_tarihi],
  ]

  const tabloX = MARGIN
  const yarimW = CONTENT_W / 2
  const etiketW = yarimW * 0.42
  const degerW = yarimW * 0.58
  const satirH = 10

  hucreCiz(doc, tabloX, y, CONTENT_W, satirH, 'PERSONEL BİLGİLERİ', { bold: true, center: true, size: 6.5 })
  y += satirH

  for (let i = 0; i < bilgiSatirlar.length; i += 2) {
    const [e1, d1] = bilgiSatirlar[i]
    hucreCiz(doc, tabloX, y, etiketW, satirH, e1, { bold: true, size: 5.5 })
    hucreCiz(doc, tabloX + etiketW, y, degerW, satirH, d1, { size: 5.5 })
    const sagX = tabloX + yarimW
    if (i + 1 < bilgiSatirlar.length) {
      const [e2, d2] = bilgiSatirlar[i + 1]
      hucreCiz(doc, sagX, y, etiketW, satirH, e2, { bold: true, size: 5.5 })
      hucreCiz(doc, sagX + etiketW, y, degerW, satirH, d2, { size: 5.5 })
    } else {
      hucreCiz(doc, sagX, y, yarimW, satirH, '', { size: 5.5 })
    }
    y += satirH
  }

  y += 3
  const ogleIdx = YZC_SAATLER.indexOf('13:30')
  const saatBasliklari: string[] = ['Gün']
  YZC_SAATLER.forEach((saat, idx) => {
    saatBasliklari.push(saat.slice(0, 5))
    if (idx === ogleIdx - 1) saatBasliklari.push('Öğle')
  })
  const colCount = saatBasliklari.length
  const colW = CONTENT_W / colCount
  const gridH = 8

  saatBasliklari.forEach((h, i) => {
    hucreCiz(doc, tabloX + i * colW, y, colW, gridH, h, { bold: true, center: true, size: 4 })
  })
  y += gridH

  for (const gun of YZC_GUNLER) {
    const secili = new Set(alanlar.calisma_programi[gun] ?? [])
    let col = 0
    hucreCiz(doc, tabloX, y, colW, gridH, GUN_KISA[gun] ?? gun, { bold: true, center: true, size: 4.5 })
    col++
    YZC_SAATLER.forEach((saat, idx) => {
      hucreCiz(doc, tabloX + col * colW, y, colW, gridH, secili.has(saat) ? 'X' : '', {
        center: true,
        size: 4.5,
      })
      col++
      if (idx === ogleIdx - 1) {
        hucreCiz(doc, tabloX + col * colW, y, colW, gridH, '', { center: true, size: 4.5 })
        col++
      }
    })
    y += gridH
  }

  y += 3
  font(doc, true)
  doc.fontSize(5.5).text('AÇIKLAMALAR', MARGIN, y, { lineGap: 0 })
  y = doc.y + 1

  const aciklamalar = YZC_ACIKLAMALAR.map((metin, i) => `${i + 1}-${metin}`)
  y = ikiKolonMetin(doc, aciklamalar, MARGIN, y, CONTENT_W, 6, { size: 4.8, lineGap: 0.1 })

  font(doc, false)
  doc.fontSize(4.8).text('*Yarı Zamanlı Çalışma Başkanlık Oluru ile yürürlüğe girer.', MARGIN, y + 1, {
    width: CONTENT_W,
    lineGap: 0,
  })
  doc.text(
    '** Mezkur yönetmeliğin "Yarı Zamanlı Çalışma hakkının sona erme halleri" başlıklı 15. maddesindeki hükümler saklıdır.',
    MARGIN,
    doc.y + 0.5,
    { width: CONTENT_W, lineGap: 0 },
  )

  // Taşma kontrolü — gerekirse font biraz daha küçült (tek sayfa hedefi)
  if (doc.y > PAGE_H - MARGIN) {
    // Bu noktaya gelinmemeli; layout yukarıda tek sayfaya göre ayarlandı.
  }

  doc.end()
  return bufPromise
}
