import { createClient } from '@/lib/supabase/server'
import PpMudurlukPerformansClient from '@/components/stratejik/PpMudurlukPerformansClient'
import { ppPerformansRaporYili } from '@/lib/pp-mudurluk-rapor'

export default async function PerformansProgramiRaporlarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const y = Number.parseInt((await searchParams).y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppPerformansRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpMudurlukPerformansClient key={rapor.yil} rapor={rapor} />
}
