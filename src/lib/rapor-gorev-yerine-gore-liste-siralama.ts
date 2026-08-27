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

function mudurlukAnahtar(v: string | null | undefined): string {
  const n = String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
  return n && n !== '—' ? n : '—'
}

/** Aktif müdür → memur → sözleşmeli → işçi → ADABEL. */
export function gorevYerineGoreListeKategorisi(satir: GorevYerineGoreListeSatir): GorevYerineGoreListeKategori {
  if (satir.kaynak === 'firma' || satir.statu === FIRMA_STATU_ETIKET) return 'adabel'
  if (gorevYerineGoreUnvanVurgu(satir.unvan, satir.fiili_gorev) === 'mudur') return 'mudur'
  const st = trNormalize(satir.statu)
  if (st === 'memur' || st.startsWith('memur ')) return 'memur'
  if (st.includes('sozlesmeli')) return 'sozlesmeli'
  if (st.includes('isci')) return 'isci'
  return 'diger'
}

function kategoriIndeksi(kat: GorevYerineGoreListeKategori): number {
  const i = GOREV_YERI_KATEGORI_SIRASI.indexOf(kat)
  return i >= 0 ? i : GOREV_YERI_KATEGORI_SIRASI.length
}

/**
 * Yeni veya müdürlük değiştiren kişiyi, hedef müdürlükte kendi istihdam grubunun sonuna koyar.
 * Kayıtlı listedeki diğer kişilerin sırasına dokunmaz.
 */
function mudurlukteKategoriSonunaEkle(
  keys: string[],
  satirByKey: Map<string, GorevYerineGoreListeSatir>,
  eklenecekKey: string,
): string[] {
  const s = satirByKey.get(eklenecekKey)
  if (!s) return keys.filter(k => k !== eklenecekKey)

  const mevcut = keys.filter(k => k !== eklenecekKey)
  if (!mevcut.length) return [eklenecekKey]

  const hedefMud = mudurlukAnahtar(s.mudurluk)
  const hedefKatIdx = kategoriIndeksi(gorevYerineGoreListeKategorisi(s))

  let lastSameKat = -1
  let lastEarlierKat = -1
  let firstLaterKat = -1
  let lastSameMud = -1

  for (let i = 0; i < mevcut.length; i++) {
    const other = satirByKey.get(mevcut[i])
    if (!other) continue
    if (mudurlukAnahtar(other.mudurluk) !== hedefMud) continue
    lastSameMud = i
    const otherIdx = kategoriIndeksi(gorevYerineGoreListeKategorisi(other))
    if (otherIdx === hedefKatIdx) lastSameKat = i
    else if (otherIdx < hedefKatIdx) lastEarlierKat = i
    else if (firstLaterKat < 0) firstLaterKat = i
  }

  let insertAt: number
  if (lastSameMud >= 0) {
    if (lastSameKat >= 0) insertAt = lastSameKat + 1
    else if (firstLaterKat >= 0) insertAt = firstLaterKat
    else if (lastEarlierKat >= 0) insertAt = lastEarlierKat + 1
    else insertAt = lastSameMud + 1
  } else {
    insertAt = mevcut.length
  }

  const next = [...mevcut]
  next.splice(insertAt, 0, eklenecekKey)
  return next
}

/**
 * Kayıtlı sıra sabittir (anlık görüntü).
 * Ayrılanlar çıkarılır. Müdürlük değişen ve yeni kayıtlar, gittikleri müdürlükte
 * kendi istihdam grubunun sonuna eklenir. Başka kimse yer değiştirmez.
 */
export function gorevYerineGoreListeArtimliSenkron(
  satirlar: GorevYerineGoreListeSatir[],
  oncekiAyar: GorevYeriListeAyarSatir[],
  otomatikEkleKeys: string[] = [],
): string[] {
  const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s]))
  const oncekiByKey = new Map(oncekiAyar.map(a => [a.kayit_key, a]))

  let keys = oncekiAyar.map(a => a.kayit_key).filter(k => satirByKey.has(k))

  const eklenecek: string[] = []
  const eklenecekSet = new Set<string>()

  for (const key of keys) {
    const prev = oncekiByKey.get(key)
    const s = satirByKey.get(key)
    if (s && prev && mudurlukAnahtar(prev.mudurluk) !== mudurlukAnahtar(s.mudurluk)) {
      if (!eklenecekSet.has(key)) {
        eklenecekSet.add(key)
        eklenecek.push(key)
      }
    }
  }

  for (const key of otomatikEkleKeys) {
    if (!satirByKey.has(key) || eklenecekSet.has(key)) continue
    eklenecekSet.add(key)
    eklenecek.push(key)
  }

  keys = keys.filter(k => !eklenecekSet.has(k))

  for (const key of eklenecek) {
    keys = mudurlukteKategoriSonunaEkle(keys, satirByKey, key)
  }

  return keys
}

/** Kayıt listesi kaydı da aynı kuralı kullanır; mevcut sırayı yeniden kurmaz. */
export function gorevYerineGoreListeSiraOlustur(
  satirlar: GorevYerineGoreListeSatir[],
  oncekiAyar: GorevYeriListeAyarSatir[],
  otomatikEkleKeys: string[] = [],
): string[] {
  return gorevYerineGoreListeArtimliSenkron(satirlar, oncekiAyar, otomatikEkleKeys)
}
