'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { smsLogDurumSenkronize, smsLogIptalEt, smsPlanliLoglariSenkronize } from '@/lib/sms-log-durum'

export async function smsLogDurumSenkronizeAction(logId: number): Promise<{
  ok?: boolean
  durum?: string
  hata?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { hata: 'Yetkiniz yok.' }

  const sonuc = await smsLogDurumSenkronize(supabase, logId, { manuel: true })
  revalidatePath('/iletisim-yonetimi/gecmis-gonderimler')
  if (sonuc.hata && !sonuc.guncellendi) return { hata: sonuc.hata }
  return { ok: true, durum: sonuc.durum }
}

export async function smsLogIptalAction(logId: number): Promise<{ ok?: boolean; hata?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { hata: 'Yetkiniz yok.' }

  const sonuc = await smsLogIptalEt(supabase, logId, user.email ?? 'admin')
  revalidatePath('/iletisim-yonetimi/gecmis-gonderimler')
  if (sonuc.hata) return { hata: sonuc.hata }
  return { ok: true }
}

export async function smsPlanliLoglariSenkronizeAction(): Promise<{ ok?: boolean; guncellenen?: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}

  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return {}

  const guncellenen = await smsPlanliLoglariSenkronize(supabase)
  revalidatePath('/iletisim-yonetimi/gecmis-gonderimler')
  return { ok: true, guncellenen }
}
