'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  userEmail?: string
  onMenuClick?: () => void
}

export default function Header({ userEmail, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {onMenuClick && (
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800"
        aria-label="Menüyü aç/kapat"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      )}
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        {userEmail && (
          <span className="text-sm text-slate-500">{userEmail}</span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-slate-600 hover:text-red-600 transition-colors font-medium"
        >
          Çıkış Yap
        </button>
      </div>
    </header>
  )
}
