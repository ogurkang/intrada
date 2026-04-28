import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PerformansProgramiFaaliyetClient, {
  type PpFaaliyet,
} from '@/components/stratejik/PerformansProgramiFaaliyetClient'
import { faaliyetEkle, faaliyetGuncelle } from '../../../actions'

export default async function PerformansProgramiAltProgramDetayPage({
  params,
}: {
  params: Promise<{ donem_id: string; program_id: string; alt_program_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  const programId = Number.parseInt(p.program_id, 10)
  const altProgramId = Number.parseInt(p.alt_program_id, 10)
  if (!Number.isFinite(yil) || !Number.isFinite(programId) || !Number.isFinite(altProgramId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: alt }, { data: faaliyetRaw }, { data: amacRaw }] = await Promise.all([
    sb.from('performans_programi_alt_program').select('id, program_id, alt_program_adi').eq('id', altProgramId).eq('program_id', programId).maybeSingle(),
    sb.from('performans_programi_faaliyet').select('id, alt_program_id, sira_no, kodu, faaliyet_adi, aktif').eq('alt_program_id', altProgramId).order('sira_no', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
    sb.from('performans_programi_faaliyet_amac').select('id, faaliyet_id'),
  ])
  if (!alt) notFound()
  const amacSayisiByFaaliyet = new Map<number, number>()
  for (const a of amacRaw ?? []) {
    const fid = Number((a as { faaliyet_id?: unknown }).faaliyet_id)
    if (!Number.isFinite(fid)) continue
    amacSayisiByFaaliyet.set(fid, (amacSayisiByFaaliyet.get(fid) ?? 0) + 1)
  }
  const faaliyetler = ((faaliyetRaw ?? []) as unknown as Omit<PpFaaliyet, 'amac_sayisi'>[]).map(f => ({
    ...f,
    amac_sayisi: amacSayisiByFaaliyet.get(f.id) ?? 0,
  }))
  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb items={[
        { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
        { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
        { label: 'Alt Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}` },
        { label: 'Faaliyetler' },
      ]} />
      <PerformansProgramiFaaliyetClient yil={yil} programId={programId} altProgramId={altProgramId} altProgramAdi={String((alt as { alt_program_adi?: string }).alt_program_adi ?? `Alt Program #${altProgramId}`)} faaliyetler={faaliyetler} onEkle={faaliyetEkle} onGuncelle={faaliyetGuncelle} />
    </div>
  )
}
