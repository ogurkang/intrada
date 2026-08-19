import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { denetimHarcamaYetkilileriMenuMu } from '@/lib/harcama-yetkilileri-liste'

export default async function DonemOrganizasyonSemasiPage({
  params,
}: {
  params: Promise<{ donemId: string }>
}) {
  const donemId = Number.parseInt((await params).donemId, 10)
  if (!Number.isFinite(donemId) || donemId <= 0) notFound()

  const supabase = await createClient()
  const { data: menuler } = await supabase
    .from('denetim_donem_menu')
    .select('id, slug, baslik')
    .eq('donem_id', donemId)

  const harcama = (menuler ?? []).find(m => denetimHarcamaYetkilileriMenuMu(m))
  if (harcama) redirect(`/denetim/donemler/${donemId}/m/${harcama.id}`)
  redirect(`/denetim/donemler/${donemId}`)
}
