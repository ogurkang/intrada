'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sifreDegistir } from '../actions'
import { SIFRE_MAX_UZUNLUK, SIFRE_MIN_UZUNLUK, yeniSifreHataMetni } from '@/lib/sifre-politikasi'

export default function SifreDegistirForm() {
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const r = await sifreDegistir(fd)
    setPending(false)
    if (r.hata) setErr(r.hata)
    else setOk(true)
  }

  if (ok) {
    return (
      <div className="max-w-md rounded-xl border border-green-200 bg-green-50 px-6 py-8 text-center">
        <p className="font-medium text-green-900">Şifreniz güncellendi.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-green-800 underline">
          Ana sayfaya dön
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-800">Şifre değiştir</h1>
      <p className="text-sm text-slate-500">Yeni şifrenizi iki kez girin.</p>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Yeni şifre</label>
        <input
          name="sifre"
          type="password"
          required
          autoComplete="new-password"
          minLength={SIFRE_MIN_UZUNLUK}
          maxLength={SIFRE_MAX_UZUNLUK}
          pattern="[A-Za-z0-9]*"
          title={yeniSifreHataMetni()}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">{yeniSifreHataMetni()}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Yeni şifre (tekrar)</label>
        <input
          name="sifre_tekrar"
          type="password"
          required
          autoComplete="new-password"
          minLength={SIFRE_MIN_UZUNLUK}
          maxLength={SIFRE_MAX_UZUNLUK}
          pattern="[A-Za-z0-9]*"
          title={yeniSifreHataMetni()}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <Link href="/" className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Vazgeç
        </Link>
      </div>
    </form>
  )
}
