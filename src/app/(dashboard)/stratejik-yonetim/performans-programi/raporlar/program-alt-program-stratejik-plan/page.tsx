import { createClient } from '@/lib/supabase/server'
import PpProgramSpClient from '@/components/stratejik/PpProgramSpClient'
import { ppProgramSpRaporYili } from '@/lib/pp-program-sp-rapor'

export default async function ProgramAltProgramSpPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppProgramSpRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpProgramSpClient key={rapor.yil} rapor={rapor} />
}
