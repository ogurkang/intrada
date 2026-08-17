import type { SupabaseClient } from '@supabase/supabase-js'

/** Profil yok: eski davranış (tam erişim). admin: süper. kullanici: sadece kendi sicil + salt okunur kuralları. */
export type AppAccess =
  | { mode: 'full' }
  | { mode: 'admin' }
  | { mode: 'kullanici'; sicilNo: string; menuIzinleri: Record<string, boolean> }
  | { mode: 'dis_denetci'; kullaniciAdi: string; adSoyad: string; kurumAdi: string }
  | { mode: 'blocked'; sicilNo: string | null }

export async function getAppAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppAccess> {
  const { data, error } = await supabase
    .from('app_profiles')
    .select('sicil_no, rol, menu_izinleri, hesap_aktif, profil_turu, kullanici_adi, ad_soyad, kurum_adi')
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
  if (rolNorm === 'dis_denetci' || data.profil_turu === 'dis_denetci') {
    return {
      mode: 'dis_denetci',
      kullaniciAdi: data.kullanici_adi ?? '',
      adSoyad: data.ad_soyad ?? '',
      kurumAdi: data.kurum_adi ?? '',
    }
  }

  return {
    mode: 'kullanici',
    sicilNo: data.sicil_no ?? '',
    menuIzinleri,
  }
}

export function isAdminLike(a: AppAccess): boolean {
  return a.mode === 'admin' || a.mode === 'full'
}

export async function isCurrentDisDenetci(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const access = await getAppAccess(supabase, user.id)
  return access.mode === 'dis_denetci'
}

/** @deprecated PermissionGate artık «Sorumluluk Sınırı» metnini kullanır; eski metin referansı için */
export const UYARI_METNI =
  'Bu ekranı görme yetkiniz yok veya henüz tanımlanmamış.'

/** @see `@/lib/menu-yetki` — modül bazlı menü + path */
export { kullaniciPathAllowed } from '@/lib/menu-yetki'
