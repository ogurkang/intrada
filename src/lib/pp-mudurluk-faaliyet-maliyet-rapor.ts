import type { SupabaseClient } from '@supabase/supabase-js'
import { ppNorm } from '@/lib/pp-erisim'
import { ppRaporVarsayilanYil, type PpRaporSayi } from '@/lib/pp-mudurluk-rapor'
import { ppPfOdenekSatirlariYukle } from '@/lib/pp-pf-odenek'

export type PpMudurlukFaaliyetMaliyetSatir = {
  mudurluk: string
  tutar: PpRaporSayi
}

export type PpMudurlukFaaliyetMaliyetRapor = {
  yil: number
  yillar: number[]
  satirlar: PpMudurlukFaaliyetMaliyetSatir[]
}

export type PpMudurlukFaaliyetMaliyetSirala = 'ad' | 'butce'
export type PpMudurlukFaaliyetMaliyetYon = 'asc' | 'desc'

function sayi(v: unknown): PpRaporSayi {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function ppMudurlukFaaliyetMaliyetSirala(
  satirlar: PpMudurlukFaaliyetMaliyetSatir[],
  alan: PpMudurlukFaaliyetMaliyetSirala,
  yon: PpMudurlukFaaliyetMaliyetYon,
): PpMudurlukFaaliyetMaliyetSatir[] {
  const carpan = yon === 'desc' ? -1 : 1
  return [...satirlar].sort((a, b) => {
    if (alan === 'butce') {
      const av = a.tutar ?? 0
      const bv = b.tutar ?? 0
      if (av !== bv) return (av - bv) * carpan
      return a.mudurluk.localeCompare(b.mudurluk, 'tr')
    }
    const ad = a.mudurluk.localeCompare(b.mudurluk, 'tr')
    if (ad !== 0) return ad * carpan
    return (a.tutar ?? 0) - (b.tutar ?? 0)
  })
}

/**
 * Yıl bazında müdürlük (secilen_mudurluk) başına performans ödenek teklifi toplamı (t_butce).
 * Kurum içi faaliyetler toplama dahil edilmez.
 */
export async function ppMudurlukFaaliyetMaliyetRaporYili(
  supabase: SupabaseClient,
  istenenYil: number | null,
): Promise<PpMudurlukFaaliyetMaliyetRapor> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: donemRaw } = await sb
    .from('stratejik_plan_donem')
    .select('id, baslangic_tarihi, bitis_tarihi, aktif')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
  const donem = (donemRaw ?? [])[0] as { id: number; baslangic_tarihi: string; bitis_tarihi: string } | undefined
  const ilk = donem ? Number(String(donem.baslangic_tarihi).slice(0, 4)) : NaN
  const son = donem ? Number(String(donem.bitis_tarihi).slice(0, 4)) : NaN
  const yillar: number[] = []
  if (Number.isFinite(ilk) && Number.isFinite(son) && son >= ilk) {
    for (let y = ilk; y <= son; y += 1) yillar.push(y)
  }
  const yil = ppRaporVarsayilanYil(yillar, istenenYil)
  if (!donem || !yillar.length) return { yil, yillar, satirlar: [] }

  const { data: programRaw } = await sb
    .from('performans_programi_program')
    .select('id')
    .eq('yil', yil)
  const programIds = ((programRaw ?? []) as { id: number }[]).map(p => p.id)
  if (!programIds.length) return { yil, yillar, satirlar: [] }

  const { data: altRaw } = await sb
    .from('performans_programi_alt_program')
    .select('id')
    .in('program_id', programIds)
  const altIds = ((altRaw ?? []) as { id: number }[]).map(a => a.id)
  if (!altIds.length) return { yil, yillar, satirlar: [] }

  const { data: bagRaw } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('id, secilen_mudurluk')
    .in('alt_program_id', altIds)
  const baglar = (bagRaw ?? []) as { id: number; secilen_mudurluk: string | null }[]
  const bagIds = baglar.map(b => b.id)
  if (!bagIds.length) return { yil, yillar, satirlar: [] }

  type PfF = { id: number; bag_id: number; kurum_ici?: boolean }
  const pfSorgu = await sb
    .from('performans_programi_pf_faaliyet')
    .select('id, bag_id, kurum_ici')
    .in('bag_id', bagIds)
  const pfRaw = pfSorgu.error
    ? await sb
      .from('performans_programi_pf_faaliyet')
      .select('id, bag_id')
      .in('bag_id', bagIds)
    : pfSorgu
  const pfFaaliyetler = ((pfRaw.data ?? []) as PfF[]).map(f => ({
    ...f,
    kurum_ici: Boolean((f as { kurum_ici?: boolean }).kurum_ici),
  }))
  const pfIds = pfFaaliyetler.map(f => f.id)

  const { data: odenekler } = await ppPfOdenekSatirlariYukle(sb as never, pfIds, 't_butce')

  const odenekByPf = new Map<number, number>()
  for (const o of odenekler) {
    const n = sayi(o.t_butce)
    if (n == null) continue
    odenekByPf.set(o.pf_faaliyet_id, (odenekByPf.get(o.pf_faaliyet_id) ?? 0) + n)
  }

  const mudMap = new Map<string, { mudurluk: string; tutar: number }>()
  for (const bag of baglar) {
    const mudurluk = String(bag.secilen_mudurluk ?? '').trim()
    if (!mudurluk) continue
    const key = ppNorm(mudurluk)
    const once = mudMap.get(key) ?? { mudurluk, tutar: 0 }
    for (const f of pfFaaliyetler) {
      if (f.bag_id !== bag.id || f.kurum_ici) continue
      once.tutar += odenekByPf.get(f.id) ?? 0
    }
    mudMap.set(key, once)
  }

  const satirlar = [...mudMap.values()]
    .map(s => ({ mudurluk: s.mudurluk, tutar: s.tutar as PpRaporSayi }))
    .sort((a, b) => a.mudurluk.localeCompare(b.mudurluk, 'tr'))

  return { yil, yillar, satirlar }
}
