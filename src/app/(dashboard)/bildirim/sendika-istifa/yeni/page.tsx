import { createClient } from '@/lib/supabase/server'
import SendikaIstifaFormClient from '@/components/bildirim/SendikaIstifaFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getBildirimFormPersonel,
  listBildirimFormPersonel,
  type BildirimFormPersonel,
} from '@/lib/bildirim-form-personel'
import { sendikaIstifaEkle } from '../../calisma-belgesi/actions'

export default async function SendikaIstifaYeniPage() {
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
      <SendikaIstifaFormClient
        personeller={personeller}
        sabitSicil={sicil}
        onKaydet={sendikaIstifaEkle}
      />
    )
  }

  const personeller = await listBildirimFormPersonel(supabase)
  return <SendikaIstifaFormClient personeller={personeller} onKaydet={sendikaIstifaEkle} />
}
