import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isUuidSegment } from '@/lib/personel-link'

/** `/izin/[id]` ve `/izin/[id]/duzenle` → canonical `/link/{public_id}` */
export async function resolveIzinHareketSegment(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<{ idNum: number } | { redirect: string }> {
  const decoded = decodeURIComponent(rawSegment.trim())
  if (isUuidSegment(decoded)) {
    const { data } = await supabase
      .from('izin_hareketleri')
      .select('id, public_id')
      .eq('public_id', decoded)
      .maybeSingle()
    if (data?.public_id) return { redirect: `/link/${data.public_id}` }
    notFound()
  }
  const idNum = parseInt(decoded, 10)
  if (Number.isNaN(idNum)) notFound()
  const { data } = await supabase
    .from('izin_hareketleri')
    .select('public_id')
    .eq('id', idNum)
    .maybeSingle()
  if (data?.public_id) return { redirect: `/link/${data.public_id}` }
  return { idNum }
}
