import { createClient } from '@/lib/supabase/server'
import PpGostergeBirimGorClient from '@/components/stratejik/PpGostergeBirimGorClient'
import { ppGostergeBirimRaporYili } from '@/lib/pp-gosterge-birim-rapor'

export default async function GostergeBirimGorPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppGostergeBirimRaporYili(supabase, Number.isFinite(y) ? y : null)
  return <PpGostergeBirimGorClient key={rapor.yil} rapor={rapor} />
}
