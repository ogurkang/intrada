import type { SupabaseClient } from '@supabase/supabase-js'
import { mudurlukBazEslesir, mudurlukEslesmeBaz } from '@/lib/organizasyon-birim'
import { baskanYardimcisiBirimindeMi, type OrgBirimSatir } from '@/lib/performans-amir'
import { formTipiFromUnvan } from '@/lib/performans'
import {
  performansBaskanYardimcisiUnvaniMi,
  performansBelediyeBaskaniUnvaniMi,
  performansMudurUnvaniMi,
} from '@/lib/performans-unvan'
import { normMudStr } from '@/lib/yerleske-adresi'

const KADRO_SAYFA_BOYUTU = 1000

/** PostgREST varsayılan 1000 satır sınırını aşmak için sayfalı aktif kadro çekimi. */
export async function tumAktifKadroHareketleriYukle<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  select: string,
  options?: { durumu?: string[] },
): Promise<T[]> {
  let from = 0
  const all: T[] = []
  while (true) {
    let q = supabase.from('kadro_hareketleri').select(select).is('ayrilis_tarihi', null)
    if (options?.durumu?.length) q = q.in('durumu', options.durumu)
    const { data, error } = await q.range(from, from + KADRO_SAYFA_BOYUTU - 1)
    if (error) throw error
    if (!data?.length) break
    all.push(...(data as unknown as T[]))
    if (data.length < KADRO_SAYFA_BOYUTU) break
    from += KADRO_SAYFA_BOYUTU
  }
  return all
}

export function kadroStatuMemurMu(statu: string | null | undefined): boolean {
  return String(statu ?? '').trim().toLocaleLowerCase('tr-TR') === 'memur'
}

export function performansKadroUygun(k: {
  statu?: string | null
  durumu?: string | null
  asil?: string | null
  vekil?: string | null
}): boolean {
  if (!kadroStatuMemurMu(k.statu)) return false
  const sicil = String(k.asil ?? '').trim() || String(k.vekil ?? '').trim()
  if (!sicil) return false
  if (k.durumu === 'Dolu' || k.durumu === 'Vekil') return true
  return Boolean(k.asil || k.vekil)
}

/** Performans müdürlük eşlemesi: yalnızca kadro müdürlüğü (görev müdürlüğü dikkate alınmaz). */
export function performansMudurlukCoz(
  k: { gorev_mudurlugu?: string | null; kadro_mudurlugu?: string | null },
  mudurlukByNorm: Map<string, string>,
): string | null {
  const raw = String(k.kadro_mudurlugu ?? '').trim()
  if (!raw) return null
  return mudurlukByNorm.get(normMudStr(raw)) ?? raw
}

/**
 * Müdürlük personel listesinde gösterilecek değerlendirilebilir kayıt.
 * Memur/şef + müdür (müdürlük yöneticisi); başkan ve BY hariç; kendi sicili hariç.
 */
export function performansMudurlukPersonelSatirindaMi(params: {
  unvan: string | null | undefined
  sicilNo: string
  currentSicil?: string | null
  birimler?: OrgBirimSatir[]
}): boolean {
  const unvan = params.unvan ?? ''
  if (performansBelediyeBaskaniUnvaniMi(unvan)) return false
  if (params.currentSicil && performansSicilEsit(params.sicilNo, params.currentSicil)) return false
  if (performansBaskanYardimcisiUnvaniMi(unvan)) return false
  if (params.birimler?.length && baskanYardimcisiBirimindeMi(params.sicilNo, params.birimler)) {
    return false
  }

  const ft = formTipiFromUnvan(unvan)
  if (ft === 'memur' || ft === 'sef') return true
  if (ft === 'yonetici' && performansMudurUnvaniMi(unvan)) return true
  return false
}

/** @deprecated performansMudurlukPersonelSatirindaMi kullanın. */
export function performansDegerlendirilenPersonelMi(unvan: string | null | undefined): boolean {
  const ft = formTipiFromUnvan(unvan)
  return ft === 'memur' || ft === 'sef'
}

/** Seçili müdürlük ↔ personelin kadro müdürlüğü eşleşmesi. */
export function performansKadroMudurlukEslesir(
  seciliMudurluk: string,
  kadro_mudurlugu?: string | null,
): boolean {
  const hedef = normMudStr(seciliMudurluk)
  if (!hedef) return true
  return normMudStr(kadro_mudurlugu) === hedef
}

/** Kadro müdürlüğü veya kayıtlı müdürlük adı ile eşleşme (BBY geri dönüşleri için). */
export function performansMudurlukKayitEslesir(
  seciliMudurluk: string,
  kayit: { kadro_mudurlugu?: string | null; mudurluk_adi?: string | null },
): boolean {
  return (
    performansKadroMudurlukEslesir(seciliMudurluk, kayit.kadro_mudurlugu) ||
    performansKadroMudurlukEslesir(seciliMudurluk, kayit.mudurluk_adi)
  )
}

export function mudurlukByNormHaritasi(mudurlukAdlari: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const adi of mudurlukAdlari) {
    if (adi) map.set(normMudStr(adi), adi)
  }
  return map
}

/** Admin listeleri: kadro / görev / kayıtlı müdürlük adından eşleşme. */
export function performansMudurlukEslesir(
  seciliMudurluk: string,
  alanlar: {
    mudurluk_adi?: string | null
    gorev_mudurlugu?: string | null
    kadro_mudurlugu?: string | null
  },
): boolean {
  const hedef = normMudStr(seciliMudurluk)
  if (!hedef) return true
  return [alanlar.mudurluk_adi, alanlar.gorev_mudurlugu, alanlar.kadro_mudurlugu].some(
    m => normMudStr(m) === hedef,
  )
}

export function performansSicilEsit(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return String(a ?? '').trim() === String(b ?? '').trim()
}

export type KadroMudurlukSatir = {
  sicil_no: string
  gorev_mudurlugu: string | null
  kadro_mudurlugu: string | null
  mudurluk_adi: string | null
}

export type PerformansKadroSatir = {
  asil?: string | null
  vekil?: string | null
  statu?: string | null
  durumu?: string | null
  gorev_mudurlugu?: string | null
  kadro_mudurlugu?: string | null
  kadro_unvani?: string | null
  gorev_unvani?: string | null
}

export type PerformansMudurKadroKayit = {
  sicil_no: string
  unvan: string
  mudurluk_adi: string
}

/** Müdür kadro satırında görevi yürüten sicil (vekil varsa vekil — organizasyon ile uyumlu). */
function mudurKadroSatirSicil(r: PerformansKadroSatir): string | null {
  const vekil = String(r.vekil ?? '').trim()
  const asil = String(r.asil ?? '').trim()
  return vekil || asil || null
}

/**
 * Organizasyon ekranı ile aynı mantık: müdürlüğün müdür kadro satırındaki asil/vekil personel.
 * Kadro veya görev unvanında «… Müdürü» geçen satır aranır.
 */
export function performansMudurlukMudurBul(
  mudurlukAdi: string | null | undefined,
  kadroRows: PerformansKadroSatir[],
): PerformansMudurKadroKayit | null {
  const hedefBaz = mudurlukEslesmeBaz(mudurlukAdi)
  if (!hedefBaz) return null

  for (const r of kadroRows) {
    if (!performansKadroUygun(r)) continue
    const sicil = mudurKadroSatirSicil(r)
    if (!sicil) continue

    const mudRaw = String(r.gorev_mudurlugu ?? r.kadro_mudurlugu ?? '').trim()
    const mudBaz = mudurlukEslesmeBaz(mudRaw)

    for (const uv of [r.gorev_unvani, r.kadro_unvani]) {
      const u = String(uv ?? '').trim()
      if (!u || !performansMudurUnvaniMi(u)) continue
      const unvanBaz = mudurlukEslesmeBaz(u)
      if (!mudurlukBazEslesir(hedefBaz, mudBaz) && !mudurlukBazEslesir(hedefBaz, unvanBaz)) {
        continue
      }
      return {
        sicil_no: sicil,
        unvan: u,
        mudurluk_adi: mudRaw || String(mudurlukAdi ?? '').trim(),
      }
    }
  }
  return null
}

/** Sicil → müdür kadro satırı kaydı (tüm müdürlükler). */
export function performansMudurKadroIndeksi(
  kadroRows: PerformansKadroSatir[],
  mudurlukByNorm: Map<string, string>,
): Map<string, PerformansMudurKadroKayit> {
  const map = new Map<string, PerformansMudurKadroKayit>()

  for (const r of kadroRows) {
    if (!performansKadroUygun(r)) continue

    const mudRaw = String(r.gorev_mudurlugu ?? r.kadro_mudurlugu ?? '').trim()
    const mudCanon = mudurlukByNorm.get(normMudStr(mudRaw)) ?? mudRaw

    for (const uv of [r.gorev_unvani, r.kadro_unvani]) {
      const u = String(uv ?? '').trim()
      if (!u || !performansMudurUnvaniMi(u)) continue
      for (const raw of [r.asil, r.vekil]) {
        const sicil = String(raw ?? '').trim()
        if (!sicil) continue
        map.set(sicil, { sicil_no: sicil, unvan: u, mudurluk_adi: mudCanon })
      }
    }
  }
  return map
}

/**
 * Personelin görev unvanı ve müdürlüğü (organizasyon ekranı ile uyumlu).
 * Önce müdür kadro satırında asil/vekil olarak yer aldığı unvan; yoksa diğer kadrolar.
 */
export function personelKadroGorevBul(
  sicilNo: string,
  kadroRows: PerformansKadroSatir[],
  mudurlukByNorm: Map<string, string>,
): { unvan: string | null; mudurluk_adi: string | null } {
  const hedef = sicilNo.trim()
  if (!hedef) return { unvan: null, mudurluk_adi: null }

  for (const r of kadroRows) {
    const asil = String(r.asil ?? '').trim()
    const vekil = String(r.vekil ?? '').trim()
    if (asil !== hedef && vekil !== hedef) continue

    const mudRaw = String(r.gorev_mudurlugu ?? r.kadro_mudurlugu ?? '').trim()
    const mudCanon = mudRaw ? (mudurlukByNorm.get(normMudStr(mudRaw)) ?? mudRaw) : null

    for (const uv of [r.gorev_unvani, r.kadro_unvani]) {
      const u = String(uv ?? '').trim()
      if (!u || !performansMudurUnvaniMi(u)) continue
      return { unvan: u, mudurluk_adi: mudCanon }
    }
  }

  let best: { unvan: string; mudurluk: string | null; oncelik: number } | null = null
  for (const r of kadroRows) {
    const asil = String(r.asil ?? '').trim()
    const vekil = String(r.vekil ?? '').trim()
    if (asil !== hedef && vekil !== hedef) continue

    const mudRaw = String(r.gorev_mudurlugu ?? r.kadro_mudurlugu ?? '').trim()
    const mudCanon = mudRaw ? (mudurlukByNorm.get(normMudStr(mudRaw)) ?? mudRaw) : null
    const u = String(r.gorev_unvani ?? r.kadro_unvani ?? '').trim()
    if (!u) continue

    const oncelik = performansKadroSatirOncelik(r, hedef)
    if (!best || oncelik > best.oncelik) {
      best = { unvan: u, mudurluk: mudCanon, oncelik }
    }
  }

  return { unvan: best?.unvan ?? null, mudurluk_adi: best?.mudurluk ?? null }
}

/** Tüm personel için görev unvanı / müdürlük (tek geçiş, O(n)). */
export function personelKadroGorevIndeksi(
  kadroRows: PerformansKadroSatir[],
  mudurlukByNorm: Map<string, string>,
  mudurIndeks?: Map<string, PerformansMudurKadroKayit>,
): Map<string, { unvan: string | null; mudurluk_adi: string | null }> {
  const mudur = mudurIndeks ?? performansMudurKadroIndeksi(kadroRows, mudurlukByNorm)
  const map = new Map<string, { unvan: string | null; mudurluk_adi: string | null }>()

  for (const [sicil, kayit] of mudur) {
    map.set(sicil, { unvan: kayit.unvan, mudurluk_adi: kayit.mudurluk_adi })
  }

  const bestBySicil = new Map<string, { unvan: string; mudurluk: string | null; oncelik: number }>()
  for (const r of kadroRows) {
    for (const raw of [r.asil, r.vekil]) {
      const sicil = String(raw ?? '').trim()
      if (!sicil || map.has(sicil)) continue

      const mudRaw = String(r.gorev_mudurlugu ?? r.kadro_mudurlugu ?? '').trim()
      const mudCanon = mudRaw ? (mudurlukByNorm.get(normMudStr(mudRaw)) ?? mudRaw) : null
      const u = String(r.gorev_unvani ?? r.kadro_unvani ?? '').trim()
      if (!u) continue

      const oncelik = performansKadroSatirOncelik(r, sicil)
      const mevcut = bestBySicil.get(sicil)
      if (!mevcut || oncelik > mevcut.oncelik) {
        bestBySicil.set(sicil, { unvan: u, mudurluk: mudCanon, oncelik })
      }
    }
  }

  for (const [sicil, best] of bestBySicil) {
    map.set(sicil, { unvan: best.unvan, mudurluk_adi: best.mudurluk })
  }

  return map
}

/**
 * Personelin performansta kullanılacak unvanı.
 * Müdür kadro satırında ise müdür unvanı; değilse kadro satırından.
 */
export function performansPersonelEtkinUnvan(
  sicilNo: string,
  mudurlukAdi: string | null | undefined,
  kadroRows: PerformansKadroSatir[],
  mudurlukByNorm: Map<string, string>,
): string | null {
  const hedef = sicilNo.trim()
  if (!hedef) return null

  if (mudurlukAdi) {
    const slot = performansMudurlukMudurBul(mudurlukAdi, kadroRows)
    if (slot?.sicil_no === hedef) return slot.unvan
  }

  const mudurKayit = performansMudurKadroIndeksi(kadroRows, mudurlukByNorm).get(hedef)
  if (mudurKayit) return mudurKayit.unvan

  const gorev = personelKadroGorevBul(hedef, kadroRows, mudurlukByNorm)
  if (gorev.unvan) return gorev.unvan

  return performansKadroGosterimUnvani(performansKadroSatirSec(hedef, kadroRows))
}

/** Puanlama / amir eşlemesi için unvan (müdür kadro öncelikli). */
export function performansPersonelEtkinUnvanBasit(
  sicilNo: string,
  kadroRows: PerformansKadroSatir[],
  mudurlukByNorm: Map<string, string>,
  mudurlukAdi?: string | null,
): string | null {
  return performansPersonelEtkinUnvan(sicilNo, mudurlukAdi ?? null, kadroRows, mudurlukByNorm)
}

/** Vekil müdürlük görevi asil kadrodan önce gelir (organizasyon ekranı ile uyum). */
function kadroSatirMudurUnvaniVar(k: PerformansKadroSatir): string | null {
  for (const uv of [k.gorev_unvani, k.kadro_unvani]) {
    const u = String(uv ?? '').trim()
    if (u && performansMudurUnvaniMi(u)) return u
  }
  return null
}

function performansKadroSatirOncelik(k: PerformansKadroSatir, sicil: string): number {
  const vekilMi = String(k.vekil ?? '').trim() === sicil
  const asilMi = String(k.asil ?? '').trim() === sicil
  const mudurUnvan = kadroSatirMudurUnvaniVar(k)
  if (vekilMi && mudurUnvan) return 100
  if (asilMi && mudurUnvan) return 90
  if (mudurUnvan) return 80
  if (vekilMi && k.durumu === 'Vekil') return 60
  if (vekilMi) return 55
  if (asilMi && k.durumu === 'Dolu') return 40
  if (asilMi) return 35
  return 20
}

/** Aynı sicile ait birden fazla kadro satırından performans için en uygun olanı seçer. */
export function performansKadroSatirlariIndeksi(
  kadroRows: PerformansKadroSatir[],
): Map<string, PerformansKadroSatir> {
  const map = new Map<string, PerformansKadroSatir>()
  for (const k of kadroRows) {
    if (!performansKadroUygun(k)) continue
    for (const raw of [k.asil, k.vekil]) {
      const sicil = String(raw ?? '').trim()
      if (!sicil) continue
      const mevcut = map.get(sicil)
      if (!mevcut || performansKadroSatirOncelik(k, sicil) > performansKadroSatirOncelik(mevcut, sicil)) {
        map.set(sicil, k)
      }
    }
  }
  return map
}

export function performansKadroSatirSec(
  sicilNo: string,
  kadroRows: PerformansKadroSatir[],
): PerformansKadroSatir | null {
  return performansKadroSatirlariIndeksi(kadroRows).get(sicilNo.trim()) ?? null
}

export function performansKadroUnvanHaritasi(
  kadroRows: PerformansKadroSatir[],
): Map<string, { kadro_unvani: string | null; gorev_unvani: string | null }> {
  const map = new Map<string, { kadro_unvani: string | null; gorev_unvani: string | null }>()
  for (const [sicil, k] of performansKadroSatirlariIndeksi(kadroRows)) {
    map.set(sicil, {
      kadro_unvani: k.kadro_unvani?.trim() || null,
      gorev_unvani: k.gorev_unvani?.trim() || null,
    })
  }
  return map
}

/** Performans listelerinde gösterilecek unvan (görev unvanı öncelikli). */
export function performansKadroGosterimUnvani(k: PerformansKadroSatir | null | undefined): string | null {
  if (!k) return null
  return k.gorev_unvani?.trim() || k.kadro_unvani?.trim() || null
}

/** Sicil → performans ekranında kullanılacak unvan (müdür kadro slotu öncelikli). */
export function performansEtkinUnvanHaritasi(
  kadroRows: PerformansKadroSatir[],
  mudurlukByNorm: Map<string, string>,
): Map<string, string | null> {
  const mudurIndeks = performansMudurKadroIndeksi(kadroRows, mudurlukByNorm)
  const gorevIndeks = personelKadroGorevIndeksi(kadroRows, mudurlukByNorm, mudurIndeks)
  const map = new Map<string, string | null>()
  for (const [sicil, gorev] of gorevIndeks) {
    map.set(sicil, gorev.unvan)
  }
  return map
}

/** Aktif kadrolardan sicil → müdürlük bilgisi */
export function kadroMudurlukIndeksi(
  kadroRows: PerformansKadroSatir[],
  mudurlukByNorm: Map<string, string>,
): Map<string, KadroMudurlukSatir> {
  const map = new Map<string, KadroMudurlukSatir>()
  for (const [sicil, k] of performansKadroSatirlariIndeksi(kadroRows)) {
    const gorev = k.gorev_mudurlugu?.trim() || null
    const kadro = k.kadro_mudurlugu?.trim() || null
    const mudurluk_adi = kadro ? (mudurlukByNorm.get(normMudStr(kadro)) ?? kadro) : null
    map.set(sicil, { sicil_no: sicil, gorev_mudurlugu: gorev, kadro_mudurlugu: kadro, mudurluk_adi })
  }
  return map
}
