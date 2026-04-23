import { createClient } from '@/lib/supabase/server'
import StratejikPlanDonemClient, { type SpDonem } from '@/components/stratejik/StratejikPlanDonemClient'
import { donemAktifPasifYap, donemEkle, donemGuncelle } from './actions'

export default async function StratejikPlanIslemlerPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stratejik_plan_donem' as never)
    .select('id, donem_adi, baslangic_tarihi, bitis_tarihi, aktif')
    .order('id', { ascending: false })

  const donemler = (data ?? []) as unknown as SpDonem[]

  return (
    <StratejikPlanDonemClient
      donemler={donemler}
      onEkle={donemEkle}
      onGuncelle={donemGuncelle}
      onAktifPasif={donemAktifPasifYap}
    />
  )
}

