import DenetimYakindaSayfa from '@/components/denetim/DenetimYakindaSayfa'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = (await params).donemId
  return (
    <DenetimYakindaSayfa
      bolum={{
        href: `/denetim/donemler/${donemId}/mali-bilgiler/gelir-tarifesi`,
        label: 'Gelir Tarifesi',
        aciklama: 'Mali bilgiler kapsamında gelir tarifesi.',
      }}
      geriHref={`/denetim/donemler/${donemId}/mali-bilgiler`}
      geriLabel="← Mali Bilgiler"
    />
  )
}
