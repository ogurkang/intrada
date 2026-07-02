import type { Worksheet } from 'exceljs'
import {
  AlignmentType,
  Document,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx'
import type { Tables } from '@/types/database'

type Calisan = Tables<'calisan'>
type PH = Tables<'personel_hareketleri'>

export const PERSONEL_HAREKET_SABLON_URL = '/templates/personel_hareketler_formu.xlsx'
export const PERSONEL_HAREKET_SABLON_SAYFA = '2019'

export function fmtPersonelHareketTarih(v: string | null | undefined): string {
  const s = String(v ?? '').trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-')
    return `${d}.${m}.${y}`
  }
  return s
}

export interface PersonelHareketEskiYeni {
  sinif: string
  gorev_yeri: string
  unvan: string
  kadro_derecesi: string
  kha_derece: string
  kha_kademe: string
  ekea_derece: string
  ekea_kademe: string
  kha_tarihi: string
  ekea_tarihi: string
  kidem_yili: string
  kidem_tarihi: string
  iyi_hal_terfi_tarihi: string
  ek_gosterge: string
  ek_odeme: string
  oht: string
  igz: string
  sds_orani: string
}

export interface PersonelHareketFormVerisi {
  personel: Pick<Calisan, 'sicil_no' | 'ad_soyad' | 'dogum_yeri' | 'dogum_tarihi' | 'askerlik_durumu'>
  dogumYeriTarihi: string
  ogrenimDurumu: string
  onaylayan: string
  hareketTipiSecim: string
  hareketTipiText: string
  yururluk_tarihi: string
  adaylik_suresi: string
  asli_memuriyete_atanma_tarihi: string
  eski: PersonelHareketEskiYeni
  yeni: PersonelHareketEskiYeni
  yeniKhaDK: string
  yeniEkeaDK: string
  yeni_kha_tarihi: string
  yeni_ekea_tarihi: string
  yeni_kidem_yili: string
  yeni_kidem_tarihi: string
  yeni_iyi_hal_terfi_tarihi: string
  yeni_ek_gosterge: string
  yeni_ek_odeme: string
  yeni_oht: string
  yeni_igz: string
  yeni_sds_orani: string
  dayanak: string
  aciklama: string
  teklifEdenAd: string
  ise_baslama_tarihi: string
  ayrilis_tarihi: string
  kayit_tarihi: string
  kayit_no: string
  dagitim: string
  eski_g_ayligi: string
  yeni_g_ayligi: string
  k_yili: string
}

export type GostergeKayit = { derece: number; kademe: number; gosterge: number }

export function gostergeDegeriBul(
  gostergeler: GostergeKayit[],
  derece: string | null | undefined,
  kademe: string | null | undefined,
): string {
  const d = Number.parseInt(String(derece ?? '').trim(), 10)
  const k = Number.parseInt(String(kademe ?? '').trim(), 10)
  if (!Number.isFinite(d) || !Number.isFinite(k)) return ''
  const hit = gostergeler.find(g => g.derece === d && g.kademe === k)
  return hit?.gosterge != null ? String(hit.gosterge) : ''
}

export function personelHareketFormVerisiOlustur(input: {
  fd: FormData
  personel: Pick<
    Calisan,
    'sicil_no' | 'ad_soyad' | 'dogum_yeri' | 'dogum_tarihi' | 'askerlik_durumu' | 'hizmet_suresi_yil'
  >
  dogumYeriTarihi: string
  ogrenimDurumu: string | null
  onaylayan: string
  yardimcilar: { sicil: string; ad: string }[]
  eski: PersonelHareketEskiYeni
  yeniGorevYeri: string
  yeniUnvan: string
  yeniSinif: string
  yeniKadroDerecesi: string
  gostergeler: GostergeKayit[]
}): PersonelHareketFormVerisi {
  const { fd, personel, eski } = input
  const hareketTipiSecim = String(fd.get('hareket_tipi') ?? '')
  const hareketTipiText =
    hareketTipiSecim === 'IlkAtanma'
      ? 'İlk Atanma'
      : hareketTipiSecim === 'YerDegistirme'
        ? 'Yer Değiştirme'
        : hareketTipiSecim === 'Yukselme'
          ? 'Yükselme'
          : ''

  const teklifSicil = String(fd.get('teklif_eden') ?? '')
  const teklifEdenAd = input.yardimcilar.find(y => y.sicil === teklifSicil)?.ad ?? ''

  const yeniKhaDK = `${String(fd.get('yeni_kha_derece') ?? '')}/${String(fd.get('yeni_kha_kademe') ?? '')}`.replace(
    /^\/|\/$/g,
    '',
  )
  const yeniEkeaDK = `${String(fd.get('yeni_ekea_derece') ?? '')}/${String(fd.get('yeni_ekea_kademe') ?? '')}`.replace(
    /^\/|\/$/g,
    '',
  )

  const yeniKhaDerece = String(fd.get('yeni_kha_derece') ?? '')
  const yeniKhaKademe = String(fd.get('yeni_kha_kademe') ?? '')
  const eskiGAyligi = gostergeDegeriBul(input.gostergeler, eski.kha_derece, eski.kha_kademe)
  const yeniGAyligi = gostergeDegeriBul(input.gostergeler, yeniKhaDerece, yeniKhaKademe)
  const kYili =
    input.personel.hizmet_suresi_yil != null && Number.isFinite(input.personel.hizmet_suresi_yil)
      ? String(input.personel.hizmet_suresi_yil)
      : ''

  return {
    personel,
    dogumYeriTarihi: input.dogumYeriTarihi,
    ogrenimDurumu: input.ogrenimDurumu ?? '',
    onaylayan: input.onaylayan,
    hareketTipiSecim,
    hareketTipiText,
    yururluk_tarihi: fmtPersonelHareketTarih(String(fd.get('yururluk_tarihi') ?? '')),
    adaylik_suresi: String(fd.get('adaylik_suresi') ?? ''),
    asli_memuriyete_atanma_tarihi: fmtPersonelHareketTarih(String(fd.get('asli_memuriyete_atanma_tarihi') ?? '')),
    eski,
    yeni: {
      ...eski,
      gorev_yeri: input.yeniGorevYeri,
      unvan: input.yeniUnvan,
      sinif: input.yeniSinif,
      kadro_derecesi: input.yeniKadroDerecesi,
      kha_derece: String(fd.get('yeni_kha_derece') ?? ''),
      kha_kademe: String(fd.get('yeni_kha_kademe') ?? ''),
      ekea_derece: String(fd.get('yeni_ekea_derece') ?? ''),
      ekea_kademe: String(fd.get('yeni_ekea_kademe') ?? ''),
      kha_tarihi: String(fd.get('yeni_kha_tarihi') ?? ''),
      ekea_tarihi: String(fd.get('yeni_ekea_tarihi') ?? ''),
      kidem_yili: String(fd.get('yeni_kidem_yili') ?? ''),
      kidem_tarihi: String(fd.get('yeni_kidem_tarihi') ?? ''),
      iyi_hal_terfi_tarihi: String(fd.get('yeni_iyi_hal_terfi_tarihi') ?? ''),
      ek_gosterge: String(fd.get('yeni_ek_gosterge') ?? ''),
      ek_odeme: String(fd.get('yeni_ek_odeme') ?? ''),
      oht: String(fd.get('yeni_oht') ?? ''),
      igz: String(fd.get('yeni_igz') ?? ''),
      sds_orani: String(fd.get('yeni_sds_orani') ?? ''),
    },
    yeniKhaDK,
    yeniEkeaDK,
    yeni_kha_tarihi: fmtPersonelHareketTarih(String(fd.get('yeni_kha_tarihi') ?? '')),
    yeni_ekea_tarihi: fmtPersonelHareketTarih(String(fd.get('yeni_ekea_tarihi') ?? '')),
    yeni_kidem_yili: String(fd.get('yeni_kidem_yili') ?? ''),
    yeni_kidem_tarihi: fmtPersonelHareketTarih(String(fd.get('yeni_kidem_tarihi') ?? '')),
    yeni_iyi_hal_terfi_tarihi: fmtPersonelHareketTarih(String(fd.get('yeni_iyi_hal_terfi_tarihi') ?? '')),
    yeni_ek_gosterge: String(fd.get('yeni_ek_gosterge') ?? ''),
    yeni_ek_odeme: String(fd.get('yeni_ek_odeme') ?? ''),
    yeni_oht: String(fd.get('yeni_oht') ?? ''),
    yeni_igz: String(fd.get('yeni_igz') ?? ''),
    yeni_sds_orani: String(fd.get('yeni_sds_orani') ?? ''),
    dayanak: String(fd.get('dayanak') ?? ''),
    aciklama: String(fd.get('aciklama') ?? ''),
    teklifEdenAd,
    ise_baslama_tarihi: fmtPersonelHareketTarih(String(fd.get('ise_baslama_tarihi') ?? '')),
    ayrilis_tarihi: fmtPersonelHareketTarih(String(fd.get('ayrilis_tarihi') ?? '')),
    kayit_tarihi: fmtPersonelHareketTarih(String(fd.get('kayit_tarihi') ?? '')),
    kayit_no: String(fd.get('kayit_no') ?? '').trim(),
    dagitim: (fd.getAll('dagitim_mudurlukleri') as string[]).filter(Boolean).join('; '),
    eski_g_ayligi: eskiGAyligi,
    yeni_g_ayligi: yeniGAyligi,
    k_yili: kYili,
  }
}

export function personelHareketFormVerisiKayittan(input: {
  personel: Pick<Calisan, 'sicil_no' | 'ad_soyad' | 'dogum_yeri' | 'dogum_tarihi' | 'askerlik_durumu' | 'hizmet_suresi_yil'>
  hareket: PH
  dogumYeriTarihi: string
  ogrenimDurumu?: string | null
  teklifEdenAd?: string | null
}): PersonelHareketFormVerisi {
  const h = input.hareket
  const secim = String(h.hareket_tipi ?? '')
  const tip =
    secim === 'IlkAtanma'
      ? 'İlk Atanma'
      : secim === 'YerDegistirme'
        ? 'Yer Değiştirme'
        : secim === 'Yukselme'
          ? 'Yükselme'
          : secim

  const eski: PersonelHareketEskiYeni = {
    sinif: String(h.eski_sinif ?? ''),
    gorev_yeri: String(h.eski_gorev_yeri ?? ''),
    unvan: String(h.eski_unvan ?? ''),
    kadro_derecesi: String(h.eski_kadro_derecesi ?? ''),
    kha_derece: String(h.eski_kha_derece ?? ''),
    kha_kademe: String(h.eski_kha_kademe ?? ''),
    ekea_derece: String(h.eski_ekea_derece ?? ''),
    ekea_kademe: String(h.eski_ekea_kademe ?? ''),
    kha_tarihi: '',
    ekea_tarihi: '',
    kidem_yili: String(h.eski_kidem_yili ?? ''),
    kidem_tarihi: '',
    iyi_hal_terfi_tarihi: '',
    ek_gosterge: String(h.eski_ek_gosterge ?? ''),
    ek_odeme: String(h.eski_ek_odeme ?? ''),
    oht: String(h.eski_oht ?? ''),
    igz: String(h.eski_igz ?? ''),
    sds_orani: '',
  }

  const yeni: PersonelHareketEskiYeni = {
    sinif: String(h.yeni_sinif ?? ''),
    gorev_yeri: String(h.yeni_gorev_yeri ?? ''),
    unvan: String(h.yeni_unvan ?? ''),
    kadro_derecesi: String(h.yeni_kadro_derecesi ?? ''),
    kha_derece: String(h.yeni_kha_derece ?? ''),
    kha_kademe: String(h.yeni_kha_kademe ?? ''),
    ekea_derece: String(h.yeni_ekea_derece ?? ''),
    ekea_kademe: String(h.yeni_ekea_kademe ?? ''),
    kha_tarihi: '',
    ekea_tarihi: '',
    kidem_yili: String(h.yeni_kidem_yili ?? ''),
    kidem_tarihi: '',
    iyi_hal_terfi_tarihi: '',
    ek_gosterge: String(h.yeni_ek_gosterge ?? ''),
    ek_odeme: String(h.yeni_ek_odeme ?? ''),
    oht: String(h.yeni_oht ?? ''),
    igz: String(h.yeni_igz ?? ''),
    sds_orani: '',
  }

  const kYili =
    input.personel.hizmet_suresi_yil != null && Number.isFinite(input.personel.hizmet_suresi_yil)
      ? String(input.personel.hizmet_suresi_yil)
      : ''

  return {
    personel: input.personel,
    dogumYeriTarihi: input.dogumYeriTarihi,
    ogrenimDurumu: input.ogrenimDurumu ?? '',
    onaylayan: String(h.onaylayan ?? ''),
    hareketTipiSecim: secim,
    hareketTipiText: tip,
    yururluk_tarihi: fmtPersonelHareketTarih(h.yururluk_tarihi),
    adaylik_suresi: String(h.adaylik_suresi ?? ''),
    asli_memuriyete_atanma_tarihi: fmtPersonelHareketTarih(h.asli_memuriyete_atanma_tarihi),
    eski,
    yeni,
    yeniKhaDK: [yeni.kha_derece, yeni.kha_kademe].filter(Boolean).join('/'),
    yeniEkeaDK: [yeni.ekea_derece, yeni.ekea_kademe].filter(Boolean).join('/'),
    yeni_kha_tarihi: '',
    yeni_ekea_tarihi: '',
    yeni_kidem_yili: yeni.kidem_yili,
    yeni_kidem_tarihi: '',
    yeni_iyi_hal_terfi_tarihi: '',
    yeni_ek_gosterge: yeni.ek_gosterge,
    yeni_ek_odeme: yeni.ek_odeme,
    yeni_oht: yeni.oht,
    yeni_igz: yeni.igz,
    yeni_sds_orani: yeni.sds_orani,
    dayanak: String(h.dayanak ?? ''),
    aciklama: String(h.aciklama ?? ''),
    teklifEdenAd: String(input.teklifEdenAd ?? ''),
    ise_baslama_tarihi: fmtPersonelHareketTarih(h.ise_baslama_tarihi),
    ayrilis_tarihi: fmtPersonelHareketTarih(h.ayrilis_tarihi),
    kayit_tarihi: fmtPersonelHareketTarih(h.kayit_tarihi),
    kayit_no: String(h.kayit_no ?? ''),
    dagitim: String(h.dagitim_mudurlukleri ?? ''),
    eski_g_ayligi: '',
    yeni_g_ayligi: '',
    k_yili: kYili,
  }
}

/** ExcelJS ile şablon doldurma — kenarlık ve biçim şablonda kalır (aile bildirimi ile aynı yaklaşım). */
export function personelHareketExcelDoldurExcelJs(ws: Worksheet, v: PersonelHareketFormVerisi) {
  const set = (addr: string, value: string | number | null | undefined) => {
    const s = String(value ?? '').trim()
    if (!s) return
    ws.getCell(addr).value = s
  }
  const mark = (addr: string, on: boolean) => {
    if (!on) return
    ws.getCell(addr).value = 'X'
  }

  mark('C5', v.hareketTipiSecim === 'IlkAtanma')
  mark('F5', v.hareketTipiSecim === 'YerDegistirme')
  mark('K5', v.hareketTipiSecim === 'Yukselme')

  set('A8', v.personel.ad_soyad)
  set('F8', v.personel.sicil_no)
  set('J8', v.dogumYeriTarihi)
  set('A10', v.yururluk_tarihi)
  set('F10', v.adaylik_suresi)
  set('J10', v.asli_memuriyete_atanma_tarihi)
  set('A12', v.ogrenimDurumu)
  set('J12', v.personel.askerlik_durumu)

  set('A14', v.eski.sinif)
  set('H14', v.yeni.sinif)
  set('A15', v.eski.gorev_yeri)
  set('H15', v.yeni.gorev_yeri)
  set('A16', v.eski.unvan)
  set('H16', v.yeni.unvan)

  set('A18', v.eski.kadro_derecesi)
  set('B18', [v.eski.kha_derece, v.eski.kha_kademe].filter(Boolean).join('/'))
  set('C18', [v.eski.ekea_derece, v.eski.ekea_kademe].filter(Boolean).join('/'))
  set('D18', v.eski_g_ayligi)
  set('E18', v.k_yili)
  set('H18', v.yeni.kadro_derecesi)
  set('I18', v.yeniKhaDK)
  set('J18', v.yeniEkeaDK)
  set('K18', v.yeni_g_ayligi)
  set('L18', v.k_yili)

  set('A20', v.eski.ek_gosterge)
  set('B20', v.eski.ek_odeme)
  set('C20', v.eski.oht)
  set('D20', v.eski.igz)
  set('E20', v.eski.sds_orani)
  set('H20', v.yeni_ek_gosterge)
  set('I20', v.yeni_ek_odeme)
  set('J20', v.yeni_oht)
  set('K20', v.yeni_igz)
  set('L20', v.yeni_sds_orani)

  set('A22', v.dayanak)
  set('A25', v.aciklama)
  set('A28', v.teklifEdenAd)
  set('A35', v.onaylayan)
  set('G27', v.ise_baslama_tarihi)
  set('J27', v.ayrilis_tarihi)
  set('G31', `${v.kayit_tarihi} ${v.kayit_no}`.trim())
  set('G34', v.dagitim)
}

function wRun(text: string, opts?: { bold?: boolean }): TextRun {
  return new TextRun({ text, bold: opts?.bold, font: 'Times New Roman', size: 20 })
}

function wPar(children: TextRun[], align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT) {
  return new Paragraph({ alignment: align, spacing: { after: 120 }, children })
}

function wCell(text: string, opts?: { bold?: boolean; width?: number }) {
  return new TableCell({
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [wPar([wRun(text, { bold: opts?.bold })])],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  })
}

function wRow(cells: TableCell[]) {
  return new TableRow({ children: cells })
}

function ikiSutunTablo(satirlar: [string, string, string][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: satirlar.map(([etiket, eski, yeni]) =>
      wRow([
        wCell(etiket, { bold: true, width: 28 }),
        wCell(eski, { width: 36 }),
        wCell(yeni, { width: 36 }),
      ]),
    ),
  })
}

export function personelHareketWordBelgesi(v: PersonelHareketFormVerisi): Document {
  const tipIsaret = (k: string) => (v.hareketTipiSecim === k ? '☑' : '☐')

  return new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } },
        },
        children: [
          wPar([wRun('T.C.', { bold: true })], AlignmentType.CENTER),
          wPar([wRun('ADAPAZARI BELEDİYE BAŞKANLIĞI', { bold: true })], AlignmentType.CENTER),
          wPar([wRun('İnsan Kaynakları ve Eğitim Müdürlüğü')], AlignmentType.CENTER),
          wPar([wRun('PERSONEL HAREKETLERİ ONAYI', { bold: true })], AlignmentType.CENTER),
          wPar([
            wRun(`${tipIsaret('IlkAtanma')} İlk Atama    `),
            wRun(`${tipIsaret('YerDegistirme')} Yer Değiştirme    `),
            wRun(`${tipIsaret('Yukselme')} Yükselme`),
          ], AlignmentType.CENTER),
          ikiSutunTablo([
            ['1. Adı, Soyadı', v.personel.ad_soyad ?? '', ''],
            ['2. Sicil No', v.personel.sicil_no, ''],
            ['3. Doğum Yeri ve Tarihi', v.dogumYeriTarihi, ''],
            ['4. Yürürlük Tarihi', v.yururluk_tarihi, ''],
            ['5. Adaylık Süresi', v.adaylik_suresi, ''],
            ['6. Asalet Tarihi', v.asli_memuriyete_atanma_tarihi, ''],
            ['7. Öğrenim Durumu', v.ogrenimDurumu, ''],
            ['8. Askerlik Durumu', v.personel.askerlik_durumu ?? '', ''],
          ]),
          wPar([wRun('ESKİ DURUMU / YENİ DURUMU', { bold: true })], AlignmentType.CENTER),
          ikiSutunTablo([
            ['Etiket', 'Eski', 'Yeni'],
            ['9. Sınıfı', v.eski.sinif, v.yeni.sinif],
            ['10. Görev Yeri', v.eski.gorev_yeri, v.yeni.gorev_yeri],
            ['11. Ünvanı', v.eski.unvan, v.yeni.unvan],
            [
              '12. D/K Göstergeleri (KDR/KHA/EKEA)',
              `${v.eski.kadro_derecesi} | ${v.eski.kha_derece}/${v.eski.kha_kademe} | ${v.eski.ekea_derece}/${v.eski.ekea_kademe}`,
              `${v.yeni.kadro_derecesi} | ${v.yeniKhaDK} | ${v.yeniEkeaDK}`,
            ],
            [
              'G. Aylığı / K. Yılı',
              `${v.eski_g_ayligi || '—'} / ${v.k_yili || '—'}`,
              `${v.yeni_g_ayligi || '—'} / ${v.k_yili || '—'}`,
            ],
            [
              '13. Yan Ödemeler',
              `EkG:${v.eski.ek_gosterge} EkÖ:${v.eski.ek_odeme} ÖHT:${v.eski.oht}`,
              `EkG:${v.yeni_ek_gosterge} EkÖ:${v.yeni_ek_odeme} ÖHT:${v.yeni_oht}`,
            ],
          ]),
          wPar([wRun('14. Dayanağı:', { bold: true })]),
          wPar([wRun(v.dayanak || '—')]),
          wPar([wRun('15. Gereğinde yapılacak açıklama:', { bold: true })]),
          wPar([wRun(v.aciklama || '—')]),
          ikiSutunTablo([
            ['16. Teklif Eden', v.teklifEdenAd, ''],
            ['18. İşe Başlama', v.ise_baslama_tarihi, ''],
            ['19. Ayrılış', v.ayrilis_tarihi, ''],
            ['20. Kayıt Tarih/No', `${v.kayit_tarihi} ${v.kayit_no}`.trim(), ''],
            ['17. Onaylayan', v.onaylayan, ''],
            ['21. Dağıtım', v.dagitim, ''],
          ]),
        ],
      },
    ],
  })
}
