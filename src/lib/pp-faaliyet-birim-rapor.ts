import type { SupabaseClient } from '@supabase/supabase-js'
import { ppFaaliyetKodu, ppKodSirala, ppPerformansYol } from '@/lib/pp-iliski'
import { ppRaporVarsayilanYil } from './pp-mudurluk-rapor'

export type PpFaaliyetBirimSatir = {
  programAdi: string
  hedefKodu: string
  hedefAdi: string
  faaliyetKodu: string
  faaliyetAdi: string
  sorumluBirim: string
}

export type PpFaaliyetBirimBlok = {
  programAdi: string
  satirlar: PpFaaliyetBirimSatir[]
}

export type PpFaaliyetBirimRapor = {
  yil: number
  yillar: number[]
  bloklar: PpFaaliyetBirimBlok[]
}

function sayiParcasi(kodu: string | null | undefined, sira: number | null | undefined): string {
  const son = String(kodu ?? '').split('.').map(s => s.trim()).filter(Boolean).pop() ?? ''
  const sayi = son.replace(/sa|sh/gi, '').trim()
  if (sayi) return sayi
  return sira != null && Number.isFinite(Number(sira)) ? String(sira) : ''
}

export { ppRaporVarsayilanYil }

/** Program başına blok: performans faaliyeti + seçilen müdürlük (sorumlu birim). */
export async function ppFaaliyetBirimRaporYili(
  supabase: SupabaseClient,
  istenenYil: number | null,
): Promise<PpFaaliyetBirimRapor> {
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
  if (!donem || !yillar.length) return { yil, yillar, bloklar: [] }

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
  const altlar = (altRaw ?? []) as {
    id: number
    program_id: number
    alt_program_adi: string
    sira_no: number | null
  }[]
  const altIds = altlar.map(a => a.id)

  type Bag = {
    id: number
    alt_program_id: number
    alt_hedef_id: number
    faaliyet_id: number | null
    secilen_mudurluk: string | null
  }
  const { data: bagRaw } = altIds.length
    ? await sb
      .from('performans_programi_alt_program_hedef')
      .select('id, alt_program_id, alt_hedef_id, faaliyet_id, secilen_mudurluk')
      .in('alt_program_id', altIds)
    : { data: [] }
  /** İşlemlerde görünmeyen yetim bag’ler (sınıflandırma faaliyeti / müdürlük boş) rapora alınmaz. */
  const baglar = ((bagRaw ?? []) as Bag[]).filter(
    b => b.faaliyet_id != null && String(b.secilen_mudurluk ?? '').trim() !== '',
  )
  const hedefIds = [...new Set(baglar.map(b => b.alt_hedef_id))]

  const { data: amacRaw } = await sb.from('stratejik_plan_amac').select('id, kodu, sira_no').eq('donem_id', donem.id)
  const amaclar = (amacRaw ?? []) as { id: number; kodu: string | null; sira_no: number | null }[]
  const amacIds = amaclar.map(a => a.id)
  const { data: hedefRaw } = amacIds.length
    ? await sb.from('stratejik_plan_hedef').select('id, amac_id, kodu, sira_no').in('amac_id', amacIds)
    : { data: [] }
  const hedefler = (hedefRaw ?? []) as { id: number; amac_id: number; kodu: string | null; sira_no: number | null }[]
  const spHedefIds = hedefler.map(h => h.id)
  const { data: altHedefRaw } = hedefIds.length && spHedefIds.length
    ? await sb
      .from('stratejik_plan_alt_hedef')
      .select('id, hedef_id, kodu, sira_no, alt_hedef_adi')
      .in('id', hedefIds)
      .in('hedef_id', spHedefIds)
      .eq('aktif', true)
    : { data: [] }
  const altHedefler = (altHedefRaw ?? []) as {
    id: number
    hedef_id: number
    kodu: string | null
    sira_no: number | null
    alt_hedef_adi: string
  }[]
  const altHedefById = new Map(altHedefler.map(h => [h.id, h]))
  const amacById = new Map(amaclar.map(a => [a.id, a]))
  const hedefById = new Map(hedefler.map(h => [h.id, h]))

  function hedefKodu(h: (typeof altHedefler)[0]): string {
    const hedef = hedefById.get(h.hedef_id)
    const amac = hedef ? amacById.get(hedef.amac_id) : undefined
    const yol = ppPerformansYol(amac?.kodu ?? '', hedef?.kodu ?? '', h.kodu ?? '')
    if (yol) return yol
    return [
      sayiParcasi(amac?.kodu, amac?.sira_no),
      sayiParcasi(hedef?.kodu, hedef?.sira_no),
      sayiParcasi(h.kodu, h.sira_no),
    ]
      .filter(Boolean)
      .join('.')
  }

  const bagIds = baglar.map(b => b.id)
  const { data: pfRaw } = bagIds.length
    ? await sb
      .from('performans_programi_pf_faaliyet')
      .select('id, bag_id, sira_no, faaliyet_adi')
      .in('bag_id', bagIds)
      .order('sira_no', { ascending: true, nullsFirst: false })
    : { data: [] }
  const pfListe = (pfRaw ?? []) as {
    id: number
    bag_id: number
    sira_no: number | null
    faaliyet_adi: string
  }[]

  const bloklar: PpFaaliyetBirimBlok[] = []
  for (const program of programlar) {
    const programAltIds = new Set(altlar.filter(a => a.program_id === program.id).map(a => a.id))
    const programBaglar = baglar.filter(b => programAltIds.has(b.alt_program_id))
    const satirlar: PpFaaliyetBirimSatir[] = []

    for (const bag of programBaglar) {
      const h = altHedefById.get(bag.alt_hedef_id)
      if (!h) continue
      const phKod = hedefKodu(h)
      const faaliyetler = pfListe
        .filter(f => f.bag_id === bag.id)
        .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.faaliyet_adi.localeCompare(b.faaliyet_adi, 'tr'))
      for (const f of faaliyetler) {
        satirlar.push({
          programAdi: program.program_adi,
          hedefKodu: phKod,
          hedefAdi: h.alt_hedef_adi,
          faaliyetKodu: ppFaaliyetKodu(phKod, Number(f.sira_no ?? 0) || 0),
          faaliyetAdi: f.faaliyet_adi,
          sorumluBirim: String(bag.secilen_mudurluk ?? '').trim(),
        })
      }
    }

    if (!satirlar.length) continue
    satirlar.sort((a, b) => ppKodSirala(a.faaliyetKodu, b.faaliyetKodu)
      || a.faaliyetAdi.localeCompare(b.faaliyetAdi, 'tr'))
    bloklar.push({ programAdi: program.program_adi, satirlar })
  }

  return { yil, yillar, bloklar }
}
