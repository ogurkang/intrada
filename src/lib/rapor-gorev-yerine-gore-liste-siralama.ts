import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import {
  gorevYerineGoreUnvanVurgu,
  type GorevYerineGoreListeSatir,
} from '@/lib/rapor-gorev-yerine-gore-liste'
import { trNormalize } from '@/lib/turkce-search'

export type GorevYerineGoreListeKategori = 'mudur' | 'memur' | 'sozlesmeli' | 'isci' | 'adabel' | 'diger'

export const GOREV_YERI_KATEGORI_SIRASI: GorevYerineGoreListeKategori[] = [
  'mudur',
  'memur',
  'sozlesmeli',
  'isci',
  'adabel',
  'diger',
]

export type GorevYeriListeAyarSatir = {
  kayit_key: string
  mudurluk: string | null
}

function normMud(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

function mudurlukAnahtar(v: string | null | undefined): string {
  const n = normMud(v)
  return n && n !== '—' ? n : '—'
}

function adSoyadSirala(a: GorevYerineGoreListeSatir, b: GorevYerineGoreListeSatir): number {
  return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
}

/** Aktif müdür → memur → sözleşmeli → işçi → ADABEL. */
export function gorevYerineGoreListeKategorisi(satir: GorevYerineGoreListeSatir): GorevYerineGoreListeKategori {
  if (satir.kaynak === 'firma' || satir.statu === FIRMA_STATU_ETIKET) return 'adabel'
  if (gorevYerineGoreUnvanVurgu(satir.unvan, satir.fiili_gorev) === 'mudur') return 'mudur'
  const st = trNormalize(satir.statu)
  if (st === trNormalize('Memur')) return 'memur'
  if (st.includes('sozlesmeli')) return 'sozlesmeli'
  if (st.includes('isci')) return 'isci'
  return 'diger'
}

/**
 * Kayıt listesi sırası: müdürlük → statü kategorisi → mevcut sıra korunur;
 * yeni kayıt veya müdürlük değişen kayıt ilgili grubun sonuna alınır.
 */
export function gorevYerineGoreListeSiraOlustur(
  satirlar: GorevYerineGoreListeSatir[],
  oncekiAyar: GorevYeriListeAyarSatir[],
  otomatikEkleKeys: string[] = [],
): string[] {
  const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s]))
  const oncekiByKey = new Map(oncekiAyar.map(a => [a.kayit_key, a]))
  const oncekiKeyOrder = oncekiAyar.map(a => a.kayit_key)

  const dahilKeys = new Set<string>([
    ...oncekiKeyOrder,
    ...otomatikEkleKeys.filter(k => satirByKey.has(k)),
  ])

  const mudurlukOrder: string[] = []
  const mudSeen = new Set<string>()
  for (const k of oncekiKeyOrder) {
    const s = satirByKey.get(k)
    if (!s) continue
    const m = mudurlukAnahtar(s.mudurluk)
    if (!mudSeen.has(m)) {
      mudSeen.add(m)
      mudurlukOrder.push(m)
    }
  }
  for (const s of satirlar) {
    if (!dahilKeys.has(s.kayit_key)) continue
    const m = mudurlukAnahtar(s.mudurluk)
    if (!mudSeen.has(m)) {
      mudSeen.add(m)
      mudurlukOrder.push(m)
    }
  }

  const result: string[] = []
  const eklendi = new Set<string>()

  for (const mud of mudurlukOrder) {
    for (const kat of GOREV_YERI_KATEGORI_SIRASI) {
      const bucket = satirlar.filter(
        s =>
          dahilKeys.has(s.kayit_key) &&
          mudurlukAnahtar(s.mudurluk) === mud &&
          gorevYerineGoreListeKategorisi(s) === kat,
      )
      if (bucket.length === 0) continue

      const bucketKeys = new Set(bucket.map(b => b.kayit_key))
      const stable: string[] = []
      const sona: string[] = []

      for (const key of oncekiKeyOrder) {
        if (!bucketKeys.has(key)) continue
        const s = satirByKey.get(key)
        const prev = oncekiByKey.get(key)
        if (!s) continue
        const transfer =
          !prev ||
          mudurlukAnahtar(prev.mudurluk) !== mudurlukAnahtar(s.mudurluk) ||
          otomatikEkleKeys.includes(key)
        if (transfer) sona.push(key)
        else stable.push(key)
      }

      for (const key of bucketKeys) {
        if (!oncekiByKey.has(key) || otomatikEkleKeys.includes(key)) {
          if (!stable.includes(key) && !sona.includes(key)) sona.push(key)
        }
      }

      sona.sort((a, b) => {
        const sa = satirByKey.get(a)!
        const sb = satirByKey.get(b)!
        return adSoyadSirala(sa, sb)
      })

      for (const key of [...stable, ...sona]) {
        if (!eklendi.has(key)) {
          eklendi.add(key)
          result.push(key)
        }
      }
    }
  }

  for (const key of oncekiKeyOrder) {
    if (!eklendi.has(key) && satirByKey.has(key)) {
      eklendi.add(key)
      result.push(key)
    }
  }

  for (const key of otomatikEkleKeys) {
    if (!eklendi.has(key) && satirByKey.has(key)) {
      eklendi.add(key)
      result.push(key)
    }
  }

  return result
}
