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
      <Link href="/anket-yonetimi/raporlar" className="text-sm text-slate-600 underline">Raporlara dön</Link>
      <AnketRaporGorunum baslik={rapor.baslik} katilim={rapor.katilim} sorular={rapor.sorular} />
    </div>
  )
}
