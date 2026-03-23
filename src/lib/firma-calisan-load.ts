import { notFound, redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'
import { isUuidSegment } from '@/lib/personel-link'

export async function resolveFirmaCalisanRouteSegment(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<{ id: number } | { redirect: string }> {
  const decoded = decodeURIComponent(rawSegment.trim())
  if (isUuidSegment(decoded)) {
    const { data } = await supabase
      .from('firma_calisanlar')
      .select('id, public_id')
      .eq('public_id', decoded)
      .maybeSingle()
    if (data?.public_id) {
      return { redirect: `/link/${data.public_id}` }
    }
    notFound()
  }
  const idNum = parseInt(decoded, 10)
  if (Number.isNaN(idNum)) notFound()
  return { id: idNum }
}

export async function resolveFirmaCalisanSegmentToId(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<number> {
  const decoded = decodeURIComponent(rawSegment.trim())
  if (isUuidSegment(decoded)) {
    const { data } = await supabase.from('firma_calisanlar').select('id').eq('public_id', decoded).maybeSingle()
    if (data?.id != null) return data.id
    notFound()
  }
  const idNum = parseInt(decoded, 10)
  if (Number.isNaN(idNum)) notFound()
  return idNum
}

export async function fetchFirmaCalisanById(
  supabase: SupabaseClient,
  id: number,
): Promise<Tables<'firma_calisanlar'> | null> {
  const { data, error } = await supabase.from('firma_calisanlar').select('*').eq('id', id).single()
  if (error || !data) return null
  return data as Tables<'firma_calisanlar'>
}

export async function loadFirmaCalisanDetayPageOrRedirect(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<Tables<'firma_calisanlar'>> {
  const resolved = await resolveFirmaCalisanRouteSegment(supabase, rawSegment)
  if ('redirect' in resolved) redirect(resolved.redirect)
  const row = await fetchFirmaCalisanById(supabase, resolved.id)
  if (!row) notFound()
  return row
}
