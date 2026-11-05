import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpAltProgramKayitClient from '@/components/stratejik/PpAltProgramKayitClient'
import { ppIliskiSecenekleri } from '../iliski-actions'

export const dynamic = 'force-dynamic'

export default async function PpAltProgramYeniPage({
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
  const { data: program } = await (supabase as any).from('performans_programi_program').select('program_adi').eq('id', programId).eq('yil', yil).maybeSingle()
  if (!program) notFound()
  const { secenekler, hata } = await ppIliskiSecenekleri()
  return (
    <div className="space-y-4">
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <PpAltProgramKayitClient yil={yil} programId={programId} programAdi={String(program.program_adi ?? '')} secenekler={secenekler} />
    </div>
  )
}
