'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Chrome / WebView geri-ileri tuşları sayfa değiştirmez.
 * Gezinme menü ve sayfa içi düğmelerle yapılır.
 */
export default function TarayiciGeriIleriKilidi() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hedef = window.location.href
    window.history.scrollRestoration = 'manual'
    window.history.pushState({ intradaLock: true }, '', hedef)

    function kilitle() {
      window.history.pushState({ intradaLock: true }, '', hedef)
    }

    window.addEventListener('popstate', kilitle)
    return () => window.removeEventListener('popstate', kilitle)
  }, [pathname])

  return null
}
