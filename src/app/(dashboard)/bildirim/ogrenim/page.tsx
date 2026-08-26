import { fetchAllCalisanOgrenim } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import OgrenimClient from '@/components/bildirim/OgrenimClient'
import { sortBildirimOgrenimList, sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { ogrenimGuncelle, ogrenimSil } from './actions'

export default async function OgrenimPage() {
  const supabase = await createClient()

  const [{ data: raw }, { data: ogrenimTurleriRaw }, { data: ayrilanPh }] = await Promise.all([
    fetchAllCalisanOgrenim(supabase, '*, calisan(ad_soyad, tckn)'),
    supabase.from('tanim_ogrenim').select('id, isim'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').not('ayrilis_tarihi', 'is', null),
  ])

  const ayrilanSet = new Set((ayrilanPh ?? []).map(r => r.sicil_no))

  const kayitlar = sortBildirimOgrenimList(
    (raw ?? [])
      .filter(r => !ayrilanSet.has(r.sicil_no))
      .map((r) => ({
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
      ad_soyad: (r.calisan as { ad_soyad: string | null; tckn: string | null } | null)?.ad_soyad ?? null,
      tckn: (r.calisan as { ad_soyad: string | null; tckn: string | null } | null)?.tckn ?? null,
    }))
  )

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'calisan_ogrenim',
    kayitlar.map(k => String(k.id)),
  )

  return (
    <OgrenimClient
      kayitlar={kayitlar}
      ogrenimTurleri={sortTanimOgrenimByIsim(
        (ogrenimTurleriRaw ?? []) as { id: number; isim: string }[],
      )}
      onGuncelle={ogrenimGuncelle}
      onSil={ogrenimSil}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
