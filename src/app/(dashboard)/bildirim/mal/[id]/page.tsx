import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MalDetayClient, { type MalDetayKayit } from '@/components/bildirim/MalDetayClient'
import { parseMalBildirimRouteParam } from '@/lib/mal-bildirim-route'

interface Props {
  params: Promise<{ id: string }>
}

/** İsim `Page` tutulur: React 19 geliştirme modunda özel isimlerle `performance.measure` bazen negatif süre hatası verebiliyor. */
export default async function Page({ params }: Props) {
  const { id } = await params
  const parsed = parseMalBildirimRouteParam(id)
  if (!parsed.ok) notFound()

  const supabase = await createClient()

  let q = supabase
    .from('mal_bildirimi')
    .select('id, public_id, sicil_no, son_net_maas, beyan_turu, onay_tarihi, aciklama, kimlik_json, tasinmaz_json, kooperatif_json, tasitlar_json, diger_tasinirlar_json, banka_menkul_json, altin_mucevher_json, borc_alacak_json, haklar_json, calisan(ad_soyad, tckn)')
  q = parsed.by === 'public_id' ? q.eq('public_id', parsed.public_id) : q.eq('id', parsed.id)

  const { data: r, error } = await q.single()

  if (error || !r) notFound()

  const cal = r.calisan as { ad_soyad: string | null; tckn: string | null } | null
  const kayit: MalDetayKayit = {
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

  return <MalDetayClient kayit={kayit} />
}
