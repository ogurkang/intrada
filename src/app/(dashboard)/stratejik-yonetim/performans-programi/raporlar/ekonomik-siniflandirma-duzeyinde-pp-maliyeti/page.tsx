import { createClient } from '@/lib/supabase/server'
import PpEkoMaliyetListeClient from '@/components/stratejik/PpEkoMaliyetListeClient'
import { ppEkoMaliyetRaporYili } from '@/lib/pp-eko-maliyet-rapor'

export default async function EkoMaliyetListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppEkoMaliyetRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpEkoMaliyetListeClient key={rapor.yil} rapor={rapor} />
}
