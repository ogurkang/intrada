import { notFound } from 'next/navigation'
import PpPfGostergeFormSayfa from '../../../gosterge-form-sayfa'

export const dynamic = 'force-dynamic'

export default async function PpPfGostergeDuzenlePage({
  params,
}: {
  params: Promise<{ id: string; gostergeId: string }>
}) {
  const p = await params
  const faaliyetId = Number.parseInt(p.id, 10)
  const gostergeId = Number.parseInt(p.gostergeId, 10)
  if (!Number.isFinite(faaliyetId) || !Number.isFinite(gostergeId)) notFound()
  return <PpPfGostergeFormSayfa faaliyetId={faaliyetId} gostergeId={gostergeId} />
}
