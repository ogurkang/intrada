import type { SupabaseClient } from '@supabase/supabase-js'

/** GoTrue bazı sürümlerde yüksek per_page reddedilebiliyor veya ağ hatası throw edilebiliyor. */
const LIST_PER_PAGE = 200
const LIST_MAX_PAGES = 50

/** E-posta ile Auth kullanıcı id (listUsers sayfalama; yedek yol). */
export async function authUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const e = email.trim().toLowerCase()
  for (let page = 1; page <= LIST_MAX_PAGES; page++) {
    try {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: LIST_PER_PAGE })
      if (error) return null
      const u = data.users.find(x => (x.email ?? '').toLowerCase() === e)
      if (u) return u.id
      if (!data.users.length) break
    } catch {
      return null
    }
  }
  return null
}

/**
 * Toplu işlemler için e-posta → Auth kullanıcı id eşlemesi.
 * `authUserIdByEmail` her çağrıda tüm listeyi taradığından, çok sicilde tek tarama yapılır.
 */
export async function authUserIdMapByEmails(
  admin: SupabaseClient,
  emails: string[],
): Promise<Map<string, string>> {
  const aranan = new Set(emails.map(e => e.trim().toLowerCase()).filter(Boolean))
  const map = new Map<string, string>()
  if (!aranan.size) return map

  for (let page = 1; page <= LIST_MAX_PAGES; page++) {
    try {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: LIST_PER_PAGE })
      if (error) break
      for (const u of data.users) {
        const e = (u.email ?? '').toLowerCase()
        if (e && aranan.has(e) && !map.has(e)) map.set(e, u.id)
      }
      if (data.users.length < LIST_PER_PAGE) break
      if (map.size === aranan.size) break
    } catch {
      break
    }
  }
  return map
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
  try {
    const { data, error } = await admin
      .from('app_profiles')
      .select('id')
      .eq('sicil_no', sicilNoDb)
      .maybeSingle()

    if (!error && data?.id) return data.id
  } catch {
    /* ağ / parse; e-posta ile yedek */
  }

  return authUserIdByEmail(admin, email)
}
