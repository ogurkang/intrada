import {
  AlignmentType,
  BorderStyle,
  Document,
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

/** 2,5 cm kenar (twip). */
const MARGIN_25 = 1418
const A4_W = 11906
const A4_H = 16838

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

const KENAR_YOK = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const HUCRE_KENARLARI = {
  top: KENAR_YOK,
  bottom: KENAR_YOK,
  left: KENAR_YOK,
  right: KENAR_YOK,
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
        children: [hucre('PERSONEL BİLGİLERİ', { bold: true, center: true, widthPct: 100 })],
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
      headerCells.push(hucre('ÖĞLE ARASI', { bold: true, center: true }))
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
        children: [run(`${i + 1}-${metin}`, { size: 22 })],
      }),
    )
  })
  paras.push(
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [run('*Yarı Zamanlı Çalışma Başkanlık Oluru ile yürürlüğe girer.', { size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        run(
          '** Mezkur yönetmeliğin "Yarı Zamanlı Çalışma hakkının sona erme halleri" başlıklı 15. maddesindeki hükümler saklıdır.',
          { size: 22 },
        ),
      ],
    }),
  )
  return paras
}

/** Sol: personel TC / ad / unvan; sağ: müdür ad / unvan. */
function ekImzaTablosu(alanlar: YzcBelgeAlanlari): Table {
  const sol = [
    alanlar.tckn,
    alanlar.ad_soyad.toLocaleUpperCase('tr-TR'),
    alanlar.unvan,
  ].filter(Boolean)
  const sag = [
    alanlar.mudur_ad_soyad.toLocaleUpperCase('tr-TR'),
    alanlar.mudur_unvan,
  ].filter(Boolean)
  const satirSayisi = Math.max(sol.length, sag.length, 1)

  const rows: TableRow[] = []
  for (let i = 0; i < satirSayisi; i++) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            borders: HUCRE_KENARLARI,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [run(sol[i] ?? '', { bold: i === 1 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 24, type: WidthType.PERCENTAGE },
            borders: HUCRE_KENARLARI,
            children: [new Paragraph({ children: [run('')] })],
          }),
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            borders: HUCRE_KENARLARI,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [run(sag[i] ?? '', { bold: i === 0 })],
              }),
            ],
          }),
        ],
      }),
    )
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: KENAR_YOK,
      bottom: KENAR_YOK,
      left: KENAR_YOK,
      right: KENAR_YOK,
      insideHorizontal: KENAR_YOK,
      insideVertical: KENAR_YOK,
    },
    rows,
  })
}

export function yzcWordDocument(alanlar: YzcBelgeAlanlari): Document {
  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: A4_W, height: A4_H },
            margin: { top: MARGIN_25, bottom: MARGIN_25, left: MARGIN_25, right: MARGIN_25 },
          },
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
        ],
      },
      {
        properties: {
          page: {
            size: { orientation: 'landscape', width: A4_H, height: A4_W },
            margin: { top: MARGIN_25, bottom: MARGIN_25, left: MARGIN_25, right: MARGIN_25 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [run('EK — YARI ZAMANLI ÇALIŞMA FORMU', { bold: true })],
          }),
          ekBilgiTablosu(alanlar),
          bosSatir(),
          new Paragraph({
            spacing: { after: 120 },
            children: [run('Ek — Haftalık Çalışma Programı', { bold: true, size: 20 })],
          }),
          ekProgramTablosu(alanlar),
          ...ekAciklamalar(),
          bosSatir(),
          bosSatir(),
          bosSatir(),
          ekImzaTablosu(alanlar),
        ],
      },
    ],
  })
}
