import { notFound } from 'next/navigation'
import PpPfGostergeFormSayfa from '../../../gosterge-form-sayfa'

export const dynamic = 'force-dynamic'

export default async function PpPfGostergeYeniPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const p = await params
  const faaliyetId = Number.parseInt(p.id, 10)
  if (!Number.isFinite(faaliyetId)) notFound()
  return <PpPfGostergeFormSayfa faaliyetId={faaliyetId} />
}
