import { createClient } from '@/lib/supabase/server'
import PpIdarePerformansListeClient from '@/components/stratejik/PpIdarePerformansListeClient'
import { ppPerformansRaporYili } from '@/lib/pp-mudurluk-rapor'

export default async function IdarePerformansBilgisiListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; h?: string }>
}) {
  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const supabase = await createClient()
  const rapor = await ppPerformansRaporYili(supabase, Number.isFinite(y) ? y : null, { mudurlukKaynak: 'secilen' })
  return (
    <PpIdarePerformansListeClient
      key={`${rapor.yil}-${sp.m ?? ''}-${sp.h ?? ''}`}
      rapor={rapor}
      secilenMudurluk={(sp.m ?? '').trim()}
      secilenHedefKey={(sp.h ?? '').trim()}
    />
  )
}
