import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpPerformansFaaliyetFormSayfa from '../form-sayfa'

export const dynamic = 'force-dynamic'

export default async function PpPerformansFaaliyetDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const p = await params
  const id = Number.parseInt(p.id, 10)
  if (!Number.isFinite(id)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('performans_programi_pf_faaliyet').select('id, bag_id').eq('id', id).maybeSingle()
  const bagId = Number(data?.bag_id)
  if (!data || !Number.isFinite(bagId)) notFound()
  return <PpPerformansFaaliyetFormSayfa bagId={bagId} faaliyetId={id} />
}
