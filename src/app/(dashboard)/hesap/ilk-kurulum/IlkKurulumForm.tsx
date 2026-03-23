'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { tamamlaIlkKurulum } from '../actions'
import { normalizeKullaniciAdi } from '@/lib/kullanici-adi'
import { SIFRE_MAX_UZUNLUK, SIFRE_MIN_UZUNLUK, yeniSifreHataMetni } from '@/lib/sifre-politikasi'

export default function IlkKurulumForm({ sicilNo, email }: { sicilNo: string; email: string }) {
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [kullaniciAdiGoster, setKullaniciAdiGoster] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const r = await tamamlaIlkKurulum(fd)
    setPending(false)
    if (r.hata) setErr(r.hata)
    else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <p className="text-xs text-slate-500">
        Sicil: <span className="font-mono text-slate-700">{sicilNo}</span> · E-posta:{' '}
        <span className="font-mono text-slate-700">{email}</span>
      </p>

      <p className="text-sm text-slate-600">
        İlk girişte kullandığınız kurum şifresini artık kullanmayacaksınız. Aşağıda kalıcı kullanıcı adınızı ve yeni
        şifrenizi belirleyin.
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
          Yalnızca harf (A–Z). Türkçe karakter yazsanız Latin harfe çevrilir. Yazdığınız metin büyük harf ve böyle
          kaydedilir (ör. adapazari → ADAPAZARI).
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
        {pending ? 'Kaydediliyor…' : 'Şifreyi değiştir ve devam et'}
      </button>
    </form>
  )
}
