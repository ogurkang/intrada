import { createClient } from '@/lib/supabase/server'
import PpFaaliyetDuzeyiMaliyetListeClient from '@/components/stratejik/PpFaaliyetDuzeyiMaliyetListeClient'
import { ppFaaliyetMaliyetRaporYili } from '@/lib/pp-faaliyet-maliyet-rapor'

export default async function FaaliyetDuzeyiMaliyetListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppFaaliyetMaliyetRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpFaaliyetDuzeyiMaliyetListeClient key={rapor.yil} rapor={rapor} />
}
