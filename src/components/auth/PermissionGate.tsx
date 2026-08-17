'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AppAccess } from '@/lib/app-access'
import { isAdminLike } from '@/lib/app-access'
import { disDenetciPathAllowed, kullaniciPathAllowed } from '@/lib/menu-yetki'
import { hayaletPathAllowed, type HayaletProfilDurum } from '@/lib/hayalet-profil'

interface Props {
  access: AppAccess
  children: React.ReactNode
  /** Terfi menü href’i (PermissionGate ile Sidebar aynı olmalı) */
  terfiMenuHref?: string
  hayaletDurum?: HayaletProfilDurum | null
}

export default function PermissionGate({ access, children, terfiMenuHref = '/terfi', hayaletDurum }: Props) {
  const pathname = usePathname() ?? '/'

  if (hayaletDurum?.aktif) {
    if (hayaletPathAllowed(pathname)) return <>{children}</>
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-xl border border-violet-300 bg-violet-50 px-6 py-8 text-center">
        <p className="text-lg font-bold text-violet-950">Hayalet profil modu</p>
        <p className="mt-2 text-sm text-violet-900/90">
          Bu ekrana hayalet modda erişilemez. Yalnızca performans yönetimi kullanılabilir.
        </p>
        <p className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link
            href="/performans/degerlendirme"
            className="text-sm font-semibold text-violet-950 underline underline-offset-2 hover:text-violet-800"
          >
            Performans değerlendirme
          </Link>
          <Link
            href="/performans/raporlama"
            className="text-sm font-semibold text-violet-950 underline underline-offset-2 hover:text-violet-800"
          >
            Raporlama
          </Link>
        </p>
      </div>
    )
  }

  if (isAdminLike(access)) {
    return <>{children}</>
  }

  if (access.mode === 'blocked') {
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-xl border border-red-300 bg-red-50 px-6 py-8 text-center">
        <p className="text-lg font-bold text-red-900">Erişim kapatıldı</p>
        <p className="mt-2 text-sm text-red-800/90">Bu kullanıcı için sistem erişimi yönetici tarafından geçici olarak kapatılmıştır.</p>
      </div>
    )
  }

  if (access.mode === 'dis_denetci') {
    if (disDenetciPathAllowed(pathname)) return <>{children}</>
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-xl border border-blue-300 bg-blue-50 px-6 py-8 text-center">
        <p className="text-lg font-bold text-blue-950">Dış denetçi erişimi</p>
        <p className="mt-2 text-sm text-blue-900/90">
          Bu profil yalnızca Denetim Yönetimi belgelerini görüntüleyebilir.
        </p>
        <p className="mt-5">
          <Link href="/denetim" className="text-sm font-semibold text-blue-950 underline underline-offset-2">
            Denetim Yönetimi
          </Link>
        </p>
      </div>
    )
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
