import { notFound } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'
import { isUuidSegment } from '@/lib/personel-link'
import { yukleKadroIsgalGecmisi, type KadroIsgalKaydi } from '@/lib/kadro-isgal-gecmisi'

export type KadroDetayPageData = {
  row: Tables<'kadro_hareketleri'>
  adMap: Record<string, string>
  personeller: { sicil_no: string; ad_soyad: string }[]
  statuler: string[]
  mudurluler: string[]
  unvanlar: { id: number; unvan_adi: string; sinif_adi: string | null }[]
  gelisNedenleri: string[]
  ayrilisNedenleri: string[]
  auditLoglar: Tables<'personel_audit_log'>[]
  isgalGecmisi: KadroIsgalKaydi[]
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
    { data: auditLogRaw },
  ] = await Promise.all([
    supabase.from('kadro_hareketleri').select('*').eq('id', idNum).single(),
    supabase.from('kadro_hareketleri').select('gelis_nedeni, ayrilis_nedeni'),
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('tanim_statu').select('statu_adi').eq('aktif', true).order('statu_adi'),
    supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true).order('mudurluk_adi'),
    supabase.from('tanim_unvan').select('id, unvan_adi').eq('aktif', true).order('sira_no').order('unvan_adi'),
    supabase
      .from('personel_audit_log')
      .select('*')
      .eq('ref_table', 'kadro_hareketleri')
      .eq('ref_id', String(idNum))
      .order('created_at', { ascending: false }),
  ])

  if (error || !k) return null
  const row = k as Tables<'kadro_hareketleri'>
  if (
    row.kadro_sira_no &&
    !row.kadro_unvani &&
    !row.gorev_unvani &&
    !row.kadro_mudurlugu &&
    !row.gorev_mudurlugu
  ) {
    const { data: fallbackRows } = await supabase
      .from('kadro_hareketleri')
      .select('kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu')
      .eq('kadro_sira_no', row.kadro_sira_no)
      .order('updated_at', { ascending: false })
      .limit(20)
    const fb = (fallbackRows ?? []).find((r) =>
      Boolean(r.kadro_unvani || r.gorev_unvani || r.kadro_mudurlugu || r.gorev_mudurlugu),
    )
    if (fb) {
      row.kadro_unvani = row.kadro_unvani ?? fb.kadro_unvani
      row.gorev_unvani = row.gorev_unvani ?? fb.gorev_unvani
      row.kadro_mudurlugu = row.kadro_mudurlugu ?? fb.kadro_mudurlugu
      row.gorev_mudurlugu = row.gorev_mudurlugu ?? fb.gorev_mudurlugu
    }
  }
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

  const auditLoglar = (auditLogRaw ?? []) as Tables<'personel_audit_log'>[]
  const isgalGecmisi = await yukleKadroIsgalGecmisi(supabase, row, adMap, auditLoglar)

  return {
    row,
    adMap,
    personeller: (calisanRaw ?? []) as { sicil_no: string; ad_soyad: string }[],
    statuler: (statuRaw ?? []).map((s: { statu_adi: string }) => s.statu_adi),
    mudurluler: (mudurRaw ?? []).map((m: { mudurluk_adi: string }) => m.mudurluk_adi),
    unvanlar: (unvanRaw ?? []).map((u) => {
      const r = u as { id: number; unvan_adi: string; sinif_adi?: string | null }
      return { id: r.id, unvan_adi: r.unvan_adi, sinif_adi: r.sinif_adi ?? null }
    }),
    gelisNedenleri,
    ayrilisNedenleri,
    auditLoglar,
    isgalGecmisi,
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
