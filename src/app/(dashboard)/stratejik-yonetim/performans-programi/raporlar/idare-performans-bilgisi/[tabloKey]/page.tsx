import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpIdareTabloGorClient from '@/components/stratejik/PpIdareTabloGorClient'
import { ppIdareBloklariTekil, ppIdareTabloKeyCoz, ppPerformansRaporYili } from '@/lib/pp-mudurluk-rapor'
import { ppNorm } from '@/lib/pp-erisim'

export default async function IdarePerformansBilgisiGorPage({
  params,
  searchParams,
}: {
  params: Promise<{ tabloKey: string }>
  searchParams: Promise<{ y?: string; m?: string }>
}) {
  const { tabloKey: ham } = await params
  const tabloKey = decodeURIComponent(ham)
  const coz = ppIdareTabloKeyCoz(tabloKey)
  if (!coz) notFound()

  const sp = await searchParams
  const y = Number.parseInt(sp.y ?? '', 10)
  const mudurluk = (sp.m ?? '').trim()
  const supabase = await createClient()
  const rapor = await ppPerformansRaporYili(supabase, Number.isFinite(y) ? y : null, { mudurlukKaynak: 'secilen' })

  const tum = ppIdareBloklariTekil(rapor)
  const blok = tum.find(
    b => b.tabloKey === tabloKey
      || (b.altProgramId === coz.altProgramId && b.altHedefId === coz.altHedefId),
  )
  if (!blok) notFound()

  const sekmeMudurluk = mudurluk
    ? (rapor.sekmeler.find(s => ppNorm(s.mudurluk) === ppNorm(mudurluk))?.mudurluk ?? mudurluk)
    : (blok.veriKaynagi.split(',')[0]?.trim() || '')

  return (
    <PpIdareTabloGorClient
      blok={blok}
      yil={rapor.yil}
      mudurluk={sekmeMudurluk}
    />
  )
}
