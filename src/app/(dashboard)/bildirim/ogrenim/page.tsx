import { createClient } from '@/lib/supabase/server'
import OgrenimClient from '@/components/bildirim/OgrenimClient'
import { sortBildirimOgrenimList } from '@/lib/ogrenim-sira'
import { ogrenimGuncelle, ogrenimSil } from './actions'

export default async function OgrenimPage() {
  const supabase = await createClient()

  const [{ data: raw }, { data: ogrenimTurleriRaw }] = await Promise.all([
    supabase.from('calisan_ogrenim').select('*, calisan(ad_soyad)').order('sicil_no', { ascending: true }),
    supabase.from('tanim_ogrenim').select('id, isim').order('isim'),
  ])

  const kayitlar = sortBildirimOgrenimList(
    (raw ?? []).map((r) => ({
      id: r.id,
      sicil_no: r.sicil_no,
      ogrenim_turu: r.ogrenim_turu,
      okul_adi: r.okul_adi,
      bolum: r.bolum,
      mezuniyet_yili: r.mezuniyet_yili,
      mezuniyet_tarihi: r.mezuniyet_tarihi ?? null,
      meslegi: r.meslegi ?? null,
      varsayilan: r.varsayilan ?? false,
      aktif: r.aktif,
      kayit_zamani: r.kayit_zamani,
      ad_soyad: (r.calisan as { ad_soyad: string | null } | null)?.ad_soyad ?? null,
    }))
  )

  return (
    <OgrenimClient
      kayitlar={kayitlar}
      ogrenimTurleri={(ogrenimTurleriRaw ?? []) as { id: number; isim: string }[]}
      onGuncelle={ogrenimGuncelle}
      onSil={ogrenimSil}
    />
  )
}
