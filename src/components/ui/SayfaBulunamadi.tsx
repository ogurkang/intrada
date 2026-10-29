'use client'

import { useRouter } from 'next/navigation'

export default function SayfaBulunamadi() {
  const router = useRouter()

  function oncekiSayfa() {
    const geldi = document.referrer
    if (geldi) {
      try {
        if (new URL(geldi).origin === window.location.origin) {
          router.back()
          return
        }
      } catch {
        /* adres okunamadı */
      }
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center max-w-md">
        <p className="text-5xl font-bold text-slate-800">404</p>
        <p className="mt-3 text-lg text-slate-700">Sayfa bulunamadı</p>
        <button
          type="button"
          onClick={oncekiSayfa}
          className="mt-6 inline-flex items-center rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700"
        >
          Önceki sayfaya dön
        </button>
      </div>
    </div>
  )
}
