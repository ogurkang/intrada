import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IlkKurulumForm from './IlkKurulumForm'

export const dynamic = 'force-dynamic'

export default async function IlkKurulumPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profil } = await supabase
    .from('app_profiles')
    .select('ilk_giris_tamam, sicil_no')
    .eq('id', user.id)
    .maybeSingle()

  if (profil?.ilk_giris_tamam) redirect('/')
  if (!profil?.sicil_no) redirect('/')

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-slate-800 mb-2">Hesap kurulumu</h1>
      <p className="text-sm text-slate-600 mb-6">
        Kurum e-postanız ve ilk şifrenizle giriş yaptınız. Kalıcı kullanıcı adınızı ve yeni şifrenizi aşağıda
        belirleyin.
      </p>
      <IlkKurulumForm sicilNo={profil.sicil_no} email={user.email ?? ''} />
    </div>
  )
}
