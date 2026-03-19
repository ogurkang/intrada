import { createClient } from '@/lib/supabase/server'
import IzinTuruClient from '@/components/tanimlar/IzinTuruClient'
import { izinTuruEkle, izinTuruGuncelle, izinTuruToggleDurum } from './actions'
import type { Tables } from '@/types/database'

type IzinTuru = Tables<'tanim_izin_tur'>

export default async function IzinTuruPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tanim_izin_tur')
    .select('*')
    .order('sira_no', { nullsFirst: false })
    .order('tur_adi')
  return (
    <>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">Veri yüklenirken hata: {error.message}</div>}
      <IzinTuruClient
        data={(data ?? []) as IzinTuru[]}
        onAdd={izinTuruEkle}
        onUpdate={izinTuruGuncelle}
        onToggle={izinTuruToggleDurum}
      />
    </>
  )
}
