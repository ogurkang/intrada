import { createClient } from '@/lib/supabase/server'
import TatilClient from '@/components/tanimlar/TatilClient'
import { tatilEkle, tatilGuncelle, tatilToggleDurum } from './actions'
import type { Tables } from '@/types/database'

type Tatil = Tables<'tanim_izin_tatil'>

export default async function TatilPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_izin_tatil')
    .select('*')
    .order('tatil_baslangici', { ascending: false })
  return (
    <>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">Veri yüklenirken hata: {error.message}</div>}
      <TatilClient
        data={(data ?? []) as Tatil[]}
        onAdd={tatilEkle}
        onUpdate={tatilGuncelle}
        onToggle={tatilToggleDurum}
      />
    </>
  )
}
