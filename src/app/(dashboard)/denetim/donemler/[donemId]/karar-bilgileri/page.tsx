import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DenetimBolumHubClient from '@/components/denetim/DenetimBolumHubClient'
import { denetimDonemBolumler, denetimMenuYolu, type DenetimMenuChild, type DenetimMenuIkonAnahtar } from '@/lib/denetim'

export default async function DonemKararBilgileriPage({
  params,
}: {
  params: Promise<{ donemId: string }>
}) {
  const donemId = Number.parseInt((await params).donemId, 10)
  if (!Number.isFinite(donemId)) notFound()

  const supabase = await createClient()
  const [{ data: donem }, { data: parent }] = await Promise.all([
    supabase.from('denetim_donem').select('id, donem_adi').eq('id', donemId).maybeSingle(),
    supabase
      .from('denetim_donem_menu')
      .select('*')
      .eq('donem_id', donemId)
      .eq('sistem_anahtari', 'karar-bilgileri')
      .maybeSingle(),
  ])
  if (!donem) notFound()

  let kartlar: DenetimMenuChild[] = denetimDonemBolumler(donemId).find(b => b.href.endsWith('/karar-bilgileri'))?.children ?? []
  if (parent) {
    const { data: children } = await supabase
      .from('denetim_donem_menu')
      .select('*')
      .eq('parent_id', parent.id)
      .order('sira_no')
    if (children?.length) {
      kartlar = children.map(c => ({
        href: denetimMenuYolu(donemId, c),
        label: c.baslik,
        aciklama: c.aciklama ?? undefined,
        ikon: (c.ikon as DenetimMenuIkonAnahtar | null) ?? undefined,
      }))
    }
  }
  if (!kartlar.length) notFound()

  return (
    <DenetimBolumHubClient
      baslik={`${parent?.baslik ?? 'Karar Bilgileri'} — ${donem.donem_adi}`}
      aciklama={parent?.aciklama ?? 'Encümen ve meclis kararları; aylık belge yükleme.'}
      geriHref={`/denetim/donemler/${donemId}`}
      geriLabel="← Dönem"
      kartlar={kartlar}
    />
  )
}
