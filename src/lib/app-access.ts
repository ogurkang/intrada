import type { SupabaseClient } from '@supabase/supabase-js'

/** Profil yok: eski davranış (tam erişim). admin: süper. kullanici: sadece kendi sicil + salt okunur kuralları. */
export type AppAccess =
  | { mode: 'full' }
  | { mode: 'admin' }
  | { mode: 'kullanici'; sicilNo: string; menuIzinleri: Record<string, boolean> }
  | { mode: 'blocked'; sicilNo: string }

export async function getAppAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppAccess> {
  const { data, error } = await supabase
    .from('app_profiles')
    .select('sicil_no, rol, menu_izinleri, hesap_aktif')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return { mode: 'full' }

  const menuIzinleri =
    data.menu_izinleri && typeof data.menu_izinleri === 'object'
      ? (data.menu_izinleri as Record<string, boolean>)
      : {}

  const rolNorm = String(data.rol ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
  const hesapAktif = data.hesap_aktif !== false
  if (!hesapAktif) {
    return {
      mode: 'blocked',
      sicilNo: data.sicil_no,
    }
  }
  if (rolNorm === 'admin' || rolNorm === 'yönetici' || rolNorm === 'yonetici' || rolNorm === 'ik_admin') {
    return { mode: 'admin' }
  }

  return {
    mode: 'kullanici',
    sicilNo: data.sicil_no,
    menuIzinleri,
  }
}

export function isAdminLike(a: AppAccess): boolean {
  return a.mode === 'admin' || a.mode === 'full'
}

/** @deprecated PermissionGate artık «Sorumluluk Sınırı» metnini kullanır; eski metin referansı için */
export const UYARI_METNI =
  'Bu ekranı görme yetkiniz yok veya henüz tanımlanmamış.'

/** @see `@/lib/menu-yetki` — modül bazlı menü + path */
export { kullaniciPathAllowed } from '@/lib/menu-yetki'
