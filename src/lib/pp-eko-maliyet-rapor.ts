import type { SupabaseClient } from '@supabase/supabase-js'
import {
  PP_EKONOMIK_1_AD,
  ppEkonomik1Kod,
  ppRaporPara,
  ppRaporVarsayilanYil,
  type PpRaporSayi,
} from './pp-mudurluk-rapor'
import { ppPfOdenekSatirlariYukle } from '@/lib/pp-pf-odenek'

export type PpEkoYilHucre = {
  hizmet: PpRaporSayi
  yonetim: PpRaporSayi
  genel: PpRaporSayi
}

export type PpEkoSatirTur = 'ekonomik' | 'butce_ici' | 'butce_disi_diger' | 'butce_disi' | 'genel'

export type PpEkoSatir = {
  tur: PpEkoSatirTur
  kod: string
  ad: string
  yillar: [PpEkoYilHucre, PpEkoYilHucre, PpEkoYilHucre]
}

export type PpEkoMaliyetRapor = {
  yil: number
  yillar: number[]
  satirlar: PpEkoSatir[]
}

const EKONOMIK_SIRALAR = ['01', '02', '03', '04', '05', '06', '07', '08', '09'] as const

/** Şablon satır adları (t3-eko-pro). */
const EKONOMIK_AD: Record<string, string> = {
  '01': 'Personel Giderleri',
  '02': 'Sosyal Güvenlik Kurumuna Devlet Primi Giderleri',
  '03': 'Mal ve Hizmet Alımı Giderleri',
  '04': 'Faiz Giderleri',
  '05': 'Cari Transferler',
  '06': 'Sermaye Giderleri',
  '07': 'Sermaye Transferleri',
  '08': 'Borç Verme',
  '09': 'Yedek Ödenek',
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

function bosHucre(): PpEkoYilHucre {
  return { hizmet: null, yonetim: null, genel: null }
}

function hucreEkle(h: PpEkoYilHucre, alan: 'hizmet' | 'yonetim', v: PpRaporSayi) {
  if (v == null) return
  h[alan] = (h[alan] ?? 0) + v
  h.genel = (h.genel ?? 0) + v
}

export function ppYonetimDestekProgramMi(ad: string | null | undefined): boolean {
  const n = String(ad ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  return n.includes('yonetim') && n.includes('destek')
}

export { ppRaporPara, ppRaporVarsayilanYil, PP_EKONOMIK_1_AD }

/**
 * Ekonomik 1. düzey × (hizmet / yönetim-destek / genel) × yıl / yıl+1 / yıl+2.
 * Hizmet = yönetim ve destek dışındaki programların ödenek toplamı.
 */
export async function ppEkoMaliyetRaporYili(
  supabase: SupabaseClient,
  istenenYil: number | null,
): Promise<PpEkoMaliyetRapor> {
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
    .select('id, program_adi, sira_no')
    .eq('yil', yil)
    .order('sira_no', { ascending: true, nullsFirst: false })
  const programlar = ((programRaw ?? []) as { id: number; program_adi: string; sira_no: number | null }[])
  const programIds = programlar.map(p => p.id)
  const yonetimIds = new Set(programlar.filter(p => ppYonetimDestekProgramMi(p.program_adi)).map(p => p.id))

  const { data: altRaw } = programIds.length
    ? await sb.from('performans_programi_alt_program').select('id, program_id').in('program_id', programIds)
    : { data: [] }
  const altlar = (altRaw ?? []) as { id: number; program_id: number }[]
  const altById = new Map(altlar.map(a => [a.id, a]))
  const altIds = altlar.map(a => a.id)

  const { data: bagRaw } = altIds.length
    ? await sb.from('performans_programi_alt_program_hedef').select('id, alt_program_id').in('alt_program_id', altIds)
    : { data: [] }
  const baglar = (bagRaw ?? []) as { id: number; alt_program_id: number }[]
  const bagById = new Map(baglar.map(b => [b.id, b]))
  const bagIds = baglar.map(b => b.id)

  const { data: pfAltRaw } = altIds.length
    ? await sb.from('performans_programi_pf_faaliyet').select('id, bag_id, alt_program_id').in('alt_program_id', altIds)
    : { data: [] }
  const { data: pfBagRaw } = bagIds.length
    ? await sb.from('performans_programi_pf_faaliyet').select('id, bag_id, alt_program_id').in('bag_id', bagIds)
    : { data: [] }
  const pfMap = new Map<number, { id: number; bag_id: number | null; alt_program_id: number | null }>()
  for (const f of [...(pfAltRaw ?? []), ...(pfBagRaw ?? [])] as {
    id: number
    bag_id: number | null
    alt_program_id: number | null
  }[]) {
    pfMap.set(f.id, f)
  }
  const pfIds = [...pfMap.keys()]

  const { data: odenekHam } = await ppPfOdenekSatirlariYukle(
    sb as never,
    pfIds,
    't_butce, t1_tahmin, t2_tahmin',
  )
  const odenekler = odenekHam
    .filter(o => o.butce_kodu_id != null)
    .map(o => ({
      pf_faaliyet_id: o.pf_faaliyet_id,
      butce_kodu_id: o.butce_kodu_id as number,
      t_butce: o.t_butce,
      t1_tahmin: o.t1_tahmin,
      t2_tahmin: o.t2_tahmin,
    }))
  const kodIds = [...new Set(odenekler.map(o => o.butce_kodu_id).filter(Number.isFinite))]
  const { data: kodRaw } = kodIds.length
    ? await sb.from('performans_programi_butce_kodu').select('id, adim_1').in('id', kodIds)
    : { data: [] }
  const butceKodById = new Map(
    ((kodRaw ?? []) as { id: number; adim_1: string }[]).map(k => [k.id, k]),
  )

  function programIdOfPf(pfId: number): number | null {
    const pf = pfMap.get(pfId)
    if (!pf) return null
    if (pf.alt_program_id != null) return altById.get(pf.alt_program_id)?.program_id ?? null
    if (pf.bag_id != null) {
      const bag = bagById.get(pf.bag_id)
      if (bag) return altById.get(bag.alt_program_id)?.program_id ?? null
    }
    return null
  }

  type Uc = [PpEkoYilHucre, PpEkoYilHucre, PpEkoYilHucre]
  const byKod = new Map<string, Uc>()
  for (const kod of EKONOMIK_SIRALAR) {
    byKod.set(kod, [bosHucre(), bosHucre(), bosHucre()])
  }

  for (const o of odenekler) {
    const programId = programIdOfPf(o.pf_faaliyet_id)
    if (programId == null) continue
    const adim = ppEkonomik1Kod(butceKodById.get(o.butce_kodu_id)?.adim_1)
    if (!adim || !byKod.has(adim)) continue
    const alan: 'hizmet' | 'yonetim' = yonetimIds.has(programId) ? 'yonetim' : 'hizmet'
    const uc = byKod.get(adim)!
    hucreEkle(uc[0], alan, sayi(o.t_butce))
    hucreEkle(uc[1], alan, sayi(o.t1_tahmin))
    hucreEkle(uc[2], alan, sayi(o.t2_tahmin))
  }

  const butceIci: Uc = [bosHucre(), bosHucre(), bosHucre()]
  for (const kod of EKONOMIK_SIRALAR) {
    const uc = byKod.get(kod)!
    for (let i = 0; i < 3; i++) {
      butceIci[i].hizmet = topla(butceIci[i].hizmet, uc[i].hizmet)
      butceIci[i].yonetim = topla(butceIci[i].yonetim, uc[i].yonetim)
      butceIci[i].genel = topla(butceIci[i].genel, uc[i].genel)
    }
  }

  const butceDisiDiger: Uc = [bosHucre(), bosHucre(), bosHucre()]
  const butceDisi: Uc = [bosHucre(), bosHucre(), bosHucre()]
  const genel: Uc = [bosHucre(), bosHucre(), bosHucre()]
  for (let i = 0; i < 3; i++) {
    genel[i].hizmet = topla(butceIci[i].hizmet, butceDisi[i].hizmet)
    genel[i].yonetim = topla(butceIci[i].yonetim, butceDisi[i].yonetim)
    genel[i].genel = topla(butceIci[i].genel, butceDisi[i].genel)
  }

  const satirlar: PpEkoSatir[] = [
    ...EKONOMIK_SIRALAR.map(kod => ({
      tur: 'ekonomik' as const,
      kod,
      ad: EKONOMIK_AD[kod] ?? PP_EKONOMIK_1_AD[kod] ?? `Ekonomik ${kod}`,
      yillar: byKod.get(kod)!,
    })),
    { tur: 'butce_ici', kod: '', ad: 'BÜTÇE İÇİ TOPLAM KAYNAK', yillar: butceIci },
    { tur: 'butce_disi_diger', kod: '', ad: 'Diğer Bütçe Dışı Kaynak', yillar: butceDisiDiger },
    { tur: 'butce_disi', kod: '', ad: 'BÜTÇE DIŞI TOPLAM KAYNAK', yillar: butceDisi },
    { tur: 'genel', kod: '', ad: 'GENEL TOPLAM', yillar: genel },
  ]

  return { yil, yillar, satirlar }
}
