import DenetimBolumBelgeSayfa from '@/components/denetim/DenetimBolumBelgeSayfa'

export default async function Page({
  params,
}: {
  params: Promise<{ donemId: string; baslikId: string }>
}) {
  const p = await params
  return (
    <DenetimBolumBelgeSayfa
      donemId={Number.parseInt(p.donemId, 10)}
      baslikId={Number.parseInt(p.baslikId, 10)}
    />
  )
}
