import Link from 'next/link'
import { ICK_DURUM_RENK } from '@/lib/ick/tanim'

export function IckRozet({ durum, etiket }: { durum: string; etiket: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${ICK_DURUM_RENK[durum] ?? 'bg-slate-100 text-slate-700'}`}>
      {etiket}
    </span>
  )
}

export function IckBaslik({ baslik, children, geri }: { baslik: string; children?: React.ReactNode; geri?: { href: string; label: string } }) {
  return (
    <div className="space-y-1">
      {geri ? (
        <Link href={geri.href} className="text-sm text-blue-700 hover:underline">
          ← {geri.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </div>
  )
}

export function IckUyari({ metin, tur = 'uyari' }: { metin: string; tur?: 'uyari' | 'hata' | 'bilgi' }) {
  const renk =
    tur === 'hata' ? 'bg-red-50 text-red-700' : tur === 'bilgi' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-900'
  return <p className={`rounded-lg px-3 py-2 text-sm ${renk}`}>{metin}</p>
}

export function IckKart({ baslik, children, sag }: { baslik?: string; children: React.ReactNode; sag?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200">
      {baslik ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-800">{baslik}</h2>
          {sag}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

export const ICK_BUTON =
  'inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap disabled:opacity-50'
export const ICK_BUTON_IKINCIL =
  'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap disabled:opacity-50'
export const ICK_BUTON_GEZINTI =
  'inline-flex items-center gap-2 rounded-lg bg-teal-700 text-white px-4 py-2 text-sm font-medium hover:bg-teal-600 transition-colors whitespace-nowrap disabled:opacity-50'
export const ICK_BUTON_TEHLIKE =
  'inline-flex items-center gap-2 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-500 transition-colors whitespace-nowrap disabled:opacity-50'
export const ICK_INPUT =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
export const ICK_ETIKET = 'block text-sm font-medium text-slate-700 mb-1'
export const ICK_TH = 'text-left px-3 py-2 font-semibold text-slate-700 whitespace-nowrap'
export const ICK_TD = 'px-3 py-2 align-top text-slate-700'
