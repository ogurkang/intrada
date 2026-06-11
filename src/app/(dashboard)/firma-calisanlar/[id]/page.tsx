import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import FirmaCalisanDetayView from '@/components/personel/FirmaCalisanDetayView'
import { loadFirmaCalisanDetayPageData, resolveFirmaCalisanRouteSegment } from '@/lib/firma-calisan-load'

export default async function FirmaPersonelDetayPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: rawSegment } = await params
  const supabase = await createClient()
  const resolved = await resolveFirmaCalisanRouteSegment(supabase, rawSegment)
  if ('redirect' in resolved) redirect(resolved.redirect)
  const detail = await loadFirmaCalisanDetayPageData(supabase, resolved.id)
  if (!detail) notFound()
  return (
    <FirmaCalisanDetayView
      row={detail.row}
      auditLoglar={detail.auditLoglar}
      yerleskeMap={detail.yerleskeMap}
    />
  )
}
