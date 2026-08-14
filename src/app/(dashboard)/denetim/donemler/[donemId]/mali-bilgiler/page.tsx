import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimBolumHubClient from '@/components/denetim/DenetimBolumHubClient'
import { denetimDonemBolumler } from '@/lib/denetim'

export default async function DonemMaliBilgilerPage({
  params,
}: {
  params: Promise<{ donemId: string }>
}) {
  const donemId = Number.parseInt((await params).donemId, 10)
  if (!Number.isFinite(donemId)) notFound()
  const supabase = await createClient()
  const { data: donem } = await supabase.from('denetim_donem').select('id, donem_adi').eq('id', donemId).maybeSingle()
  if (!donem) notFound()
  const bolum = denetimDonemBolumler(donemId).find(b => b.href.endsWith('/mali-bilgiler'))
  if (!bolum?.children) notFound()
  return (
    <DenetimBolumHubClient
      baslik={`${bolum.label} — ${donem.donem_adi}`}
      aciklama={bolum.aciklama}
      geriHref={`/denetim/donemler/${donemId}`}
      geriLabel="← Dönem"
      kartlar={bolum.children}
    />
  )
}
