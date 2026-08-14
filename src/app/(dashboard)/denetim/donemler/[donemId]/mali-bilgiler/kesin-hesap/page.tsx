import DenetimYakindaSayfa from '@/components/denetim/DenetimYakindaSayfa'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = (await params).donemId
  return (
    <DenetimYakindaSayfa
      bolum={{
        href: `/denetim/donemler/${donemId}/mali-bilgiler/kesin-hesap`,
        label: 'Kesin Hesap',
        aciklama: 'Mali bilgiler kapsamında kesin hesap.',
      }}
      geriHref={`/denetim/donemler/${donemId}/mali-bilgiler`}
      geriLabel="← Mali Bilgiler"
    />
  )
}
