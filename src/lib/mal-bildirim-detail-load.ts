import type { SupabaseClient } from '@supabase/supabase-js'
import type { MalDetayKayit } from '@/components/bildirim/MalDetayClient'
import { parseMalBildirimRouteParam } from '@/lib/mal-bildirim-route'

export type MalBildirimUrlParsedOk = Extract<ReturnType<typeof parseMalBildirimRouteParam>, { ok: true }>

/** Mal bildirimi detay kaydı — liste ve detay sayfaları ortak kullanır. */
export async function fetchMalBildirimDetayKayit(
  supabase: SupabaseClient,
  parsed: MalBildirimUrlParsedOk,
): Promise<MalDetayKayit | null> {
  let q = supabase
    .from('mal_bildirimi')
    .select(
      'id, public_id, sicil_no, son_net_maas, beyan_turu, onay_tarihi, aciklama, kimlik_json, tasinmaz_json, kooperatif_json, tasitlar_json, diger_tasinirlar_json, banka_menkul_json, altin_mucevher_json, borc_alacak_json, haklar_json, calisan(ad_soyad, tckn)',
    )
  q = parsed.by === 'public_id' ? q.eq('public_id', parsed.public_id) : q.eq('id', parsed.id)

  const { data: r, error } = await q.single()
  if (error || !r) return null

  const cal = r.calisan as unknown as { ad_soyad: string | null; tckn: string | null } | null
  return {
    id: r.id,
    public_id: r.public_id,
    sicil_no: r.sicil_no,
    ad_soyad: cal?.ad_soyad ?? null,
    tckn: cal?.tckn ?? null,
    son_net_maas: r.son_net_maas,
    beyan_turu: r.beyan_turu,
    onay_tarihi: r.onay_tarihi,
    aciklama: r.aciklama,
    kimlik_json: r.kimlik_json,
    tasinmaz_json: r.tasinmaz_json,
    kooperatif_json: r.kooperatif_json,
    tasitlar_json: r.tasitlar_json,
    diger_tasinirlar_json: r.diger_tasinirlar_json,
    banka_menkul_json: r.banka_menkul_json,
    altin_mucevher_json: r.altin_mucevher_json,
    borc_alacak_json: r.borc_alacak_json,
    haklar_json: r.haklar_json,
  }
}

/** `app_links` yoksa veya eski URL: slug doğrudan mal public_id / sayısal id olabilir. */
export function parseSlugAsMalParam(slug: string): MalBildirimUrlParsedOk | null {
  const p = parseMalBildirimRouteParam(slug)
  return p.ok ? p : null
}
