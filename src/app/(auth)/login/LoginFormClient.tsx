'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LoginDuyuruModal } from '@/components/auth/LoginDuyuruModal'
import { LoginKurumsalLogo } from '@/components/branding/IntradaLogos'
import { girisYap } from './actions'

export type LoginAnket = { baslik: string; kod: string }

export default function LoginFormClient({ anketler }: { anketler: LoginAnket[] }) {
  const [kimlik, setKimlik] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    const sonuc = await girisYap(kimlik, password)
    if (sonuc.hata) {
      setError(sonuc.hata)
      setLoading(false)
      return
    }
    router.push(sonuc.yon ?? '/')
    router.refresh()
  }

  return (
    <>
      <LoginDuyuruModal />
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8 text-center">
          <LoginKurumsalLogo />
          <p className="text-sm text-slate-500 mt-1">Personel Yönetim Sistemi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-posta veya kullanıcı adı
            </label>
            <input
              type="text"
              required
              value={kimlik}
              onChange={(e) => setKimlik(e.target.value)}
              placeholder="ornek@kurum.gov.tr veya KULLANICIADI"
              className="w-full px-3 py-2 border-2 border-slate-800 rounded-lg text-sm text-slate-800 bg-white
                         focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border-2 border-slate-800 rounded-lg text-sm text-slate-800 bg-white
                         focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800"
            />
            <p className="text-xs text-slate-500 mt-1.5 leading-snug">
              İlk giriş: T.C. kimlik numaranızın <strong>ilk 3 hanesi</strong> + nokta +{' '}
              <strong>doğum yılınız 4 hane</strong> (ör. <code className="bg-slate-100 px-1 rounded">252.1987</code>).
              İlk girişten sonra hesap kurulumunda yeni şifre belirlersiniz.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
              ${loading
                ? 'bg-slate-500 text-white cursor-wait'
                : 'bg-slate-800 text-white hover:bg-slate-700'
              } disabled:cursor-not-allowed`}
          >
            {loading && (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full shrink-0" />
            )}
            <span className={loading ? 'animate-pulse' : ''}>
              {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </span>
          </button>

          <p className="text-center text-sm">
            <Link href="/sifre-sifirla" className="text-slate-600 underline hover:text-slate-800">
              Şifremi sıfırla
            </Link>
          </p>
        </form>

        {anketler.length > 0 ? (
          <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            {anketler.map(anket => (
              <div key={anket.kod} className="flex items-stretch gap-2">
                <a
                  href={`/anket/${encodeURIComponent(anket.kod)}`}
                  className="flex min-w-0 flex-1 items-center justify-center rounded-lg bg-blue-700 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-600"
                >
                  {anket.baslik}
                </a>
                <a
                  href={`/anket/${encodeURIComponent(anket.kod)}/pdf`}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-emerald-700 px-3 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  Anketi İndir
                </a>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
