import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { hayaletProfilPersonelListesi } from '@/lib/hayalet-profil-personel'
import { hayaletProfilDurumCoz } from '@/lib/hayalet-profil-server'
import { hayaletProfilYetkisiVar } from '@/lib/hayalet-profil'
import HayaletProfilClient from './HayaletProfilClient'

export const dynamic = 'force-dynamic'

export default async function HayaletProfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const access = await getAppAccess(supabase, user.id)
  if (!hayaletProfilYetkisiVar(access)) notFound()

  const hayalet = await hayaletProfilDurumCoz(supabase, access)
  const personeller = await hayaletProfilPersonelListesi(supabase)

  return (
    <HayaletProfilClient
      personeller={personeller}
      aktifHayaletSicil={hayalet?.hedefSicil ?? null}
      aktifHayaletAd={hayalet?.hedefAdSoyad ?? null}
    />
  )
}
