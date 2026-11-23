import { createClient } from '@/lib/supabase/server'
import PpIdarePerformansListeClient, { type PpIdareListeTur } from '@/components/stratejik/PpIdarePerformansListeClient'
import { ppPerformansRaporYili } from '@/lib/pp-mudurluk-rapor'

function turOku(raw: string | undefined): PpIdareListeTur {
  if (raw === 'hedef' || raw === 'mudurluk') return raw
  return ''
}

export default async function IdarePerformansBilgisiListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; t?: string; m?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const listeTur = turOku(sp.t)
  const supabase = await createClient()
  const rapor = await ppPerformansRaporYili(supabase, Number.isFinite(y) ? y : null, { mudurlukKaynak: 'secilen' })
  return (
    <PpIdarePerformansListeClient
      key={`${rapor.yil}-${listeTur}-${sp.m ?? ''}`}
      rapor={rapor}
      listeTur={listeTur}
      secilenMudurluk={(sp.m ?? '').trim()}
    />
  )
}
