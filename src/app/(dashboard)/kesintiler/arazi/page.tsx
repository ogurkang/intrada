import { createClient } from '@/lib/supabase/server'
import AraziDonemClient from '@/components/kesintiler/AraziDonemClient'
import { araziDonemEkle, araziDonemGuncelle, araziDonemKapat, araziDonemAc } from './actions'
import type { Tables } from '@/types/database'
import { getAppAccess } from '@/lib/app-access'

export default async function AraziPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const saltOkunur = access.mode === 'kullanici'

  const [{ data: donemRaw }, { data: kayitSayiRaw }] = await Promise.all([
    supabase.from('arazi_donem').select('*').order('id', { ascending: false }),
    supabase.from('arazi_kayit').select('donem_id'),
  ])

  const sayiMap: Record<number, number> = {}
  ;(kayitSayiRaw ?? []).forEach(k => { sayiMap[k.donem_id] = (sayiMap[k.donem_id] ?? 0) + 1 })

  const donemler = (donemRaw ?? []).map(d => ({
    ...(d as Tables<'arazi_donem'>),
    kayit_sayisi: sayiMap[d.id] ?? 0,
  }))

  return (
    <AraziDonemClient
      donemler={donemler}
      onEkle={araziDonemEkle}
      onGuncelle={araziDonemGuncelle}
      onKapat={araziDonemKapat}
      onAc={araziDonemAc}
      saltOkunur={saltOkunur}
    />
  )
}
