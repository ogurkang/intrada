'use client'

import type { MouseEvent } from 'react'

const IKON_BTN = 'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40'

export function SaatGecmisDugmesi({
  sayi = 0,
  onClick,
  title = 'Değişiklik geçmişi',
}: {
  sayi?: number
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative ${IKON_BTN} text-slate-500 hover:text-amber-600 hover:bg-amber-50`}
      title={title}
      aria-label={title}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.5 2" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.5 9.5A9 9 0 113 12m.5-2.5L1.75 7.25M3.5 9.5L6 8.75"
        />
      </svg>
      {sayi > 0 && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex min-w-[1.1rem] h-[1.1rem] px-1 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-medium">
          {sayi}
        </span>
      )}
    </button>
  )
}

export function KalemDuzenleDugmesi({
  onClick,
  disabled,
  title = 'Düzenle',
}: {
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${IKON_BTN} text-slate-600 hover:bg-slate-100`}
      title={title}
      aria-label={title}>
      <KalemSvg />
    </button>
  )
}

export function CopKutusuSilDugmesi({
  onClick,
  disabled,
  title = 'Sil',
}: {
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${IKON_BTN} text-red-600 hover:bg-red-50`}
      title={title}
      aria-label={title}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  )
}

function KalemSvg() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  )
}

export function GozDetayLink({
  href,
  title = 'Detay',
  onClick,
}: {
  href: string
  title?: string
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`${IKON_BTN} text-indigo-600 hover:bg-indigo-50`}
      title={title}
      aria-label={title}>
      <GozSvg />
    </a>
  )
}

export function KalemDuzenleLink({
  href,
  title = 'Düzenle',
  onClick,
}: {
  href: string
  title?: string
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`${IKON_BTN} text-slate-600 hover:bg-slate-100`}
      title={title}
      aria-label={title}>
      <KalemSvg />
    </a>
  )
}

export function KopyalaDugmesi({
  onClick,
  disabled,
  title = 'Kopyala',
}: {
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${IKON_BTN} text-indigo-600 hover:bg-indigo-50`}
      title={title}
      aria-label={title}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    </button>
  )
}

export function IndirLink({
  href,
  title = 'İndir',
  onClick,
}: {
  href: string
  title?: string
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`${IKON_BTN} text-emerald-600 hover:bg-emerald-50`}
      title={title}
      aria-label={title}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 10l5 5 5-5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3" />
      </svg>
    </a>
  )
}

function GozSvg() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  )
}
