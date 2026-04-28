import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PerformansProgramiProgramClient, {
  type PpProgram,
} from '@/components/stratejik/PerformansProgramiProgramClient'
import { programEkle, programGuncelle } from '../actions'

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
  const programlar = (data ?? []) as PpProgram[]

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
          { label: 'Programlar' },
        ]}
      />
      <PerformansProgramiProgramClient yil={yil} programlar={programlar} onEkle={programEkle} onGuncelle={programGuncelle} />
    </div>
  )
}
