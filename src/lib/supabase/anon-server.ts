import { createClient } from '@supabase/supabase-js'

/**
 * Sunucu aksiyonlarında oturum çerezi olmadan yalnızca anon anahtar ile çağrı (ör. resetPasswordForEmail, RPC).
 */
export function createAnonServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY gerekli.')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
