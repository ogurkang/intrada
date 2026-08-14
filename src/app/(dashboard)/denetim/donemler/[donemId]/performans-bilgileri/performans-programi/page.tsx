import DenetimYakindaSayfa from '@/components/denetim/DenetimYakindaSayfa'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = (await params).donemId
  return (
    <DenetimYakindaSayfa
      bolum={{ href: `/denetim/donemler/${donemId}/performans-bilgileri/performans-programi`, label: 'Performans Programı', aciklama: 'Performans bilgileri kapsamında performans programı.' }}
      geriHref={`/denetim/donemler/${donemId}/performans-bilgileri`}
      geriLabel="← Performans Bilgileri"
    />
  )
}
