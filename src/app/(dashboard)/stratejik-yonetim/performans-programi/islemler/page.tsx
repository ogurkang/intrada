import { createClient } from '@/lib/supabase/server'
import PerformansProgramiDonemClient, {
  type PpDonem,
} from '@/components/stratejik/PerformansProgramiDonemClient'

export default async function PerformansProgramiIslemlerPage() {
  const supabase = await createClient()
  const { data: aktifDonem } = await supabase
    .from('stratejik_plan_donem' as never)
    .select('id, donem_adi, baslangic_tarihi, bitis_tarihi, aktif')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const secili = (aktifDonem ?? null) as unknown as {
    id: number
    baslangic_tarihi: string
    bitis_tarihi: string
  } | null
  if (!secili) return <PerformansProgramiDonemClient donemler={[]} />

  const ilkYil = Number.parseInt(String(secili.baslangic_tarihi ?? '').slice(0, 4), 10)
  const sonYil = Number.parseInt(String(secili.bitis_tarihi ?? '').slice(0, 4), 10)
  if (!Number.isFinite(ilkYil) || !Number.isFinite(sonYil) || sonYil < ilkYil) {
    return <PerformansProgramiDonemClient donemler={[]} />
  }

  const donemler: PpDonem[] = []
  for (let yil = ilkYil; yil <= sonYil; yil += 1) {
    donemler.push({
      id: Number(`${secili.id}${yil}`),
      yil,
      donem_adi: `${yil} Yılı Performans Programı`,
      baslangic_tarihi: `${yil}-01-01`,
      bitis_tarihi: `${yil}-12-31`,
    })
  }

  return <PerformansProgramiDonemClient donemler={donemler} />
}
