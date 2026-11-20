import { createClient } from '@/lib/supabase/server'
import PpFaaliyetDuzeyiMaliyetGorClient from '@/components/stratejik/PpFaaliyetDuzeyiMaliyetGorClient'
import { ppFaaliyetMaliyetRaporYili } from '@/lib/pp-faaliyet-maliyet-rapor'

export default async function FaaliyetDuzeyiMaliyetGorPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppFaaliyetMaliyetRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpFaaliyetDuzeyiMaliyetGorClient key={rapor.yil} rapor={rapor} />
}
