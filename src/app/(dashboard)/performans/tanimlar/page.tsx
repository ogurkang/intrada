import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import PerformansTanimlarClient from '@/components/performans/PerformansTanimlarClient'

export default async function PerformansTanimlarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : null
  const isAdmin = access ? isAdminLike(access) : false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: kriterler } = await db
    .from('performans_kriter')
    .select('id, kod, baslik, aciklama, grup, aktif')
    .order('kod')
  const { data: sms } = await db
    .from('performans_sms_ayar')
    .select('metin')
    .eq('id', 1)
    .maybeSingle()

  return (
    <PerformansTanimlarClient
      kriterler={kriterler ?? []}
      smsMetin={
        sms?.metin ??
        'Sayın {ad_soyad}, {yil} yılı performans değerlendirmelerinde 1. amir turu tamamlanmıştır. İncelemenizi bekleyen kayıtlar bulunmaktadır.'
      }
      isAdmin={isAdmin}
    />
  )
}
