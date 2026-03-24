import { createClient } from '@/lib/supabase/server'
import AileYeniClient from '@/components/bildirim/AileYeniClient'
import { aileKaydet } from '../actions'
import { getAppAccess } from '@/lib/app-access'

export default async function AileYeniPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const sicilSaltOkunur = access.mode === 'kullanici' ? access.sicilNo.trim() : undefined
  const { data: calisanlar } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad')
    .order('ad_soyad', { ascending: true })

  const personeller = (calisanlar ?? []).map(c => ({
    sicil_no: c.sicil_no,
    ad_soyad: c.ad_soyad ?? c.sicil_no,
  }))

  return (
    <AileYeniClient
      personeller={personeller}
      onKaydet={aileKaydet}
      sicilSaltOkunur={sicilSaltOkunur}
    />
  )
}
