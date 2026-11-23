import { createClient } from '@/lib/supabase/server'
import PpHarcamaYetkilileriClient from '@/components/stratejik/PpHarcamaYetkilileriClient'
import { ppHarcamaYetkilileriEkranYukle } from '@/lib/pp-harcama-yetkilileri-rapor'

export default async function HarcamaBirimYetkilileriPage() {
  const supabase = await createClient()
  const rapor = await ppHarcamaYetkilileriEkranYukle(supabase)
  return <PpHarcamaYetkilileriClient rapor={rapor} />
}
