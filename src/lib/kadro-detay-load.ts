import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'
import { isUuidSegment } from '@/lib/personel-link'

export type KadroDetayPageData = {
  row: Tables<'kadro_hareketleri'>
  adMap: Record<string, string>
  personeller: { sicil_no: string; ad_soyad: string }[]
  statuler: string[]
  mudurluler: string[]
  unvanlar: { id: number; unvan_adi: string }[]
  gelisNedenleri: string[]
  ayrilisNedenleri: string[]
}

export async function loadKadroDetayPageData(
  supabase: SupabaseClient,
  idNum: number,
): Promise<KadroDetayPageData | null> {
  const [
    { data: k, error },
    { data: kadroRaw },
    { data: calisanRaw },
    { data: statuRaw },
    { data: mudurRaw },
    { data: unvanRaw },
  ] = await Promise.all([
    supabase.from('kadro_hareketleri').select('*').eq('id', idNum).single(),
    supabase.from('kadro_hareketleri').select('gelis_nedeni, ayrilis_nedeni'),
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('tanim_statu').select('statu_adi').eq('aktif', true).order('statu_adi'),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    supabase.from('tanim_unvan').select('id, unvan_adi').eq('aktif', true).order('sira_no').order('unvan_adi'),
  ])

  if (error || !k) return null
  const row = k as Tables<'kadro_hareketleri'>
  const adMap: Record<string, string> = {}
  ;(calisanRaw ?? []).forEach((p: { sicil_no: string; ad_soyad: string }) => {
    adMap[p.sicil_no] = p.ad_soyad
  })

  const gelisNedenleri = [
    ...new Set(
      (kadroRaw ?? []).map((r: { gelis_nedeni: string | null }) => r.gelis_nedeni).filter(Boolean),
    ),
  ] as string[]
  gelisNedenleri.sort((a, b) => (a ?? '').localeCompare(b ?? '', 'tr'))
  const ayrilisNedenleri = [
    ...new Set(
      (kadroRaw ?? []).map((r: { ayrilis_nedeni: string | null }) => r.ayrilis_nedeni).filter(Boolean),
    ),
  ] as string[]
  ayrilisNedenleri.sort((a, b) => (a ?? '').localeCompare(b ?? '', 'tr'))

  return {
    row,
    adMap,
    personeller: (calisanRaw ?? []) as { sicil_no: string; ad_soyad: string }[],
    statuler: (statuRaw ?? []).map((s: { statu_adi: string }) => s.statu_adi),
    mudurluler: (mudurRaw ?? []).map((m: { mudurluk_adi: string }) => m.mudurluk_adi),
    unvanlar: (unvanRaw ?? []).map((u: { id: number; unvan_adi: string }) => ({
      id: u.id,
      unvan_adi: u.unvan_adi,
    })),
    gelisNedenleri,
    ayrilisNedenleri,
  }
}

/**
 * `/kadro/[param]`: UUID veya sayısal id → canonical `/link/{public_id}` veya id ile devam.
 */
export async function resolveKadroRouteSegment(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<{ idNum: number } | { redirect: string }> {
  const decoded = decodeURIComponent(rawSegment.trim())
  if (isUuidSegment(decoded)) {
    const { data } = await supabase
      .from('kadro_hareketleri')
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
  const { data } = await supabase
    .from('kadro_hareketleri')
    .select('public_id')
    .eq('id', idNum)
    .maybeSingle()
  if (data?.public_id) {
    return { redirect: `/link/${data.public_id}` }
  }
  return { idNum }
}
