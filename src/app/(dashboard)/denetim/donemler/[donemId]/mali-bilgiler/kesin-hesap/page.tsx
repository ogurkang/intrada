import DenetimAltBolumSayfa from '@/components/denetim/DenetimAltBolumSayfa'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = Number.parseInt((await params).donemId, 10)
  return <DenetimAltBolumSayfa donemId={donemId} bolum="mali" altBolum="kesin-hesap" />
}
