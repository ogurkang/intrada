import { createClient } from '@/lib/supabase/server'
import UnvanClient from '@/components/tanimlar/UnvanClient'
import { unvanEkle, unvanGuncelle, unvanToggleAktif } from './actions'
import type { Tables } from '@/types/database'

type Unvan = Tables<'tanim_unvan'>

export default async function UnvanPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_unvan')
    .select('*')
    .order('sira_no', { nullsFirst: false })
    .order('unvan_adi')

  const kayitlar: Unvan[] = data ?? []

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <UnvanClient
        data={kayitlar}
        onAdd={unvanEkle}
        onUpdate={unvanGuncelle}
        onToggle={unvanToggleAktif}
      />
    </>
  )
}
