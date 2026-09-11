'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import PermissionGate from '@/components/auth/PermissionGate'
import IntradaAsistanWidget from '@/components/asistan/IntradaAsistanWidget'
import HayaletProfilBanner from '@/components/layout/HayaletProfilBanner'
import TarayiciGeriIleriKilidi from '@/components/layout/TarayiciGeriIleriKilidi'
import type { AppAccess } from '@/lib/app-access'
import type { HayaletProfilDurum } from '@/lib/hayalet-profil'

interface DashboardShellProps {
  children: React.ReactNode
  userEmail?: string
  /** Kullanıcı rolü üst şerit karşılaması (calisan.ad_soyad). */
  kullaniciKarsilamaAd?: string | null
  /** Sunucudan gelir; opak terfi yolu (ör. /abc123). */
  terfiMenuHref?: string
  access: AppAccess
  /** Aktif hayalet profil oturumu */
  hayaletDurum?: HayaletProfilDurum | null
  /** Aktif deploy/build kimliği (debug amaçlı). */
  buildMarker?: string
  denetimAgac?: import('@/lib/denetim-menu').DenetimSidebarDonem[]
  kysAgac?: import('@/lib/kys-menu').KysSidebarMenu[]
  tasinirGorevlendirmeMenuAcik?: boolean
  thHizmetYiliMenuAcik?: boolean
  /** Amir/hayalet için güncel dönem URL’si; admin için dönem listesi. */
  performansDegerlendirmeHref?: string
}

export default function DashboardShell({
  children,
  userEmail,
  kullaniciKarsilamaAd,
  terfiMenuHref = '/terfi',
  access,
  hayaletDurum,
  buildMarker,
  denetimAgac,
  kysAgac,
  tasinirGorevlendirmeMenuAcik = false,
  thHizmetYiliMenuAcik = false,
  performansDegerlendirmeHref = '/performans/degerlendirme',
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <TarayiciGeriIleriKilidi />
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
          w-64 h-full min-h-0 bg-slate-900 text-slate-100 flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          onNavigate={() => setSidebarOpen(false)}
          terfiMenuHref={terfiMenuHref}
          access={access}
          hayaletDurum={hayaletDurum}
          denetimAgac={denetimAgac}
          kysAgac={kysAgac}
          tasinirGorevlendirmeMenuAcik={tasinirGorevlendirmeMenuAcik}
          thHizmetYiliMenuAcik={thHizmetYiliMenuAcik}
          performansDegerlendirmeHref={performansDegerlendirmeHref}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className="shrink-0">
        <Header
          userEmail={userEmail}
          kullaniciKarsilamaAd={hayaletDurum?.aktif ? hayaletDurum.hedefAdSoyad : kullaniciKarsilamaAd}
          onMenuClick={() => setSidebarOpen((o) => !o)}
        />
        </div>
        <main className="flex-1 min-h-0 p-6 overflow-auto">
          {hayaletDurum?.aktif ? (
            <HayaletProfilBanner hedefAdSoyad={hayaletDurum.hedefAdSoyad} hedefSicil={hayaletDurum.hedefSicil} />
          ) : null}
          <PermissionGate
            access={access}
            terfiMenuHref={terfiMenuHref}
            hayaletDurum={hayaletDurum}
            performansDegerlendirmeHref={performansDegerlendirmeHref}
          >
            {children}
          </PermissionGate>
        </main>
        <div className="shrink-0 px-6 pb-3 text-[11px] text-slate-400 text-right">
          build: {buildMarker ?? 'unknown'}
        </div>
      </div>
      {!hayaletDurum?.aktif && access.mode !== 'dis_denetci' ? <IntradaAsistanWidget access={access} /> : null}
    </div>
  )
}
