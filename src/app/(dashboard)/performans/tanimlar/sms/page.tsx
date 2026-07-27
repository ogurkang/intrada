import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import PerformansSmsClient from '@/components/performans/PerformansSmsClient'

export default async function PerformansSmsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : null
  const isAdmin = access ? isAdminLike(access) : false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sms } = await (supabase as any)
    .from('performans_sms_ayar')
    .select('metin')
    .eq('id', 1)
    .maybeSingle()

  return (
    <PerformansSmsClient
      smsMetin={
        sms?.metin ??
        'Sayın {ad_soyad}, {yil} yılı performans değerlendirmelerinde 1. amir turu tamamlanmıştır. İncelemenizi bekleyen kayıtlar bulunmaktadır.'
      }
      isAdmin={isAdmin}
    />
  )
}
