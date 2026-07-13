import { createClient } from '@/lib/supabase/server'
import HizmetBirlestirmeFormClient from '@/components/bildirim/HizmetBirlestirmeFormClient'
import { getAppAccess } from '@/lib/app-access'
import {
  getHizmetBirlestirmePersonel,
  listHizmetBirlestirmePersonel,
  type HizmetBirlestirmePersonel,
} from '@/lib/hizmet-birlestirme-personel'
import { hizmetBirlestirmeEkle } from '../actions'

export default async function HizmetBirlestirmeYeniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (access.mode === 'kullanici') {
    const sicil = access.sicilNo.trim()
    const kendi = await getHizmetBirlestirmePersonel(supabase, sicil)
    const personeller: HizmetBirlestirmePersonel[] = kendi ? [kendi] : []
    return (
      <HizmetBirlestirmeFormClient
        mode="create"
        personeller={personeller}
        sabitSicil={sicil}
        onKaydet={hizmetBirlestirmeEkle}
        ayrilanIzinli={false}
      />
    )
  }

  const personeller = await listHizmetBirlestirmePersonel(supabase)
  return (
    <HizmetBirlestirmeFormClient
      mode="create"
      personeller={personeller}
      onKaydet={hizmetBirlestirmeEkle}
      ayrilanIzinli
    />
  )
}
