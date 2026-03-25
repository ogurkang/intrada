import { createClient } from '@/lib/supabase/server'
import OgrenimClient from '@/components/bildirim/OgrenimClient'
import { ogrenimEkle, ogrenimGuncelle, ogrenimSil } from './actions'

export default async function OgrenimPage() {
  const supabase = await createClient()

  const { data: personellerRaw } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad')
    .order('ad_soyad')

  const { data: raw } = await supabase
    .from('calisan_ogrenim')
    .select('*, calisan(ad_soyad)')
    .order('sicil_no', { ascending: true })

  const kayitlar = (raw ?? [])
    .map(r => ({
    id:                 r.id,
    sicil_no:           r.sicil_no,
    ogrenim_turu:       r.ogrenim_turu,
    okul_adi:           r.okul_adi,
    bolum:              r.bolum,
    mezuniyet_yili:     r.mezuniyet_yili,
    mezuniyet_tarihi:   (r as { mezuniyet_tarihi?: string | null }).mezuniyet_tarihi ?? null,
    aktif:              r.aktif,
    kayit_zamani:       r.kayit_zamani,
    ad_soyad:           (r.calisan as { ad_soyad: string | null } | null)?.ad_soyad ?? null,
  }))
    .sort((a, b) => String(a.sicil_no).localeCompare(String(b.sicil_no), undefined, { numeric: true }))

  return (
    <OgrenimClient
      kayitlar={kayitlar}
      personeller={(personellerRaw ?? []) as { sicil_no: string; ad_soyad: string }[]}
      onEkle={ogrenimEkle}
      onGuncelle={ogrenimGuncelle}
      onSil={ogrenimSil}
    />
  )
}
