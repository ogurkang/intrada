import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { menuModulAcik } from '@/lib/menu-yetki'

/** Yerel Bilgi işlem ekranları (ör. araç girişi): oturum + modül veya yönetici. */
export async function requireYerelBilgiIslem(): Promise<
  | { ok: true; userId: string; isAdmin: boolean; sicilNo: string | null }
  | { ok: false; hata: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  if (isAdminLike(access)) {
    return { ok: true, userId: user.id, isAdmin: true, sicilNo: null }
  }
  if (access.mode !== 'kullanici') {
    return { ok: false, hata: 'Bu işlem için yetkiniz yok.' }
  }
  if (!menuModulAcik('yerelBilgi', access.menuIzinleri)) {
    return { ok: false, hata: 'Yerel Bilgi modülü için yetkiniz yok.' }
  }
  return {
    ok: true,
    userId: user.id,
    isAdmin: false,
    sicilNo: access.sicilNo.trim() || null,
  }
}
