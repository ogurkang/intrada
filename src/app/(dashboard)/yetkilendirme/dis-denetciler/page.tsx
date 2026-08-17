import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import DisDenetcilerClient from './DisDenetcilerClient'

export const dynamic = 'force-dynamic'

export default async function DisDenetcilerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : null
  if (!access || !isAdminLike(access)) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">Bu ekran yalnızca yöneticiler içindir.</div>
  }

  const { data } = await supabase
    .from('app_profiles')
    .select('id, kullanici_adi, ad_soyad, kurum_adi, e_posta, hesap_aktif, updated_at')
    .eq('profil_turu', 'dis_denetci')
    .order('ad_soyad')

  return <DisDenetcilerClient denetciler={data ?? []} />
}
