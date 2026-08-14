import DenetimBolumSayfa from '@/components/denetim/DenetimBolumSayfa'

export default async function DonemMaliBilgilerPage({
  params,
}: {
  params: Promise<{ donemId: string }>
}) {
  const donemId = Number.parseInt((await params).donemId, 10)
  return <DenetimBolumSayfa donemId={donemId} bolum="mali" />
}
