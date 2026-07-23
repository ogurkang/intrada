import { trNormalize } from '@/lib/turkce-search'

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

/** Unvan metninden "müdürü/müdürlüğü" öncesi taban. */
function unvanMudurBaz(unvanNorm: string): string {
  let idx = unvanNorm.indexOf('muduru')
  if (idx < 0) idx = unvanNorm.indexOf('mudurlugu')
  if (idx < 0) return ''
  return eslesmeBazNorm(unvanNorm.slice(0, idx))
}

function mudurBazEkle(map: Map<string, Set<string>>, baz: string, ad: string) {
  if (!baz) return
  if (!map.has(baz)) map.set(baz, new Set())
  map.get(baz)!.add(ad)
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
 * Kadro hareketlerinden (asil ya da vekil farkı gözetmeksizin) unvanlara göre
 * Belediye Başkanı / Başkan Yardımcısı / Müdür isim dizinini kurar.
 */
export function organizasyonPersonelIndeksKur(rows: KadroUnvanSatir[]): OrganizasyonPersonelIndeks {
  const baskanlar = new Set<string>()
  const baskanYrd = new Set<string>()
  const baskanYrdAday = new Map<string, string>() // sicil → ad
  const sicilAd = new Map<string, string>()
  const mudurByBaz = new Map<string, Set<string>>()

  for (const r of rows) {
    const kisi = satirKisi(r)
    if (!kisi) continue
    const { sicil, ad } = kisi
    sicilAd.set(sicil, ad)

    for (const uvRaw of [r.gorev_unvani, r.kadro_unvani]) {
      const u = String(uvRaw ?? '').trim()
      if (!u) continue
      const n = trNormalize(u)
      if (n.includes('yardimci') && n.includes('baskan')) {
        baskanYrd.add(ad)
        baskanYrdAday.set(sicil, ad)
        continue
      }
      if (n.includes('belediye') && n.includes('baskan')) {
        baskanlar.add(ad)
        continue
      }
      if (n.includes('muduru') || n.includes('mudurlugu')) {
        const baz = unvanMudurBaz(n)
        mudurBazEkle(mudurByBaz, baz, ad)
        for (const mudRaw of [r.gorev_mudurlugu, r.kadro_mudurlugu]) {
          mudurBazEkle(mudurByBaz, mudurlukEslesmeBaz(mudRaw), ad)
        }
      }
    }
  }

  const sirala = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b, 'tr'))
  const mudurMap = new Map<string, string[]>()
  for (const [baz, set] of mudurByBaz) mudurMap.set(baz, sirala(set))

  const adaylar: PersonelAday[] = [...baskanYrdAday.entries()]
    .map(([sicil_no, ad_soyad]) => ({ sicil_no, ad_soyad }))
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))

  return {
    baskanlar: sirala(baskanlar),
    baskanYardimcilari: sirala(baskanYrd),
    baskanYardimcisiAdaylari: adaylar,
    sicilAdHaritasi: sicilAd,
    mudurByBaz: mudurMap,
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
  const baz = mudurlukEslesmeBaz(mudurlukAdi)
  if (!baz) return ''
  return (indeks.mudurByBaz.get(baz) ?? []).join(', ')
}
