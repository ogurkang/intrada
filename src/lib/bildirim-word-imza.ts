import {
  AlignmentType,
  BorderStyle,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'

function run(text: string, opts?: { bold?: boolean }): TextRun {
  return new TextRun({
    text,
    bold: opts?.bold,
    font: 'Times New Roman',
    size: 24,
  })
}

/** Kenarlık yok — Word'de "Klavuz çizgilerini görüntüle" ile tablo yapısı görünür. */
const KENAR_YOK = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }

const TABLO_KENARLARI = {
  top: KENAR_YOK,
  bottom: KENAR_YOK,
  left: KENAR_YOK,
  right: KENAR_YOK,
  insideHorizontal: KENAR_YOK,
  insideVertical: KENAR_YOK,
}

const HUCRE_KENARLARI = {
  top: KENAR_YOK,
  bottom: KENAR_YOK,
  left: KENAR_YOK,
  right: KENAR_YOK,
}

export type ImzaSolSatir = {
  /** Boş bırakılırsa yalnızca deger gösterilir. */
  etiket?: string
  deger: string
}

function solMetin(s: ImzaSolSatir): string {
  const etiket = String(s.etiket ?? '').trim()
  const deger = String(s.deger ?? '').trim()
  if (etiket) return `${etiket} : ${deger || '—'}`
  return deger
}

function bosHucre(widthPct: number): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: HUCRE_KENARLARI,
    children: [new Paragraph({ children: [run('')] })],
  })
}

/**
 * 3 hücreli imza alanı: sol bilgiler sola yaslı, sağ hücrede TCKN ve ad soyad ortalı.
 * Hücre kenarlıkları yok; Word klavuz çizgileri ile yapı görünür.
 */
export function ucHucreImzaTablosu(opts: {
  solSatirlar: ImzaSolSatir[]
  sagTckn: string
  sagAdSoyad: string
}): Table {
  const adBuyuk = opts.sagAdSoyad.toLocaleUpperCase('tr-TR')
  const satirSayisi = Math.max(opts.solSatirlar.length, 2, 1)

  const rows: TableRow[] = []
  for (let i = 0; i < satirSayisi; i++) {
    const sol = opts.solSatirlar[i]
    const solParagraf = sol
      ? new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [run(solMetin(sol))],
        })
      : new Paragraph({ children: [run('')] })

    const sagParagraf =
      i === 0
        ? new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [run(opts.sagTckn)],
          })
        : i === 1
          ? new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run(adBuyuk, { bold: true })],
            })
          : new Paragraph({ children: [run('')] })

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: HUCRE_KENARLARI,
            verticalAlign: VerticalAlign.TOP,
            children: [solParagraf],
          }),
          bosHucre(34),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: HUCRE_KENARLARI,
            verticalAlign: VerticalAlign.CENTER,
            children: [sagParagraf],
          }),
        ],
      }),
    )
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLO_KENARLARI,
    rows,
  })
}

/** Pasaport — sol: telefon, sağ: TCKN + ad soyad. */
export function pasaportImzaTablosu(telefonEtiket: string, telefon: string, tckn: string, adSoyad: string): Table {
  return ucHucreImzaTablosu({
    solSatirlar: [{ deger: telefonEtiket }, { deger: telefon }],
    sagTckn: tckn,
    sagAdSoyad: adSoyad,
  })
}

/** Mehil izni — yalnızca sağ hücrede TCKN ve ad soyad. */
export function mehilIzniImzaTablosu(tckn: string, adSoyad: string): Table {
  return ucHucreImzaTablosu({
    solSatirlar: [],
    sagTckn: tckn,
    sagAdSoyad: adSoyad,
  })
}

/** Harcırah — sol: adres, sağ: TCKN + ad soyad. */
export function harcirahTalepImzaTablosu(adres: string, tckn: string, adSoyad: string): Table {
  return ucHucreImzaTablosu({
    solSatirlar: [{ deger: 'Adres:' }, { deger: adres.toLocaleUpperCase('tr-TR') }],
    sagTckn: tckn,
    sagAdSoyad: adSoyad,
  })
}

/** Hizmet birleştirme — sol: sicil alanları, sağ: TCKN + ad soyad. */
export function hizmetBirlestirmeImzaTablosu(
  alanlar: {
    tckn: string
    ad_soyad: string
    emeklilik_sicil_no: string
    ssk: string
    bagkur_sicil_no: string
    hizmet_illeri: string
  },
): Table {
  return ucHucreImzaTablosu({
    solSatirlar: [
      { etiket: 'T.C.Kimlik Numarası', deger: alanlar.tckn },
      { etiket: 'Emeklilik Sicil Numarası', deger: alanlar.emeklilik_sicil_no },
      { etiket: 'S.S.K.', deger: alanlar.ssk },
      { etiket: 'Bağ-Kur Sicil Numarası', deger: alanlar.bagkur_sicil_no },
      { etiket: 'Sigortalı Hizmetin Geçtiği İl/İller', deger: alanlar.hizmet_illeri },
    ],
    sagTckn: alanlar.tckn,
    sagAdSoyad: alanlar.ad_soyad,
  })
}
