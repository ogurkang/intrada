import type { SupabaseClient } from '@supabase/supabase-js'
import { getAppAccess, isAdminLike, type AppAccess } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'

/** Seçilen müdürlük bu değerdeyse satır, ilerideki müdürlük süzgecinde herkese görünür. */
export const PP_TUM_MUDURLUKLER = 'Tüm Müdürlükler'

export function ppTumMudurluklerMi(ad: string | null | undefined): boolean {
  return ppNorm(ad) === ppNorm(PP_TUM_MUDURLUKLER)
}

/** Yönetici her satırı görür. Tüm Müdürlükler seçilen satır da herkese açıktır. */
export function ppSecilenMudurlukGorunur(secilen: string, gorevMudurlukleri: string[], yonetici: boolean): boolean {
  if (yonetici || ppTumMudurluklerMi(secilen)) return true
  const hedef = ppNorm(secilen)
  return gorevMudurlukleri.some(m => ppNorm(m) === hedef)
}

export function ppNorm(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

/** Görev müdürlüğü strateji geliştirme olan personel, yönetici gibi tüm müdürlüklerde işlem yapar. */
export function stratejiGelistirmeMudurluguMu(ad: string): boolean {
  const n = ppNorm(ad)
  return n.includes('strateji') && n.includes('gelistirme')
}

/** Yönetici veya strateji geliştirme görev müdürlüğü. */
export async function stratejikYoneticiMi(
  supabase: SupabaseClient,
  access: AppAccess,
): Promise<boolean> {
  if (isAdminLike(access)) return true
  if (access.mode !== 'kullanici') return false
  const { mudurlukler } = await getKullaniciGorevMudurlukleri(supabase, access.sicilNo)
  return mudurlukler.some(stratejiGelistirmeMudurluguMu)
}

export async function ppMaliyetSeciciMi(
  supabase: SupabaseClient,
  access: AppAccess,
): Promise<boolean> {
  return stratejikYoneticiMi(supabase, access)
}

export async function ppOturum(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'blocked') return null
  return { user, access }
}
