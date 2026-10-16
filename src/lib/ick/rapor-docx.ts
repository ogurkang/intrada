import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { ICK_RAPOR_ACIKLAMA, type IckRaporOzet, type IckRaporSatir, type IckRaporVerisi } from '@/lib/ick/rapor'

const FONT = 'Times New Roman'
const KENAR = { style: BorderStyle.SINGLE, size: 4, color: '999999' }
const KENARLAR = { top: KENAR, bottom: KENAR, left: KENAR, right: KENAR }

function r(text: string, bold = false, size = 20): TextRun {
  return new TextRun({ text, bold, font: FONT, size })
}

function p(text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}): Paragraph {
  return new Paragraph({ alignment: opts.align, spacing: { after: opts.after ?? 120 }, children: [r(text, opts.bold, opts.size ?? 22)] })
}

function hucre(text: string, opts: { bold?: boolean; baslik?: boolean; genislik?: number } = {}): TableCell {
  return new TableCell({
    borders: KENARLAR,
    width: opts.genislik ? { size: opts.genislik, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.baslik ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E7EEF7' } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: (text || '—').split('\n').map(s => new Paragraph({ children: [r(s, opts.bold || opts.baslik, 18)] })),
  })
}

function tablo(basliklar: string[], satirlar: string[][], genislikler?: number[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: basliklar.map((b, i) => hucre(b, { baslik: true, genislik: genislikler?.[i] })) }),
      ...satirlar.map(s => new TableRow({ children: s.map((c, i) => hucre(c, { genislik: genislikler?.[i] })) })),
    ],
  })
}

function ozetTablo(o: IckRaporOzet): Table {
  return tablo(
    ['Eylem Sayısı', 'Tamamlanan Eylem Sayısı', 'Devam Eden Eylem Sayısı', 'Başlanmayan Eylem Sayısı', 'Gerçekleşme Oranı'],
    [[String(o.eylem), String(o.tamamlanan), String(o.devam), String(o.baslanmadi), `%${o.oran}`]],
  )
}

function eylemKarti(s: IckRaporSatir): Table {
  const satir = (a: string, b: string) => new TableRow({ children: [hucre(a, { baslik: true, genislik: 28 }), hucre(b, { genislik: 72 })] })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      satir('Eylem Kodu / Durumu', `${s.kod} / ${s.durumEtiket}${s.gecikti ? ' — tamamlanma tarihi geçti' : ''}`),
      satir('Öngörülen Eylem', s.ongorulenEylem),
      satir('Sorumlu Birim', s.muhatap ? `${s.sorumlu}\nMüdürlük koordinatörü: ${s.muhatap}` : s.sorumlu),
      satir('Tamamlanma Tarihi', s.termin),
      satir('Gerçekleştirilen Çalışma', s.calisma || 'Kesinleşmiş bildirim yok.'),
      satir('Kanıtlayıcı Belge / Çıktı', `${s.kanit || '—'}${s.kanitSayisi ? `\nSistemde ${s.kanitSayisi} belge kayıtlı.` : ''}`),
      satir('İzleme Değerlendirmesi', s.degerlendirme),
      satir('Sonuç', s.sonuc),
    ],
  })
}

export async function ickRaporDocx(v: IckRaporVerisi): Promise<Buffer> {
  const kapsam = v.satirlar.filter(s => s.donemdeTerminli || s.kumulatifKapsam)
  const cocuklar: (Paragraph | Table)[] = [
    p(v.planAd, { bold: true, size: 28, align: AlignmentType.CENTER }),
    p(v.donemBaslik, { bold: true, size: 26, align: AlignmentType.CENTER }),
    p(`İzleme dönemi: ${v.donemAralik}`, { align: AlignmentType.CENTER }),
    v.kilitli
      ? p(`Dönem ${v.kilitTarihi} tarihinde kapatılmıştır (tamamlandı); rapor kapanış anındaki kesinleşmiş verilerden üretilmiştir.`, { align: AlignmentType.CENTER, size: 18 })
      : p('TASLAK — dönem kapatılmadı; veriler değişebilir.', { bold: true, align: AlignmentType.CENTER }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [r('1. Dönem Gerçekleşme Özeti', true, 24)] }),
    p('Bu izleme döneminin kapsamındaki eylemler (tamamlanma tarihi bu dönemde olanlar ve tamamlanmayan gecikmiş eylemler):'),
    ozetTablo(v.donemOzet),
    p(''),
    p('Tamamlanma tarihi dönem sonuna kadar gelen eylemler (kümülatif):'),
    ozetTablo(v.kumulatifOzet),
    p(''),
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [r('2. Bileşen Bazında Durum', true, 24)] }),
    tablo(
      ['Bileşen', 'Eylem', 'Tamamlanan', 'Devam Eden', 'Başlanmadı', 'İptal', 'Tamamlanma Tarihi Geçen'],
      v.bilesenOzet.map(b => [b.bilesen, String(b.toplam), String(b.tamamlanan), String(b.devam), String(b.baslanmadi), String(b.iptal), String(b.geciken)]),
    ),
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [r('3. Kapsamdaki Eylemler', true, 24)] }),
    tablo(
      ['Genel Şart', 'Eylem Kodu', 'Öngörülen Eylem', 'Sorumlu Birim', 'Planlanan Çıktı', 'Tamamlanma Tarihi', 'Durum'],
      kapsam.map(s => [s.genelSartKod, s.kod, s.ongorulenEylem, s.sorumlu, s.cikti, s.termin, s.durumEtiket]),
      [8, 9, 33, 16, 14, 10, 10],
    ),
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [r('4. Eylem Bazında Değerlendirme', true, 24)] }),
  ]
  for (const s of kapsam) {
    cocuklar.push(eylemKarti(s), p(''))
  }
  cocuklar.push(
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [r('Ek: Tüm Eylemlerin Durumu', true, 24)] }),
    tablo(
      ['Eylem Kodu', 'Genel Şart', 'Öngörülen Eylem', 'Sorumlu Birim', 'Tamamlanma Tarihi', 'Durum'],
      v.satirlar.map(s => [s.kod, s.genelSartKod, s.ongorulenEylem, s.sorumlu, s.termin, `${s.durumEtiket}${s.gecikti ? ' (tamamlanma tarihi geçti)' : ''}`]),
      [9, 8, 41, 18, 12, 12],
    ),
    new Paragraph({ spacing: { before: 240, after: 80 }, children: [r('Açıklama', true, 20)] }),
    ...ICK_RAPOR_ACIKLAMA.map(a => p(a, { size: 18, after: 60 })),
  )

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.PORTRAIT }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children: cocuklar,
      },
    ],
  })
  return Packer.toBuffer(doc)
}
