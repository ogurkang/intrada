import type { SupabaseClient } from '@supabase/supabase-js'
import { ppRaporPara, type PpRaporSayi } from './pp-mudurluk-rapor'

export type PpFaaliyetMaliyetSatirTur = 'program' | 'alt_program' | 'faaliyet'

export type PpFaaliyetMaliyetSatir = {
  tur: PpFaaliyetMaliyetSatirTur
  etiket: string
  ad: string
  yilTutar: PpRaporSayi
  sonrakiTutar: PpRaporSayi
}

export type PpFaaliyetMaliyetRapor = {
  yil: number
  yillar: number[]
  satirlar: PpFaaliyetMaliyetSatir[]
}

function sayi(v: unknown): PpRaporSayi {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function topla(...degerler: PpRaporSayi[]): PpRaporSayi {
  const dolu = degerler.filter((n): n is number => n != null)
  return dolu.length ? dolu.reduce((a, b) => a + b, 0) : null
}

/** Seçili yıl varsayılanı: takvim yılının bir sonraki yılı (dönem aralığında varsa). */
export function ppFaaliyetMaliyetVarsayilanYil(yillar: number[], istenen: number | null): number {
  const bugun = new Date().getFullYear()
  const sonraki = bugun + 1
  if (istenen != null && yillar.includes(istenen)) return istenen
  if (yillar.includes(sonraki)) return sonraki
  if (yillar.includes(bugun)) return bugun
  return yillar[yillar.length - 1] ?? sonraki
}

export { ppRaporPara }

/**
 * Program → Alt Program → Faaliyet hiyerarşisinde yıl / yıl+1 BÜTÇE İÇİ toplamları.
 * Faaliyet = alt programa bağlı sınıflandırma faaliyeti; maliyet, o faaliyete bağlı
 * performans faaliyetlerinin ödeneklerinden (t_butce / t1_tahmin) toplanır.
 */
export async function ppFaaliyetMaliyetRaporYili(
  supabase: SupabaseClient,
  istenenYil: number | null,
): Promise<PpFaaliyetMaliyetRapor> {
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
  const yil = ppFaaliyetMaliyetVarsayilanYil(yillar, istenenYil)
  if (!donem || !yillar.length) return { yil, yillar, satirlar: [] }

  const { data: programRaw } = await sb
    .from('performans_programi_program')
    .select('id, program_adi, sira_no')
    .eq('yil', yil)
    .order('sira_no', { ascending: true, nullsFirst: false })
  const programlar = ((programRaw ?? []) as { id: number; program_adi: string; sira_no: number | null }[])
    .slice()
    .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.program_adi.localeCompare(b.program_adi, 'tr'))
  const programIds = programlar.map(p => p.id)

  const { data: altRaw } = programIds.length
    ? await sb
      .from('performans_programi_alt_program')
      .select('id, program_id, alt_program_adi, sira_no')
      .in('program_id', programIds)
      .order('sira_no', { ascending: true, nullsFirst: false })
    : { data: [] }
  const altlar = (altRaw ?? []) as { id: number; program_id: number; alt_program_adi: string; sira_no: number | null }[]
  const altIds = altlar.map(a => a.id)

  const { data: faaliyetRaw } = altIds.length
    ? await sb
      .from('performans_programi_pf_faaliyet')
      .select('id, alt_program_id, sira_no, faaliyet_adi')
      .in('alt_program_id', altIds)
      .order('sira_no', { ascending: true, nullsFirst: false })
    : { data: [] }
  const faaliyetler = (faaliyetRaw ?? []) as {
    id: number
    alt_program_id: number
    sira_no: number | null
    faaliyet_adi: string
  }[]
  const faaliyetIds = faaliyetler.map(f => f.id)

  const { data: bagRaw } = faaliyetIds.length
    ? await sb
      .from('performans_programi_alt_program_hedef')
      .select('id, faaliyet_id')
      .in('faaliyet_id', faaliyetIds)
    : { data: [] }
  const baglar = (bagRaw ?? []) as { id: number; faaliyet_id: number }[]
  const bagIds = baglar.map(b => b.id)
  const bagByFaaliyet = new Map<number, number[]>()
  for (const b of baglar) {
    const liste = bagByFaaliyet.get(b.faaliyet_id) ?? []
    liste.push(b.id)
    bagByFaaliyet.set(b.faaliyet_id, liste)
  }

  const { data: pfRaw } = bagIds.length
    ? await sb
      .from('performans_programi_pf_faaliyet')
      .select('id, bag_id')
      .in('bag_id', bagIds)
    : { data: [] }
  const pfListe = (pfRaw ?? []) as { id: number; bag_id: number }[]
  const pfIds = pfListe.map(f => f.id)
  const pfByBag = new Map<number, number[]>()
  for (const f of pfListe) {
    const liste = pfByBag.get(f.bag_id) ?? []
    liste.push(f.id)
    pfByBag.set(f.bag_id, liste)
  }

  // Üst faaliyetin kendisine doğrudan yazılmış ödenek de dahil
  const odenekPfIds = [...new Set([...pfIds, ...faaliyetIds])]
  const { data: odenekRaw } = odenekPfIds.length
    ? await sb
      .from('performans_programi_pf_odenek')
      .select('pf_faaliyet_id, t_butce, t1_tahmin')
      .in('pf_faaliyet_id', odenekPfIds)
    : { data: [] }
  const odenekler = (odenekRaw ?? []) as {
    pf_faaliyet_id: number
    t_butce: number | null
    t1_tahmin: number | null
  }[]
  const odenekByPf = new Map<number, { yil: PpRaporSayi; sonraki: PpRaporSayi }>()
  for (const o of odenekler) {
    const once = odenekByPf.get(o.pf_faaliyet_id) ?? { yil: null, sonraki: null }
    once.yil = topla(once.yil, sayi(o.t_butce))
    once.sonraki = topla(once.sonraki, sayi(o.t1_tahmin))
    odenekByPf.set(o.pf_faaliyet_id, once)
  }

  function pfToplam(ids: number[]): { yil: PpRaporSayi; sonraki: PpRaporSayi } {
    let y: PpRaporSayi = null
    let s: PpRaporSayi = null
    for (const id of ids) {
      const o = odenekByPf.get(id)
      if (!o) continue
      y = topla(y, o.yil)
      s = topla(s, o.sonraki)
    }
    return { yil: y, sonraki: s }
  }

  const satirlar: PpFaaliyetMaliyetSatir[] = []
  for (const program of programlar) {
    const programAltlar = altlar
      .filter(a => a.program_id === program.id)
      .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.alt_program_adi.localeCompare(b.alt_program_adi, 'tr'))

    const altBloklari: {
      alt: (typeof altlar)[0]
      faaliyetSatirlari: PpFaaliyetMaliyetSatir[]
      yilTutar: PpRaporSayi
      sonrakiTutar: PpRaporSayi
    }[] = []

    for (const alt of programAltlar) {
      const altFaaliyetler = faaliyetler
        .filter(f => f.alt_program_id === alt.id)
        .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.faaliyet_adi.localeCompare(b.faaliyet_adi, 'tr'))

      const faaliyetSatirlari: PpFaaliyetMaliyetSatir[] = []
      let altYil: PpRaporSayi = null
      let altSonraki: PpRaporSayi = null

      for (const f of altFaaliyetler) {
        const bagIdleri = bagByFaaliyet.get(f.id) ?? []
        const cocukPfIds = bagIdleri.flatMap(bid => pfByBag.get(bid) ?? [])
        const maliyet = pfToplam([f.id, ...cocukPfIds])
        faaliyetSatirlari.push({
          tur: 'faaliyet',
          etiket: 'FAALİYET',
          ad: f.faaliyet_adi,
          yilTutar: maliyet.yil,
          sonrakiTutar: maliyet.sonraki,
        })
        altYil = topla(altYil, maliyet.yil)
        altSonraki = topla(altSonraki, maliyet.sonraki)
      }

      altBloklari.push({
        alt,
        faaliyetSatirlari,
        yilTutar: altYil,
        sonrakiTutar: altSonraki,
      })
    }

    let programYil: PpRaporSayi = null
    let programSonraki: PpRaporSayi = null
    for (const blok of altBloklari) {
      programYil = topla(programYil, blok.yilTutar)
      programSonraki = topla(programSonraki, blok.sonrakiTutar)
    }

    // Yalnızca altında en az bir faaliyet olan programları yaz
    if (!altBloklari.some(b => b.faaliyetSatirlari.length > 0)) continue

    satirlar.push({
      tur: 'program',
      etiket: 'PROGRAM',
      ad: program.program_adi,
      yilTutar: programYil,
      sonrakiTutar: programSonraki,
    })

    for (const blok of altBloklari) {
      if (!blok.faaliyetSatirlari.length) continue
      satirlar.push({
        tur: 'alt_program',
        etiket: 'ALT PROGRAM',
        ad: blok.alt.alt_program_adi,
        yilTutar: blok.yilTutar,
        sonrakiTutar: blok.sonrakiTutar,
      })
      satirlar.push(...blok.faaliyetSatirlari)
    }
  }

  return { yil, yillar, satirlar }
}
