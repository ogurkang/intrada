import Link from 'next/link'
import { notFound } from 'next/navigation'
import AnketDuzenleClient from '@/components/anket/AnketDuzenleClient'
import { anketYoneticiSayfasi } from '@/lib/anket-yetki'

export default async function AnketDuzenlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await anketYoneticiSayfasi()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: anket } = await (supabase as any)
    .from('anketler')
    .select('id, baslik, aciklama, kod')
    .eq('id', id)
    .maybeSingle()
  if (!anket) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/anket-yonetimi/anketler" className="text-sm text-slate-600 underline">Anketlere dön</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">Anketi düzenle</h1>
      </div>
      <AnketDuzenleClient
        id={String(anket.id)}
        baslik={String(anket.baslik)}
        aciklama={String(anket.aciklama ?? '')}
        kod={String(anket.kod)}
      />
    </div>
  )
}
