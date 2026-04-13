import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'

/** Yerel Bilgi tanımları: yazma yalnızca yönetici / tam erişim (Tanımlar ile aynı mantık). */
export async function requireYerelBilgiYazma(): Promise<{ ok: true } | { ok: false; hata: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, hata: 'Oturum gerekli.' }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) {
    return { ok: false, hata: 'Bu işlem için düzenleme yetkisi yok (salt okunur).' }
  }
  return { ok: true }
}
