import { createClient } from '@/lib/supabase/server'
import MalYeniClient from '@/components/bildirim/MalYeniClient'
import { listMemurPersonelForMal } from '@/lib/bildirim-personel'
import { malBildirimEkle } from '../actions'
import { getAppAccess } from '@/lib/app-access'

export default async function MalYeniPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const kullaniciKendiSicil = access.mode === 'kullanici' ? access.sicilNo.trim() : undefined

  const memurlar = await listMemurPersonelForMal(supabase)

  return (
    <MalYeniClient
      memurlar={memurlar}
      onKaydet={malBildirimEkle}
      kullaniciKendiSicil={kullaniciKendiSicil}
    />
  )
}
