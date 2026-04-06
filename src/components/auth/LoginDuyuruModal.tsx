'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'intrada.login.duyuru.dismissed'
const IMAGE_SRC = '/branding/lansman-duyuru.png'

export function LoginDuyuruModal() {
  const [open, setOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1') {
        return
      }
      setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  const close = useCallback(() => {
    if (dontShowAgain && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
  }, [dontShowAgain])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, close])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-duyuru-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
        aria-hidden
        onClick={close}
      />
      <div className="relative z-[101] w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-950 shadow-2xl ring-1 ring-white/10">
        <h2 id="login-duyuru-title" className="sr-only">
          İntrada duyurusu
        </h2>

        <button
          type="button"
          onClick={close}
          className="absolute right-2 top-2 z-[102] flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-lg font-semibold leading-none text-slate-900 shadow-lg ring-1 ring-black/10 transition hover:bg-white"
          aria-label="Kapat"
        >
          ×
        </button>

        <div className="bg-slate-900/50 px-2 pt-12 pb-14 sm:px-4 sm:pt-14 sm:pb-16">
          <Image
            src={IMAGE_SRC}
            alt="İntranetin Adapazarı Belediyesi hali İntrada yayında"
            width={1600}
            height={900}
            className="mx-auto h-auto w-full max-h-[min(72vh,520px)] object-contain object-center"
            sizes="(max-width: 896px) calc(100vw - 2rem), 864px"
            priority
          />
        </div>

        <label className="absolute bottom-3 left-3 z-[102] flex cursor-pointer select-none items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm text-slate-800 shadow-md ring-1 ring-black/10 sm:bottom-4 sm:left-4">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="h-4 w-4 rounded border-slate-400 text-slate-800 focus:ring-slate-700"
          />
          Bir daha gösterme
        </label>
      </div>
    </div>
  )
}
