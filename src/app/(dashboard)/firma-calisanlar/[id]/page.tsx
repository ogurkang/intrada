import { createClient } from '@/lib/supabase/server'
import FirmaCalisanDetayView from '@/components/personel/FirmaCalisanDetayView'
import { loadFirmaCalisanDetayPageOrRedirect } from '@/lib/firma-calisan-load'

export default async function FirmaPersonelDetayPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id: rawSegment } = await params
  const supabase = await createClient()
  const row = await loadFirmaCalisanDetayPageOrRedirect(supabase, rawSegment)
  return <FirmaCalisanDetayView row={row} />
}
