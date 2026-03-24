'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  userEmail?: string
  onMenuClick?: () => void
  /** Kullanıcı rolü: üst şeritte "Sayın …, Hoşgeldiniz." */
  kullaniciKarsilamaAd?: string | null
}

export default function Header({ userEmail, onMenuClick, kullaniciKarsilamaAd }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="grid grid-cols-1 items-center gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6 lg:py-2.5">
        {/* Sol: menü + karşılama */}
        <div className="flex min-w-0 items-center gap-2 justify-self-start">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
              aria-label="Menüyü aç/kapat"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          {kullaniciKarsilamaAd ? (
            <p className="min-w-0 text-left text-sm leading-snug text-slate-700">
              <span className="text-slate-500">Sayın </span>
              <span className="font-semibold text-slate-900">{kullaniciKarsilamaAd}</span>
              <span className="text-slate-500">, Hoşgeldiniz.</span>
            </p>
          ) : null}
        </div>

        {/* Orta: şifre değiştir */}
        <div className="flex justify-center justify-self-center lg:px-4">
          <Link
            href="/hesap/sifre"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
          >
            Şifre değiştir
          </Link>
        </div>

        {/* Sağ: e-posta + çıkış */}
        <div className="flex flex-wrap items-center justify-end gap-3 justify-self-end">
          {userEmail && (
            <span className="max-w-[min(100%,220px)] truncate text-sm text-slate-500" title={userEmail}>
              {userEmail}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="shrink-0 text-sm font-medium text-slate-600 transition-colors hover:text-red-600"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </header>
  )
}
