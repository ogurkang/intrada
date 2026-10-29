import type { SupabaseClient } from '@supabase/supabase-js'
import { getAppAccess, isAdminLike, type AppAccess } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'

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

/** Görev müdürlüğü strateji geliştirme olan personel, maliyet için müdürlük seçer. */
export function stratejiGelistirmeMudurluguMu(ad: string): boolean {
  const n = ppNorm(ad)
  return n.includes('strateji') && n.includes('gelistirme')
}

export async function ppMaliyetSeciciMi(
  supabase: SupabaseClient,
  access: AppAccess,
): Promise<boolean> {
  if (isAdminLike(access)) return true
  if (access.mode !== 'kullanici') return false
  const { mudurlukler } = await getKullaniciGorevMudurlukleri(supabase, access.sicilNo)
  return mudurlukler.some(stratejiGelistirmeMudurluguMi)
}

export async function ppOturum(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'blocked') return null
  return { user, access }
}
