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

/** A4 kenar boşluğu: 2,5 cm. */
const MARGIN = (25 / 25.4) * 72
const A4_W = 595.28
const A4_H = 841.89

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

function satirAraligi(doc: PdfDoc, fontSize: number, satir = 1): number {
  font(doc, false)
  doc.fontSize(fontSize)
  return doc.currentLineHeight(true) * satir
}

function besSatir(doc: PdfDoc, fontSize: number): number {
  return satirAraligi(doc, fontSize, 5)
}

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
  const pad = 1.5
  doc.text(text, x + pad, y + Math.max(1, (h - size) / 2 - 1), {
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

/** Ad soyad satırı (index) kalın; diğerleri normal. */
function imzaBlok(doc: PdfDoc, x: number, y: number, w: number, satirlar: string[], adSoyadIndex = 0) {
  let yy = y
  satirlar.forEach((s, i) => {
    const metin = String(s ?? '').trim()
    if (!metin) return
    font(doc, i === adSoyadIndex)
    doc.fontSize(8).text(metin, x, yy, { width: w, align: 'center', lineGap: 0 })
    yy = doc.y + 2
  })
  return yy
}

export async function yzcPdfBuffer(alanlar: YzcBelgeAlanlari): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margin: MARGIN,
    autoFirstPage: true,
  })
  const bufPromise = pdfBuffer(doc)

  const portraitW = A4_W - MARGIN * 2
  let y = MARGIN

  // —— Sayfa 1: Dilekçe (dikey) ——
  const bodySize = 11
  font(doc, false)
  doc.fontSize(bodySize).text(alanlar.tarih, MARGIN, y, { width: portraitW, align: 'right', lineGap: 0 })
  y = doc.y + besSatir(doc, bodySize)
  font(doc, true)
  doc.fontSize(12).text(YZC_MAKAM, MARGIN, y, { width: portraitW, align: 'center', lineGap: 0 })
  y = doc.y + 3
  font(doc, false)
  doc.fontSize(bodySize).text(YZC_BIRIM, MARGIN, y, { width: portraitW, align: 'center', lineGap: 0 })
  y = doc.y + 14
  doc.text(alanlar.metin, MARGIN, y, { width: portraitW, align: 'justify', indent: 28, lineGap: 1.5 })
  y = doc.y + besSatir(doc, bodySize)

  const imzaX = MARGIN + portraitW * 0.55
  const imzaW = portraitW * 0.45
  font(doc, false)
  doc.fontSize(bodySize).text(alanlar.tckn, imzaX, y, { width: imzaW, align: 'center', lineGap: 0 })
  font(doc, true)
  doc.fontSize(bodySize).text(alanlar.ad_soyad.toLocaleUpperCase('tr-TR'), imzaX, doc.y + 2, {
    width: imzaW,
    align: 'center',
    lineGap: 0,
  })

  // —— Sayfa 2: Ek (yatay A4, 2,5 cm kenar) ——
  doc.addPage({ size: 'A4', layout: 'landscape', margin: MARGIN })
  const pageW = A4_H
  const pageH = A4_W
  const contentW = pageW - MARGIN * 2
  const bottomLimit = pageH - MARGIN
  y = MARGIN
  const tabloX = MARGIN

  font(doc, true)
  doc.fontSize(10).text('EK — YARI ZAMANLI ÇALIŞMA FORMU', MARGIN, y, { width: contentW, align: 'center' })
  y = doc.y + 6

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

  const yarimW = contentW / 2
  const etiketW = yarimW * 0.38
  const degerW = yarimW * 0.62
  const satirH = 14

  hucreCiz(doc, tabloX, y, contentW, satirH, 'PERSONEL BİLGİLERİ', { bold: true, center: true, size: 8 })
  y += satirH

  for (let i = 0; i < bilgiSatirlar.length; i += 2) {
    const [e1, d1] = bilgiSatirlar[i]
    hucreCiz(doc, tabloX, y, etiketW, satirH, e1, { bold: true, size: 7 })
    hucreCiz(doc, tabloX + etiketW, y, degerW, satirH, d1, { size: 7 })
    const sagX = tabloX + yarimW
    if (i + 1 < bilgiSatirlar.length) {
      const [e2, d2] = bilgiSatirlar[i + 1]
      hucreCiz(doc, sagX, y, etiketW, satirH, e2, { bold: true, size: 7 })
      hucreCiz(doc, sagX + etiketW, y, degerW, satirH, d2, { size: 7 })
    } else {
      hucreCiz(doc, sagX, y, yarimW, satirH, '', { size: 7 })
    }
    y += satirH
  }

  y += 6
  font(doc, true)
  doc.fontSize(8).text('Ek — Haftalık Çalışma Programı', MARGIN, y, { width: contentW, align: 'left' })
  y = doc.y + 4

  const ogleIdx = YZC_SAATLER.indexOf('13:30')
  const saatBasliklari: string[] = ['Gün']
  YZC_SAATLER.forEach((saat, idx) => {
    saatBasliklari.push(saat.slice(0, 5))
    if (idx === ogleIdx - 1) saatBasliklari.push('Öğle')
  })
  const colCount = saatBasliklari.length
  const colW = contentW / colCount

  // İmza + açıklama için altta yer ayır; kalan alanı programa yay.
  const imzaAlanH = 52
  const aciklamaAlanH = 78
  const dipNotH = 22
  const gridSatirSayisi = 1 + YZC_GUNLER.length
  const kalanH = Math.max(90, bottomLimit - y - aciklamaAlanH - dipNotH - imzaAlanH - 8)
  const gridH = Math.max(12, Math.floor(kalanH / gridSatirSayisi))
  const baslikFont = gridH >= 18 ? 6.5 : 5.5
  const hucreFont = gridH >= 18 ? 8 : 6.5

  saatBasliklari.forEach((h, i) => {
    hucreCiz(doc, tabloX + i * colW, y, colW, gridH, h, { bold: true, center: true, size: baslikFont })
  })
  y += gridH

  for (const gun of YZC_GUNLER) {
    const secili = new Set(alanlar.calisma_programi[gun] ?? [])
    let col = 0
    hucreCiz(doc, tabloX, y, colW, gridH, GUN_KISA[gun] ?? gun, { bold: true, center: true, size: hucreFont })
    col++
    YZC_SAATLER.forEach((saat, idx) => {
      hucreCiz(doc, tabloX + col * colW, y, colW, gridH, secili.has(saat) ? 'X' : '', {
        center: true,
        size: hucreFont,
      })
      col++
      if (idx === ogleIdx - 1) {
        hucreCiz(doc, tabloX + col * colW, y, colW, gridH, '', { center: true, size: hucreFont })
        col++
      }
    })
    y += gridH
  }

  y += 5
  font(doc, true)
  doc.fontSize(7).text('AÇIKLAMALAR', MARGIN, y, { lineGap: 0 })
  y = doc.y + 2

  const aciklamalar = YZC_ACIKLAMALAR.map((metin, i) => `${i + 1}-${metin}`)
  y = ikiKolonMetin(doc, aciklamalar, MARGIN, y, contentW, 10, { size: 5.2, lineGap: 0.2 })

  font(doc, false)
  doc.fontSize(5.2).text('*Yarı Zamanlı Çalışma Başkanlık Oluru ile yürürlüğe girer.', MARGIN, y + 2, {
    width: contentW,
    lineGap: 0,
  })
  doc.text(
    '** Mezkur yönetmeliğin "Yarı Zamanlı Çalışma hakkının sona erme halleri" başlıklı 15. maddesindeki hükümler saklıdır.',
    MARGIN,
    doc.y + 1,
    { width: contentW, lineGap: 0 },
  )
  y = doc.y + 8

  // İmza: sol personel (TC / ad soyad / unvan), sağ müdür (ad soyad / unvan)
  const imzaY = Math.min(y + 4, bottomLimit - imzaAlanH)
  const kolonW = contentW * 0.38
  const solX = MARGIN
  const sagX = MARGIN + contentW - kolonW

  imzaBlok(
    doc,
    solX,
    imzaY,
    kolonW,
    [alanlar.tckn, alanlar.ad_soyad.toLocaleUpperCase('tr-TR'), alanlar.unvan],
    1,
  )

  imzaBlok(
    doc,
    sagX,
    imzaY,
    kolonW,
    [alanlar.mudur_ad_soyad.toLocaleUpperCase('tr-TR'), alanlar.mudur_unvan],
    0,
  )

  doc.end()
  return bufPromise
}
