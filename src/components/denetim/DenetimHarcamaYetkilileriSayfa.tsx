import HarcamaYetkilileriListeClient from '@/components/denetim/HarcamaYetkilileriListeClient'
import { harcamaYetkilileriSatirlariYukle } from '@/lib/harcama-yetkilileri-liste'

export default async function DenetimHarcamaYetkilileriSayfa({
  menuLabel,
  donemId,
  donemAdi,
}: {
  menuLabel: string
  donemId: number
  donemAdi: string
}) {
  const satirlar = await harcamaYetkilileriSatirlariYukle()
  return (
    <HarcamaYetkilileriListeClient
      menuLabel={menuLabel}
      donemAdi={donemAdi}
      satirlar={satirlar}
      geriHref={`/denetim/donemler/${donemId}`}
      geriLabel="← Dönem"
    />
  )
}
