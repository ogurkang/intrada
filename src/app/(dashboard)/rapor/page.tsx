import { getAppAccess } from '@/lib/app-access'
import { createClient } from '@/lib/supabase/server'
import { yukleRaporYonetimVerisi } from '@/lib/rapor-yonetim-load'
import RaporYonetimClient from '@/components/rapor/RaporYonetimClient'

export default async function RaporYonetimiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  const { raporlar, auditLoglarByKod } = await yukleRaporYonetimVerisi(supabase)

  return (
    <RaporYonetimClient
      raporlar={raporlar}
      auditLoglarByKod={auditLoglarByKod}
      kullaniciModu={access.mode === 'kullanici'}
    />
  )
}
