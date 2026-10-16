import path from 'node:path'
import PDFDocument from 'pdfkit'
import { ICK_RAPOR_ACIKLAMA, type IckRaporOzet, type IckRaporVerisi } from '@/lib/ick/rapor'

const FONT_NORMAL = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf')
const FONT_BOLD = path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf')
const MARGIN = 50

type PdfDoc = InstanceType<typeof PDFDocument>

function pdfBuffer(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', c => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

function baslik(doc: PdfDoc, metin: string) {
  doc.moveDown(0.8).font(FONT_BOLD).fontSize(12).fillColor('#1e293b').text(metin)
  doc.moveDown(0.3)
}

function ozetSatirlari(doc: PdfDoc, ad: string, o: IckRaporOzet) {
  doc.font(FONT_BOLD).fontSize(9.5).text(ad)
  doc
    .font(FONT_NORMAL)
    .text(`Eylem: ${o.eylem}   Tamamlanan: ${o.tamamlanan}   Devam eden: ${o.devam}   Başlanmadı: ${o.baslanmadi}   Gerçekleşme oranı: %${o.oran}`)
  doc.moveDown(0.4)
}

function alan(doc: PdfDoc, etiket: string, deger: string) {
  doc.font(FONT_BOLD).fontSize(9).fillColor('#475569').text(etiket)
  doc.font(FONT_NORMAL).fontSize(9.5).fillColor('#0f172a').text(deger || '—')
  doc.moveDown(0.2)
}

export async function ickRaporPdf(v: IckRaporVerisi): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, info: { Title: `${v.planAd} — ${v.donemBaslik}` } })
  const cikti = pdfBuffer(doc)
  doc.font(FONT_BOLD).fontSize(14).text(v.planAd, { align: 'center' })
  doc.moveDown(0.3).fontSize(12).text(v.donemBaslik, { align: 'center' })
  doc.moveDown(0.3).font(FONT_NORMAL).fontSize(10).text(`İzleme dönemi: ${v.donemAralik}`, { align: 'center' })
  doc
    .moveDown(0.3)
    .fontSize(9)
    .fillColor(v.kilitli ? '#475569' : '#b91c1c')
    .text(v.kilitli ? `Dönem ${v.kilitTarihi} tarihinde kilitlendi.` : 'TASLAK — dönem kilitlenmedi; veriler değişebilir.', { align: 'center' })
  doc.fillColor('#0f172a')

  baslik(doc, '1. Dönem Gerçekleşme Özeti')
  ozetSatirlari(doc, 'Termini bu izleme döneminde olan eylemler', v.donemOzet)
  ozetSatirlari(doc, 'Termini dönem sonuna kadar gelen eylemler (kümülatif)', v.kumulatifOzet)

  baslik(doc, '2. Bileşen Bazında Durum')
  for (const b of v.bilesenOzet) {
    doc
      .font(FONT_NORMAL)
      .fontSize(9.5)
      .text(`${b.bilesen}: ${b.toplam} eylem — tamamlanan ${b.tamamlanan}, devam eden ${b.devam}, başlanmadı ${b.baslanmadi}, iptal ${b.iptal}, termini geçen ${b.geciken}`)
  }

  baslik(doc, '3. Eylem Bazında Değerlendirme')
  for (const s of v.satirlar.filter(x => x.donemdeTerminli || x.kumulatifKapsam)) {
    if (doc.y > doc.page.height - 200) doc.addPage()
    doc.font(FONT_BOLD).fontSize(10.5).fillColor('#1d4ed8').text(`${s.kod} / ${s.durumEtiket}${s.gecikti ? ' — termin geçti' : ''}`)
    doc.fillColor('#0f172a')
    alan(doc, 'Öngörülen Eylem', s.ongorulenEylem)
    alan(doc, 'Sorumlu Birim / Termin', `${s.sorumlu} — ${s.termin}`)
    alan(doc, 'Gerçekleştirilen Çalışma', s.calisma || 'Kesinleşmiş bildirim yok.')
    alan(doc, 'Kanıtlayıcı Belge / Çıktı', `${s.kanit || '—'}${s.kanitSayisi ? ` (sistemde ${s.kanitSayisi} belge)` : ''}`)
    alan(doc, 'İzleme Değerlendirmesi', s.degerlendirme)
    alan(doc, 'Sonuç', s.sonuc)
    doc.moveDown(0.5)
  }

  baslik(doc, 'Ek: Tüm Eylemlerin Durumu')
  for (const s of v.satirlar) {
    doc
      .font(FONT_NORMAL)
      .fontSize(8.5)
      .text(`${s.kod} (${s.genelSartKod}) — ${s.durumEtiket}${s.gecikti ? ', termin geçti' : ''} — ${s.termin} — ${s.sorumlu}`)
  }

  baslik(doc, 'Açıklama')
  for (const a of ICK_RAPOR_ACIKLAMA) doc.font(FONT_NORMAL).fontSize(8.5).text(a)

  doc.end()
  return cikti
}
