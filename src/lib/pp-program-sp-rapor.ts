import type { SupabaseClient } from '@supabase/supabase-js'
import { ppKodSirala, ppPerformansYol } from '@/lib/pp-iliski'
import { ppRaporVarsayilanYil } from '@/lib/pp-mudurluk-rapor'

export type PpProgramSpSatir = {
  programAdi: string
  altProgramAdi: string
  performansHedefi: string
  stratejikAmac: string
  hedefKod: string
  amacNo: number
}

function amacNumarasi(amac: { kodu: string | null; sira_no: number | null }): number {
  if (amac.sira_no != null && Number.isFinite(Number(amac.sira_no)) && Number(amac.sira_no) > 0) {
    return Number(amac.sira_no)
  }
  const m = String(amac.kodu ?? '').match(/(\d+)/)
  return m ? Number(m[1]) : 0
}

export function ppStratejikAmacEtiket(amacNo: number, amacAdi: string): string {
  const ad = String(amacAdi ?? '').trim()
  if (amacNo > 0) return `STRATEJİK AMAÇ ${amacNo}- ${ad}`.trim()
  return ad ? `STRATEJİK AMAÇ- ${ad}` : 'STRATEJİK AMAÇ'
}

export type PpProgramSpRapor = {
  yil: number
  yillar: number[]
  satirlar: PpProgramSpSatir[]
}

function sayiParcasi(kodu: string | null | undefined, sira: number | null | undefined): string {
  const son = String(kodu ?? '').split('.').map(s => s.trim()).filter(Boolean).pop() ?? ''
  const sayi = son.replace(/sa|sh/gi, '').trim()
  if (sayi) return sayi
  return sira != null && Number.isFinite(Number(sira)) ? String(sira) : ''
}

/**
 * Program → Alt Program → Performans Hedefi (alt_hedef) → Stratejik Amaç.
 * Her benzersiz program/alt program/PH satırı bir kez.
 */
export async function ppProgramSpRaporYili(
  supabase: SupabaseClient,
  istenenYil: number | null,
): Promise<PpProgramSpRapor> {
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
    .slice()
    .sort((a, b) => (a.sira_no ?? 0) - (b.sira_no ?? 0) || a.program_adi.localeCompare(b.program_adi, 'tr'))
  const programIds = programlar.map(p => p.id)
  if (!programIds.length) return { yil, yillar, satirlar: [] }

  const { data: altRaw } = await sb
    .from('performans_programi_alt_program')
    .select('id, program_id, alt_program_adi, sira_no')
    .in('program_id', programIds)
  const altlar = (altRaw ?? []) as {
    id: number
    program_id: number
    alt_program_adi: string
    sira_no: number | null
  }[]
  const altIds = altlar.map(a => a.id)
  if (!altIds.length) return { yil, yillar, satirlar: [] }

  const { data: bagRaw } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('alt_program_id, alt_hedef_id')
    .in('alt_program_id', altIds)
  const baglar = (bagRaw ?? []) as { alt_program_id: number; alt_hedef_id: number }[]
  const hedefIds = [...new Set(baglar.map(b => b.alt_hedef_id))]

  const { data: amacRaw } = await sb
    .from('stratejik_plan_amac')
    .select('id, kodu, sira_no, amac_adi')
    .eq('donem_id', donem.id)
  const amaclar = (amacRaw ?? []) as {
    id: number
    kodu: string | null
    sira_no: number | null
    amac_adi: string
  }[]
  const amacIds = amaclar.map(a => a.id)
  const amacById = new Map(amaclar.map(a => [a.id, a]))

  const { data: hedefRaw } = amacIds.length
    ? await sb.from('stratejik_plan_hedef').select('id, amac_id, kodu, sira_no').in('amac_id', amacIds)
    : { data: [] }
  const hedefler = (hedefRaw ?? []) as {
    id: number
    amac_id: number
    kodu: string | null
    sira_no: number | null
  }[]
  const spHedefIds = hedefler.map(h => h.id)
  const hedefById = new Map(hedefler.map(h => [h.id, h]))

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
  const phById = new Map(altHedefler.map(h => [h.id, h]))
  const programById = new Map(programlar.map(p => [p.id, p]))
  const altById = new Map(altlar.map(a => [a.id, a]))

  const tekil = new Map<string, PpProgramSpSatir>()
  for (const bag of baglar) {
    const alt = altById.get(bag.alt_program_id)
    if (!alt) continue
    const program = programById.get(alt.program_id)
    if (!program) continue
    const ph = phById.get(bag.alt_hedef_id)
    if (!ph) continue
    const hedef = hedefById.get(ph.hedef_id)
    if (!hedef) continue
    const amac = amacById.get(hedef.amac_id)
    if (!amac) continue

    const yol = ppPerformansYol(amac.kodu ?? '', hedef.kodu ?? '', ph.kodu ?? '')
    const hedefKod = yol || [
      sayiParcasi(amac.kodu, amac.sira_no),
      sayiParcasi(hedef.kodu, hedef.sira_no),
      sayiParcasi(ph.kodu, ph.sira_no),
    ].filter(Boolean).join('.')

    const key = `${program.id}\0${alt.id}\0${ph.id}`
    if (tekil.has(key)) continue
    const amacNo = amacNumarasi(amac)
    tekil.set(key, {
      programAdi: program.program_adi,
      altProgramAdi: alt.alt_program_adi,
      performansHedefi: hedefKod
        ? `${hedefKod} — ${ph.alt_hedef_adi}`
        : ph.alt_hedef_adi,
      stratejikAmac: ppStratejikAmacEtiket(amacNo, String(amac.amac_adi ?? '')),
      hedefKod,
      amacNo,
    })
  }

  const satirlar = [...tekil.values()].sort((a, b) =>
    a.programAdi.localeCompare(b.programAdi, 'tr')
    || a.altProgramAdi.localeCompare(b.altProgramAdi, 'tr')
    || ppKodSirala(a.hedefKod, b.hedefKod)
    || a.performansHedefi.localeCompare(b.performansHedefi, 'tr'),
  )

  return { yil, yillar, satirlar }
}
