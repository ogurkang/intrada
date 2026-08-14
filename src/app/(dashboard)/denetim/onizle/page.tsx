import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimOnizlemeClient from '@/components/denetim/DenetimOnizlemeClient'
import type { DenetimBelgeTuru } from '@/lib/denetim'

export const dynamic = 'force-dynamic'

export default async function DenetimOnizlePage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; id?: string }>
}) {
  const p = await searchParams
  const tur = p.tur as DenetimBelgeTuru
  const id = Number.parseInt(p.id ?? '', 10)
  if ((tur !== 'karar' && tur !== 'bolum') || !Number.isFinite(id) || id <= 0) notFound()

  const supabase = await createClient()
  const table = tur === 'karar' ? 'denetim_karar_belge' : 'denetim_bolum_belge'
  const { data: belge } = await supabase
    .from(table)
    .select('id, dosya_adi, mime_type')
    .eq('id', id)
    .maybeSingle()
  if (!belge) notFound()

  return (
    <DenetimOnizlemeClient
      belgeUrl={`/api/denetim/onizle?tur=${tur}&id=${id}`}
      dosyaAdi={belge.dosya_adi}
      mimeType={belge.mime_type}
    />
  )
}
