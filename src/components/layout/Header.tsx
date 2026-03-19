'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  userEmail?: string
}

export default function Header({ userEmail }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div />
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
