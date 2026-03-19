import { createClient } from '@/lib/supabase/server'
import IzinHakClient from '@/components/tanimlar/IzinHakClient'
import { izinHakEkle, izinHakGuncelle, izinHakToggleDurum } from './actions'
import type { Tables } from '@/types/database'

type IzinHak = Tables<'tanim_izin_hak'>

export default async function IzinHakPage() {
  const supabase = await createClient()

  const [{ data: haklar, error }, { data: statuRaw }] = await Promise.all([
    supabase.from('tanim_izin_hak').select('*').order('sira_no', { nullsFirst: false }).order('statu'),
    supabase.from('tanim_statu').select('statu_adi').eq('aktif', true).order('statu_adi'),
  ])

  const statuler = (statuRaw ?? []).map(s => s.statu_adi)

  return (
    <>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">Veri yüklenirken hata: {error.message}</div>}
      <IzinHakClient
        data={(haklar ?? []) as IzinHak[]}
        statuler={statuler}
        onAdd={izinHakEkle}
        onUpdate={izinHakGuncelle}
        onToggle={izinHakToggleDurum}
      />
    </>
  )
}
