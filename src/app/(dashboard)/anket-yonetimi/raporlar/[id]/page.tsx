import Link from 'next/link'
import { notFound } from 'next/navigation'
import AnketRaporGorunum from '@/components/anket/AnketRaporGorunum'
import { anketRaporYukle } from '@/lib/anket-yukle'

export default async function AnketRaporDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rapor = await anketRaporYukle(id)
  if ('hata' in rapor) notFound()
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/anket-yonetimi/raporlar" className="text-sm text-slate-600 underline">Raporlara dön</Link>
        <a
          href={`/api/anket-yonetimi/rapor/pdf?id=${id}`}
          className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
        >
          PDF indir
        </a>
      </div>
      <AnketRaporGorunum baslik={rapor.baslik} katilim={rapor.katilim} kurumMetin={rapor.kurumMetin} sorular={rapor.sorular} />
    </div>
  )
}
