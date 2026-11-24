import path from 'node:path'
import PDFDocument from 'pdfkit'
import type {
  PersonelKazancBilgiKart,
  PersonelKazancBilgiTerfi,
} from '@/lib/personel-kazanc-bilgi'
import { toGgAayyyy } from '@/lib/tarih'

const MARGIN = 36
const PAGE_W = 595.28
const PAGE_H = 841.89
const CONTENT_W = PAGE_W - MARGIN * 2
const FONT_NORMAL = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
const FONT_BOLD = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')

type PdfDoc = InstanceType<typeof PDFDocument>
export type PersonelKazancBilgiPdfVaryant = 1 | 2

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

function sayiParse(v: string | null | undefined): number {
  const ham = String(v ?? '').trim()
  if (!ham) return 0
  const temiz = ham.replace(/%/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(temiz)
  return Number.isFinite(n) ? n : 0
}

function sayiGoster(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0'
  return String(Math.round(n * 100) / 100)
}

function sayfaBasi(doc: PdfDoc, y: number, ihtiyac: number): number {
  if (y + ihtiyac <= PAGE_H - MARGIN) return y
  doc.addPage()
  return MARGIN
}

function hucre(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  opts?: { bold?: boolean; center?: boolean; size?: number; zemin?: string; renk?: string },
) {
  if (opts?.zemin) {
    doc.save().fillColor(opts.zemin).rect(x, y, w, h).fill().restore()
  }
  doc.save().lineWidth(0.5).strokeColor('#cbd5e1').rect(x, y, w, h).stroke().restore()
  font(doc, opts?.bold === true)
  const size = opts?.size ?? 8
  doc.fontSize(size).fillColor(opts?.renk ?? '#0f172a')
  const padX = 4
  const padY = 3
  const maxW = Math.max(8, w - padX * 2)
  const textH = doc.heightOfString(text, { width: maxW })
  const ty = y + Math.max(padY, (h - textH) / 2)
  doc.text(text, x + padX, ty, {
    width: maxW,
    align: opts?.center ? 'center' : 'left',
    lineBreak: true,
    height: h - padY,
  })
}

function hucreYukseklik(doc: PdfDoc, text: string, w: number, size = 8, bold = false): number {
  font(doc, bold)
  doc.fontSize(size)
  return Math.max(16, doc.heightOfString(text, { width: Math.max(8, w - 8) }) + 8)
}

function bolumBaslik(doc: PdfDoc, y: number, text: string): number {
  y = sayfaBasi(doc, y, 20)
  font(doc, true)
  doc.fontSize(10).fillColor('#334155').text(text, MARGIN, y, { width: CONTENT_W })
  return doc.y + 6
}

function bosSatir(doc: PdfDoc, y: number, text: string): number {
  y = sayfaBasi(doc, y, 18)
  font(doc, false)
  doc.fontSize(8.5).fillColor('#94a3b8').text(text, MARGIN, y, { width: CONTENT_W })
  return doc.y + 8
}

/** Etiket | değer çiftlerini 2 sütunlu tablo olarak çizer (sayfadaki grid). */
function alanTablosu(doc: PdfDoc, y: number, alanlar: { etiket: string; deger: string }[]): number {
  const colW = CONTENT_W / 2
  const etiketW = colW * 0.42
  const degerW = colW - etiketW
  for (let i = 0; i < alanlar.length; i += 2) {
    const sol = alanlar[i]
    const sag = alanlar[i + 1]
    const hSolE = hucreYukseklik(doc, sol.etiket, etiketW, 7.5, true)
    const hSolD = hucreYukseklik(doc, sol.deger, degerW, 8)
    const hSagE = sag ? hucreYukseklik(doc, sag.etiket, etiketW, 7.5, true) : 0
    const hSagD = sag ? hucreYukseklik(doc, sag.deger, degerW, 8) : 0
    const h = Math.max(hSolE, hSolD, hSagE, hSagD, 18)
    y = sayfaBasi(doc, y, h)
    hucre(doc, MARGIN, y, etiketW, h, sol.etiket, { bold: true, size: 7.5, zemin: '#f8fafc', renk: '#64748b' })
    hucre(doc, MARGIN + etiketW, y, degerW, h, sol.deger, { size: 8 })
    if (sag) {
      hucre(doc, MARGIN + colW, y, etiketW, h, sag.etiket, { bold: true, size: 7.5, zemin: '#f8fafc', renk: '#64748b' })
      hucre(doc, MARGIN + colW + etiketW, y, degerW, h, sag.deger, { size: 8 })
    } else {
      hucre(doc, MARGIN + colW, y, colW, h, '', { size: 8 })
    }
    y += h
  }
  return y + 6
}

function ogrenimTablosu(
  doc: PdfDoc,
  y: number,
  satirlar: { tur: string; meslek: string; varsayilan: string; ilgili: string; teknik: string }[],
): number {
  const widths = [CONTENT_W * 0.22, CONTENT_W * 0.28, CONTENT_W * 0.16, CONTENT_W * 0.18, CONTENT_W * 0.16]
  const basliklar = ['Öğrenim Türü', 'Mesleği', 'Varsayılan', 'Kadrosu İle İlgili', 'Teknik Öğrenim']
  const baslikH = 20
  y = sayfaBasi(doc, y, baslikH + 16)
  let x = MARGIN
  for (let i = 0; i < basliklar.length; i++) {
    hucre(doc, x, y, widths[i], baslikH, basliklar[i], {
      bold: true,
      center: i >= 2,
      size: 7.5,
      zemin: '#f1f5f9',
      renk: '#475569',
    })
    x += widths[i]
  }
  y += baslikH

  for (const s of satirlar) {
    const degerler = [s.tur, s.meslek, s.varsayilan, s.ilgili, s.teknik]
    let h = 18
    for (let i = 0; i < degerler.length; i++) {
      h = Math.max(h, hucreYukseklik(doc, degerler[i], widths[i], 8))
    }
    y = sayfaBasi(doc, y, h)
    x = MARGIN
    for (let i = 0; i < degerler.length; i++) {
      hucre(doc, x, y, widths[i], h, degerler[i], { center: i >= 2, size: 8 })
      x += widths[i]
    }
    y += h
  }
  return y + 8
}

function aileTablosu(
  doc: PdfDoc,
  y: number,
  aile: PersonelKazancBilgiKart['aile'],
): number {
  const widths = [CONTENT_W * 0.22, CONTENT_W * 0.22, CONTENT_W * 0.28, CONTENT_W * 0.28]
  const basliklar = [
    'Medeni Durum',
    'Eş Durumu',
    '6 Yaşından Küçük Çocuk',
    '6 Yaşından Büyük Çocuk',
  ]
  const baslikH = 20
  y = sayfaBasi(doc, y, baslikH + 18)
  let x = MARGIN
  for (let i = 0; i < basliklar.length; i++) {
    hucre(doc, x, y, widths[i], baslikH, basliklar[i], {
      bold: true,
      center: i >= 2,
      size: 7,
      zemin: '#f1f5f9',
      renk: '#475569',
    })
    x += widths[i]
  }
  y += baslikH
  const degerler = [
    metin(aile?.medeni_hal),
    metin(aile?.es_durumu),
    aile ? String(aile.cocuk_6_kucuk) : '—',
    aile ? String(aile.cocuk_6_buyuk) : '—',
  ]
  let h = 18
  for (let i = 0; i < degerler.length; i++) {
    h = Math.max(h, hucreYukseklik(doc, degerler[i], widths[i], 8))
  }
  y = sayfaBasi(doc, y, h)
  x = MARGIN
  for (let i = 0; i < degerler.length; i++) {
    hucre(doc, x, y, widths[i], h, degerler[i], { center: i >= 2, size: 8 })
    x += widths[i]
  }
  return y + h + 8
}

function kazancKatsayiTablosu(doc: PdfDoc, y: number, terfiler: PersonelKazancBilgiTerfi[]): number {
  const asiller = terfiler.filter(t => t.rol === 'Asil')
  const vekiller = terfiler.filter(t => t.rol === 'Vekil')
  const satirlar = [...asiller, ...vekiller]
  if (!satirlar.length) return bosSatir(doc, y, 'Kazanç katsayısı kaydı yok.')

  const widths = [
    CONTENT_W * 0.28,
    CONTENT_W * 0.144,
    CONTENT_W * 0.144,
    CONTENT_W * 0.144,
    CONTENT_W * 0.144,
    CONTENT_W * 0.144,
  ]
  const basliklar = ['Rol', 'Ek Gösterge', 'Ek Ödeme', 'ÖHT', 'Yan Ödeme', 'SDS']
  const baslikH = 20
  y = sayfaBasi(doc, y, baslikH + 18)
  let x = MARGIN
  for (let i = 0; i < basliklar.length; i++) {
    hucre(doc, x, y, widths[i], baslikH, basliklar[i], {
      bold: true,
      center: i > 0,
      size: 7.5,
      zemin: '#f1f5f9',
      renk: '#475569',
    })
    x += widths[i]
  }
  y += baslikH

  const toplam = {
    eg: 0,
    eo: 0,
    oht: 0,
    yo: 0,
    sds: 0,
  }

  for (const t of satirlar) {
    const rol = `${t.rol}${t.unvan_adi ? ` · ${t.unvan_adi}` : ''}`
    const degerler = [
      rol,
      metin(t.ek_gosterge),
      metin(t.ek_odeme),
      metin(t.oht),
      metin(t.yan_odeme),
      metin(t.sds_orani),
    ]
    toplam.eg += sayiParse(t.ek_gosterge)
    toplam.eo += sayiParse(t.ek_odeme)
    toplam.oht += sayiParse(t.oht)
    toplam.yo += sayiParse(t.yan_odeme)
    toplam.sds += sayiParse(t.sds_orani)

    let h = 18
    for (let i = 0; i < degerler.length; i++) {
      h = Math.max(h, hucreYukseklik(doc, degerler[i], widths[i], 8))
    }
    y = sayfaBasi(doc, y, h)
    x = MARGIN
    for (let i = 0; i < degerler.length; i++) {
      hucre(doc, x, y, widths[i], h, degerler[i], { center: i > 0, size: 8 })
      x += widths[i]
    }
    y += h
  }

  const toplamDeger = [
    'Toplam',
    sayiGoster(toplam.eg),
    sayiGoster(toplam.eo),
    sayiGoster(toplam.oht),
    sayiGoster(toplam.yo),
    sayiGoster(toplam.sds),
  ]
  let th = 18
  for (let i = 0; i < toplamDeger.length; i++) {
    th = Math.max(th, hucreYukseklik(doc, toplamDeger[i], widths[i], 8, true))
  }
  y = sayfaBasi(doc, y, th)
  x = MARGIN
  for (let i = 0; i < toplamDeger.length; i++) {
    hucre(doc, x, y, widths[i], th, toplamDeger[i], {
      bold: true,
      center: i > 0,
      size: 8,
      zemin: '#f8fafc',
    })
    x += widths[i]
  }
  return y + th + 8
}

function mevzuatBolumuCiz(doc: PdfDoc, y: number, kalemler: { baslik: string; aciklama: string }[]): number {
  const etiketW = 100
  const degerW = CONTENT_W - etiketW
  const baslikH = 20
  const yukseklikler = kalemler.map(k => {
    const hE = hucreYukseklik(doc, k.baslik, etiketW, 8, true)
    const hD = hucreYukseklik(doc, k.aciklama, degerW, 8)
    return Math.max(hE, hD, 20)
  })
  const tabloH = yukseklikler.reduce((a, b) => a + b, 0)
  const toplamH = baslikH + tabloH + 6
  const sayfaIci = PAGE_H - MARGIN * 2

  // Tek sayfaya sığacaksa ve mevcut sayfada yer yoksa bütünü sonraki sayfaya al; başlık bir kez yazılır.
  if (toplamH <= sayfaIci && y + toplamH > PAGE_H - MARGIN && y > MARGIN + 1) {
    doc.addPage()
    y = MARGIN
  }

  font(doc, true)
  doc.fontSize(10).fillColor('#334155').text('Mevzuat Hükümleri', MARGIN, y, { width: CONTENT_W })
  y = doc.y + 6

  for (let i = 0; i < kalemler.length; i++) {
    const k = kalemler[i]
    const h = yukseklikler[i]
    // Tek satır bile sığmazsa (çok uzun metin) sayfa kır; başlığı tekrarlama.
    if (y + h > PAGE_H - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
    hucre(doc, MARGIN, y, etiketW, h, k.baslik, { bold: true, size: 8, zemin: '#f8fafc' })
    hucre(doc, MARGIN + etiketW, y, degerW, h, k.aciklama, { size: 8, renk: '#334155' })
    y += h
  }
  return y + 6
}

function kartBaslik(doc: PdfDoc, kart: PersonelKazancBilgiKart): number {
  let y = MARGIN

  font(doc, true)
  doc.fontSize(10).fillColor('#0f172a').text('T.C. ADAPAZARI BELEDİYE BAŞKANLIĞI', MARGIN, y, {
    width: CONTENT_W,
    align: 'center',
  })
  y = doc.y + 2
  font(doc, false)
  doc.fontSize(9).fillColor('#475569').text('İnsan Kaynakları ve Eğitim Müdürlüğü', MARGIN, y, {
    width: CONTENT_W,
    align: 'center',
  })
  y = doc.y + 8
  font(doc, true)
  doc.fontSize(13).fillColor('#0f172a').text('Personel Kazanç Bilgileri', MARGIN, y, {
    width: CONTENT_W,
    align: 'center',
  })
  y = doc.y + 12

  font(doc, false)
  doc.fontSize(8).fillColor('#94a3b8').text(kart.sicil_no, MARGIN, y)
  y = doc.y + 2
  font(doc, true)
  doc.fontSize(12).fillColor('#0f172a').text(kart.ad_soyad, MARGIN, y)
  y = doc.y + 8

  return alanTablosu(doc, y, [
    { etiket: 'Asil unvan', deger: metin(kart.asilUnvan) },
    { etiket: 'Vekil unvan', deger: kart.vekilUnvanlar.length ? kart.vekilUnvanlar.join(', ') : '—' },
  ])
}

function ogrenimBolumu(doc: PdfDoc, y: number, kart: PersonelKazancBilgiKart): number {
  y = bolumBaslik(doc, y + 2, 'Öğrenim Bilgileri')
  if (!kart.ogrenimler.length) {
    return bosSatir(doc, y, 'Öğrenim kaydı yok.')
  }
  return ogrenimTablosu(
    doc,
    y,
    kart.ogrenimler.map(o => ({
      tur: metin(o.ogrenim_turu),
      meslek: metin(o.meslegi),
      varsayilan: o.varsayilan ? 'Evet' : 'Hayır',
      ilgili: o.kadrosu_ile_ilgili ? 'Evet' : 'Hayır',
      teknik: o.teknik_ogrenim ? 'Evet' : 'Hayır',
    })),
  )
}

function mevzuatBolumu(doc: PdfDoc, y: number, kart: PersonelKazancBilgiKart): number {
  if (!kart.mevzuat.length) {
    y = bolumBaslik(doc, y, 'Mevzuat Hükümleri')
    return bosSatir(doc, y, 'Mevzuat kaydı yok.')
  }
  return mevzuatBolumuCiz(
    doc,
    y,
    kart.mevzuat.map(m => ({ baslik: m.baslik, aciklama: m.aciklama })),
  )
}

function kartCizV1(doc: PdfDoc, kart: PersonelKazancBilgiKart) {
  let y = kartBaslik(doc, kart)
  y = ogrenimBolumu(doc, y, kart)

  y = bolumBaslik(doc, y, 'Kadro Bilgileri')
  if (!kart.kadrolar.length) {
    y = bosSatir(doc, y, 'Kadro kaydı yok.')
  } else {
    for (const k of kart.kadrolar) {
      y = sayfaBasi(doc, y, 24)
      font(doc, true)
      doc.fontSize(8).fillColor('#64748b').text(`${k.rol} kadro`, MARGIN, y)
      y = doc.y + 4
      y = alanTablosu(doc, y, [
        { etiket: 'Kadro Sıra No', deger: metin(k.kadro_sira_no) },
        { etiket: 'Kadro Ünvanı', deger: metin(k.kadro_unvani) },
        { etiket: 'Görev Ünvanı', deger: metin(k.gorev_unvani) },
        { etiket: 'Kadro Müdürlüğü', deger: metin(k.kadro_mudurlugu) },
        { etiket: 'Görev Müdürlüğü', deger: metin(k.gorev_mudurlugu) },
        { etiket: 'Statü', deger: metin(k.statu) },
        { etiket: 'Kadro Derecesi', deger: metin(k.kadro_derecesi) },
      ])
    }
  }

  y = bolumBaslik(doc, y, 'Terfi Bilgileri')
  if (!kart.terfiler.length) {
    y = bosSatir(doc, y, 'Terfi kaydı yok.')
  } else {
    for (const t of kart.terfiler) {
      y = sayfaBasi(doc, y, 24)
      font(doc, true)
      doc.fontSize(8).fillColor('#64748b').text(`${t.rol}${t.unvan_adi ? ` · ${t.unvan_adi}` : ''}`, MARGIN, y)
      y = doc.y + 4
      y = alanTablosu(doc, y, [
        { etiket: 'Kadro Derecesi', deger: metin(t.kadro_derecesi) },
        { etiket: 'Görev Aylığı', deger: dk(t.gorev_ayligi_derece, t.gorev_ayligi_kademe) },
        { etiket: 'KHA', deger: `${dk(t.kha_derece, t.kha_kademe)} · ${tarihGoster(t.kha_tarihi)}` },
        { etiket: 'EKEA', deger: `${dk(t.ekea_derece, t.ekea_kademe)} · ${tarihGoster(t.ekea_tarihi)}` },
        { etiket: 'Kıdem', deger: `${metin(t.kidem_yili)} yıl · ${tarihGoster(t.kidem_tarihi)}` },
        { etiket: 'İyi Hal', deger: tarihGoster(t.iyi_hal_terfi_tarihi) },
        { etiket: 'Ek Gösterge', deger: metin(t.ek_gosterge) },
        { etiket: 'Ek Ödeme', deger: metin(t.ek_odeme) },
        { etiket: 'ÖHT', deger: metin(t.oht) },
        { etiket: 'Yan Ödeme', deger: metin(t.yan_odeme) },
        { etiket: 'SDS', deger: metin(t.sds_orani) },
      ])
    }
  }

  mevzuatBolumu(doc, y, kart)
}

function kartCizV2(doc: PdfDoc, kart: PersonelKazancBilgiKart) {
  let y = kartBaslik(doc, kart)
  y = ogrenimBolumu(doc, y, kart)

  y = bolumBaslik(doc, y, 'Aile Bilgileri')
  y = aileTablosu(doc, y, kart.aile)

  y = bolumBaslik(doc, y, 'Kadro Bilgileri')
  if (!kart.kadrolar.length) {
    y = bosSatir(doc, y, 'Kadro kaydı yok.')
  } else {
    for (const k of kart.kadrolar) {
      y = sayfaBasi(doc, y, 24)
      font(doc, true)
      doc.fontSize(8).fillColor('#64748b').text(`${k.rol} kadro`, MARGIN, y)
      y = doc.y + 4
      if (k.rol === 'Asil') {
        y = alanTablosu(doc, y, [
          { etiket: 'Kadro Ünvanı', deger: metin(k.kadro_unvani) },
          { etiket: 'Kadro Müdürlüğü', deger: metin(k.kadro_mudurlugu) },
          { etiket: 'Statü', deger: metin(k.statu) },
          { etiket: 'Kadro Derecesi', deger: metin(k.kadro_derecesi) },
        ])
      } else {
        y = alanTablosu(doc, y, [
          { etiket: 'Görev Ünvanı', deger: metin(k.gorev_unvani) },
          { etiket: 'Görev Müdürlüğü', deger: metin(k.gorev_mudurlugu) },
          { etiket: 'Statü', deger: metin(k.statu) },
          { etiket: 'Kadro Derecesi', deger: metin(k.kadro_derecesi) },
        ])
      }
    }
  }

  y = bolumBaslik(doc, y, 'Terfi Bilgileri')
  if (!kart.terfiler.length) {
    y = bosSatir(doc, y, 'Terfi kaydı yok.')
  } else {
    for (const t of kart.terfiler) {
      y = sayfaBasi(doc, y, 24)
      font(doc, true)
      doc.fontSize(8).fillColor('#64748b').text(`${t.rol}${t.unvan_adi ? ` · ${t.unvan_adi}` : ''}`, MARGIN, y)
      y = doc.y + 4
      const alanlar =
        t.rol === 'Vekil'
          ? [
            { etiket: 'Kadro Derecesi', deger: metin(t.kadro_derecesi) },
            { etiket: 'Görev Aylığı', deger: dk(t.gorev_ayligi_derece, t.gorev_ayligi_kademe) },
          ]
          : [
            { etiket: 'Kadro Derecesi', deger: metin(t.kadro_derecesi) },
            { etiket: 'Görev Aylığı', deger: dk(t.gorev_ayligi_derece, t.gorev_ayligi_kademe) },
            { etiket: 'KHA', deger: `${dk(t.kha_derece, t.kha_kademe)} · ${tarihGoster(t.kha_tarihi)}` },
            { etiket: 'EKEA', deger: `${dk(t.ekea_derece, t.ekea_kademe)} · ${tarihGoster(t.ekea_tarihi)}` },
            { etiket: 'Kıdem', deger: `${metin(t.kidem_yili)} yıl · ${tarihGoster(t.kidem_tarihi)}` },
            { etiket: 'İyi Hal', deger: tarihGoster(t.iyi_hal_terfi_tarihi) },
          ]
      y = alanTablosu(doc, y, alanlar)
    }
  }

  y = bolumBaslik(doc, y, 'Kazanç Katsayıları')
  y = kazancKatsayiTablosu(doc, y, kart.terfiler)

  mevzuatBolumu(doc, y, kart)
}

export async function personelKazancBilgiPdfBuffer(
  kartlar: PersonelKazancBilgiKart[],
  varyant: PersonelKazancBilgiPdfVaryant = 1,
): Promise<Buffer> {
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
      if (varyant === 2) kartCizV2(doc, kart)
      else kartCizV1(doc, kart)
    }
  }

  doc.end()
  return done
}
