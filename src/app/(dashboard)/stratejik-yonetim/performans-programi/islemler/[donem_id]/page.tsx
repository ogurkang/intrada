import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PerformansProgramiProgramClient, {
  type PpProgram,
} from '@/components/stratejik/PerformansProgramiProgramClient'
import { programEkle, programGuncelle, programSil } from '../actions'

export default async function PerformansProgramiDonemDetayPage({
  params,
}: {
  params: Promise<{ donem_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  if (!Number.isFinite(yil)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data } = await sb
    .from('performans_programi_program')
    .select('id, sira_no, kodu, program_adi, aktif')
    .eq('yil', yil)
    .order('sira_no', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })
  const programlarHam = (data ?? []) as Omit<PpProgram, 'alt_program_sayisi'>[]
  const programIds = programlarHam.map(p => p.id)
  const { data: altRaw } = programIds.length
    ? await sb.from('performans_programi_alt_program').select('program_id').in('program_id', programIds)
    : { data: [] }
  const sayac = new Map<number, number>()
  for (const a of altRaw ?? []) {
    const id = Number((a as { program_id?: number }).program_id)
    if (Number.isFinite(id)) sayac.set(id, (sayac.get(id) ?? 0) + 1)
  }
  const programlar: PpProgram[] = programlarHam.map(p => ({ ...p, alt_program_sayisi: sayac.get(p.id) ?? 0 }))

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
          { label: 'Programlar' },
        ]}
      />
      <PerformansProgramiProgramClient yil={yil} programlar={programlar} onEkle={programEkle} onGuncelle={programGuncelle} onSil={programSil} />
    </div>
  )
}
