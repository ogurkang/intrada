import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimOrganizasyonSemasiClient from '@/components/denetim/DenetimOrganizasyonSemasiClient'
import { aktifOrganizasyonSemasiYukle } from '@/lib/organizasyon-aktif-yukle'

export const dynamic = 'force-dynamic'

export default async function DonemOrganizasyonSemasiPage({
  params,
}: {
  params: Promise<{ donemId: string }>
}) {
  const donemId = Number.parseInt((await params).donemId, 10)
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()

  const supabase = await createClient()
  const [{ data: donem }, { data: menu }, sema] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi').eq('id', donemId).maybeSingle(),
    supabase
      .from('denetim_donem_menu')
      .select('baslik, aciklama')
      .eq('donem_id', donemId)
      .eq('sistem_anahtari', 'organizasyon-semasi')
      .maybeSingle(),
    aktifOrganizasyonSemasiYukle(supabase),
  ])
  if (!donem) notFound()

  return (
    <DenetimOrganizasyonSemasiClient
      baslik={`${menu?.baslik ?? 'Organizasyon Şeması'} — ${donem.donem_adi}`}
      aciklama={menu?.aciklama}
      organizasyonAdi={sema?.organizasyonAdi ?? null}
      birimler={sema?.birimler ?? []}
      geriHref={`/denetim/donemler/${donemId}`}
      geriLabel="← Dönem"
    />
  )
}
