import { createClient } from '@/lib/supabase/server'
import PpMudurlukProgramSpClient from '@/components/stratejik/PpMudurlukProgramSpClient'
import { ppMudurlukProgramSpRaporYili } from '@/lib/pp-mudurluk-program-sp-rapor'

export default async function MudurlukProgramAltProgramSpPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppMudurlukProgramSpRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpMudurlukProgramSpClient key={rapor.yil} rapor={rapor} />
}
