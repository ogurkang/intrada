import DenetimYakindaSayfa from '@/components/denetim/DenetimYakindaSayfa'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = (await params).donemId
  return (
    <DenetimYakindaSayfa
      bolum={{ href: `/denetim/donemler/${donemId}/performans-bilgileri/stratejik-plan`, label: 'Stratejik Plan', aciklama: 'Performans bilgileri kapsamında stratejik plan.' }}
      geriHref={`/denetim/donemler/${donemId}/performans-bilgileri`}
      geriLabel="← Performans Bilgileri"
    />
  )
}
