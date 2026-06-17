/**
 * Müdürlük ↔ yerleşke seçenekleri ve personel yerleşke ataması yardımcıları.
 */

export interface YerleskeSecenek {
  id: number
  ad: string
}

export interface MudurlukYerleskeTanimSatir {
  mudurluk_id: number
  mudurluk_adi: string
  mudurluk_sira_no: number | null
  yerleske_adresi_id: number
  yerleske_adi: string
  yerleske_sira_no: number | null
  konum: string
}

export function normMudStr(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

/** Müdürlük adı (normalize) → yerleşke seçenekleri (sıralı) */
export function mudurlukYerleskeHaritasi(
  satirlar: MudurlukYerleskeTanimSatir[],
): Map<string, YerleskeSecenek[]> {
  const byMud = new Map<string, YerleskeSecenek[]>()
  const sorted = [...satirlar].sort((a, b) => {
    const ms = (a.mudurluk_sira_no ?? 9999) - (b.mudurluk_sira_no ?? 9999)
    if (ms !== 0) return ms
    const ma = a.mudurluk_adi.localeCompare(b.mudurluk_adi, 'tr')
    if (ma !== 0) return ma
    const ys = (a.yerleske_sira_no ?? 9999) - (b.yerleske_sira_no ?? 9999)
    if (ys !== 0) return ys
    return a.yerleske_adi.localeCompare(b.yerleske_adi, 'tr')
  })
  for (const r of sorted) {
    const key = normMudStr(r.mudurluk_adi)
    if (!byMud.has(key)) byMud.set(key, [])
    const list = byMud.get(key)!
    if (!list.some(x => x.id === r.yerleske_adresi_id)) {
      list.push({ id: r.yerleske_adresi_id, ad: r.yerleske_adi })
    }
  }
  return byMud
}

export interface SirketYerleskeHaritaSatir {
  sirket_adi: string
  yerleske_adresi_id: number
  yerleske_adi: string
  yerleske_sira_no?: number | null
}

/** Şirket adı (normalize) → yerleşke seçenekleri (sıralı) — ADABEL görev yeri için */
export function sirketYerleskeHaritasi(
  satirlar: SirketYerleskeHaritaSatir[],
): Map<string, YerleskeSecenek[]> {
  const bySirket = new Map<string, YerleskeSecenek[]>()
  const sorted = [...satirlar].sort((a, b) => {
    const sa = a.sirket_adi.localeCompare(b.sirket_adi, 'tr')
    if (sa !== 0) return sa
    const ys = (a.yerleske_sira_no ?? 9999) - (b.yerleske_sira_no ?? 9999)
    if (ys !== 0) return ys
    return a.yerleske_adi.localeCompare(b.yerleske_adi, 'tr')
  })
  for (const r of sorted) {
    const key = normMudStr(r.sirket_adi)
    if (!bySirket.has(key)) bySirket.set(key, [])
    const list = bySirket.get(key)!
    if (!list.some(x => x.id === r.yerleske_adresi_id)) {
      list.push({ id: r.yerleske_adresi_id, ad: r.yerleske_adi })
    }
  }
  return bySirket
}

export type YerleskeKaynakTip = 'kadro' | 'firma'

/** Kadro: müdürlük; ADABEL: önce şirket (görev yeri), gerekirse müdürlük yedek */
export function yerleskeSecenekleriKaynak(
  mudHarita: Map<string, YerleskeSecenek[]>,
  sirketHarita: Map<string, YerleskeSecenek[]>,
  kaynak: YerleskeKaynakTip,
  gorevMudurlugu: string | null | undefined,
  gorevYeri?: string | null | undefined,
): YerleskeSecenek[] {
  if (kaynak === 'firma') {
    for (const ad of [gorevMudurlugu, gorevYeri]) {
      const list = sirketHarita.get(normMudStr(ad))
      if (list?.length) return list
    }
    return mudHarita.get(normMudStr(gorevMudurlugu)) ?? []
  }
  return mudHarita.get(normMudStr(gorevMudurlugu)) ?? []
}

export function gecerliYerleskeIdKaynak(
  mudHarita: Map<string, YerleskeSecenek[]>,
  sirketHarita: Map<string, YerleskeSecenek[]>,
  kaynak: YerleskeKaynakTip,
  gorevMudurlugu: string | null | undefined,
  yerleskeId: number | null | undefined,
  gorevYeri?: string | null | undefined,
): boolean {
  if (yerleskeId == null) return true
  return yerleskeSecenekleriKaynak(mudHarita, sirketHarita, kaynak, gorevMudurlugu, gorevYeri).some(
    y => y.id === yerleskeId,
  )
}

export function etkinYerleskeIdKaynak(
  mudHarita: Map<string, YerleskeSecenek[]>,
  sirketHarita: Map<string, YerleskeSecenek[]>,
  kaynak: YerleskeKaynakTip,
  gorevMudurlugu: string | null | undefined,
  kayitliId: number | null | undefined,
  gorevYeri?: string | null | undefined,
): number | null {
  if (
    kayitliId != null &&
    gecerliYerleskeIdKaynak(mudHarita, sirketHarita, kaynak, gorevMudurlugu, kayitliId, gorevYeri)
  ) {
    return kayitliId
  }
  const list = yerleskeSecenekleriKaynak(mudHarita, sirketHarita, kaynak, gorevMudurlugu, gorevYeri)
  return list[0]?.id ?? null
}

export function varsayilanYerleskeId(
  harita: Map<string, YerleskeSecenek[]>,
  mudurlukAdi: string | null | undefined,
): number | null {
  const list = harita.get(normMudStr(mudurlukAdi)) ?? []
  return list[0]?.id ?? null
}

export function yerleskeSecenekleri(
  harita: Map<string, YerleskeSecenek[]>,
  mudurlukAdi: string | null | undefined,
): YerleskeSecenek[] {
  return harita.get(normMudStr(mudurlukAdi)) ?? []
}

export function gecerliYerleskeId(
  harita: Map<string, YerleskeSecenek[]>,
  mudurlukAdi: string | null | undefined,
  yerleskeId: number | null | undefined,
): boolean {
  if (yerleskeId == null) return true
  return yerleskeSecenekleri(harita, mudurlukAdi).some(y => y.id === yerleskeId)
}

/** Kayıtlı veya müdürlük varsayılanı */
export function etkinYerleskeId(
  harita: Map<string, YerleskeSecenek[]>,
  mudurlukAdi: string | null | undefined,
  kayitliId: number | null | undefined,
): number | null {
  if (kayitliId != null && gecerliYerleskeId(harita, mudurlukAdi, kayitliId)) return kayitliId
  return varsayilanYerleskeId(harita, mudurlukAdi)
}

export async function fetchMudurlukYerleskeTanimSatirlari(
  supabase: unknown,
): Promise<MudurlukYerleskeTanimSatir[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('tanim_mudurluk_yerleske')
    .select(`
      mudurluk_id,
      yerleske_adresi_id,
      konum,
      tanim_mudurluk!inner ( mudurluk_adi, sira_no, aktif ),
      tanim_yerleske_adresi!inner ( yerleske_adi, sira_no, aktif )
    `)
    .eq('tanim_mudurluk.aktif', true)
    .eq('tanim_yerleske_adresi.aktif', true)

  if (error) throw new Error(error.message)

  const rows: MudurlukYerleskeTanimSatir[] = []
  for (const raw of data ?? []) {
    const row = raw as {
      mudurluk_id: number
      yerleske_adresi_id: number
      konum: string
      tanim_mudurluk: { mudurluk_adi: string; sira_no: number | null } | null
      tanim_yerleske_adresi: { yerleske_adi: string; sira_no: number | null } | null
    }
    if (!row.tanim_mudurluk?.mudurluk_adi || !row.tanim_yerleske_adresi?.yerleske_adi) continue
    rows.push({
      mudurluk_id: row.mudurluk_id,
      mudurluk_adi: row.tanim_mudurluk.mudurluk_adi,
      mudurluk_sira_no: row.tanim_mudurluk.sira_no,
      yerleske_adresi_id: row.yerleske_adresi_id,
      yerleske_adi: row.tanim_yerleske_adresi.yerleske_adi,
      yerleske_sira_no: row.tanim_yerleske_adresi.sira_no,
      konum: row.konum,
    })
  }
  return rows
}

/** Rapor satır anahtarı */
export function yerleskeRaporSatirKey(mudurlukId: number, yerleskeId: number): string {
  return `${mudurlukId}|${yerleskeId}`
}
