import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aşağıdaki yollar HARİÇ tüm istekleri yakalar:
     * - _next/static (statik dosyalar)
     * - _next/image  (resim optimizasyon endpoint'i)
     * - favicon.ico  (favicon)
     * - Uzantılı dosyalar (svg, png, jpg, …)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
