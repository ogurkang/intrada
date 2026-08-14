import DenetimYakindaSayfa from '@/components/denetim/DenetimYakindaSayfa'

export default async function Page({ params }: { params: Promise<{ donemId: string }> }) {
  const donemId = (await params).donemId
  return (
    <DenetimYakindaSayfa
      bolum={{ href: `/denetim/donemler/${donemId}/ic-kontrol-bilgileri/ikep`, label: 'İKEP', aciklama: 'İç kontrol kapsamında İKEP.' }}
      geriHref={`/denetim/donemler/${donemId}/ic-kontrol-bilgileri`}
      geriLabel="← İç Kontrol Bilgileri"
    />
  )
}
