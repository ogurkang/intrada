'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export default function KysKlasorKart({
  href,
  baslik,
  aciklama,
  onDuzenle,
  duzenleDisabled,
  ekstra,
}: {
  href: string
  baslik: string
  aciklama?: string | null
  onDuzenle?: () => void
  duzenleDisabled?: boolean
  ekstra?: ReactNode
}) {
  return (
    <div className="relative">
      <Link
        href={href}
        className="group block rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
              />
            </svg>
          </span>
          <div className="min-w-0 pr-8">
            <h2 className="leading-snug font-semibold text-slate-800">{baslik}</h2>
            {aciklama ? <p className="mt-2 text-xs leading-relaxed text-slate-600">{aciklama}</p> : null}
            <span className="mt-3 inline-block text-xs font-medium text-slate-500 group-hover:text-slate-800">
              Aç →
            </span>
          </div>
        </div>
      </Link>
      {onDuzenle || ekstra ? (
        <div className="absolute right-3 top-3 flex items-center gap-0.5">
          {ekstra}
          {onDuzenle ? (
            <button
              type="button"
              disabled={duzenleDisabled}
              onClick={onDuzenle}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              title="Menüyü düzenle veya sil"
              aria-label="Menüyü düzenle"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
