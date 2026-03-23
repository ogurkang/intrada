'use client'

import { usePathname } from 'next/navigation'
import type { AppAccess } from '@/lib/app-access'
import { isAdminLike, UYARI_METNI } from '@/lib/app-access'
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
    <div className="max-w-lg mx-auto mt-16 rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
      <p className="text-amber-900 font-medium">{UYARI_METNI}</p>
      <p className="mt-2 text-sm text-amber-800/90">
        Yalnızca kendi personel özetinize erişebilirsiniz; diğer modüller yönetici onayı gerektirir.
      </p>
    </div>
  )
}
