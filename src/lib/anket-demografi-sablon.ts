import { anketDemografiKonu, type AnketDemografiKonu } from '@/lib/anket-kirilim'
import { ogrenimTuruSiraIndex } from '@/lib/ogrenim-sira'
import { YEREL_YAS_KOLONLARI } from '@/lib/rapor-yerel-bilgi-yas-dagilimi'

export type AnketDemografiSoru = {
  metin: string
  tip: 'tek_secim'
  secenekler: string[]
}

const CINSIYET = 'Cinsiyetiniz?'
const YAS = 'Yaşınız?'
const OGRENIM = 'Öğrenim durumunuz?'
const STATU = 'Statünüz?'

function benzersiz(liste: string[]): string[] {
  const gorulen = new Set<string>()
  const sonuc: string[] = []
  for (const ad of liste) {
    const anahtar = ad.toLocaleLowerCase('tr-TR')
    if (gorulen.has(anahtar)) continue
    gorulen.add(anahtar)
    sonuc.push(ad)
  }
  return sonuc
}

/** Seçenekler kayıtlı statü ve öğrenim tanımlarından, yaş aralıkları kurum raporundaki gruplardan gelir. */
export function anketDemografiSorulariOlustur(girdi: {
  statuler: { statu_adi: string; sira_no: number | null }[]
  ogrenimler: string[]
}): AnketDemografiSoru[] {
  const statu = benzersiz(
    girdi.statuler
      .slice()
      .sort((a, b) => (a.sira_no ?? 9999) - (b.sira_no ?? 9999) || a.statu_adi.localeCompare(b.statu_adi, 'tr'))
      .map(s => s.statu_adi.trim())
      .filter(Boolean),
  ).slice(0, 12)
  const ogrenim = benzersiz(girdi.ogrenimler.map(s => s.trim()).filter(Boolean))
    .sort((a, b) => ogrenimTuruSiraIndex(a) - ogrenimTuruSiraIndex(b) || a.localeCompare(b, 'tr'))
    .slice(0, 12)
  const sorular: AnketDemografiSoru[] = [
    { metin: CINSIYET, tip: 'tek_secim', secenekler: ['Kadın', 'Erkek'] },
    { metin: YAS, tip: 'tek_secim', secenekler: [...YEREL_YAS_KOLONLARI] },
  ]
  if (ogrenim.length >= 2) sorular.push({ metin: OGRENIM, tip: 'tek_secim', secenekler: ogrenim })
  if (statu.length >= 2) sorular.push({ metin: STATU, tip: 'tek_secim', secenekler: statu })
  return sorular
}

export function anketDemografiEksikler(
  sablon: AnketDemografiSoru[],
  mevcutMetinler: string[],
): AnketDemografiSoru[] {
  const konular = new Set(
    mevcutMetinler
      .map(m => anketDemografiKonu(m))
      .filter((k): k is AnketDemografiKonu => k !== null),
  )
  return sablon.filter(s => {
    const konu = anketDemografiKonu(s.metin)
    return konu !== null && !konular.has(konu)
  })
}
