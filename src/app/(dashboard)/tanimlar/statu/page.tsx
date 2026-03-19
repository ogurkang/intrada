import { createClient } from '@/lib/supabase/server'
import BasitTanimClient from '@/components/tanimlar/BasitTanimClient'
import { statuEkle, statuGuncelle, statuToggleAktif } from './actions'
import type { Tables } from '@/types/database'

type Statu = Tables<'tanim_statu'>

export default async function StatuPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('tanim_statu').select('*').order('sira_no', { nullsFirst: false }).order('statu_adi')
  return (
    <>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">Veri yüklenirken hata: {error.message}</div>}
      <BasitTanimClient<Statu>
        baslik="Statüler"
        data={data ?? []}
        nameField="statu_adi"
        nameLabel="Statü Adı"
        onAdd={statuEkle}
        onUpdate={statuGuncelle}
        onToggle={statuToggleAktif}
      />
    </>
  )
}
