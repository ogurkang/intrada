'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  ilkKurulumTamam: boolean
  children: React.ReactNode
}

/** İlk kurulum bitmeden uygulama sayfalarına gitmeyi engeller. */
export default function IlkKurulumGuard({ ilkKurulumTamam, children }: Props) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const ilkPath = '/hesap/ilk-kurulum'

  useEffect(() => {
    if (ilkKurulumTamam) return
    if (pathname === ilkPath || pathname.startsWith(ilkPath + '/')) return
    router.replace(ilkPath)
  }, [ilkKurulumTamam, pathname, router])

  if (!ilkKurulumTamam && pathname !== ilkPath && !pathname.startsWith(ilkPath + '/')) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600 text-sm">
        Hesap kurulumuna yönlendiriliyor…
      </div>
    )
  }

  return <>{children}</>
}
