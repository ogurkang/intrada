import { createClient } from '@/lib/supabase/server'
import AylikIzinFormClient from '@/components/bildirim/AylikIzinFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getBildirimFormPersonel,
  listBildirimFormPersonel,
  type BildirimFormPersonel,
} from '@/lib/bildirim-form-personel'
import { aylikIzinEkle } from '../actions'

export default async function AylikIzinYeniPage() {
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
      <AylikIzinFormClient personeller={personeller} sabitSicil={sicil} onKaydet={aylikIzinEkle} />
    )
  }

  const personeller = await listBildirimFormPersonel(supabase)
  return <AylikIzinFormClient personeller={personeller} onKaydet={aylikIzinEkle} />
}
