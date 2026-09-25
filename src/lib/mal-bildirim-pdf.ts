import path from 'node:path'
import PDFDocument from 'pdfkit'
import { malBildirimFormVerisi, type MalBildirimFormKayit, type MalExcelPersonelBilgi } from '@/lib/mal-bildirim-excel'

const FONT_NORMAL = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
const FONT_BOLD = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')

/** A4 dikey. Yazdırılabilir alan her kenardan 2,5 cm içeride. */
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = (2.5 / 2.54) * 72
const CONTENT_W = PAGE_W - MARGIN * 2

const YASAL =
  '3628 sayılı kanunun 2. ve Mal Bildiriminde Bulunması Hakkında Yönetmeliğin 8. maddesine göre mal bildiriminde bulunacak olanlar kendileri ile eşleri ve velayetleri altındaki çocuklarının taşınır ve taşınmaz malları ile arsa ve yapı kooperatifi gibi kooperatiflerde bulunan hisselerini değerleri ne olursa olsun formun 2. ve 3. bölümlerine kaydetmek zorundadırlar. Formun 4-8. bölümlerine kaydedilmesi gereken her türlü kara, deniz ve hava taşıt araçları, traktör, biçerdöver, harman makineleri ve diğer ziraat araçları, inşaat ve iş makineleri, hayvanlar, koleksiyon ve antika ev eşyaları ile hakları, alacaklar, borçlar ve gelirlerden, kendilerine ödeme yapılanlara aylık net ödemenin, ödeme yapılmayanlara ise GİH sınıfındaki 1. derece şube aylık net ödemenin, beş katından fazla tutardaki kısmı beyan edilir.'

const NOTLAR = [
  '1) Yakınlığı sütununa kendi eşi ve çocukları yazılacaktır.',
  '2) Bu bölüme “bina”, “arsa” veya “arazi” yazılacaktır.',
  '3) Bu bölüme kara, deniz veya hava ulaşım araçları yazılacaktır.',
  '4) Silah, pul, diğer koleksiyonlar, antikalar, kıymetli tablolar, hayvanlar vs.',
  '5) Yurt içindeki veya yurt dışındaki bankalar ile özel finans kurumlarında bulunan para veya menkul değerler yazılacaktır.',
  '6) Tüzel kişilerde unvan yazılacaktır.',
  '7) Menkul mallara ait ihtira beratı, alameti farika ve telif hakkı gibi haklar yazılacaktır.',
]

type PdfDoc = InstanceType<typeof PDFDocument>
type Hucre = { metin: string; oran: number }

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

function metinYukseklik(doc: PdfDoc, metin: string, genislik: number, boyut: number, bold = false) {
  font(doc, bold)
  doc.fontSize(boyut)
  return doc.heightOfString(metin || ' ', { width: Math.max(8, genislik - 4) })
}

function hucreCiz(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  metin: string,
  opts?: { bold?: boolean; boyut?: number; zemin?: string; orta?: boolean },
) {
  if (opts?.zemin) doc.save().fillColor(opts.zemin).rect(x, y, w, h).fill().restore()
  doc.save().lineWidth(0.4).strokeColor('#334155').rect(x, y, w, h).stroke().restore()
  font(doc, opts?.bold)
  doc.fillColor('#0f172a').fontSize(opts?.boyut ?? 6.5)
  doc.text(metin || '', x + 2, y + 2, {
    width: Math.max(8, w - 4),
    height: Math.max(8, h - 4),
    align: opts?.orta ? 'center' : 'left',
  })
}

function satirYuksekligi(doc: PdfDoc, hucreler: Hucre[], boyut: number, bold: boolean) {
  let h = 11
  for (const hucre of hucreler) {
    const w = CONTENT_W * hucre.oran
    h = Math.max(h, metinYukseklik(doc, hucre.metin, w, boyut, bold) + 5)
  }
  return Math.min(h, 72)
}

function sayfaSigdir(doc: PdfDoc, y: number, ihtiyac: number) {
  if (y + ihtiyac <= PAGE_H - MARGIN) return y
  doc.addPage({ size: 'A4', layout: 'portrait', margin: MARGIN })
  return MARGIN
}

function satirCiz(doc: PdfDoc, y: number, hucreler: Hucre[], opts?: { bold?: boolean; boyut?: number; zemin?: string; orta?: boolean }) {
  const boyut = opts?.boyut ?? 6.5
  const h = satirYuksekligi(doc, hucreler, boyut, Boolean(opts?.bold))
  const sonraki = sayfaSigdir(doc, y, h)
  let x = MARGIN
  for (const hucre of hucreler) {
    const w = CONTENT_W * hucre.oran
    hucreCiz(doc, x, sonraki, w, h, hucre.metin, { ...opts, boyut })
    x += w
  }
  return sonraki + h
}

function bolumBaslik(doc: PdfDoc, y: number, no: string, baslik: string) {
  return satirCiz(
    doc,
    y + 4,
    [
      { metin: no, oran: 0.12 },
      { metin: baslik, oran: 0.88 },
    ],
    { bold: true, boyut: 7.5, zemin: '#e2e8f0', orta: true },
  )
}

function tablo(
  doc: PdfDoc,
  y: number,
  basliklar: Hucre[],
  govde: Hucre[][],
) {
  let sonraki = satirCiz(doc, y, basliklar, { bold: true, boyut: 6, zemin: '#f8fafc', orta: true })
  const satirlar = govde.length > 0 ? govde : [basliklar.map(h => ({ metin: '', oran: h.oran }))]
  for (const satir of satirlar) {
    sonraki = satirCiz(doc, sonraki, satir, { boyut: 6.5 })
  }
  return sonraki
}

export async function malBildirimPdfBuffer(
  kayit: MalBildirimFormKayit,
  personel: MalExcelPersonelBilgi,
): Promise<Buffer> {
  const veri = malBildirimFormVerisi(kayit)
  const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: MARGIN, autoFirstPage: true })
  const bufPromise = pdfBuffer(doc)
  font(doc, false)

  let y = MARGIN
  y = satirCiz(doc, y, [
    { metin: 'MAL BİLDİRİMİ FORMU', oran: 0.34 },
    { metin: 'KURUMU', oran: 0.12 },
    { metin: 'ADAPAZARI BELEDİYESİ', oran: 0.54 },
  ], { bold: true, boyut: 9, zemin: '#f1f5f9', orta: true })

  y = satirCiz(doc, y, [
    { metin: 'GÖREVİ', oran: 0.16 },
    { metin: personel.gorevUnvani || personel.kadroUnvani, oran: 0.84 },
  ], { boyut: 7.5 })
  y = satirCiz(doc, y, [
    { metin: 'SİCİL NO', oran: 0.16 },
    { metin: veri.sicil, oran: 0.42 },
    { metin: 'TC KİMLİK NO', oran: 0.16 },
    { metin: personel.tckn, oran: 0.26 },
  ], { boyut: 7.5 })

  const yasalH = Math.max(28, metinYukseklik(doc, YASAL, CONTENT_W, 6) + 6)
  y = sayfaSigdir(doc, y, yasalH)
  hucreCiz(doc, MARGIN, y, CONTENT_W, yasalH, YASAL, { boyut: 6 })
  y += yasalH

  y = satirCiz(doc, y, [
    { metin: 'Net Maaş', oran: 0.16 },
    { metin: veri.sonNetFmt, oran: 0.34 },
    { metin: 'Net Maaş x 5', oran: 0.16 },
    { metin: veri.sonNetX5, oran: 0.34 },
  ], { boyut: 7.5 })

  y = bolumBaslik(doc, y, 'BÖLÜM-1', 'KİMLİK BİLGİLERİ')
  y = tablo(
    doc,
    y,
    [
      { metin: 'Sıra', oran: 0.06 },
      { metin: 'Adı ve Soyadı', oran: 0.28 },
      { metin: 'Doğum Tarihi', oran: 0.14 },
      { metin: 'Doğum Yeri', oran: 0.18 },
      { metin: 'Yakınlığı', oran: 0.14 },
      { metin: 'TC Kimlik No', oran: 0.2 },
    ],
    veri.kimlik.map((row, i) => [
      { metin: String(i + 1), oran: 0.06 },
      { metin: row.adSoyad, oran: 0.28 },
      { metin: row.dogumTarihi, oran: 0.14 },
      { metin: row.dogumYeri, oran: 0.18 },
      { metin: row.yakinlik, oran: 0.14 },
      { metin: row.tckn, oran: 0.2 },
    ]),
  )

  y = bolumBaslik(doc, y, 'BÖLÜM-2', 'TAŞINMAZ MAL BİLGİLERİ')
  y = tablo(
    doc,
    y,
    [
      { metin: 'Sıra', oran: 0.06 },
      { metin: 'Taşınmaz Cinsi', oran: 0.12 },
      { metin: 'Adresi', oran: 0.32 },
      { metin: 'Hisse', oran: 0.1 },
      { metin: 'Değeri', oran: 0.12 },
      { metin: 'Edinme Tarihi', oran: 0.12 },
      { metin: 'Malikin TC Kimlik No', oran: 0.16 },
    ],
    veri.tasinmaz.map((row, i) => [
      { metin: String(i + 1), oran: 0.06 },
      { metin: row.cins, oran: 0.12 },
      { metin: row.adres, oran: 0.32 },
      { metin: row.hisse, oran: 0.1 },
      { metin: row.deger, oran: 0.12 },
      { metin: row.edinmeTr, oran: 0.12 },
      { metin: row.malikTc, oran: 0.16 },
    ]),
  )

  y = bolumBaslik(doc, y, 'BÖLÜM-3', 'KOOPERATİF BİLGİLERİ')
  y = tablo(
    doc,
    y,
    [
      { metin: 'Sıra', oran: 0.06 },
      { metin: 'Kooperatifin Adı ve Yeri', oran: 0.4 },
      { metin: 'Hisse Değeri', oran: 0.16 },
      { metin: 'Üyelik Tarihi', oran: 0.16 },
      { metin: 'Hissedarın TC Kimlik No', oran: 0.22 },
    ],
    veri.kooperatif.map((row, i) => [
      { metin: String(i + 1), oran: 0.06 },
      { metin: row.adiYeri, oran: 0.4 },
      { metin: row.hisseDegeri, oran: 0.16 },
      { metin: row.uyelikTr, oran: 0.16 },
      { metin: row.hissedarTc, oran: 0.22 },
    ]),
  )

  y = bolumBaslik(doc, y, 'BÖLÜM-4A', 'TAŞIT BİLGİLERİ')
  y = tablo(
    doc,
    y,
    [
      { metin: 'Sıra', oran: 0.06 },
      { metin: 'Cinsi', oran: 0.1 },
      { metin: 'Plaka', oran: 0.1 },
      { metin: 'Marka / Model', oran: 0.22 },
      { metin: 'Model Yılı', oran: 0.1 },
      { metin: 'Edinme Değeri', oran: 0.14 },
      { metin: 'Edinme Tarihi', oran: 0.12 },
      { metin: 'Sahibinin TC Kimlik No', oran: 0.16 },
    ],
    veri.tasit.map((row, i) => [
      { metin: String(i + 1), oran: 0.06 },
      { metin: row.cins, oran: 0.1 },
      { metin: row.plaka, oran: 0.1 },
      { metin: row.markaModel, oran: 0.22 },
      { metin: row.modelYili, oran: 0.1 },
      { metin: row.edinmeDegerFmt, oran: 0.14 },
      { metin: row.edinmeTr, oran: 0.12 },
      { metin: row.sahipTc, oran: 0.16 },
    ]),
  )

  y = bolumBaslik(doc, y, 'BÖLÜM-4B', 'DİĞER TAŞINIR MALLAR')
  y = tablo(
    doc,
    y,
    [
      { metin: 'Sıra', oran: 0.06 },
      { metin: 'Cinsi', oran: 0.28 },
      { metin: 'Model Yılı', oran: 0.12 },
      { metin: 'Edinme Değeri', oran: 0.16 },
      { metin: 'Edinme Tarihi', oran: 0.16 },
      { metin: 'Sahibinin TC Kimlik No', oran: 0.22 },
    ],
    veri.diger.map((row, i) => [
      { metin: String(i + 1), oran: 0.06 },
      { metin: row.cinsi, oran: 0.28 },
      { metin: row.modelYili, oran: 0.12 },
      { metin: row.edinmeDegerFmt, oran: 0.16 },
      { metin: row.edinmeTr, oran: 0.16 },
      { metin: row.sahipTc, oran: 0.22 },
    ]),
  )

  y = bolumBaslik(doc, y, 'BÖLÜM-5', 'BANKA VE MENKUL KIYMET BİLGİLERİ')
  y = tablo(
    doc,
    y,
    [
      { metin: 'Sıra', oran: 0.06 },
      { metin: 'Nitelik', oran: 0.2 },
      { metin: 'Cinsi', oran: 0.16 },
      { metin: 'Miktar', oran: 0.12 },
      { metin: 'Güncel Kur', oran: 0.12 },
      { metin: 'Değeri', oran: 0.14 },
      { metin: 'Sahibinin TC Kimlik No', oran: 0.2 },
    ],
    veri.banka.map((row, i) => [
      { metin: String(i + 1), oran: 0.06 },
      { metin: row.nitelik, oran: 0.2 },
      { metin: row.cinsi, oran: 0.16 },
      { metin: row.miktarFmt, oran: 0.12 },
      { metin: row.kurFmt, oran: 0.12 },
      { metin: row.degerFmt, oran: 0.14 },
      { metin: row.sahipTc, oran: 0.2 },
    ]),
  )

  y = bolumBaslik(doc, y, 'BÖLÜM-6', 'ALTIN VE MÜCEVHERAT BİLGİLERİ')
  y = tablo(
    doc,
    y,
    [
      { metin: 'Sıra', oran: 0.06 },
      { metin: 'Cinsi', oran: 0.18 },
      { metin: 'Türü', oran: 0.16 },
      { metin: 'Miktar', oran: 0.12 },
      { metin: 'Güncel Kur', oran: 0.12 },
      { metin: 'Değeri', oran: 0.14 },
      { metin: 'Sahibinin TC Kimlik No', oran: 0.22 },
    ],
    veri.altin.map((row, i) => [
      { metin: String(i + 1), oran: 0.06 },
      { metin: row.cinsi, oran: 0.18 },
      { metin: row.turu, oran: 0.16 },
      { metin: row.miktarFmt, oran: 0.12 },
      { metin: row.kurFmt, oran: 0.12 },
      { metin: row.degerFmt, oran: 0.14 },
      { metin: row.sahipTc, oran: 0.22 },
    ]),
  )

  y = bolumBaslik(doc, y, 'BÖLÜM-7', 'BORÇ VE ALACAK BİLGİLERİ')
  y = tablo(
    doc,
    y,
    [
      { metin: 'Sıra', oran: 0.06 },
      { metin: 'Borçlu', oran: 0.22 },
      { metin: 'Alacaklı', oran: 0.22 },
      { metin: 'Birimi', oran: 0.1 },
      { metin: 'Miktar', oran: 0.12 },
      { metin: 'Güncel Kur', oran: 0.12 },
      { metin: 'Tutar', oran: 0.16 },
    ],
    veri.borc.map((row, i) => [
      { metin: String(i + 1), oran: 0.06 },
      { metin: row.borclu, oran: 0.22 },
      { metin: row.alacakli, oran: 0.22 },
      { metin: row.birimi, oran: 0.1 },
      { metin: row.miktarFmt, oran: 0.12 },
      { metin: row.kurFmt, oran: 0.12 },
      { metin: row.tutarFmt, oran: 0.16 },
    ]),
  )

  y = bolumBaslik(doc, y, 'BÖLÜM-8', 'HAKLAR VE DİĞER SERVET UNSURLARI')
  y = tablo(
    doc,
    y,
    [
      { metin: 'Sıra', oran: 0.06 },
      { metin: 'Hak veya Servet Unsuru', oran: 0.46 },
      { metin: 'Edinme Şekli', oran: 0.24 },
      { metin: 'Sahibinin TC Kimlik No', oran: 0.24 },
    ],
    veri.haklar.map((row, i) => [
      { metin: String(i + 1), oran: 0.06 },
      { metin: row.unsur, oran: 0.46 },
      { metin: row.edinmeSekli, oran: 0.24 },
      { metin: row.sahipTc, oran: 0.24 },
    ]),
  )

  y = bolumBaslik(doc, y, 'AÇIKLAMA', 'ARTIŞ / AZALIŞ')
  const aciklama = veri.aciklama || ' '
  const aciklamaH = Math.max(18, metinYukseklik(doc, aciklama, CONTENT_W, 7) + 6)
  y = sayfaSigdir(doc, y, aciklamaH)
  hucreCiz(doc, MARGIN, y, CONTENT_W, aciklamaH, veri.aciklama, { boyut: 7 })
  y += aciklamaH

  const solW = CONTENT_W * 0.58
  const sagW = CONTENT_W - solW
  const etiketW = sagW * 0.4
  const degerW = sagW - etiketW
  const notMetin = NOTLAR.join('\n')
  const notBoyut = 6
  const notH = Math.max(110, metinYukseklik(doc, `AÇIKLAMALAR\n${notMetin}`, solW, notBoyut, false) + 16)
  const sagSatirlar: [string, string, boolean][] = [
    ['Bildirim Sahibinin Adı Soyadı', personel.adSoyad || '', true],
    ['Bildirim Tarihi', veri.onayTarihi || '', false],
    ['Bildirim Türü', veri.beyanTuru || '', false],
    ['İmza', '', false],
  ]
  const imzaPay = 52
  const etiketMin = Math.max(
    16,
    ...sagSatirlar.slice(0, -1).map(([etiket]) => metinYukseklik(doc, etiket, etiketW, 6, false) + 6),
  )
  const digerSatirH = Math.max(etiketMin, (notH - imzaPay) / (sagSatirlar.length - 1))
  const blokH = digerSatirH * (sagSatirlar.length - 1) + imzaPay
  y = sayfaSigdir(doc, y, blokH)

  hucreCiz(doc, MARGIN, y, solW, blokH, '', { boyut: 6 })
  font(doc, true)
  doc.fontSize(notBoyut).fillColor('#0f172a').text('AÇIKLAMALAR', MARGIN + 3, y + 3, { width: solW - 6, height: 10 })
  font(doc, false)
  doc.fontSize(notBoyut).fillColor('#334155').text(notMetin, MARGIN + 3, y + 14, {
    width: solW - 6,
    height: blokH - 18,
    lineGap: 1,
  })

  let sagY = y
  sagSatirlar.forEach(([etiket, deger, kalin], index) => {
    const h = index === sagSatirlar.length - 1 ? imzaPay : digerSatirH
    hucreCiz(doc, MARGIN + solW, sagY, etiketW, h, etiket, { boyut: 6, zemin: '#f8fafc' })
    hucreCiz(doc, MARGIN + solW + etiketW, sagY, degerW, h, deger, { boyut: 6.5, bold: kalin })
    sagY += h
  })

  doc.end()
  return bufPromise
}
