import DenetimYakindaSayfa from '@/components/denetim/DenetimYakindaSayfa'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = (await params).donemId
  return (
    <DenetimYakindaSayfa
      bolum={{ href: `/denetim/donemler/${donemId}/performans-bilgileri/faaliyet-raporu`, label: 'Faaliyet Raporu', aciklama: 'Performans bilgileri kapsamında faaliyet raporu.' }}
      geriHref={`/denetim/donemler/${donemId}/performans-bilgileri`}
      geriLabel="← Performans Bilgileri"
    />
  )
}
