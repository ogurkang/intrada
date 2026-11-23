import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpIdareTabloGorClient from '@/components/stratejik/PpIdareTabloGorClient'
import { ppIdareBloklariTekil, ppIdareTabloKeyCoz, ppPerformansRaporYili } from '@/lib/pp-mudurluk-rapor'

export default async function IdarePerformansBilgisiGorPage({
  params,
  searchParams,
}: {
  params: Promise<{ tabloKey: string }>
  searchParams: Promise<{ y?: string; m?: string; t?: string }>
}) {
  const { tabloKey: ham } = await params
  const tabloKey = decodeURIComponent(ham)
  const coz = ppIdareTabloKeyCoz(tabloKey)
  if (!coz) notFound()

  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const mudurluk = (sp.m ?? '').trim()
  const listeTur = sp.t === 'hedef' || sp.t === 'mudurluk' ? sp.t : (mudurluk ? 'mudurluk' : 'hedef')
  const supabase = await createClient()
  const rapor = await ppPerformansRaporYili(supabase, Number.isFinite(y) ? y : null, { mudurlukKaynak: 'secilen' })

  const tum = ppIdareBloklariTekil(rapor)
  const blok = tum.find(
    b => b.tabloKey === tabloKey
      || (b.altProgramId === coz.altProgramId && b.altHedefId === coz.altHedefId),
  )
  if (!blok) notFound()

  return (
    <PpIdareTabloGorClient
      blok={blok}
      yil={rapor.yil}
      mudurluk={mudurluk}
      listeTur={listeTur}
    />
  )
}
