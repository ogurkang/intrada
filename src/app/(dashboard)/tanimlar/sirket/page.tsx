import { createClient } from '@/lib/supabase/server'
import BasitTanimClient from '@/components/tanimlar/BasitTanimClient'
import { sirketEkle, sirketGuncelle, sirketToggleAktif } from './actions'

interface SirketRow {
  id: number
  sirket_adi: string
  konum: string
  aktif: boolean
  [key: string]: unknown
}

export default async function SirketPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = (await createClient()) as any
  const { data, error } = await sb
    .from('tanim_sirket')
    .select('id, sirket_adi, konum, aktif')
    .order('sirket_adi')

  const kayitlar: SirketRow[] = data ?? []

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <BasitTanimClient<SirketRow>
        baslik="Şirketler"
        data={kayitlar}
        nameField="sirket_adi"
        nameLabel="Şirket Adı"
        extraSelectFields={[
          {
            key: 'konum',
            label: 'Konum',
            required: true,
            options: [
              { value: 'Dış', label: 'Dış' },
              { value: 'İç', label: 'İç' },
            ],
          },
        ]}
        onAdd={sirketEkle}
        onUpdate={sirketGuncelle}
        onToggle={sirketToggleAktif}
      />
    </>
  )
}
