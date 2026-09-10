import { fetchAllCalisanOgrenim, fetchAllPaged } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import OgrenimClient from '@/components/bildirim/OgrenimClient'
import { sortBildirimOgrenimList, sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { ogrenimGuncelle, ogrenimSil, ogrenimTopluGuncelle } from './actions'

export default async function OgrenimPage() {
  const supabase = await createClient()

  const [{ data: raw }, { data: ogrenimTurleriRaw }, { data: ayrilanPh }, { data: kadroOzet }] = await Promise.all([
    fetchAllCalisanOgrenim(supabase, '*, calisan(ad_soyad, tckn)'),
    supabase.from('tanim_ogrenim').select('id, isim'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').not('ayrilis_tarihi', 'is', null),
    fetchAllPaged<{ sicil_no: string; kadro_unvani: string | null; gorev_unvani: string | null }>((from, to) =>
      supabase
        .from('personel_kadro_ozet')
        .select('sicil_no, kadro_unvani, gorev_unvani')
        .order('sicil_no')
        .range(from, to),
    ),
  ])

  const ayrilanSet = new Set((ayrilanPh ?? []).map(r => r.sicil_no))
  const kadroBySicil = new Map<string, { kadro_unvani: string | null; gorev_unvani: string | null }>()
  for (const k of kadroOzet ?? []) {
    if (!kadroBySicil.has(k.sicil_no)) kadroBySicil.set(k.sicil_no, k)
  }

  const kayitlar = sortBildirimOgrenimList(
    (raw ?? [])
      .filter(r => !ayrilanSet.has(r.sicil_no))
      .map((r) => {
        const kadro = kadroBySicil.get(r.sicil_no)
        return {
          id: r.id,
          sicil_no: r.sicil_no,
          ogrenim_turu: r.ogrenim_turu,
          okul_adi: r.okul_adi,
          bolum: r.bolum,
          mezuniyet_yili: r.mezuniyet_yili,
          mezuniyet_tarihi: r.mezuniyet_tarihi ?? null,
          meslegi: r.meslegi ?? null,
          varsayilan: r.varsayilan ?? false,
          kadrosu_ile_ilgili: r.kadrosu_ile_ilgili ?? false,
          teknik_ogrenim: r.teknik_ogrenim ?? false,
          aktif: r.aktif,
          kayit_zamani: r.kayit_zamani,
          ad_soyad: (r.calisan as { ad_soyad: string | null; tckn: string | null } | null)?.ad_soyad ?? null,
          tckn: (r.calisan as { ad_soyad: string | null; tckn: string | null } | null)?.tckn ?? null,
          kadro_unvani: kadro?.kadro_unvani ?? null,
          gorev_unvani: kadro?.gorev_unvani ?? null,
        }
      })
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
      onTopluKaydet={ogrenimTopluGuncelle}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
