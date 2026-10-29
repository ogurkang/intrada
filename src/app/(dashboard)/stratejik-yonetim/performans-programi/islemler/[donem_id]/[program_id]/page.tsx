import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PerformansProgramiAltProgramClient, {
  type PpAltProgram,
} from '@/components/stratejik/PerformansProgramiAltProgramClient'
import { altProgramEkle, altProgramGuncelle } from '../../actions'

export default async function PerformansProgramiProgramDetayPage({
  params,
}: {
  params: Promise<{ donem_id: string; program_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  const programId = Number.parseInt(p.program_id, 10)
  if (!Number.isFinite(yil) || !Number.isFinite(programId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: program }, { data: altRaw }] = await Promise.all([
    sb.from('performans_programi_program').select('id, yil, program_adi').eq('id', programId).eq('yil', yil).maybeSingle(),
    sb.from('performans_programi_alt_program').select('id, program_id, sira_no, kodu, alt_program_adi, aktif').eq('program_id', programId).order('sira_no', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
  ])
  if (!program) notFound()
  const altIds = (altRaw ?? []).map((a: { id: number }) => a.id)
  const { data: hedefRaw } = altIds.length
    ? await sb.from('performans_programi_alt_program_hedef').select('alt_program_id').in('alt_program_id', altIds)
    : { data: [] }
  const hedefSayisiByAlt = new Map<number, number>()
  for (const h of hedefRaw ?? []) {
    const altId = Number((h as { alt_program_id?: unknown }).alt_program_id)
    if (!Number.isFinite(altId)) continue
    hedefSayisiByAlt.set(altId, (hedefSayisiByAlt.get(altId) ?? 0) + 1)
  }
  const altProgramlar = ((altRaw ?? []) as unknown as Omit<PpAltProgram, 'hedef_sayisi'>[]).map(a => ({
    ...a,
    hedef_sayisi: hedefSayisiByAlt.get(a.id) ?? 0,
  }))
  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb items={[
        { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
        { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
        { label: 'Alt Programlar' },
      ]} />
      <PerformansProgramiAltProgramClient yil={yil} programId={programId} programAdi={String((program as { program_adi?: string }).program_adi ?? `Program #${programId}`)} altProgramlar={altProgramlar} onEkle={altProgramEkle} onGuncelle={altProgramGuncelle} />
    </div>
  )
}
