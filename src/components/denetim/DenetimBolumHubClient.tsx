'use client'

import Link from 'next/link'
import type { DenetimMenuChild, DenetimMenuIkonAnahtar } from '@/lib/denetim'

interface Props {
  baslik: string
  aciklama: string
  geriHref?: string
  geriLabel?: string
  kartlar: DenetimMenuChild[]
}

function MenuIkon({ ikon, className = 'w-6 h-6' }: { ikon?: DenetimMenuIkonAnahtar; className?: string }) {
  const common = {
    className,
    fill: 'none' as const,
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.75,
  }
  switch (ikon) {
    case 'karar':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 7h8M7 11h10M9 15h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 21h12" />
        </svg>
      )
    case 'encumen':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'meclis':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
        </svg>
      )
    case 'mali':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'gelir':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6M9 11h6M9 15h4M5 5h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
        </svg>
      )
    case 'hesap':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6M9 11h.01M13 11h.01M9 15h.01M13 15h.01M17 15h.01M5 5h14v14H5V5z" />
        </svg>
      )
    case 'butce':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      )
    case 'tasinmaz':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-6h4v6" />
        </svg>
      )
    case 'performans':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 7h7v7" />
        </svg>
      )
    case 'stratejik':
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2" />
        </svg>
      )
    case 'program':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    case 'rapor':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4h7l3 3v13a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" />
        </svg>
      )
    case 'ickontrol':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    case 'yonetmelik':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    case 'ikep':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M8 11h8M8 15h5" />
        </svg>
      )
    case 'insankaynaklari':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      )
    case 'sosyaldenge':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M5 7h14M7 7l-4 7h8L7 7zm10 0l-4 7h8l-4-7zM8 21h8" />
        </svg>
      )
    case 'sozlesme':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8l3 3v13H5V4h3zm1 7h6m-6 4h6M8 4v3h8V4" />
        </svg>
      )
    case 'normkadro':
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4V5zm4 4h8M8 13h3m2 0h3M8 17h3m2 0h3" />
        </svg>
      )
    default:
      return (
        <svg {...common} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      )
  }
}

const IKON_TON: Record<string, string> = {
  karar: 'bg-violet-100 text-violet-700',
  encumen: 'bg-violet-100 text-violet-700',
  meclis: 'bg-indigo-100 text-indigo-700',
  mali: 'bg-emerald-100 text-emerald-700',
  gelir: 'bg-emerald-100 text-emerald-700',
  hesap: 'bg-teal-100 text-teal-700',
  butce: 'bg-cyan-100 text-cyan-700',
  tasinmaz: 'bg-amber-100 text-amber-800',
  performans: 'bg-sky-100 text-sky-700',
  stratejik: 'bg-sky-100 text-sky-700',
  program: 'bg-blue-100 text-blue-700',
  rapor: 'bg-slate-100 text-slate-700',
  ickontrol: 'bg-rose-100 text-rose-700',
  yonetmelik: 'bg-rose-100 text-rose-700',
  ikep: 'bg-orange-100 text-orange-800',
  insankaynaklari: 'bg-fuchsia-100 text-fuchsia-700',
  sosyaldenge: 'bg-purple-100 text-purple-700',
  sozlesme: 'bg-violet-100 text-violet-700',
  normkadro: 'bg-pink-100 text-pink-700',
}

export default function DenetimBolumHubClient({
  baslik,
  aciklama,
  geriHref = '/denetim',
  geriLabel = '← Denetim Yönetimi',
  kartlar,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        {geriLabel ? (
          <Link href={geriHref} className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2">
            {geriLabel}
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">{aciklama}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {kartlar.map(k => {
          const ton = IKON_TON[k.ikon ?? ''] ?? 'bg-slate-100 text-slate-700'
          return (
            <Link
              key={k.href}
              href={k.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <span className={`inline-flex shrink-0 items-center justify-center w-11 h-11 rounded-xl ${ton}`}>
                  <MenuIkon ikon={k.ikon} />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-800 leading-snug">{k.label}</h2>
                  {k.aciklama ? <p className="text-xs text-slate-600 mt-2 leading-relaxed">{k.aciklama}</p> : null}
                  <span className="text-xs font-medium text-slate-500 mt-3 inline-block group-hover:text-slate-800">
                    Aç →
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
