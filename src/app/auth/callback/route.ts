import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

function safeInternalPath(next: string | null): string {
  const d = (next ?? '/sifre-sifirla/yenile').trim()
  if (!d.startsWith('/') || d.startsWith('//')) return '/sifre-sifirla/yenile'
  return d
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const next = safeInternalPath(url.searchParams.get('next'))
  const redirectUrl = new URL(next, url.origin).toString()

  if (!code) {
    return NextResponse.redirect(new URL('/login?hata=kurtarma_baglanti', url.origin))
  }

  let response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?hata=kurtarma_baglanti', url.origin))
  }

  return response
}
