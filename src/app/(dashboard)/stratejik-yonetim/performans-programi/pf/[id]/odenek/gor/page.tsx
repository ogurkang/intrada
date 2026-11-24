import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Eski faaliyet ödenek görüntüleme → gösterge listesi */
export default async function PpPfOdenekGorRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const p = await params
  const faaliyetId = Number.parseInt(p.id, 10)
  redirect(`/stratejik-yonetim/performans-programi/pf/${faaliyetId}/gostergeler`)
}
