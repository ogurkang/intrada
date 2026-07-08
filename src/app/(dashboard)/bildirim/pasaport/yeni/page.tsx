import { createClient } from '@/lib/supabase/server'
import PasaportFormClient from '@/components/bildirim/PasaportFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getPasaportPersonel,
  listPasaportPersonel,
  type PasaportPersonel,
} from '@/lib/pasaport-personel'
import { pasaportEkle } from '../actions'

export default async function PasaportYeniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (access.mode === 'kullanici') {
    const sicil = access.sicilNo.trim()
    const kendi = await getPasaportPersonel(supabase, sicil)
    const personeller: PasaportPersonel[] = kendi ? [kendi] : []
    return (
      <PasaportFormClient
        mode="create"
        personeller={personeller}
        sabitSicil={sicil}
        onKaydet={pasaportEkle}
        ayrilanIzinli={false}
      />
    )
  }

  const personeller = await listPasaportPersonel(supabase)
  return <PasaportFormClient mode="create" personeller={personeller} onKaydet={pasaportEkle} ayrilanIzinli />
}
