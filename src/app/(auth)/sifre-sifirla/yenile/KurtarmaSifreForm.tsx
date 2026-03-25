'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { kurtarmaKullaniciAdiVeSifreKaydet } from '../actions'
import { normalizeKullaniciAdi } from '@/lib/kullanici-adi'
import { SIFRE_MAX_UZUNLUK, SIFRE_MIN_UZUNLUK, yeniSifreHataMetni } from '@/lib/sifre-politikasi'

export default function KurtarmaSifreForm({
  email,
  sicilNo,
  baslangicKullaniciAdi,
}: {
  email: string
  sicilNo: string
  baslangicKullaniciAdi: string
}) {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [kullaniciAdiGoster, setKullaniciAdiGoster] = useState(
    baslangicKullaniciAdi ? normalizeKullaniciAdi(baslangicKullaniciAdi) : '',
  )

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setPending(true)
    try {
      const fd = new FormData(e.currentTarget)
      const r = await kurtarmaKullaniciAdiVeSifreKaydet(fd)
      if (r.hata) {
        setErr(r.hata)
        return
      }
      router.push('/login?mesaj=sifre_guncellendi')
      router.refresh()
    } catch {
      setErr('Kayıt tamamlanamadı. Tekrar deneyin.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Yeni kullanıcı adı ve şifre</h1>
      <p className="text-sm text-slate-500 mb-6">
        E-posta bağlantısıyla geldiniz. Aşağıda kalıcı kullanıcı adınızı ve yeni şifrenizi belirleyin; ilk kurulumdaki
        kurallar geçerlidir.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-xs text-slate-500">
          Sicil: <span className="font-mono text-slate-700">{sicilNo}</span> · E-posta:{' '}
          <span className="font-mono text-slate-700">{email}</span>
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı adı</label>
          <input
            name="kullanici_adi"
            required
            value={kullaniciAdiGoster}
            onChange={e => {
              const n = normalizeKullaniciAdi(e.target.value)
              setKullaniciAdiGoster(n.slice(0, 32))
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold tracking-wide uppercase"
            style={{ textTransform: 'uppercase' }}
            placeholder="ADAPAZARI"
            autoComplete="username"
            spellCheck={false}
            maxLength={32}
          />
          <p className="text-xs text-slate-500 mt-1">
            Yalnızca harf (A–Z). Türkçe karakter yazsanız Latin harfe çevrilir; kayıt büyük harfle yapılır.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Yeni şifre</label>
          <input
            name="sifre"
            type="password"
            required
            minLength={SIFRE_MIN_UZUNLUK}
            maxLength={SIFRE_MAX_UZUNLUK}
            pattern="[A-Za-z0-9]*"
            title={yeniSifreHataMetni()}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            autoComplete="new-password"
          />
          <p className="text-xs text-slate-500 mt-1">{yeniSifreHataMetni()}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Yeni şifre (tekrar)</label>
          <input
            name="sifre_tekrar"
            type="password"
            required
            minLength={SIFRE_MIN_UZUNLUK}
            maxLength={SIFRE_MAX_UZUNLUK}
            pattern="[A-Za-z0-9]*"
            title={yeniSifreHataMetni()}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            autoComplete="new-password"
          />
        </div>

        {err && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? 'Kaydediliyor…' : 'Kaydet ve girişe dön'}
        </button>
      </form>

      <Link href="/login" className="mt-4 block text-center text-sm text-slate-600 hover:underline">
        Girişe dön
      </Link>
    </div>
  )
}
