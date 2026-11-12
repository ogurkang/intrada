import path from 'node:path'
import PDFDocument from 'pdfkit'
import type { PersonelKazancBilgiKart } from '@/lib/personel-kazanc-bilgi'
import { toGgAayyyy } from '@/lib/tarih'

const MARGIN = 40
const PAGE_W = 595.28
const PAGE_H = 841.89
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

function metin(v: string | null | undefined): string {
  const t = String(v ?? '').trim()
  return t || '—'
}

function tarihGoster(v: string | null | undefined): string {
  const t = toGgAayyyy(v)
  return t || '—'
}

function dk(d: string | null | undefined, k: string | null | undefined): string {
  if (!d && !k) return '—'
  return `${metin(d)}/${metin(k)}`
}

function sayfaBasi(doc: PdfDoc, y: number, ihtiyac: number): number {
  if (y + ihtiyac <= PAGE_H - MARGIN) return y
  doc.addPage()
  return MARGIN
}

function baslik(doc: PdfDoc, y: number, text: string): number {
  y = sayfaBasi(doc, y, 22)
  font(doc, true)
  doc.fontSize(11).fillColor('#0f172a').text(text, MARGIN, y, { width: PAGE_W - MARGIN * 2 })
  return doc.y + 6
}

function satir(doc: PdfDoc, y: number, etiket: string, deger: string): number {
  y = sayfaBasi(doc, y, 16)
  const etiketW = 130
  font(doc, false)
  doc.fontSize(9).fillColor('#64748b').text(etiket, MARGIN, y, { width: etiketW, lineBreak: false })
  font(doc, true)
  doc.fontSize(9).fillColor('#0f172a').text(deger, MARGIN + etiketW, y, {
    width: PAGE_W - MARGIN * 2 - etiketW,
  })
  return Math.max(y + 14, doc.y + 2)
}

function paragraf(doc: PdfDoc, y: number, baslikTxt: string, govde: string): number {
  y = sayfaBasi(doc, y, 28)
  font(doc, true)
  doc.fontSize(9).fillColor('#0f172a').text(baslikTxt, MARGIN, y, { width: PAGE_W - MARGIN * 2 })
  y = doc.y + 2
  font(doc, false)
  doc.fontSize(8.5).fillColor('#334155').text(govde, MARGIN, y, {
    width: PAGE_W - MARGIN * 2,
    align: 'left',
  })
  return doc.y + 8
}

function kartCiz(doc: PdfDoc, kart: PersonelKazancBilgiKart) {
  let y = MARGIN
  const icW = PAGE_W - MARGIN * 2

  font(doc, true)
  doc.fontSize(10).fillColor('#0f172a').text('T.C. ADAPAZARI BELEDİYE BAŞKANLIĞI', MARGIN, y, {
    width: icW,
    align: 'center',
  })
  y = doc.y + 2
  font(doc, false)
  doc.fontSize(9).fillColor('#475569').text('İnsan Kaynakları ve Eğitim Müdürlüğü', MARGIN, y, {
    width: icW,
    align: 'center',
  })
  y = doc.y + 8
  font(doc, true)
  doc.fontSize(13).fillColor('#0f172a').text('Personel Kazanç Bilgileri', MARGIN, y, {
    width: icW,
    align: 'center',
  })
  y = doc.y + 14

  font(doc, false)
  doc.fontSize(8).fillColor('#94a3b8').text(kart.sicil_no, MARGIN, y)
  y = doc.y + 2
  font(doc, true)
  doc.fontSize(12).fillColor('#0f172a').text(kart.ad_soyad, MARGIN, y)
  y = doc.y + 8

  y = baslik(doc, y, 'Öğrenim Bilgileri')
  if (!kart.ogrenimler.length) {
    y = satir(doc, y, 'Öğrenim', 'Kayıt yok')
  } else {
    for (const o of kart.ogrenimler) {
      y = satir(doc, y, 'Öğrenim türü', metin(o.ogrenim_turu))
      y = satir(doc, y, 'Mesleği', metin(o.meslegi))
      y = satir(doc, y, 'Varsayılan', o.varsayilan ? 'Evet' : 'Hayır')
      y = satir(doc, y, 'Kadrosu ile ilgili', o.kadrosu_ile_ilgili ? 'Evet' : 'Hayır')
      y = satir(doc, y, 'Teknik öğrenim', o.teknik_ogrenim ? 'Evet' : 'Hayır')
      y += 4
    }
  }

  y = baslik(doc, y + 4, 'Kadro Bilgileri')
  if (!kart.kadrolar.length) {
    y = satir(doc, y, 'Kadro', 'Kayıt yok')
  } else {
    for (const k of kart.kadrolar) {
      y = satir(doc, y, `${k.rol} sıra no`, metin(k.kadro_sira_no))
      y = satir(doc, y, 'Kadro ünvanı', metin(k.kadro_unvani))
      y = satir(doc, y, 'Görev ünvanı', metin(k.gorev_unvani))
      y = satir(doc, y, 'Kadro müdürlüğü', metin(k.kadro_mudurlugu))
      y = satir(doc, y, 'Görev müdürlüğü', metin(k.gorev_mudurlugu))
      y = satir(doc, y, 'Statü', metin(k.statu))
      y = satir(doc, y, 'Kadro derecesi', metin(k.kadro_derecesi))
      y += 4
    }
  }

  y = baslik(doc, y + 4, 'Terfi Bilgileri')
  if (!kart.terfiler.length) {
    y = satir(doc, y, 'Terfi', 'Kayıt yok')
  } else {
    for (const t of kart.terfiler) {
      y = satir(doc, y, `${t.rol} unvan`, metin(t.unvan_adi))
      y = satir(doc, y, 'Kadro derecesi', metin(t.kadro_derecesi))
      y = satir(doc, y, 'Görev aylığı', dk(t.gorev_ayligi_derece, t.gorev_ayligi_kademe))
      y = satir(doc, y, 'KHA', `${dk(t.kha_derece, t.kha_kademe)} · ${tarihGoster(t.kha_tarihi)}`)
      y = satir(doc, y, 'EKEA', `${dk(t.ekea_derece, t.ekea_kademe)} · ${tarihGoster(t.ekea_tarihi)}`)
      y = satir(doc, y, 'Kıdem', `${metin(t.kidem_yili)} yıl · ${tarihGoster(t.kidem_tarihi)}`)
      y = satir(doc, y, 'İyi hal', tarihGoster(t.iyi_hal_terfi_tarihi))
      y = satir(doc, y, 'Ek gösterge', metin(t.ek_gosterge))
      y = satir(doc, y, 'Ek ödeme', metin(t.ek_odeme))
      y = satir(doc, y, 'ÖHT', metin(t.oht))
      y = satir(doc, y, 'Yan ödeme', metin(t.yan_odeme))
      y = satir(doc, y, 'SDS', metin(t.sds_orani))
      y += 4
    }
  }

  y = baslik(doc, y + 4, 'Mevzuat Hükümleri')
  for (const m of kart.mevzuat) {
    y = paragraf(doc, y, m.baslik, m.aciklama)
  }
}

export async function personelKazancBilgiPdfBuffer(kartlar: PersonelKazancBilgiKart[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: false })
  const done = pdfBuffer(doc)

  if (!kartlar.length) {
    doc.addPage()
    font(doc, true)
    doc.fontSize(12).fillColor('#0f172a').text('Personel Kazanç Bilgileri', MARGIN, MARGIN)
    font(doc, false)
    doc.fontSize(10).fillColor('#64748b').text('Seçime uyan personel yok.', MARGIN, MARGIN + 24)
  } else {
    for (const kart of kartlar) {
      doc.addPage()
      kartCiz(doc, kart)
    }
  }

  doc.end()
  return done
}
