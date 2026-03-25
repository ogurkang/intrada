import type { SupabaseClient } from '@supabase/supabase-js'

const LIST_PER_PAGE = 1000
const LIST_MAX_PAGES = 20

/** E-posta ile Auth kullanıcı id (listUsers sayfalama; yedek yol). */
export async function authUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const e = email.trim().toLowerCase()
  for (let page = 1; page <= LIST_MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: LIST_PER_PAGE })
    if (error) return null
    const u = data.users.find(x => (x.email ?? '').toLowerCase() === e)
    if (u) return u.id
    if (!data.users.length) break
  }
  return null
}

/**
 * Şifre sıfırlama: doğrulanan sicile bağlı giriş hesabı (app_profiles → auth.users).
 * Profil yoksa eski kurulumlar için e-posta ile Auth listesinde aranır.
 */
export async function authUserIdSifreSifirlaIcin(
  admin: SupabaseClient,
  sicilNoDb: string,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('app_profiles')
    .select('id')
    .eq('sicil_no', sicilNoDb)
    .maybeSingle()

  if (!error && data?.id) return data.id

  return authUserIdByEmail(admin, email)
}
