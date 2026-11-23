import { createClient } from '@/lib/supabase/server'
import PpMudurlukFaaliyetMaliyetClient from '@/components/stratejik/PpMudurlukFaaliyetMaliyetClient'
import { ppMudurlukFaaliyetMaliyetRaporYili } from '@/lib/pp-mudurluk-faaliyet-maliyet-rapor'

export default async function MudurlukFaaliyetMaliyetleriPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppMudurlukFaaliyetMaliyetRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpMudurlukFaaliyetMaliyetClient key={rapor.yil} rapor={rapor} />
}
