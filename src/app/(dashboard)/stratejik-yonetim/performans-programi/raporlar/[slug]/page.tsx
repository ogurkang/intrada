import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpMudurlukPerformansClient from '@/components/stratejik/PpMudurlukPerformansClient'
import { ppPerformansRaporYili } from '@/lib/pp-mudurluk-rapor'
import { ppRaporBul, PP_RAPORLAR, PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'

const OZEL_SLUG = new Set([
  'idare-performans-bilgisi',
  'faaliyetler-duzeyinde-idare-pp-maliyeti',
])

export function generateStaticParams() {
  return PP_RAPORLAR.filter(r => !OZEL_SLUG.has(r.slug)).map(r => ({ slug: r.slug }))
}

export default async function PerformansProgramiRaporSayfa({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ y?: string }>
}) {
  const { slug } = await params
  if (OZEL_SLUG.has(slug)) notFound()
  const rapor = ppRaporBul(slug)
  if (!rapor) notFound()

  if (slug === 'mudurluklerin-performans-programi') {
    const y = Number.parseInt((await searchParams).y ?? '', 10)
    const supabase = await createClient()
    const veri = await ppPerformansRaporYili(supabase, Number.isFinite(y) ? y : null)
    return <PpMudurlukPerformansClient key={veri.yil} rapor={veri} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">{rapor.baslik}</h1>
          <p className="mt-1 text-sm text-slate-600">{rapor.aciklama}</p>
        </div>
        <Link
          href={PP_RAPORLAR_BASE}
          className="inline-flex shrink-0 items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 self-start sm:self-center"
        >
          ← Raporlar
        </Link>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
        Bu tablonun veri bağlantısı sonraki adımda tamamlanacak. Menü ve başlık sıralaması hazırdır.
      </div>
    </div>
  )
}
