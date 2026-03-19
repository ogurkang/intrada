import { createClient } from '@/lib/supabase/server'
import IzinKuralClient from '@/components/tanimlar/IzinKuralClient'
import { izinKuralEkle, izinKuralGuncelle, izinKuralToggleDurum } from './actions'
import type { Tables } from '@/types/database'

type IzinKural = Tables<'tanim_izin_kural'>

export default async function IzinKuralPage() {
  const supabase = await createClient()

  const [{ data: kurallar, error }, { data: statuRaw }] = await Promise.all([
    supabase.from('tanim_izin_kural').select('*').order('sira_no', { nullsFirst: false }).order('statu'),
    supabase.from('tanim_statu').select('statu_adi').eq('aktif', true).order('statu_adi'),
  ])

  const statuler = (statuRaw ?? []).map(s => s.statu_adi)

  return (
    <>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">Veri yüklenirken hata: {error.message}</div>}
      <IzinKuralClient
        data={(kurallar ?? []) as IzinKural[]}
        statuler={statuler}
        onAdd={izinKuralEkle}
        onUpdate={izinKuralGuncelle}
        onToggle={izinKuralToggleDurum}
      />
    </>
  )
}
