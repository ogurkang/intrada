import { createClient } from '@/lib/supabase/server'
import PpFaaliyetBirimListeClient from '@/components/stratejik/PpFaaliyetBirimListeClient'
import { ppFaaliyetBirimRaporYili } from '@/lib/pp-faaliyet-birim-rapor'

export default async function FaaliyetBirimListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppFaaliyetBirimRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpFaaliyetBirimListeClient key={rapor.yil} rapor={rapor} />
}
