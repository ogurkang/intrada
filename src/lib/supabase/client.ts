import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Tarayıcı (Client Component) tarafında kullanılacak Supabase istemcisi.
 * Yalnızca 'use client' direktifleri olan bileşenlerden çağrılmalıdır.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
