import { createClient } from '@/lib/supabase/server'
import HarcirahTalepFormClient from '@/components/bildirim/HarcirahTalepFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getMemurBildirimPersonel,
  listMemurBildirimPersonel,
  type MemurBildirimPersonel,
} from '@/lib/bildirim-memur-personel'
import { harcirahTalepEkle } from '../actions'

export default async function HarcirahTalepYeniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (access.mode === 'kullanici') {
    const sicil = access.sicilNo.trim()
    const kendi = await getMemurBildirimPersonel(supabase, sicil)
    const personeller: MemurBildirimPersonel[] = kendi ? [kendi] : []
    return (
      <HarcirahTalepFormClient
        personeller={personeller}
        sabitSicil={sicil}
        onKaydet={harcirahTalepEkle}
      />
    )
  }

  const personeller = await listMemurBildirimPersonel(supabase)
  return <HarcirahTalepFormClient personeller={personeller} onKaydet={harcirahTalepEkle} />
}
