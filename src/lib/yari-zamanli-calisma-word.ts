import {
  AlignmentType,
  Document,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import { mehilIzniImzaTablosu } from '@/lib/bildirim-word-imza'
import {
  YZC_ACIKLAMALAR,
  YZC_BIRIM,
  YZC_GUNLER,
  YZC_MAKAM,
  YZC_SAATLER,
  type YzcBelgeAlanlari,
} from '@/lib/yari-zamanli-calisma-belge'

function run(text: string, opts?: { bold?: boolean; size?: number }): TextRun {
  return new TextRun({
    text,
    bold: opts?.bold,
    font: 'Times New Roman',
    size: opts?.size ?? 24,
  })
}

function hucre(text: string, opts?: { bold?: boolean; center?: boolean; widthPct?: number }): TableCell {
  return new TableCell({
    width: opts?.widthPct ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [run(text, { bold: opts?.bold })],
      }),
    ],
  })
}

function bosSatir(): Paragraph {
  return new Paragraph({ spacing: { after: 200 }, children: [run('')] })
}

function ekBilgiTablosu(alanlar: YzcBelgeAlanlari): Table {
  const satirlar: [string, string][] = [
    ['Adı Soyadı', alanlar.ad_soyad],
    ['Görev Yaptığı Birim', alanlar.mudurluk],
    ['TCKN', alanlar.tckn],
    ['Çocuğun Doğum Tarihi', alanlar.cocuk_dogum_tarihi],
    ['Kadro Unvanı', alanlar.unvan],
    ['Yarı Zamanlı Çalışma Başlama Tarihi', alanlar.yari_zamanli_baslangic_tarihi],
    ['Sicil No', alanlar.sicil_no],
    ['Normal Zamanlı Çalışmaya Dönüş Tarihi', alanlar.normal_zamanli_donus_tarihi],
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          hucre('PERSONEL BİLGİLERİ', { bold: true, center: true, widthPct: 100 }),
        ],
      }),
      ...satirlar.map(
        ([etiket, deger]) =>
          new TableRow({
            children: [hucre(etiket, { bold: true, widthPct: 42 }), hucre(deger, { widthPct: 58 })],
          }),
      ),
    ],
  })
}

function programHucre(isaret: boolean): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run(isaret ? 'X' : '')],
      }),
    ],
  })
}

function ekProgramTablosu(alanlar: YzcBelgeAlanlari): Table {
  const ogleIdx = YZC_SAATLER.indexOf('13:30')
  const headerCells: TableCell[] = [hucre('Günler', { bold: true, center: true })]
  YZC_SAATLER.forEach((saat, idx) => {
    headerCells.push(hucre(saat, { bold: true, center: true }))
    if (idx === ogleIdx - 1) {
      headerCells.push(
        hucre('ÖĞLE ARASI', { bold: true, center: true }),
      )
    }
  })

  const rows: TableRow[] = [new TableRow({ children: headerCells })]

  for (const gun of YZC_GUNLER) {
    const secili = new Set(alanlar.calisma_programi[gun] ?? [])
    const cells: TableCell[] = [hucre(gun, { bold: true })]
    YZC_SAATLER.forEach((saat, idx) => {
      cells.push(programHucre(secili.has(saat)))
      if (idx === ogleIdx - 1) {
        cells.push(hucre('', { center: true }))
      }
    })
    rows.push(new TableRow({ children: cells }))
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })
}

function ekAciklamalar(): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [run('AÇIKLAMALAR', { bold: true })],
    }),
  ]
  YZC_ACIKLAMALAR.forEach((metin, i) => {
    paras.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 80, line: 276 },
        children: [run(`${i + 1}-${metin}`)],
      }),
    )
  })
  paras.push(
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [
        run('*Yarı Zamanlı Çalışma Başkanlık Oluru ile yürürlüğe girer.'),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        run(
          '** Mezkur yönetmeliğin "Yarı Zamanlı Çalışma hakkının sona erme halleri" başlıklı 15. maddesindeki hükümler saklıdır.',
        ),
      ],
    }),
  )
  return paras
}

export function yzcWordDocument(alanlar: YzcBelgeAlanlari): Document {
  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 600 },
            children: [run(alanlar.tarih)],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [run(YZC_MAKAM, { bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [run(YZC_BIRIM)],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 708 },
            spacing: { after: 200, line: 360 },
            children: [run(alanlar.metin)],
          }),
          bosSatir(),
          bosSatir(),
          mehilIzniImzaTablosu(alanlar.tckn, alanlar.ad_soyad),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [run('EK — YARI ZAMANLI ÇALIŞMA FORMU', { bold: true })],
          }),
          ekBilgiTablosu(alanlar),
          bosSatir(),
          ekProgramTablosu(alanlar),
          ...ekAciklamalar(),
        ],
      },
    ],
  })
}
