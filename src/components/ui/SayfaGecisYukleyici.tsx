'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { IntradaLoader } from '@/components/ui/IntradaLoader'

function dahiliLinkMi(a: HTMLAnchorElement): boolean {
  if (a.target && a.target !== '_self') return false
  if (a.hasAttribute('download')) return false
  const href = a.getAttribute('href')
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false
  try {
    const url = new URL(a.href, window.location.href)
    if (url.origin !== window.location.origin) return false
    if (url.pathname === window.location.pathname && url.search === window.location.search) return false
    return true
  } catch {
    return false
  }
}

function SayfaGecisYukleyiciIc() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [goster, setGoster] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setGoster(false)
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [pathname, searchParams])

  useEffect(() => {
    function baslat() {
      setGoster(true)
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setGoster(false), 12000)
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const a = el?.closest('a')
      if (!a || !dahiliLinkMi(a)) return
      baslat()
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [])

  if (!goster) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-white/75 backdrop-blur-[1px]"
      role="alert"
      aria-busy="true"
      aria-label="Sayfa yükleniyor"
    >
      <IntradaLoader label="Sayfa yükleniyor" />
    </div>
  )
}

export default function SayfaGecisYukleyici() {
  return (
    <Suspense fallback={null}>
      <SayfaGecisYukleyiciIc />
    </Suspense>
  )
}
