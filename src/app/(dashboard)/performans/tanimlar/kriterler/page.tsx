import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import PerformansKriterlerClient from '@/components/performans/PerformansKriterlerClient'

export default async function PerformansKriterlerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : null
  const isAdmin = access ? isAdminLike(access) : false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kriterler } = await (supabase as any)
    .from('performans_kriter')
    .select('id, kod, baslik, aciklama, grup, aktif')
    .order('kod')

  return <PerformansKriterlerClient kriterler={kriterler ?? []} isAdmin={isAdmin} />
}
