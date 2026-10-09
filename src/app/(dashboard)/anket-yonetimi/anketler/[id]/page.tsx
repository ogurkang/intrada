import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import AnketDetayClient, { type AnketSoruSatir } from '@/components/anket/AnketDetayClient'
import { anketYoneticiSayfasi } from '@/lib/anket-yetki'
import type { AnketSoruTipi } from '@/lib/anket'
import type { AnketLogSatir } from '@/app/(dashboard)/anket-yonetimi/actions'

export default async function AnketDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ duzenle?: string }>
}) {
  const { id } = await params
  const { duzenle } = await searchParams
  const { supabase } = await anketYoneticiSayfasi()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: anket } = await sb
    .from('anketler')
    .select('id, baslik, aciklama, kod, durum')
    .eq('id', id)
    .maybeSingle()
  if (!anket) notFound()
  const [{ data: soruData }, { data: logData }] = await Promise.all([
    sb.from('anket_sorulari').select('id, sira, metin, tip, secenekler').eq('anket_id', id).order('sira'),
    sb.from('anket_log').select('id, soru_id, islem, ozet, yapan_ad, created_at').eq('anket_id', id).order('created_at', { ascending: false }).limit(100),
  ])
  const sorular: AnketSoruSatir[] = ((soruData ?? []) as AnketSoruSatir[])
    .map(s => ({
      id: String(s.id),
      sira: Number(s.sira),
      metin: String(s.metin),
      tip: s.tip as AnketSoruTipi,
      secenekler: Array.isArray(s.secenekler) ? s.secenekler.map(String) : [],
    }))
    .sort((a, b) => a.sira - b.sira)
  const loglar: AnketLogSatir[] = ((logData ?? []) as AnketLogSatir[]).map(l => ({
    id: String(l.id),
    soru_id: l.soru_id ? String(l.soru_id) : null,
    islem: String(l.islem),
    ozet: String(l.ozet ?? ''),
    yapan_ad: String(l.yapan_ad ?? ''),
    created_at: String(l.created_at),
  }))
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  return (
    <AnketDetayClient
      id={String(anket.id)}
      baslik={String(anket.baslik)}
      aciklama={String(anket.aciklama ?? '')}
      kod={String(anket.kod)}
      durum={String(anket.durum)}
      link={`${proto}://${host}/anket/${anket.kod}`}
      duzenleAcik={duzenle === '1'}
      sorular={sorular}
      loglar={loglar}
    />
  )
}
