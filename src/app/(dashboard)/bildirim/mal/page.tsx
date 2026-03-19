import { createClient } from '@/lib/supabase/server'
import MalClient, { type MalBildirimi } from '@/components/bildirim/MalClient'
import { malBildirimEkle, malBildirimGuncelle, malBildirimSil } from './actions'

type JsonSatir = Record<string, string>

function toArr(v: unknown): JsonSatir[] {
  return Array.isArray(v) ? (v as JsonSatir[]) : []
}

export default async function MalPage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('mal_bildirimi')
    .select('*, calisan(ad_soyad)')
    .order('sicil_no', { ascending: true })

  const kayitlar: MalBildirimi[] = (raw ?? [])
    .map(r => ({
    id:                    r.id,
    sicil_no:              r.sicil_no,
    ad_soyad:              (r.calisan as { ad_soyad: string | null } | null)?.ad_soyad ?? null,
    beyan_turu:            r.beyan_turu,
    onay_tarihi:           r.onay_tarihi,
    son_net_maas:          r.son_net_maas,
    aciklama:              r.aciklama,
    kimlik_json:           toArr(r.kimlik_json),
    tasinmaz_json:         toArr(r.tasinmaz_json),
    kooperatif_json:       toArr(r.kooperatif_json),
    tasitlar_json:         toArr(r.tasitlar_json),
    diger_tasinirlar_json: toArr(r.diger_tasinirlar_json),
    banka_menkul_json:     toArr(r.banka_menkul_json),
    altin_mucevher_json:   toArr(r.altin_mucevher_json),
    borc_alacak_json:      toArr(r.borc_alacak_json),
    haklar_json:           toArr(r.haklar_json),
    kayit_zamani:          r.kayit_zamani,
  }))
    .sort((a, b) => String(a.sicil_no).localeCompare(String(b.sicil_no), undefined, { numeric: true }))

  return (
    <MalClient
      kayitlar={kayitlar}
      onEkle={malBildirimEkle}
      onGuncelle={malBildirimGuncelle}
      onSil={malBildirimSil}
    />
  )
}
