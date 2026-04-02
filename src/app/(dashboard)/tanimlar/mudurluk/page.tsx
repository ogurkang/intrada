import { createClient } from '@/lib/supabase/server'
import BasitTanimClient from '@/components/tanimlar/BasitTanimClient'
import { mudurlukEkle, mudurlukGuncelle, mudurlukToggleAktif } from './actions'
import type { Tables } from '@/types/database'

type Mudurluk = Tables<'tanim_mudurluk'>

export default async function MudurlukPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_mudurluk')
    .select('*')
    .order('mudurluk_adi')

  const kayitlar: Mudurluk[] = data ?? []

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <BasitTanimClient<Mudurluk>
        baslik="Müdürlükler"
        data={kayitlar}
        nameField="mudurluk_adi"
        nameLabel="Müdürlük Adı"
        extraSelectFields={[
          {
            key: 'konum',
            label: 'Konum',
            required: true,
            options: [
              { value: 'İç', label: 'İç' },
              { value: 'Dış', label: 'Dış' },
            ],
          },
        ]}
        onAdd={mudurlukEkle}
        onUpdate={mudurlukGuncelle}
        onToggle={mudurlukToggleAktif}
      />
    </>
  )
}
