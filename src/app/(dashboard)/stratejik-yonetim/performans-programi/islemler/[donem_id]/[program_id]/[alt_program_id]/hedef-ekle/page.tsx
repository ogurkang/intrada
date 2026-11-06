import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpAltProgramKayitClient from '@/components/stratejik/PpAltProgramKayitClient'
import { ppIliskiSecenekleri } from '../../iliski-actions'

export const dynamic = 'force-dynamic'

export default async function PpHedefEklePage({
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
  const { data: alt } = await (supabase as any)
    .from('performans_programi_alt_program')
    .select('id, sira_no, kodu, alt_program_adi')
    .eq('id', altId)
    .eq('program_id', programId)
    .maybeSingle()
  if (!alt) notFound()
  const { secenekler, hata } = await ppIliskiSecenekleri()
  return (
    <div className="space-y-4">
      {hata ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <PpAltProgramKayitClient
        yil={yil}
        programId={programId}
        programAdi={String(alt.alt_program_adi ?? '')}
        secenekler={secenekler}
        baslangic={{
          altProgramId: altId,
          yalnizHedef: true,
          sira: alt.sira_no == null ? '' : String(alt.sira_no),
          kodu: String(alt.kodu ?? ''),
          ad: String(alt.alt_program_adi ?? ''),
          altHedefId: '',
          gerekce: '',
          faaliyetler: [],
        }}
      />
    </div>
  )
}
