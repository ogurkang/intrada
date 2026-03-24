'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AppAccess } from '@/lib/app-access'
import { isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'

interface Props {
  access: AppAccess
  children: React.ReactNode
  /** Terfi menü href’i (PermissionGate ile Sidebar aynı olmalı) */
  terfiMenuHref?: string
}

export default function PermissionGate({ access, children, terfiMenuHref = '/terfi' }: Props) {
  const pathname = usePathname() ?? '/'

  if (isAdminLike(access)) {
    return <>{children}</>
  }

  if (access.mode !== 'kullanici') {
    return <>{children}</>
  }

  const { sicilNo, menuIzinleri } = access

  if (kullaniciPathAllowed(pathname, sicilNo, menuIzinleri, terfiMenuHref)) {
    return <>{children}</>
  }

  return (
    <div className="max-w-lg mx-auto mt-16 rounded-xl border border-amber-300 bg-amber-50 px-6 py-8 text-center">
      <p className="text-lg font-bold text-amber-950">Sorumluluk Sınırı!</p>
      <p className="mt-2 text-sm text-amber-900/90">
        Bu ekran sorumluluğunuz dışındaki işlemleri barındırmaktadır.
      </p>
      <p className="mt-5">
        <Link href="/" className="text-sm font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-800">
          Anasayfa
        </Link>
      </p>
    </div>
  )
}
