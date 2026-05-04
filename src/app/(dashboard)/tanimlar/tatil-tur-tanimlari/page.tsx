import { createClient } from '@/lib/supabase/server'
import BasitTanimClient from '@/components/tanimlar/BasitTanimClient'
import { tatilTurEkle, tatilTurGuncelle, tatilTurToggleAktif } from './actions'
import type { Tables } from '@/types/database'

type TatilTur = Tables<'tanim_izin_tatil_tur'>

export default async function TatilTurTanimlariPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_izin_tatil_tur')
    .select('*')
    .order('sira_no', { ascending: true, nullsFirst: false })
    .order('tur_adi', { ascending: true })

  const kayitlar: TatilTur[] = (data ?? []) as TatilTur[]

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <BasitTanimClient<TatilTur>
        baslik="Tatil Tür Tanımları"
        data={kayitlar}
        nameField="tur_adi"
        nameLabel="Tatil Türü"
        onAdd={tatilTurEkle}
        onUpdate={tatilTurGuncelle}
        onToggle={tatilTurToggleAktif}
      />
    </>
  )
}
