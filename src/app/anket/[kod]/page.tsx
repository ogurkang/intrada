import { cookies } from 'next/headers'
import { createHash } from 'crypto'
import AnketCevapClient, { type AnketCevapSoru } from '@/components/anket/AnketCevapClient'
import { anketKodTemizle, type AnketSoruTipi } from '@/lib/anket'
import { tryCreateServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

function Kart({ baslik, metin }: { baslik: string; metin: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-slate-800">{baslik}</h1>
      <p className="mt-3 text-sm text-slate-600">{metin}</p>
    </div>
  )
}

export default async function AnketCevapPage({ params }: { params: Promise<{ kod: string }> }) {
  const { kod: kodHam } = await params
  const kod = anketKodTemizle(kodHam)
  const sb = tryCreateServiceRoleClient()
  if (!sb || !kod) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <Kart baslik="Anket açılamadı" metin="Bu koda ait bir anket yok." />
      </main>
    )
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: anket } = await db.from('anketler').select('id, baslik, aciklama, durum').eq('kod', kod).maybeSingle()
  if (!anket) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <Kart baslik="Anket bulunamadı" metin="Bu koda ait bir anket yok." />
      </main>
    )
  }
  if (anket.durum !== 'yayinda') {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <Kart baslik={String(anket.baslik)} metin="Bu anketin yayını durdurulmuş. Yeni cevap alınmıyor." />
      </main>
    )
  }

  const depo = await cookies()
  const token = depo.get(`intrada_anket_${kod}`)?.value
  if (token) {
    const ozet = createHash('sha256').update(token).digest('hex')
    const { data: katilim } = await db
      .from('anket_katilim')
      .select('id')
      .eq('anket_id', anket.id)
      .eq('tarayici_ozeti', ozet)
      .maybeSingle()
    if (katilim) {
      return (
        <main className="min-h-screen bg-slate-100 px-4 py-10">
          <Kart baslik={String(anket.baslik)} metin="Bu anketi bu tarayıcıdan daha önce cevapladınız. Adınız tutulmadı." />
        </main>
      )
    }
  }

  const { data: soruData } = await db
    .from('anket_sorulari')
    .select('id, sira, metin, tip, secenekler')
    .eq('anket_id', anket.id)
    .order('sira')
  const sorular: AnketCevapSoru[] = ((soruData ?? []) as AnketCevapSoru[])
    .map(s => ({
      id: String(s.id),
      sira: Number(s.sira),
      metin: String(s.metin),
      tip: s.tip as AnketSoruTipi,
      secenekler: s.tip === 'evet_hayir'
        ? ['Evet', 'Hayır']
        : (Array.isArray(s.secenekler) ? s.secenekler.map(String) : []),
    }))
    .sort((a, b) => a.sira - b.sira)

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <AnketCevapClient
        kod={kod}
        baslik={String(anket.baslik)}
        aciklama={String(anket.aciklama ?? '')}
        sorular={sorular}
      />
    </main>
  )
}
