import DenetimYakindaSayfa from '@/components/denetim/DenetimYakindaSayfa'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = (await params).donemId
  return (
    <DenetimYakindaSayfa
      bolum={{
        href: `/denetim/donemler/${donemId}/tasinmaz-bilgileri`,
        label: 'Taşınmaz Bilgileri',
        aciklama: 'Taşınmaz bilgileri içerik ekranı sonraki adımda eklenecek.',
      }}
      geriHref={`/denetim/donemler/${donemId}`}
      geriLabel="← Dönem"
    />
  )
}
