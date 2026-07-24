import { createClient } from '@/lib/supabase/server'
import CalismaBelgesiFormClient from '@/components/bildirim/CalismaBelgesiFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getBildirimFormPersonel,
  listBildirimFormPersonel,
  type BildirimFormPersonel,
} from '@/lib/bildirim-form-personel'
import { calismaBelgesiEkle } from '../actions'

export default async function CalismaBelgesiYeniPage() {
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
      <CalismaBelgesiFormClient
        personeller={personeller}
        sabitSicil={sicil}
        onKaydet={calismaBelgesiEkle}
      />
    )
  }

  const personeller = await listBildirimFormPersonel(supabase)
  return <CalismaBelgesiFormClient personeller={personeller} onKaydet={calismaBelgesiEkle} />
}
