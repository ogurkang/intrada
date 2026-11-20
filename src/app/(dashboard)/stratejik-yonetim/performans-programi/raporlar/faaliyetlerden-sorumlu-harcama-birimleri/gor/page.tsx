import { createClient } from '@/lib/supabase/server'
import PpFaaliyetBirimGorClient from '@/components/stratejik/PpFaaliyetBirimGorClient'
import { ppFaaliyetBirimRaporYili } from '@/lib/pp-faaliyet-birim-rapor'

export default async function FaaliyetBirimGorPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppFaaliyetBirimRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpFaaliyetBirimGorClient key={rapor.yil} rapor={rapor} />
}
