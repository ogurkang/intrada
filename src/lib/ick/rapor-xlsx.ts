import ExcelJS from 'exceljs'
import { ICK_RAPOR_ACIKLAMA, type IckRaporVerisi } from '@/lib/ick/rapor'

function baslikSatiri(ws: ExcelJS.Worksheet) {
  const row = ws.getRow(1)
  row.font = { bold: true }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7EEF7' } }
  ws.eachRow(r => r.eachCell(c => (c.alignment = { wrapText: true, vertical: 'top' })))
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

export async function ickRaporXlsx(v: IckRaporVerisi): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const oz = wb.addWorksheet('Özet')
  oz.columns = [
    { header: 'Kapsam', key: 'k', width: 44 },
    { header: 'Eylem Sayısı', key: 'e', width: 14 },
    { header: 'Tamamlanan', key: 't', width: 14 },
    { header: 'Devam Eden', key: 'd', width: 14 },
    { header: 'Başlanmadı', key: 'b', width: 14 },
    { header: 'Gerçekleşme Oranı', key: 'o', width: 18 },
  ]
  oz.addRow({ k: 'Tamamlanma tarihi bu dönemde olan eylemler', e: v.donemOzet.eylem, t: v.donemOzet.tamamlanan, d: v.donemOzet.devam, b: v.donemOzet.baslanmadi, o: `%${v.donemOzet.oran}` })
  oz.addRow({
    k: 'Tamamlanma tarihi dönem sonuna kadar gelen eylemler',
    e: v.kumulatifOzet.eylem,
    t: v.kumulatifOzet.tamamlanan,
    d: v.kumulatifOzet.devam,
    b: v.kumulatifOzet.baslanmadi,
    o: `%${v.kumulatifOzet.oran}`,
  })
  oz.addRow({})
  oz.addRow({ k: v.planAd })
  oz.addRow({ k: `${v.donemBaslik} (${v.donemAralik})` })
  oz.addRow({ k: v.kilitli ? `Dönem kapatıldı (tamamlandı): ${v.kilitTarihi}` : 'TASLAK — dönem kapatılmadı' })
  for (const a of ICK_RAPOR_ACIKLAMA) oz.addRow({ k: a })
  baslikSatiri(oz)

  const bl = wb.addWorksheet('Bileşen')
  bl.columns = [
    { header: 'Bileşen', key: 'bilesen', width: 12 },
    { header: 'Eylem', key: 'toplam', width: 10 },
    { header: 'Tamamlanan', key: 'tamamlanan', width: 12 },
    { header: 'Devam Eden', key: 'devam', width: 12 },
    { header: 'Başlanmadı', key: 'baslanmadi', width: 12 },
    { header: 'İptal', key: 'iptal', width: 10 },
    { header: 'Tamamlanma Tarihi Geçen', key: 'geciken', width: 22 },
  ]
  v.bilesenOzet.forEach(b => bl.addRow(b))
  baslikSatiri(bl)

  const ey = wb.addWorksheet('Eylemler')
  ey.columns = [
    { header: 'Eylem Kodu', key: 'kod', width: 11 },
    { header: 'Genel Şart', key: 'genelSartKod', width: 10 },
    { header: 'Öngörülen Eylem', key: 'ongorulenEylem', width: 60 },
    { header: 'Sorumlu Birim', key: 'sorumlu', width: 30 },
    { header: 'Müdürlük Koordinatörü', key: 'muhatap', width: 28 },
    { header: 'Çıktı / Sonuç', key: 'cikti', width: 30 },
    { header: 'Tamamlanma Tarihi', key: 'termin', width: 20 },
    { header: 'Durum', key: 'durumEtiket', width: 40 },
    { header: 'Dönem Kapsamı', key: 'donem', width: 12 },
    { header: 'Kümülatif Kapsam', key: 'kum', width: 12 },
    { header: 'Tamamlanma Tarihi Geçti', key: 'gec', width: 22 },
    { header: 'Gerçekleştirilen Çalışma', key: 'calisma', width: 60 },
    { header: 'Kanıtlayıcı Belge / Çıktı', key: 'kanit', width: 40 },
    { header: 'Sistemdeki Belge', key: 'kanitSayisi', width: 12 },
    { header: 'İzleme Değerlendirmesi', key: 'degerlendirme', width: 60 },
    { header: 'Sonuç', key: 'sonuc', width: 40 },
  ]
  for (const s of v.satirlar) {
    ey.addRow({ ...s, donem: s.donemdeTerminli ? 'Evet' : '', kum: s.kumulatifKapsam ? 'Evet' : '', gec: s.gecikti ? 'Evet' : '' })
  }
  ey.autoFilter = { from: 'A1', to: 'P1' }
  baslikSatiri(ey)

  return Buffer.from(await wb.xlsx.writeBuffer())
}
