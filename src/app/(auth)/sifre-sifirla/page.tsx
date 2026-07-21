'use client'

import { useState } from 'react'
import Link from 'next/link'
import { dogrulaSifreSifirlaKimlik, sifreSifirlaKaydet } from './actions'
import { normalizeKullaniciAdi } from '@/lib/kullanici-adi'
import { SIFRE_MAX_UZUNLUK, SIFRE_MIN_UZUNLUK, yeniSifreHataMetni } from '@/lib/sifre-politikasi'

export default function SifreSifirlaPage() {
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [pending, setPending] = useState(false)
  const [kimlikOnay, setKimlikOnay] = useState(false)
  const [epostaGonderildi, setEpostaGonderildi] = useState(false)
  const [email, setEmail] = useState('')
  const [tckn, setTckn] = useState('')
  const [sicil, setSicil] = useState('')
  const [kullaniciAdiGoster, setKullaniciAdiGoster] = useState('')

  async function onDogrula(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setPending(true)
    try {
      const fd = new FormData(e.currentTarget)
      const r = await dogrulaSifreSifirlaKimlik(fd)
      if ('hata' in r) {
        setErr(r.hata)
        return
      }
      setEmail(String(fd.get('email') ?? '').trim().toLowerCase())
      setTckn(String(fd.get('tckn') ?? ''))
      setSicil(String(fd.get('sicil') ?? ''))
      if (r.yol === 'eposta') {
        setEpostaGonderildi(true)
        return
      }
      setKullaniciAdiGoster('')
      setKimlikOnay(true)
    } catch {
      setErr('İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.')
    } finally {
      setPending(false)
    }
  }

  async function onKaydet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setPending(true)
    try {
      const fd = new FormData(e.currentTarget)
      const r = await sifreSifirlaKaydet(fd)
      if (r.hata) setErr(r.hata)
      else setOk(true)
    } catch {
      setErr('Şifre kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.')
    } finally {
      setPending(false)
    }
  }

  if (ok) {
    return (
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-slate-800 font-medium">Kullanıcı adınız ve şifreniz güncellendi.</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-slate-700 underline">
          Giriş sayfasına dön
        </Link>
      </div>
    )
  }

  if (epostaGonderildi) {
    return (
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-slate-800 mb-2">E-postanızı kontrol edin</h1>
        <p className="text-sm text-slate-600 mb-4">
          Kayıtlı adresinize şifre sıfırlama bağlantısı gönderildi. Bağlantıya tıkladığınızda güvenli sayfada{' '}
          <strong>kullanıcı adınızı</strong> ve <strong>yeni şifrenizi</strong> (ilk kurulumdaki kurallarla)
          belirleyebilirsiniz.
        </p>
        <p className="text-xs text-slate-500 mb-6">
          E-posta gelmediyse spam/gereksiz klasörüne bakın. Bağlantının süresi sınırlıdır.
        </p>
        <Link href="/login" className="block text-center text-sm text-slate-600 hover:underline">
          Girişe dön
        </Link>
      </div>
    )
  }

  if (kimlikOnay) {
    return (
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-slate-800 mb-1">Yeni kullanıcı adı ve şifre</h1>
        <p className="text-sm text-slate-500 mb-2">
          Kimliğiniz doğrulandı. Girişte kullanacağınız kalıcı kullanıcı adınızı ve yeni şifrenizi kaydedin (ilk
          kurulum ekranıyla aynı kurallar).
        </p>
        <p className="text-xs text-slate-500 mb-6 font-mono">
          {email} · sicil {sicil}
        </p>

        <form onSubmit={onKaydet} className="space-y-3">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="tckn" value={tckn} />
          <input type="hidden" name="sicil" value={sicil} />

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
              Yalnızca harf (A–Z). Türkçe karakter Latin harfe çevrilir; kayıt büyük harfle yapılır.
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
            className="intrada-btn intrada-btn-kaydet w-full py-2.5 disabled:opacity-50"
          >
            {pending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>

          <button
            type="button"
            onClick={() => {
              setKimlikOnay(false)
              setErr(null)
            }}
            className="w-full py-2 text-sm text-slate-600 hover:underline"
          >
            ← Geri (bilgileri değiştir)
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Şifremi sıfırla</h1>
      <p className="text-sm text-slate-500 mb-6">
        Kayıtlı e-posta, T.C. kimlik numarası ve sicil ile kimliğinizi doğrularız. Ardından ya bu sayfada ya da
        e-postadaki bağlantıda yeni kullanıcı adı ve şifrenizi belirlersiniz.
      </p>

      <form onSubmit={onDogrula} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border-2 border-slate-800 rounded-lg text-sm"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">T.C. kimlik numarası (11 hane)</label>
          <input
            name="tckn"
            inputMode="numeric"
            required
            minLength={11}
            maxLength={11}
            pattern="\d{11}"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sicil numarası</label>
          <input name="sicil" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>

        {err && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}

        <button
          type="submit"
          disabled={pending}
          className="intrada-btn intrada-btn-kaydet w-full py-2.5 disabled:opacity-50"
        >
          {pending ? 'Kontrol ediliyor…' : 'Devam et'}
        </button>
      </form>

      <Link href="/login" className="mt-4 block text-center text-sm text-slate-600 hover:underline">
        Girişe dön
      </Link>
    </div>
  )
}
