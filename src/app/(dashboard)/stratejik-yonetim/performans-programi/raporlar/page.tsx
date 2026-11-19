import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PP_RAPORLAR, PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'

export default async function PerformansProgramiRaporlarHub({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const { y } = await searchParams
  if (y) {
    redirect(`${PP_RAPORLAR_BASE}/mudurluklerin-performans-programi?y=${encodeURIComponent(y)}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">Performans Programı — Raporlar</h1>
          <p className="mt-1 text-sm text-slate-600">
            Aşağıdaki tablolar sırayla listelenir. Açmak için başlığa tıklayın.
          </p>
        </div>
        <Link
          href="/stratejik-yonetim/performans-programi"
          className="inline-flex shrink-0 items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 self-start sm:self-center"
        >
          ← Performans Programı
        </Link>
      </div>

      <ol className="space-y-2">
        {PP_RAPORLAR.map((r, i) => (
          <li key={r.slug}>
            <Link
              href={`${PP_RAPORLAR_BASE}/${r.slug}`}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-400"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-800 leading-snug">{r.baslik}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{r.aciklama}</span>
              </span>
              <span className="ml-auto shrink-0 self-center text-xs font-medium text-slate-500">
                {r.hazir ? 'Aç →' : 'Yakında →'}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
