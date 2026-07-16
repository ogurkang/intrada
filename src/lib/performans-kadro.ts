import { normMudStr } from '@/lib/yerleske-adresi'

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

export function performansMudurlukCoz(
  k: { gorev_mudurlugu?: string | null; kadro_mudurlugu?: string | null },
  mudurlukByNorm: Map<string, string>,
): string | null {
  const raw = String(k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '').trim()
  if (!raw) return null
  return mudurlukByNorm.get(normMudStr(raw)) ?? raw
}

export function mudurlukByNormHaritasi(mudurlukAdlari: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const adi of mudurlukAdlari) {
    if (adi) map.set(normMudStr(adi), adi)
  }
  return map
}

/** Seçili müdürlükte mi? (görev veya kadro müdürlüğü — ünvan fark etmez) */
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

export type KadroMudurlukSatir = {
  sicil_no: string
  gorev_mudurlugu: string | null
  kadro_mudurlugu: string | null
  mudurluk_adi: string | null
}

/** Aktif kadrolardan sicil → müdürlük bilgisi */
export function kadroMudurlukIndeksi(
  kadroRows: Array<{
    asil?: string | null
    vekil?: string | null
    statu?: string | null
    durumu?: string | null
    gorev_mudurlugu?: string | null
    kadro_mudurlugu?: string | null
  }>,
  mudurlukByNorm: Map<string, string>,
): Map<string, KadroMudurlukSatir> {
  const map = new Map<string, KadroMudurlukSatir>()
  for (const k of kadroRows) {
    if (!performansKadroUygun(k)) continue
    const sicil = String(k.asil ?? '').trim() || String(k.vekil ?? '').trim()
    if (!sicil || map.has(sicil)) continue
    const gorev = k.gorev_mudurlugu?.trim() || null
    const kadro = k.kadro_mudurlugu?.trim() || null
    const mudurluk_adi = performansMudurlukCoz(k, mudurlukByNorm)
    map.set(sicil, { sicil_no: sicil, gorev_mudurlugu: gorev, kadro_mudurlugu: kadro, mudurluk_adi })
  }
  return map
}
