import type { TerfiKaynak } from '@/lib/terfi-ettir-hesap'
import {
  kadroVeKha1Ile5Mi,
  parseDerece,
  teknisyenOgrenimUyum,
  unvanTeknikerMi,
  yuksekDerece657,
} from '@/lib/kazanc-teknisyen-ek-gosterge'
import { unvanBelediyeBaskanYardimcisiMi, unvanKazancBirinciDereceMi } from '@/lib/kazanc-ozel-kalem'
import { mudurKariyerTuru, unvanMuduruMi } from '@/lib/kazanc-mudur-th-overlay'
import { unvanSinifiThMi, unvanYanOdemeBilgisayarMi } from '@/lib/kazanc-yan-odeme'

export type PersonelKazancKuralKalem = {
  baslik: string
  aciklama: string
}

export type PersonelKazancKuralKart = {
  sicil_no: string
  ad_soyad: string
  asilUnvan: string | null
  vekilUnvanlar: string[]
  asilKadroDerecesi: string | null
  vekilKadroDereceleri: string[]
  khaDerece: string | null
  ogrenim: string | null
  kalemler: PersonelKazancKuralKalem[]
}

function metin(v: string | null | undefined): string | null {
  const t = String(v ?? '').trim()
  return t || null
}

function birlestir(parcalar: Array<string | null | undefined>): string {
  return parcalar.map(p => String(p ?? '').trim()).filter(Boolean).join(' ')
}

function vekilFarkNotu(vekilVar: boolean): string {
  if (!vekilVar) return ''
  return (
    ' Vekil müdür kaydında bu kalem, asil bir müdürün alacağı ile kendi unvan kazancı arasındaki farktır; ' +
    'negatif tutar 0 yazılır. Terfi › Terfi Bilgileri vekil satırı ve Personel Hareketi kazanç karşılaştırması.'
  )
}

function vekilEkGostergeNotu(vekilVar: boolean): string {
  if (!vekilVar) return ''
  return (
    ' Vekil müdür satırında ek gösterge farkı yazılmaz (0). 657 md. 43 ek gösterge kadroya bağlıdır; ' +
    'vekalet (md. 86) kadroyu değiştirmez. Personel ek göstergeyi asil kadro / KHA kuralından alır.'
  )
}

export function personelKazancKuralKartlariKur(kaynaklar: TerfiKaynak[]): PersonelKazancKuralKart[] {
  const grup = new Map<string, TerfiKaynak[]>()
  for (const k of kaynaklar) {
    const list = grup.get(k.sicil_no)
    if (list) list.push(k)
    else grup.set(k.sicil_no, [k])
  }

  const kartlar: PersonelKazancKuralKart[] = []
  for (const [sicil, list] of grup) {
    const asil = list.find(k => k.kadro_rolu === 'Asil') ?? null
    const vekiller = list.filter(k => k.kadro_rolu === 'Vekil' || k.vekil_mudur_fark_mi)
    const kuralKaynak = asil ?? list[0]
    if (!kuralKaynak) continue
    kartlar.push({
      sicil_no: sicil,
      ad_soyad: kuralKaynak.ad_soyad ?? sicil,
      asilUnvan: metin(asil?.unvan_adi),
      vekilUnvanlar: [...new Set(vekiller.map(v => metin(v.unvan_adi)).filter((x): x is string => !!x))],
      asilKadroDerecesi: metin(asil?.kadro_derecesi ?? (asil ? null : kuralKaynak.kadro_derecesi)),
      vekilKadroDereceleri: [...new Set(vekiller.map(v => metin(v.kadro_derecesi)).filter((x): x is string => !!x))],
      khaDerece: metin(kuralKaynak.kha_derece),
      ogrenim: metin(kuralKaynak.ogrenim_turu),
      kalemler: kalemleriKur(kuralKaynak, vekiller.some(v => v.vekil_mudur_fark_mi || unvanMuduruMi(v.unvan_adi))),
    })
  }

  return kartlar.sort(
    (a, b) =>
      (Number.parseInt(a.sicil_no, 10) || 0) - (Number.parseInt(b.sicil_no, 10) || 0) ||
      a.sicil_no.localeCompare(b.sicil_no, 'tr'),
  )
}

function kalemleriKur(r: TerfiKaynak, vekilMudurVar: boolean): PersonelKazancKuralKalem[] {
  const unvan = metin(r.unvan_adi) ?? 'kadro unvanı'
  const ogrenim = metin(r.ogrenim_turu) ?? 'öğrenim'
  const kha = parseDerece(r.kha_derece)
  const kadro = parseDerece(r.kadro_derecesi)
  const birinci = unvanKazancBirinciDereceMi(r.unvan_adi)
  const yuksek1_5 = kadroVeKha1Ile5Mi(r.kadro_derecesi, r.kha_derece)
  const yuksekDerece = yuksekDerece657(kadro, kha)
  const tanimDerece = birinci ? 1 : kha
  const thMi = unvanSinifiThMi(r.unvan_sinif)
  const bilgisayarUnvan = unvanYanOdemeBilgisayarMi(r.unvan_adi)
  const teknisyenUyum = teknisyenOgrenimUyum({
    unvanAdi: r.unvan_adi,
    yuksekOgrenimVar: r.yuksek_ogrenim_var,
    kadrosuIleIlgili: r.kadrosu_ile_ilgili,
    teknisyenKariyer: r.teknisyen_kariyer ?? null,
  })
  const teknikerTeknik = unvanTeknikerMi(r.unvan_adi) && r.teknik_ogrenim
  const asilMudur = r.asil_mi === true && unvanMuduruMi(r.unvan_adi)
  const bby = unvanBelediyeBaskanYardimcisiMi(r.unvan_adi)
  const kariyer = (asilMudur || bby) ? mudurKariyerTuru(r.ogrenim_meslegi, r.ogrenim_bolum) : null
  const yurut = metin(r.yuruttugu_unvan_adi)
  const ekranTanim = `Tanımlar › Kazanç Bilgileri › ${unvan} › ${ogrenim}`
  const ekranTerfi = 'Terfi › Terfi Bilgileri'
  const fark = vekilFarkNotu(vekilMudurVar)

  const egParcalar: string[] = [
    '657 sayılı Devlet Memurları Kanunu md. 43 ve ek gösterge cetveli.',
  ]
  if (birinci) {
    egParcalar.push(
      `${unvan} kazancı KHA’ya bakılmaksızın 1. derece tanımdan okunur. ${ekranTanim} › 1. derece.`,
    )
  } else if (yuksek1_5 && yuksekDerece != null && kha != null && yuksekDerece !== kha) {
    egParcalar.push(
      `Kadro (${kadro}) ve KHA (${kha}) 1–5 aralığında olduğu için ek gösterge yüksek 657 derecesinden (${yuksekDerece}) alınır. ${ekranTanim} › ${yuksekDerece}. derece.`,
    )
  } else {
    egParcalar.push(
      `KHA derecesindeki (${tanimDerece ?? '—'}) unvan satırından alınır. ${ekranTanim} › ${tanimDerece ?? 'KHA'}. derece.`,
    )
  }
  if (teknisyenUyum === 'uyumsuz') {
    egParcalar.push(
      'Teknisyen + yüksek öğrenim, kadrosu ile ilgili değil: ek gösterge Bilgisayar İşletmeni tanımından (657 cetveli uygulaması). Personel › Öğrenim; Tanımlar › Kazanç Bilgileri › Bilgisayar İşletmeni.',
    )
  }
  if (teknikerTeknik) {
    egParcalar.push(
      'Tekniker + Teknik Öğrenim tiki: ek gösterge Kimyager lisans/önlisans tanımından. Personel › Öğrenim; Tanımlar › Kazanç Bilgileri › Kimyager.',
    )
  }
  if (kariyer === 'muhendis' || kariyer === 'peyzajmimar') {
    egParcalar.push(
      bby
        ? 'Belediye Başkan Yardımcısı TH kariyer: ek gösterge = max(1. derece BBY, mühendis KHA derecesi). 2006/10344 sayılı BKK I sayılı cetvel.'
        : 'Asil müdür TH kariyer (mühendis/mimar/şehir plancısı): ek gösterge = max(müdür unvanı, mühendis tanımı), yüksek 657 derecesi. 2006/10344 sayılı BKK I sayılı cetvel.',
    )
  } else if (kariyer === 'kimyager') {
    egParcalar.push(
      'Asil müdür TH kariyer (kimyager): ek gösterge = max(müdür unvanı, kimyager tanımı). 2006/10344 sayılı BKK I sayılı cetvel.',
    )
  }
  egParcalar.push(`${ekranTerfi} asil satırındaki ek gösterge bu kuralın sonucudur.${vekilEkGostergeNotu(vekilMudurVar)}`)

  const eoParcalar: string[] = [
    '375 sayılı Kanun Hükmünde Kararname ek md. 9 (aylığa ilişkin ek ödeme).',
  ]
  if (birinci) {
    eoParcalar.push(`1. derece kazanç satırındaki ek ödeme. ${ekranTanim} › 1. derece.`)
  } else {
    eoParcalar.push(
      `Ek ödeme KHA derecesinde (${kha ?? '—'}) kalır; kadro derecesi yükseltmez. ${ekranTanim} › ${kha ?? 'KHA'}. derece.`,
    )
  }
  eoParcalar.push(`${ekranTerfi}.${fark}`)

  const ohtParcalar: string[] = [
    '657 sayılı Kanun md. 152; 17/4/2006 tarihli ve 2006/10344 sayılı Bakanlar Kurulu Kararı I sayılı cetvel (özel hizmet tazminatı).',
  ]
  if (birinci && !bby) {
    ohtParcalar.push(`Özel Kalem Müdürü ÖHT’si 1. derece tanımdan alınır. ${ekranTanim} › 1. derece.`)
  } else if (bby) {
    ohtParcalar.push('Belediye Başkan Yardımcısı tabanı 1. derece tanımdandır.')
  } else if (yuksek1_5 && yuksekDerece != null && kha != null && yuksekDerece !== kha) {
    ohtParcalar.push(
      `Kadro ve KHA 1–5 olduğu için ÖHT yüksek 657 derecesinden (${yuksekDerece}) okunur. ${ekranTanim} › ${yuksekDerece}. derece.`,
    )
  } else {
    ohtParcalar.push(`KHA derecesindeki unvan satırı. ${ekranTanim} › ${kha ?? 'KHA'}. derece.`)
  }
  if (asilMudur && yuksekDerece != null && kha != null && yuksekDerece !== kha) {
    ohtParcalar.push(`Asil müdür ÖHT’si ayrıca kadro/KHA yüksek 657 derecesinden teyit edilir (${yuksekDerece}).`)
  }
  if (teknisyenUyum === 'uyumlu_tekniker' || teknisyenUyum === 'uyumlu_muhendis') {
    ohtParcalar.push(
      `Teknisyen öğrenim uyumlu: ÖHT ${teknisyenUyum === 'uyumlu_muhendis' ? 'Mühendis' : 'Tekniker'} tanımından. Personel › Öğrenim (kadrosu ile ilgili).`,
    )
  }
  if (kariyer === 'muhendis') {
    ohtParcalar.push(
      'TH kariyer mühendis/mimar/şehir plancısı: ÖHT = max(unvan, %195 — 2006/10344 I sayılı cetvel grup 8 + 40).',
    )
  } else if (kariyer === 'kimyager') {
    ohtParcalar.push('TH kariyer kimyager: ÖHT = max(unvan, %185 — 2006/10344 I sayılı cetvel grup 9 + 40).')
  } else if (kariyer === 'icmimar') {
    ohtParcalar.push('İç mimar öğrenimi: ÖHT İç Mimar kazanç satırından; %195 uygulanmaz.')
  } else if (kariyer === 'peyzajmimar') {
    ohtParcalar.push(
      'Peyzaj mimarı öğrenimi: ÖHT müdür unvanının yüksek 657 derecesindeki satırından; Peyzaj Mimarı tanımı ve %195 kullanılmaz.',
    )
  }
  if (bby && kariyer) {
    ohtParcalar.push('BBY’de kariyer ÖHT karşılaştırması KHA derecesindeki mühendis/kimyager satırıyladır.')
  }
  ohtParcalar.push(`${ekranTerfi}.${fark}`)

  const yanParcalar: string[] = [
    '657 sayılı Kanun md. 152; 2006/10344 sayılı BKK G (iş güçlüğü) ve B (temin güçlüğü) cetvelleri.',
  ]
  if (thMi) {
    yanParcalar.push(
      'TH sınıfı: hizmet yılı 0–4 ise −5 yıl sütunu, 5. yıl ve sonrası +5 yıl sütunu (2006/10344). Personel › TH hizmet başlangıcı / kıdem yılı; Terfi Ettir önizlemesi.',
    )
  }
  if (bilgisayarUnvan) {
    yanParcalar.push(
      'V.H.K.İ. / Bilgisayar İşletmeni: Bilgisayarlı veya Bilgisayarsız sütun, Bildirim › Yetkinlik (bilgisayar kullanıyor) kaydına göre.',
    )
  }
  if (asilMudur && kariyer && kariyer !== 'icmimar') {
    yanParcalar.push(
      r.destek_yardimci_birim
        ? 'Destek/yardımcı birim tiki işaretli: müdür kariyer +1300 yan ödeme eklenmez. Tanımlar › Unvan.'
        : 'Asil müdür TH kariyer: yan ödeme = min(müdür puanı + 1300, 2400) — 2006/10344 I sayılı cetvel B dipnot 3/a ve md. 4/a tavanı.',
    )
  }
  if (bby && kariyer && kariyer !== 'icmimar') {
    yanParcalar.push(
      'Belediye Başkan Yardımcısı TH kariyer: yan ödeme 2600 (İGZ 800 + TG 1800) — 2006/10344 G/B-3-a, B dipnot 3/a, md. 4/a.',
    )
  }
  if (teknisyenUyum === 'uyumlu_tekniker' || teknisyenUyum === 'uyumlu_muhendis') {
    yanParcalar.push(
      `Teknisyen uyumlu: yan ödeme ${teknisyenUyum === 'uyumlu_muhendis' ? 'Mühendis' : 'Tekniker'} tanımından.`,
    )
  }
  if (teknikerTeknik) {
    yanParcalar.push('Tekniker + Teknik Öğrenim: yan ödeme Kütüphaneci lisans/önlisans tanımından.')
  }
  yanParcalar.push(
    'TKY görevi varsa kadro puanına taşınır yetkili puanı eklenir. Bildirim › Taşınır Görevi; Tanımlar › Kazanç Bilgileri › Taşınır Yetkilileri.',
  )
  yanParcalar.push(`${ekranTerfi}.${fark}`)

  const sdsParcalar: string[] = [
    'Belediye sosyal denge sözleşmesi (SDS) oranı; 657 cetvelinden bağımsız kurumsal sözleşme kalemidir.',
  ]
  if (yurut) {
    sdsParcalar.push(
      `Yürütülen unvan (${yurut}) doluysa SDS bu unvanın kazanç tanımından alınır. Personel kaydı › yürüttüğü unvan; ${ekranTanim.replace(unvan, yurut)}.`,
    )
  } else {
    sdsParcalar.push(`Kadro unvanının KHA derecesindeki SDS satırı. ${ekranTanim}.`)
  }
  sdsParcalar.push(`${ekranTerfi}.${fark}`)

  return [
    { baslik: 'Ek Gösterge', aciklama: birlestir(egParcalar) },
    { baslik: 'Ek Ödeme', aciklama: birlestir(eoParcalar) },
    { baslik: 'ÖHT', aciklama: birlestir(ohtParcalar) },
    { baslik: 'Yan Ödeme', aciklama: birlestir(yanParcalar) },
    { baslik: 'SDS', aciklama: birlestir(sdsParcalar) },
  ]
}
