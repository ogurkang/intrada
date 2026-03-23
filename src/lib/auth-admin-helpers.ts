import type { SupabaseClient } from '@supabase/supabase-js'

/** E-posta ile Auth kullanıcı id (listUsers sayfalama). */
export async function authUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const e = email.trim().toLowerCase()
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const u = data.users.find(x => (x.email ?? '').toLowerCase() === e)
    if (u) return u.id
    if (!data.users.length) break
  }
  return null
}
