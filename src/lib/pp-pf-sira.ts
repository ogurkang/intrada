/**
 * Performans faaliyeti sıra/kodu: aynı alt program içinde,
 * aynı performans hedefi koduna (örn. 2.5.1) bağlı tüm müdürlük bag’leri
 * ortak sırayı paylaşır. Müdürlük başına yeniden 1’den başlanmaz.
 */

type Sb = {
  from: (t: string) => any
}

export async function sonrakiPhFaaliyetSira(sb: Sb, bagId: number): Promise<number> {
  const { data: bag } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('alt_hedef_id, alt_program_id')
    .eq('id', bagId)
    .maybeSingle()
  const altHedefId = Number((bag as { alt_hedef_id?: number } | null)?.alt_hedef_id)
  const altProgramId = Number((bag as { alt_program_id?: number } | null)?.alt_program_id)
  if (!Number.isFinite(altHedefId) || altHedefId <= 0) return 1
  if (!Number.isFinite(altProgramId) || altProgramId <= 0) return 1

  const { data: buHedef } = await sb
    .from('stratejik_plan_alt_hedef')
    .select('kodu')
    .eq('id', altHedefId)
    .maybeSingle()
  const kod = String((buHedef as { kodu?: string } | null)?.kodu ?? '').trim()
  if (!kod) {
    const { data: tekBag } = await sb
      .from('performans_programi_alt_program_hedef')
      .select('id')
      .eq('alt_program_id', altProgramId)
      .eq('alt_hedef_id', altHedefId)
    return maxSiraSonrasi(sb, ((tekBag ?? []) as { id: number }[]).map(b => Number(b.id)))
  }

  const { data: ayniKod } = await sb
    .from('stratejik_plan_alt_hedef')
    .select('id')
    .eq('kodu', kod)
  const hedefIds = ((ayniKod ?? []) as { id: number }[])
    .map(h => Number(h.id))
    .filter(n => Number.isFinite(n) && n > 0)
  if (!hedefIds.length) return 1

  const { data: baglar } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('id')
    .eq('alt_program_id', altProgramId)
    .in('alt_hedef_id', hedefIds)
  return maxSiraSonrasi(sb, ((baglar ?? []) as { id: number }[]).map(b => Number(b.id)))
}

async function maxSiraSonrasi(sb: Sb, bagIds: number[]): Promise<number> {
  const ids = bagIds.filter(n => Number.isFinite(n) && n > 0)
  if (!ids.length) return 1
  const { data: varOlan } = await sb
    .from('performans_programi_pf_faaliyet')
    .select('sira_no')
    .in('bag_id', ids)
  const nolar = ((varOlan ?? []) as { sira_no: number | null }[])
    .map(r => Number(r.sira_no))
    .filter(Number.isFinite)
  return (nolar.length ? Math.max(...nolar) : 0) + 1
}
