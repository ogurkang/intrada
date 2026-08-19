import { trNormalize } from '@/lib/turkce-search'
import {
  performansBaskanYardimcisiUnvaniMi,
  performansBelediyeBaskaniUnvaniMi,
  performansMudurUnvaniMi,
} from '@/lib/performans-unvan'

export type BirimTuru = 'mudurluk' | 'baskan' | 'baskan_yardimcisi'

export const BIRIM_TURU_ETIKET: Record<BirimTuru, string> = {
  mudurluk: 'Müdürlük',
  baskan: 'Belediye Başkanı',
  baskan_yardimcisi: 'Belediye Başkan Yardımcısı',
}

/** Eşleştirmede "ve" bağlacı ve fazla boşluk farklarını yok sayar. */
export function eslesmeBazNorm(s: string): string {
  return s
    .replace(/\s+ve\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Müdürlük adından eşleştirme tabanı: "... Müdürlüğü"/"... Müdürü" ekleri sökülür. */
export function mudurlukEslesmeBaz(mudurlukAdi: string | null | undefined): string {
  const n = trNormalize(mudurlukAdi)
  return eslesmeBazNorm(
    n
      .replace(/\s*mudurlugu\b.*$/, '')
      .replace(/\s*muduru\b.*$/, '')
      .trim(),
  )
}

/** Unvan metninden "müdürü/müdürlüğü" öncesi taban. */
export function unvanMudurEslesmeBaz(unvan: string | null | undefined): string {
  const unvanNorm = trNormalize(unvan ?? '')
  let idx = unvanNorm.indexOf('muduru')
  if (idx < 0) idx = unvanNorm.indexOf('mudurlugu')
  if (idx < 0) return ''
  return eslesmeBazNorm(unvanNorm.slice(0, idx))
}

/** İki müdürlük tabanı eşleşiyor mu (ve/boşluk farkları yok sayılır). */
export function mudurlukBazEslesir(a: string, b: string): boolean {
  const na = eslesmeBazNorm(trNormalize(a))
  const nb = eslesmeBazNorm(trNormalize(b))
  if (!na || !nb) return false
  return na === nb || na.includes(nb) || nb.includes(na)
}

function mudurBazEkle(map: Map<string, Set<string>>, baz: string, deger: string) {
  if (!baz || !deger) return
  if (!map.has(baz)) map.set(baz, new Set())
  map.get(baz)!.add(deger)
}

/** Organizasyonda müdürlük müdürü: kadro ünvanı müdür, şube müdürü değil. */
export function organizasyonMudurUnvaniMi(unvan: string): boolean {
  if (!performansMudurUnvaniMi(unvan)) return false
  return !trNormalize(unvan).includes('sube')
}

export function afetRiskMudurluguMu(ad: string): boolean {
  const n = trNormalize(ad)
  return n.includes('afet') && n.includes('risk')
}

function kadroSatiriUnvani(r: KadroUnvanSatir): string {
  return String(r.kadro_unvani ?? '').trim() || String(r.gorev_unvani ?? '').trim()
}

function maptenEslesen(map: Map<string, string[]>, mudurlukAdi: string | null | undefined): string[] {
  const baz = mudurlukEslesmeBaz(mudurlukAdi)
  if (!baz) return []
  const out = new Set<string>()
  for (const [k, vals] of map) {
    if (k === baz || mudurlukBazEslesir(baz, k)) vals.forEach(v => out.add(v))
  }
  return [...out].sort((a, b) => a.localeCompare(b, 'tr'))
}

export interface KadroUnvanSatir {
  durumu?: string | null
  kadro_unvani?: string | null
  gorev_unvani?: string | null
  kadro_mudurlugu?: string | null
  gorev_mudurlugu?: string | null
  asil?: string | null
  vekil?: string | null
  asil_calisan?: { ad_soyad: string | null } | null
  vekil_calisan?: { ad_soyad: string | null } | null
}

export interface PersonelAday {
  sicil_no: string
  ad_soyad: string
}

export interface OrganizasyonPersonelIndeks {
  baskanlar: string[]
  baskanYardimcilari: string[]
  /** Başkan yardımcısı adayları (sicil_no + ad_soyad) — kişi seçimi için */
  baskanYardimcisiAdaylari: PersonelAday[]
  /** sicil_no → ad_soyad (seçili kişinin adını çözmek için) */
  sicilAdHaritasi: Map<string, string>
  /** müdürlük eşleşme tabanı → müdür ad-soyad listesi */
  mudurByBaz: Map<string, string[]>
  /** müdürlük eşleşme tabanı → müdür sicil listesi */
  mudurSicilByBaz: Map<string, string[]>
  /** Belediye başkanı sicilleri */
  baskanSicilleri: string[]
}

/** Satırda görevi yürüten kişiyi (asil öncelikli, yoksa vekil) sicil+ad olarak çöz. */
function satirKisi(r: KadroUnvanSatir): { sicil: string; ad: string } | null {
  const asil = String(r.asil ?? '').trim()
  if (asil) {
    const ad = String(r.asil_calisan?.ad_soyad ?? '').trim()
    if (ad) return { sicil: asil, ad }
  }
  const vekil = String(r.vekil ?? '').trim()
  if (vekil) {
    const ad = String(r.vekil_calisan?.ad_soyad ?? '').trim()
    if (ad) return { sicil: vekil, ad }
  }
  return null
}

/**
 * Makam (başkan / BY) kadro ünvanına göre; müdür, kadro ünvanı + kadro müdürlüğüne göre.
 */
export function organizasyonPersonelIndeksKur(rows: KadroUnvanSatir[]): OrganizasyonPersonelIndeks {
  const baskanlar = new Set<string>()
  const baskanSicil = new Set<string>()
  const baskanYrd = new Set<string>()
  const baskanYrdAday = new Map<string, string>() // sicil → ad
  const sicilAd = new Map<string, string>()
  const mudurByBaz = new Map<string, Set<string>>()
  const mudurSicilByBaz = new Map<string, Set<string>>()

  for (const r of rows) {
    const kisi = satirKisi(r)
    if (!kisi) continue
    const { sicil, ad } = kisi
    sicilAd.set(sicil, ad)

    const unvan = kadroSatiriUnvani(r)
    if (!unvan) continue

    if (performansBaskanYardimcisiUnvaniMi(unvan)) {
      baskanYrd.add(ad)
      baskanYrdAday.set(sicil, ad)
      continue
    }
    if (performansBelediyeBaskaniUnvaniMi(unvan)) {
      baskanlar.add(ad)
      baskanSicil.add(sicil)
      continue
    }
    const kadroUnvan = String(r.kadro_unvani ?? '').trim()
    const mudurUnvan = organizasyonMudurUnvaniMi(kadroUnvan)
      ? kadroUnvan
      : organizasyonMudurUnvaniMi(unvan)
        ? unvan
        : ''
    if (mudurUnvan) {
      // 1) Kadro ünvanı: "İşletme ve İştirakler Müdürü" → İşletme ve İştirakler Müdürlüğü
      mudurBazEkle(mudurByBaz, unvanMudurEslesmeBaz(mudurUnvan), ad)
      mudurBazEkle(mudurSicilByBaz, unvanMudurEslesmeBaz(mudurUnvan), sicil)
      // 2) Kadro müdürlüğü alanı (boşsa görev müdürlüğü)
      const mudBaz =
        mudurlukEslesmeBaz(r.kadro_mudurlugu) || mudurlukEslesmeBaz(r.gorev_mudurlugu)
      mudurBazEkle(mudurByBaz, mudBaz, ad)
      mudurBazEkle(mudurSicilByBaz, mudBaz, sicil)
    }
  }

  const sirala = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b, 'tr'))
  const mudurMap = new Map<string, string[]>()
  const mudurSicilMap = new Map<string, string[]>()
  for (const [baz, set] of mudurByBaz) mudurMap.set(baz, sirala(set))
  for (const [baz, set] of mudurSicilByBaz) mudurSicilMap.set(baz, sirala(set))

  const adaylar: PersonelAday[] = [...baskanYrdAday.entries()]
    .map(([sicil_no, ad_soyad]) => ({ sicil_no, ad_soyad }))
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))

  return {
    baskanlar: sirala(baskanlar),
    baskanYardimcilari: sirala(baskanYrd),
    baskanYardimcisiAdaylari: adaylar,
    sicilAdHaritasi: sicilAd,
    mudurByBaz: mudurMap,
    mudurSicilByBaz: mudurSicilMap,
    baskanSicilleri: sirala(baskanSicil),
  }
}

/**
 * Bir birime karşılık gelen personel ad-soyad metni (virgülle birleşik).
 * Başkan yardımcısı için belirli bir kişi seçildiyse yalnızca o kişinin adı döner.
 */
export function birimPersonelMetni(
  indeks: OrganizasyonPersonelIndeks,
  birimTuru: BirimTuru,
  mudurlukAdi: string | null | undefined,
  personelSicil?: string | null,
): string {
  if (birimTuru === 'baskan') return indeks.baskanlar.join(', ')
  if (birimTuru === 'baskan_yardimcisi') {
    const sicil = String(personelSicil ?? '').trim()
    if (sicil) return indeks.sicilAdHaritasi.get(sicil) ?? ''
    return indeks.baskanYardimcilari.join(', ')
  }
  return maptenEslesen(indeks.mudurByBaz, mudurlukAdi).join(', ')
}

export function birimPersonelTelefonMetni(
  indeks: OrganizasyonPersonelIndeks,
  sicilTelefon: Map<string, string>,
  birimTuru: BirimTuru,
  mudurlukAdi: string | null | undefined,
  personelSicil?: string | null,
): string {
  const tel = (sicil: string) => String(sicilTelefon.get(sicil) ?? '').trim()
  const birlestir = (siciller: string[]) => {
    const phones = [...new Set(siciller.map(tel).filter(Boolean))]
    return phones.join(', ')
  }
  if (birimTuru === 'baskan') return birlestir(indeks.baskanSicilleri)
  if (birimTuru === 'baskan_yardimcisi') {
    const sicil = String(personelSicil ?? '').trim()
    return sicil ? tel(sicil) : ''
  }
  return birlestir(maptenEslesen(indeks.mudurSicilByBaz, mudurlukAdi))
}

export type OrganizasyonBirimSatir = {
  id: number
  birim_turu: BirimTuru
  mudurluk_id: number | null
  personel_sicil_no: string | null
  ad: string
  personel_adi: string
  personel_telefon: string
  ust_birim_id: number | null
  sira_no: number
}

export type OrganizasyonAgacDugum = OrganizasyonBirimSatir & { cocuklar: OrganizasyonAgacDugum[] }

/** Tür, ardından sira_no, ardından ada göre ağaç. */
export function organizasyonAgacKur(birimler: OrganizasyonBirimSatir[]): OrganizasyonAgacDugum[] {
  const map = new Map<number, OrganizasyonAgacDugum>()
  birimler.forEach(b => map.set(b.id, { ...b, cocuklar: [] }))
  const kokler: OrganizasyonAgacDugum[] = []
  map.forEach(dugum => {
    if (dugum.ust_birim_id != null && map.has(dugum.ust_birim_id)) {
      map.get(dugum.ust_birim_id)!.cocuklar.push(dugum)
    } else {
      kokler.push(dugum)
    }
  })
  const turSira: Record<string, number> = { baskan: 0, baskan_yardimcisi: 1, mudurluk: 2 }
  const sirala = (liste: OrganizasyonAgacDugum[]) => {
    liste.sort((a, b) => {
      const t = (turSira[a.birim_turu] ?? 9) - (turSira[b.birim_turu] ?? 9)
      if (t !== 0) return t
      const afet = Number(afetRiskMudurluguMu(a.ad)) - Number(afetRiskMudurluguMu(b.ad))
      if (afet !== 0) return afet
      const s = (a.sira_no ?? 0) - (b.sira_no ?? 0)
      if (s !== 0) return s
      return a.ad.localeCompare(b.ad, 'tr')
    })
    liste.forEach(d => sirala(d.cocuklar))
  }
  sirala(kokler)
  return kokler
}
