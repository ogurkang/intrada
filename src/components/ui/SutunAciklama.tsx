'use client'

import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Tablo başlığı: fare üzerine gelince Eğitim İstatistiği log hover benzeri açıklama. */
export default function SutunAciklama({
  baslik,
  aciklama,
  className = '',
}: {
  baslik: ReactNode
  aciklama: string
  className?: string
}) {
  const [konum, setKonum] = useState<{ x: number; y: number } | null>(null)

  return (
    <>
      <span
        className={`inline-flex items-center gap-1 cursor-help ${className}`}
        title={aciklama}
        onMouseEnter={e => {
          const r = e.currentTarget.getBoundingClientRect()
          setKonum({ x: r.left + r.width / 2, y: r.top })
        }}
        onMouseLeave={() => setKonum(null)}
      >
        {baslik}
        <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      {konum && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed z-[200] pointer-events-none w-max max-w-[260px] px-3 py-2 rounded-lg bg-slate-800 text-[11px] leading-snug text-slate-100 shadow-lg border border-slate-700"
            style={{ left: konum.x, top: konum.y, transform: 'translate(-50%, calc(-100% - 8px))' }}
          >
            {aciklama}
          </div>,
          document.body,
        )
        : null}
    </>
  )
}
