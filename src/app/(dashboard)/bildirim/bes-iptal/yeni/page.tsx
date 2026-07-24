import { createClient } from '@/lib/supabase/server'
import BesIptalFormClient from '@/components/bildirim/BesIptalFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getBildirimFormPersonel,
  listBildirimFormPersonel,
  type BildirimFormPersonel,
} from '@/lib/bildirim-form-personel'
import { besIptalEkle } from '../../calisma-belgesi/actions'

export default async function BesIptalYeniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (access.mode === 'kullanici') {
    const sicil = access.sicilNo.trim()
    const kendi = await getBildirimFormPersonel(supabase, sicil)
    const personeller: BildirimFormPersonel[] = kendi ? [kendi] : []
    return (
      <BesIptalFormClient personeller={personeller} sabitSicil={sicil} onKaydet={besIptalEkle} />
    )
  }

  const personeller = await listBildirimFormPersonel(supabase)
  return <BesIptalFormClient personeller={personeller} onKaydet={besIptalEkle} />
}
