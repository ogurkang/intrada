'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import PermissionGate from '@/components/auth/PermissionGate'
import type { AppAccess } from '@/lib/app-access'

interface DashboardShellProps {
  children: React.ReactNode
  userEmail?: string
  /** Kullanıcı rolü üst şerit karşılaması (calisan.ad_soyad). */
  kullaniciKarsilamaAd?: string | null
  /** Sunucudan gelir; opak terfi yolu (ör. /abc123). */
  terfiMenuHref?: string
  access: AppAccess
  /** Aktif deploy/build kimliği (debug amaçlı). */
  buildMarker?: string
}

export default function DashboardShell({
  children,
  userEmail,
  kullaniciKarsilamaAd,
  terfiMenuHref = '/terfi',
  access,
  buildMarker,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobil overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - mobilde drawer, masaüstünde sabit */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          onNavigate={() => setSidebarOpen(false)}
          terfiMenuHref={terfiMenuHref}
          access={access}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userEmail={userEmail}
          kullaniciKarsilamaAd={kullaniciKarsilamaAd}
          onMenuClick={() => setSidebarOpen((o) => !o)}
        />
        <main className="flex-1 p-6 overflow-auto">
          <PermissionGate access={access} terfiMenuHref={terfiMenuHref}>
            {children}
          </PermissionGate>
        </main>
        <div className="px-6 pb-3 text-[11px] text-slate-400 text-right">
          build: {buildMarker ?? 'unknown'}
        </div>
      </div>
    </div>
  )
}
