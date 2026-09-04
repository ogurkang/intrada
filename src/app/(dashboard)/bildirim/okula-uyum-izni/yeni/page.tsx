import { createClient } from '@/lib/supabase/server'
import OkulaUyumIzniFormClient from '@/components/bildirim/OkulaUyumIzniFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getBildirimFormTumPersonel,
  listBildirimFormTumPersonel,
  type BildirimFormPersonel,
} from '@/lib/bildirim-form-personel'
import { okulaUyumIzniEkle } from '../actions'

export default async function OkulaUyumIzniYeniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (access.mode === 'kullanici') {
    const sicil = access.sicilNo.trim()
    const kendi = await getBildirimFormTumPersonel(supabase, sicil)
    const personeller: BildirimFormPersonel[] = kendi ? [kendi] : []
    return (
      <OkulaUyumIzniFormClient
        personeller={personeller}
        sabitSicil={sicil}
        onKaydet={okulaUyumIzniEkle}
      />
    )
  }

  const personeller = await listBildirimFormTumPersonel(supabase)
  return <OkulaUyumIzniFormClient personeller={personeller} onKaydet={okulaUyumIzniEkle} />
}
