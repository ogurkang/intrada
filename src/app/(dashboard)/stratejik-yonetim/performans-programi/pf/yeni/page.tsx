import { notFound } from 'next/navigation'
import PpPerformansFaaliyetFormSayfa from '../form-sayfa'

export const dynamic = 'force-dynamic'

export default async function PpPerformansFaaliyetYeniPage({
  searchParams,
}: {
  searchParams: Promise<{ bag?: string }>
}) {
  const sp = await searchParams
  const bagId = Number.parseInt(sp.bag ?? '', 10)
  if (!Number.isFinite(bagId)) notFound()
  return <PpPerformansFaaliyetFormSayfa bagId={bagId} />
}
