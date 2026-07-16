/**
 * Personel konumu: Tanımlar > Şirket (görev yeri / müdürlük adı) ve müdürlük–yerleşke eşlemesi.
 */

import {
  etkinYerleskeId,
  mudurlukYerleskeHaritasi,
  normMudStr,
  type MudurlukYerleskeTanimSatir,
  type YerleskeSecenek,
} from '@/lib/yerleske-adresi'

export type KonumTip = 'İç' | 'Dış'

export interface SirketYerleskeTanimSatir {
  sirket_id: number
  sirket_adi: string
  yerleske_adresi_id: number
  yerleske_adi: string
  konum: string
}

export interface PersonelKonumCtx {
  mudYerleskeKonum: Map<string, KonumTip>
  sirketYerleskeKonum: Map<string, KonumTip>
  sirketKonum: Map<string, string>
  yerleskeAdById: Map<number, string>
  yerleskeHarita: Map<string, YerleskeSecenek[]>
}

function konumEtiket(raw: string | null | undefined): KonumTip | null {
  const t = String(raw ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
  if (t === 'iç') return 'İç'
  if (t === 'dış') return 'Dış'
  return null
}

export function mudurlukYerleskeKonumAnahtari(
  mudurlukAdi: string | null | undefined,
  yerleskeId: number,
): string {
  return `${normMudStr(mudurlukAdi)}|${yerleskeId}`
}

export function sirketYerleskeKonumAnahtari(
  sirketAdi: string | null | undefined,
  yerleskeId: number,
): string {
  return `${normMudStr(sirketAdi)}|${yerleskeId}`
}

export function mudurlukYerleskeKonumCiftHaritasi(
  satirlar: MudurlukYerleskeTanimSatir[],
): Map<string, KonumTip> {
  const m = new Map<string, KonumTip>()
  for (const r of satirlar) {
    const kn = konumEtiket(r.konum)
    if (!kn) continue
    m.set(mudurlukYerleskeKonumAnahtari(r.mudurluk_adi, r.yerleske_adresi_id), kn)
  }
  return m
}

export function sirketYerleskeKonumCiftHaritasi(
  satirlar: SirketYerleskeTanimSatir[],
): Map<string, KonumTip> {
  const m = new Map<string, KonumTip>()
  for (const r of satirlar) {
    const kn = konumEtiket(r.konum)
    if (!kn) continue
    m.set(sirketYerleskeKonumAnahtari(r.sirket_adi, r.yerleske_adresi_id), kn)
  }
  return m
}

/** Şirket adı → tek konum (yalnızca tüm yerleşkeler aynı konumdaysa) */
export function sirketTekKonumHaritasi(satirlar: SirketYerleskeTanimSatir[]): Map<string, string> {
  const bySirket = new Map<string, Set<KonumTip>>()
  for (const r of satirlar) {
    const kn = konumEtiket(r.konum)
    if (!kn) continue
    const key = normMudStr(r.sirket_adi)
    if (!bySirket.has(key)) bySirket.set(key, new Set())
    bySirket.get(key)!.add(kn)
  }
  const m = new Map<string, string>()
  for (const [k, set] of bySirket) {
    if (set.size === 1) m.set(k, [...set][0]!)
  }
  return m
}

export function yerleskeAdiHaritasi(
  mudSatirlar: MudurlukYerleskeTanimSatir[],
  sirketSatirlar: SirketYerleskeTanimSatir[],
): Map<number, string> {
  const m = new Map<number, string>()
  for (const r of mudSatirlar) {
    if (!m.has(r.yerleske_adresi_id)) m.set(r.yerleske_adresi_id, r.yerleske_adi)
  }
  for (const r of sirketSatirlar) {
    if (!m.has(r.yerleske_adresi_id)) m.set(r.yerleske_adresi_id, r.yerleske_adi)
  }
  return m
}

export async function fetchSirketYerleskeTanimSatirlari(
  supabase: unknown,
): Promise<SirketYerleskeTanimSatir[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tanim_sirket_yerleske')
    .select(`
      sirket_id,
      yerleske_adresi_id,
      konum,
      tanim_sirket!inner ( sirket_adi, aktif ),
      tanim_yerleske_adresi!inner ( yerleske_adi, aktif )
    `)
    .eq('tanim_sirket.aktif', true)
    .eq('tanim_yerleske_adresi.aktif', true)

  if (error) throw new Error(error.message)

  const rows: SirketYerleskeTanimSatir[] = []
  for (const raw of data ?? []) {
    const row = raw as {
      sirket_id: number
      yerleske_adresi_id: number
      konum: string
      tanim_sirket: { sirket_adi: string } | null
      tanim_yerleske_adresi: { yerleske_adi: string } | null
    }
    if (!row.tanim_sirket?.sirket_adi || !row.tanim_yerleske_adresi?.yerleske_adi) continue
    rows.push({
      sirket_id: row.sirket_id,
      sirket_adi: row.tanim_sirket.sirket_adi,
      yerleske_adresi_id: row.yerleske_adresi_id,
      yerleske_adi: row.tanim_yerleske_adresi.yerleske_adi,
      konum: row.konum,
    })
  }
  return rows
}

export function buildPersonelKonumCtx(
  mudSatirlar: MudurlukYerleskeTanimSatir[],
  sirketSatirlar: SirketYerleskeTanimSatir[],
): PersonelKonumCtx {
  return {
    mudYerleskeKonum: mudurlukYerleskeKonumCiftHaritasi(mudSatirlar),
    sirketYerleskeKonum: sirketYerleskeKonumCiftHaritasi(sirketSatirlar),
    sirketKonum: sirketTekKonumHaritasi(sirketSatirlar),
    yerleskeAdById: yerleskeAdiHaritasi(mudSatirlar, sirketSatirlar),
    yerleskeHarita: mudurlukYerleskeHaritasi(mudSatirlar),
  }
}

function sirketKonumBul(harita: Map<string, string>, ad: string | null | undefined): KonumTip | null {
  const k = String(ad ?? '').trim()
  if (!k) return null
  return konumEtiket(harita.get(normMudStr(k)))
}

function sirketYerleskeKonumBul(
  harita: Map<string, KonumTip>,
  sirketAdi: string | null | undefined,
  yerleskeId: number | null | undefined,
): KonumTip | null {
  if (yerleskeId == null) return null
  const ad = String(sirketAdi ?? '').trim()
  if (!ad) return null
  return harita.get(sirketYerleskeKonumAnahtari(ad, yerleskeId)) ?? null
}

/** Tek İç/Dış — rapor gruplama için */
export function personelKonumTipi(
  ctx: PersonelKonumCtx,
  params: {
    gorevYeri?: string | null
    gorevMudurlugu?: string | null
    yerleskeId?: number | null
  },
): KonumTip | null {
  const mud = String(params.gorevMudurlugu ?? '').trim()
  const gy = String(params.gorevYeri ?? '').trim()
  const yId = params.yerleskeId

  if (yId != null && mud) {
    const j = ctx.mudYerleskeKonum.get(mudurlukYerleskeKonumAnahtari(mud, yId))
    if (j) return j
  }

  if (yId != null && gy) {
    const sg = sirketYerleskeKonumBul(ctx.sirketYerleskeKonum, gy, yId)
    if (sg) return sg
  }

  if (yId != null && mud) {
    const sm = sirketYerleskeKonumBul(ctx.sirketYerleskeKonum, mud, yId)
    if (sm) return sm
  }

  const fromGy = sirketKonumBul(ctx.sirketKonum, gy)
  if (fromGy) return fromGy

  const fromMud = sirketKonumBul(ctx.sirketKonum, mud)
  if (fromMud) return fromMud

  return null
}

/** Ekran metni (İç / Dış / —) */
export function personelKonumMetni(
  ctx: PersonelKonumCtx,
  params: {
    gorevYeri?: string | null
    gorevMudurlugu?: string | null
    yerleskeId?: number | null
  },
): string {
  const tip = personelKonumTipi(ctx, params)
  return tip ?? '—'
}

function yerleskeAdFromHarita(
  harita: Map<string, YerleskeSecenek[]>,
  mudurlukAdi: string,
  yerleskeId: number,
): string | null {
  const fromMud = harita.get(normMudStr(mudurlukAdi))?.find(y => y.id === yerleskeId)?.ad
  if (fromMud) return fromMud
  for (const list of harita.values()) {
    const found = list.find(y => y.id === yerleskeId)
    if (found) return found.ad
  }
  return null
}

export function etkinYerleskeAdiGoster(
  ctx: PersonelKonumCtx,
  params: {
    gorevMudurlugu?: string | null
    kayitliYerleskeId?: number | null
  },
): string | null {
  const mud = String(params.gorevMudurlugu ?? '').trim()
  const kayitli = params.kayitliYerleskeId ?? null

  if (kayitli != null) {
    const direct = ctx.yerleskeAdById.get(kayitli)
    if (direct) return direct
    const fromHarita = yerleskeAdFromHarita(ctx.yerleskeHarita, mud, kayitli)
    if (fromHarita) return fromHarita
  }

  const yId = etkinYerleskeId(ctx.yerleskeHarita, mud, kayitli)
  if (yId == null) return null
  return ctx.yerleskeAdById.get(yId) ?? yerleskeAdFromHarita(ctx.yerleskeHarita, mud, yId) ?? null
}

/** Rapor / liste satırı için personelin yerleşke atamasına göre konum metni */
export function personelKonumRaporMetni(
  ctx: PersonelKonumCtx,
  input: {
    gorevMudurlugu?: string | null
    gorevYeri?: string | null
    yerleskeAdresiId?: number | null
    gorevTuru?: string | null
  },
): string {
  const gorevMud = String(input.gorevMudurlugu ?? '').trim()
  const yId = etkinYerleskeId(ctx.yerleskeHarita, gorevMud, input.yerleskeAdresiId ?? null)
  let konum = personelKonumMetni(ctx, {
    gorevYeri: input.gorevYeri,
    gorevMudurlugu: gorevMud,
    yerleskeId: yId,
  })
  if ((input.gorevTuru ?? '') === 'Kurum Görevlendirme') konum = 'Dış'
  return konum
}
