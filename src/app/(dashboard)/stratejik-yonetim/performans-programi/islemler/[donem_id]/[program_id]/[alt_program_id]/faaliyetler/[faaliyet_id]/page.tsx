import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PpFaaliyetHedefListeClient, { type PpFaaliyetHedefSatir } from '@/components/stratejik/PpFaaliyetHedefListeClient'
import { ppIliskiSecenekleri } from '../../../iliski-actions'

export const dynamic = 'force-dynamic'

export default async function PpFaaliyetHedefleriPage({
  params,
}: {
  params: Promise<{ donem_id: string; program_id: string; alt_program_id: string; faaliyet_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  const programId = Number.parseInt(p.program_id, 10)
  const altId = Number.parseInt(p.alt_program_id, 10)
  const faaliyetId = Number.parseInt(p.faaliyet_id, 10)
  if (![yil, programId, altId, faaliyetId].every(Number.isFinite)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const bagSorgu = await sb
    .from('performans_programi_alt_program_hedef')
    .select('id, alt_hedef_id, secilen_mudurluk, gerekce, hedef_aciklama')
    .eq('faaliyet_id', faaliyetId)
    .order('id')
  const bagFallback = bagSorgu.error
    ? await sb
        .from('performans_programi_alt_program_hedef')
        .select('id, alt_hedef_id, secilen_mudurluk, gerekce')
        .eq('faaliyet_id', faaliyetId)
        .order('id')
    : bagSorgu
  const [{ data: faaliyet }, { data: mudRaw }, sec] = await Promise.all([
    sb.from('performans_programi_pf_faaliyet').select('id, faaliyet_adi, alt_program_id').eq('id', faaliyetId).eq('alt_program_id', altId).maybeSingle(),
    sb.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    ppIliskiSecenekleri(),
  ])
  if (!faaliyet) notFound()
  const baglar = (bagFallback.data ?? []) as {
    id: number
    alt_hedef_id: number
    secilen_mudurluk: string | null
    gerekce?: string | null
    hedef_aciklama?: string | null
  }[]
  const secenekById = new Map(sec.secenekler.map(s => [s.id, s]))
  const bagIds = baglar.map(b => b.id)
  const { data: pfRaw } = bagIds.length
    ? await sb.from('performans_programi_pf_faaliyet').select('bag_id').in('bag_id', bagIds)
    : { data: [] }
  const pfSay = new Map<number, number>()
  for (const r of pfRaw ?? []) {
    const id = Number((r as { bag_id?: number }).bag_id)
    if (Number.isFinite(id)) pfSay.set(id, (pfSay.get(id) ?? 0) + 1)
  }
  const hedefler: PpFaaliyetHedefSatir[] = baglar.map(b => {
    const secenek = secenekById.get(b.alt_hedef_id)
    return {
      id: b.id,
      kod: secenek?.kod ?? '',
      ad: secenek?.ad ?? String(b.alt_hedef_id),
      altHedefId: b.alt_hedef_id,
      mudurluk: b.secilen_mudurluk ?? '',
      gerekce: b.gerekce ?? '',
      hedefAciklama: b.hedef_aciklama ?? '',
      faaliyetSayisi: pfSay.get(b.id) ?? 0,
    }
  })
  const mudurlukler = ((mudRaw ?? []) as { mudurluk_adi: string | null }[]).map(m => String(m.mudurluk_adi ?? '')).filter(Boolean)
  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb items={[
        { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
        { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
        { label: 'Alt Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}` },
        { label: 'Faaliyetler', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altId}/faaliyetler` },
        { label: 'Alt Program Hedefleri' },
      ]} />
      <PpFaaliyetHedefListeClient
        yil={yil}
        programId={programId}
        altProgramId={altId}
        faaliyetId={faaliyetId}
        faaliyetAdi={String(faaliyet.faaliyet_adi ?? '')}
        hedefler={hedefler}
        secenekler={sec.secenekler}
        mudurlukler={mudurlukler}
      />
    </div>
  )
}
