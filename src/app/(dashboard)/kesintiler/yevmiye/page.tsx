import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import YevmiyeDonemClient from '@/components/kesintiler/YevmiyeDonemClient'
import { yevmiyeDonemEkle, yevmiyeDonemGuncelle, yevmiyeDonemKapat, yevmiyeDonemAc } from './actions'
import { getAppAccess } from '@/lib/app-access'

export default async function YevmiyePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const saltOkunur = access.mode === 'kullanici'

  const { data: donemRaw } = await supabase
    .from('yevmiye_donem')
    .select('*')
    .order('id', { ascending: false })

  const { data: puantajSayiRaw } = await supabase
    .from('yevmiye_puantaj_kayit')
    .select('donem_id')

  const sayiMap: Record<number, number> = {}
  ;(puantajSayiRaw ?? []).forEach(p => { sayiMap[p.donem_id] = (sayiMap[p.donem_id] ?? 0) + 1 })

  const donemler = (donemRaw ?? []).map(d => ({ ...d as Tables<'yevmiye_donem'>, puantaj_sayisi: sayiMap[d.id] ?? 0 }))

  return (
    <YevmiyeDonemClient
      donemler={donemler}
      onEkle={yevmiyeDonemEkle}
      onGuncelle={yevmiyeDonemGuncelle}
      onKapat={yevmiyeDonemKapat}
      onAc={yevmiyeDonemAc}
      saltOkunur={saltOkunur}
    />
  )
}
