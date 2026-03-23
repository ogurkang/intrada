import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MalBildirimFormClient, { type MalDuzenleInitial } from '@/components/bildirim/MalBildirimFormClient'
import { malBildirimGuncelle } from '../../actions'
import { parseMalBildirimRouteParam } from '@/lib/mal-bildirim-route'
import { getAppAccess, isAdminLike } from '@/lib/app-access'

interface Props {
  params: Promise<{ id: string }>
}

/** @see bildirim/mal/[id]/page.tsx — React 19 dev Performance ölçümü için `Page` adı. */
export default async function Page({ params }: Props) {
  const { id } = await params
  const parsed = parseMalBildirimRouteParam(id)
  if (!parsed.ok) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  let q = supabase
    .from('mal_bildirimi')
    .select('id, public_id, sicil_no, son_net_maas, kimlik_json, tasinmaz_json, kooperatif_json, tasitlar_json, diger_tasinirlar_json, banka_menkul_json, altin_mucevher_json, borc_alacak_json, haklar_json, aciklama, beyan_turu, onay_tarihi, calisan(ad_soyad, tckn, dogum_tarihi, dogum_yeri)')
  q = parsed.by === 'public_id' ? q.eq('public_id', parsed.public_id) : q.eq('id', parsed.id)

  const { data: r, error } = await q.single()

  if (error || !r) notFound()

  if (!isAdminLike(access)) {
    if (access.mode !== 'kullanici') notFound()
    if (String(access.sicilNo).trim() !== String(r.sicil_no).trim()) notFound()
  }

  const cal = r.calisan as {
    ad_soyad: string | null
    tckn: string | null
    dogum_tarihi: string | null
    dogum_yeri: string | null
  } | null

  const { data: khList } = await supabase
    .from('kadro_hareketleri')
    .select('gorev_unvani, kadro_unvani, statu, durumu, asil')
    .eq('durumu', 'Dolu')
    .eq('asil', r.sicil_no)

  const memurKadro = (khList ?? []).find(
    k => String((k as { statu?: string }).statu ?? '').trim().toLowerCase() === 'memur',
  ) as { gorev_unvani?: string; kadro_unvani?: string } | undefined

  const gorev_unvani =
    memurKadro?.gorev_unvani ?? memurKadro?.kadro_unvani ?? ''

  const initial: MalDuzenleInitial = {
    id: r.id,
    public_id: r.public_id,
    sicil_no: r.sicil_no,
    ad_soyad: cal?.ad_soyad ?? null,
    tckn: cal?.tckn ?? null,
    dogum_tarihi: cal?.dogum_tarihi ?? null,
    dogum_yeri: cal?.dogum_yeri ?? null,
    gorev_unvani,
    son_net_maas: r.son_net_maas,
    kimlik_json: r.kimlik_json,
    tasinmaz_json: r.tasinmaz_json,
    kooperatif_json: r.kooperatif_json,
    tasitlar_json: r.tasitlar_json,
    diger_tasinirlar_json: r.diger_tasinirlar_json,
    banka_menkul_json: r.banka_menkul_json,
    altin_mucevher_json: r.altin_mucevher_json,
    borc_alacak_json: r.borc_alacak_json,
    haklar_json: r.haklar_json,
    aciklama: r.aciklama,
    beyan_turu: r.beyan_turu,
    onay_tarihi: r.onay_tarihi,
  }

  return (
    <MalBildirimFormClient
      mode="edit"
      initial={initial}
      onGuncelle={malBildirimGuncelle}
    />
  )
}
