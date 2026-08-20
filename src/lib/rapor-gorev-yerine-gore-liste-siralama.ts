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

type ListeBlokLider = 'baskan' | 'bby' | 'mudur'

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

function satirBlokLideri(s: GorevYerineGoreListeSatir): ListeBlokLider | null {
  const v = gorevYerineGoreUnvanVurgu(s.unvan, s.fiili_gorev)
  if (v === 'belediye_baskani') return 'baskan'
  if (v === 'baskan_yardimci') return 'bby'
  if (v === 'mudur') return 'mudur'
  return null
}

function blokIdForLider(s: GorevYerineGoreListeSatir, lider: ListeBlokLider): string {
  if (lider === 'baskan') return `blok:baskan:${s.kayit_key}`
  if (lider === 'bby') return `blok:bby:${s.kayit_key}`
  return `blok:mud:${mudurlukAnahtar(s.mudurluk)}`
}

function mudurlukBlokId(s: GorevYerineGoreListeSatir): string {
  return `blok:mud:${mudurlukAnahtar(s.mudurluk)}`
}

/**
 * Kayıtlı sıradan blok düzeni çıkarır:
 * Belediye Başkanı → BBY + bağlı personel → müdürlük + personel …
 */
function blokHaritasiOlustur(
  oncekiKeyOrder: string[],
  satirByKey: Map<string, GorevYerineGoreListeSatir>,
): { blokOrder: string[]; keyToBlok: Map<string, string> } {
  const blokOrder: string[] = []
  const keyToBlok = new Map<string, string>()
  let currentBlok = ''

  for (const key of oncekiKeyOrder) {
    const s = satirByKey.get(key)
    if (!s) continue

    const lider = satirBlokLideri(s)
    if (lider) {
      currentBlok = blokIdForLider(s, lider)
      if (!blokOrder.includes(currentBlok)) blokOrder.push(currentBlok)
    } else if (!currentBlok) {
      currentBlok = mudurlukBlokId(s)
      if (!blokOrder.includes(currentBlok)) blokOrder.push(currentBlok)
    }

    keyToBlok.set(key, currentBlok || mudurlukBlokId(s))
  }

  return { blokOrder, keyToBlok }
}

function yeniKayitBlokId(
  s: GorevYerineGoreListeSatir,
  blokOrder: string[],
): string {
  const lider = satirBlokLideri(s)
  if (lider) return blokIdForLider(s, lider)

  const mudBlok = mudurlukBlokId(s)
  if (blokOrder.includes(mudBlok)) return mudBlok

  // Aktif BBY bloğu varsa son BBY bloğuna ekleme yapılmaz; müdürlük bloğu açılır.
  return mudBlok
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

/**
 * Kayıt listesi sırası:
 * - Üst düzey: Belediye Başkanı → BBY grupları → müdürlük grupları (kayıtlı sıradan)
 * - Grup içi: müdür → memur → sözleşmeli → işçi → ADABEL
 * - Yeni / müdürlük değişen kayıt ilgili grubun sonuna alınır
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

  const { blokOrder: oncekiBlokOrder, keyToBlok: oncekiKeyToBlok } = blokHaritasiOlustur(
    oncekiKeyOrder,
    satirByKey,
  )

  const blokOrder = [...oncekiBlokOrder]
  const keyToBlok = new Map(oncekiKeyToBlok)

  for (const key of otomatikEkleKeys) {
    if (!satirByKey.has(key) || keyToBlok.has(key)) continue
    const s = satirByKey.get(key)!
    const blok = yeniKayitBlokId(s, blokOrder)
    keyToBlok.set(key, blok)
    if (!blokOrder.includes(blok)) blokOrder.push(blok)
  }

  for (const key of dahilKeys) {
    if (keyToBlok.has(key)) continue
    const s = satirByKey.get(key)
    if (!s) continue
    const blok = yeniKayitBlokId(s, blokOrder)
    keyToBlok.set(key, blok)
    if (!blokOrder.includes(blok)) blokOrder.push(blok)
  }

  const result: string[] = []
  const eklendi = new Set<string>()

  for (const blokId of blokOrder) {
    for (const kat of GOREV_YERI_KATEGORI_SIRASI) {
      const bucket = satirlar.filter(
        s =>
          dahilKeys.has(s.kayit_key) &&
          keyToBlok.get(s.kayit_key) === blokId &&
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
          keyToBlok.get(key) !== oncekiKeyToBlok.get(key) ||
          otomatikEkleKeys.includes(key)
        if (transfer) sona.push(key)
        else stable.push(key)
      }

      for (const key of bucketKeys) {
        if (!oncekiByKey.has(key) || otomatikEkleKeys.includes(key)) {
          if (!stable.includes(key) && !sona.includes(key)) sona.push(key)
        }
      }

      sona.sort((a, b) => adSoyadSirala(satirByKey.get(a)!, satirByKey.get(b)!))

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

function kategoriIndeksi(kat: GorevYerineGoreListeKategori): number {
  const i = GOREV_YERI_KATEGORI_SIRASI.indexOf(kat)
  return i >= 0 ? i : GOREV_YERI_KATEGORI_SIRASI.length
}

/**
 * Yeni / müdürlük değişen kaydı, hedef blokta kendi istihdam kategorisinin en sonuna ekler.
 * Örn. Memur → o müdürlükteki Memur grubunun sonuna; Sözleşmeli → Sözleşmeli grubunun sonuna.
 * Bloğun mutlak sonuna (işçi/ADABEL altına) düşmez.
 */
function blokaKategoriSonunaEkle(
  keys: string[],
  satirByKey: Map<string, GorevYerineGoreListeSatir>,
  eklenecekKey: string,
): string[] {
  const s = satirByKey.get(eklenecekKey)
  if (!s) return keys.filter(k => k !== eklenecekKey)

  const mevcut = keys.filter(k => k !== eklenecekKey)
  if (!mevcut.length) return [eklenecekKey]

  const { blokOrder, keyToBlok } = blokHaritasiOlustur(mevcut, satirByKey)
  const hedefBlok = yeniKayitBlokId(s, blokOrder)
  const hedefKat = gorevYerineGoreListeKategorisi(s)
  const hedefKatIdx = kategoriIndeksi(hedefKat)

  let lastSameKat = -1
  let lastEarlierKat = -1
  let firstLaterKat = -1
  let lastInBlok = -1
  let firstInBlok = -1

  for (let i = 0; i < mevcut.length; i++) {
    if (keyToBlok.get(mevcut[i]) !== hedefBlok) continue
    if (firstInBlok < 0) firstInBlok = i
    lastInBlok = i
    const other = satirByKey.get(mevcut[i])
    if (!other) continue
    const otherIdx = kategoriIndeksi(gorevYerineGoreListeKategorisi(other))
    if (otherIdx === hedefKatIdx) lastSameKat = i
    else if (otherIdx < hedefKatIdx) lastEarlierKat = i
    else if (firstLaterKat < 0) firstLaterKat = i
  }

  let insertAt: number
  if (lastSameKat >= 0) insertAt = lastSameKat + 1
  else if (firstLaterKat >= 0) insertAt = firstLaterKat
  else if (lastEarlierKat >= 0) insertAt = lastEarlierKat + 1
  else if (lastInBlok >= 0) insertAt = lastInBlok + 1
  else {
    const fullBlokOrder = blokOrder.includes(hedefBlok) ? blokOrder : [...blokOrder, hedefBlok]
    const hedefIdx = fullBlokOrder.indexOf(hedefBlok)
    insertAt = mevcut.length
    for (let i = 0; i < mevcut.length; i++) {
      const b = keyToBlok.get(mevcut[i])
      if (!b) continue
      const bIdx = fullBlokOrder.indexOf(b)
      if (bIdx > hedefIdx) {
        insertAt = i
        break
      }
    }
  }

  const next = [...mevcut]
  next.splice(insertAt, 0, eklenecekKey)
  return next
}

/**
 * Her blokta istihdam türü sırasını zorunlu kılar: müdür → memur → sözleşmeli → işçi → ADABEL → diğer.
 * Aynı kategori içindeki mevcut sıra korunur.
 */
function blokIciKategoriDuzeniZorla(
  keys: string[],
  satirByKey: Map<string, GorevYerineGoreListeSatir>,
): string[] {
  if (keys.length <= 1) return keys

  const { blokOrder, keyToBlok } = blokHaritasiOlustur(keys, satirByKey)
  const byBlok = new Map<string, string[]>()
  for (const key of keys) {
    const blok = keyToBlok.get(key) ?? mudurlukBlokId(satirByKey.get(key)!)
    const list = byBlok.get(blok) ?? []
    list.push(key)
    byBlok.set(blok, list)
  }

  const result: string[] = []
  const seenBlok = new Set<string>()
  for (const blokId of [...blokOrder, ...byBlok.keys()]) {
    if (seenBlok.has(blokId)) continue
    seenBlok.add(blokId)
    const group = byBlok.get(blokId) ?? []
    if (!group.length) continue

    for (const kat of GOREV_YERI_KATEGORI_SIRASI) {
      for (const key of group) {
        const s = satirByKey.get(key)
        if (s && gorevYerineGoreListeKategorisi(s) === kat) result.push(key)
      }
    }
    for (const key of group) {
      if (!result.includes(key)) result.push(key)
    }
  }

  return result
}

/**
 * Referans / kayıtlı sırayı bozmadan senkronize eder.
 * Ayrılanları çıkarır; müdürlük değişen ve yeni kayıtları kendi istihdam grubunun sonuna ekler.
 * Ardından her blokta Memur → Sözleşmeli → İşçi sırasını zorunlu kılar.
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
    keys = blokaKategoriSonunaEkle(keys, satirByKey, key)
  }

  return blokIciKategoriDuzeniZorla(keys, satirByKey)
}
