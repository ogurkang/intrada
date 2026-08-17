import SifreDegistirForm from './SifreDegistirForm'
import { createClient } from '@/lib/supabase/server'

export default async function HesapSifrePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profil } = user
    ? await supabase.from('app_profiles').select('profil_turu').eq('id', user.id).maybeSingle()
    : { data: null }
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Hesap</h1>
      <SifreDegistirForm disDenetci={profil?.profil_turu === 'dis_denetci'} />
    </div>
  )
}
