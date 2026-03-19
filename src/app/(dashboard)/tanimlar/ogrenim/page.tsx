import { createClient } from '@/lib/supabase/server'
import BasitTanimClient from '@/components/tanimlar/BasitTanimClient'
import { ogrenimEkle, ogrenimGuncelle, ogrenimToggleAktif } from './actions'
import type { Tables } from '@/types/database'

type Ogrenim = Tables<'tanim_ogrenim'>

export default async function OgrenimPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_ogrenim')
    .select('*')
    .order('isim')

  const kayitlar: Ogrenim[] = data ?? []

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <BasitTanimClient<Ogrenim>
        baslik="Öğrenim Düzeyleri"
        data={kayitlar}
        nameField="isim"
        nameLabel="Öğrenim Adı"
        onAdd={ogrenimEkle}
        onUpdate={ogrenimGuncelle}
        onToggle={ogrenimToggleAktif}
      />
    </>
  )
}
