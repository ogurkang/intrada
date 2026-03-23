import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'

/** Tanımlar: kullanıcı rolü salt okunur; yazma yalnızca admin / profilsiz tam erişim. */
export async function requireTanimlarYazma(): Promise<{ ok: true } | { ok: false; hata: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, hata: 'Oturum gerekli.' }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { ok: false, hata: 'Bu işlem için düzenleme yetkisi yok (tanımlar salt okunur).' }
  return { ok: true }
}
