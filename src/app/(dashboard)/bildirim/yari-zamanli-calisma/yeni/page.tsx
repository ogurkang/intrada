import { createClient } from '@/lib/supabase/server'
import YariZamanliCalismaFormClient from '@/components/bildirim/YariZamanliCalismaFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getBildirimFormPersonel,
  listBildirimFormPersonel,
  type BildirimFormPersonel,
} from '@/lib/bildirim-form-personel'
import { yariZamanliCalismaEkle } from '../actions'

export default async function YariZamanliCalismaYeniPage() {
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
      <YariZamanliCalismaFormClient
        personeller={personeller}
        sabitSicil={sicil}
        onKaydet={yariZamanliCalismaEkle}
      />
    )
  }

  const personeller = await listBildirimFormPersonel(supabase)
  return <YariZamanliCalismaFormClient personeller={personeller} onKaydet={yariZamanliCalismaEkle} />
}
