import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PpFaaliyetListeClient, { type PpFaaliyetSatirListe } from '@/components/stratejik/PpFaaliyetListeClient'

export const dynamic = 'force-dynamic'

export default async function PpFaaliyetlerPage({
  params,
}: {
  params: Promise<{ donem_id: string; program_id: string; alt_program_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  const programId = Number.parseInt(p.program_id, 10)
  const altId = Number.parseInt(p.alt_program_id, 10)
  if (!Number.isFinite(yil) || !Number.isFinite(programId) || !Number.isFinite(altId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: alt }, { data: raw }] = await Promise.all([
    sb.from('performans_programi_alt_program').select('id, alt_program_adi').eq('id', altId).eq('program_id', programId).maybeSingle(),
    sb.from('performans_programi_pf_faaliyet').select('id, sira_no, faaliyet_adi').eq('alt_program_id', altId).order('sira_no'),
  ])
  if (!alt) notFound()
  const kayitlar = (raw ?? []) as { id: number; sira_no: number; faaliyet_adi: string }[]
  const ids = kayitlar.map(f => f.id)
  const { data: hedefRaw } = ids.length
    ? await sb.from('performans_programi_alt_program_hedef').select('faaliyet_id').in('faaliyet_id', ids)
    : { data: [] }
  const hedefSay = new Map<number, number>()
  for (const h of hedefRaw ?? []) {
    const id = Number((h as { faaliyet_id?: number }).faaliyet_id)
    if (Number.isFinite(id)) hedefSay.set(id, (hedefSay.get(id) ?? 0) + 1)
  }
  const faaliyetler: PpFaaliyetSatirListe[] = kayitlar.map(f => ({
    id: f.id,
    sira: f.sira_no,
    ad: f.faaliyet_adi,
    hedefSayisi: hedefSay.get(f.id) ?? 0,
  }))
  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb items={[
        { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
        { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
        { label: 'Alt Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}` },
        { label: 'Faaliyetler' },
      ]} />
      <PpFaaliyetListeClient
        yil={yil}
        programId={programId}
        altProgramId={altId}
        baslik={String(alt.alt_program_adi ?? '')}
        faaliyetler={faaliyetler}
      />
    </div>
  )
}
