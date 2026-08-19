import { createClient } from '@/lib/supabase/server'
import DenetimOrganizasyonSemasiClient from '@/components/denetim/DenetimOrganizasyonSemasiClient'
import { aktifOrganizasyonSemasiYukle } from '@/lib/organizasyon-aktif-yukle'

export default async function DenetimHarcamaYetkilileriSayfa({
  menuLabel,
  donemId,
  donemAdi,
}: {
  menuLabel: string
  donemId: number
  donemAdi: string
}) {
  const supabase = await createClient()
  const sema = await aktifOrganizasyonSemasiYukle(supabase)

  return (
    <DenetimOrganizasyonSemasiClient
      baslik={`${menuLabel} — ${donemAdi}`}
      aciklama="Aktif organizasyon yapısı ve müdür iletişim bilgileri."
      organizasyonAdi={sema?.organizasyonAdi ?? null}
      birimler={sema?.birimler ?? []}
      geriHref={`/denetim/donemler/${donemId}`}
      geriLabel="← Dönem"
    />
  )
}
