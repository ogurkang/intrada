import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import KurtarmaSifreForm from './KurtarmaSifreForm'

export default async function SifreSifirlaYenilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login?hata=kurtarma_oturum')
  }

  const { data: profil } = await supabase
    .from('app_profiles')
    .select('sicil_no, kullanici_adi')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <KurtarmaSifreForm
      email={user.email}
      sicilNo={profil?.sicil_no?.trim() || '—'}
      baslangicKullaniciAdi={profil?.kullanici_adi?.trim() ?? ''}
    />
  )
}
