import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import PersonelHareketiListClient from '@/components/personel/PersonelHareketiListClient'
import { personelHareketIslemNo } from '@/lib/personel-hareket-islem-no'
import type { Tables } from '@/types/database'

type KH = Tables<'kadro_hareketleri'>
type PH = Tables<'personel_hareketleri'>

export default async function PersonelHareketiListPage() {
  const supabase = await createClient()

  const [{ data: kadroRaw }, { data: calisanRaw }, { data: hareketRaw }] = await Promise.all([
    fetchAllKadroHareketleri(supabase, '*', q => q.eq('statu', 'Memur').is('ayrilis_tarihi', null)),
    supabase
      .from('calisan')
      .select('sicil_no, ad_soyad'),
    supabase
      .from('personel_hareketleri')
      .select('id, sicil_no, hareket_tipi, kadro_id, kadro_rol, yururluk_tarihi, ise_baslama_tarihi, ayrilis_tarihi, yeni_gorev_yeri, yeni_unvan, eski_gorev_yeri, eski_unvan, aciklama, kayit_zamani')
      .order('kayit_zamani', { ascending: false }),
  ])

  const kadrolar = (kadroRaw ?? []) as KH[]
  const hareketler = (hareketRaw ?? []) as PH[]

  const adMap: Record<string, string> = {}
  ;(calisanRaw ?? []).forEach(c => { adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })

  type Satir = {
    rowKey: string; sicil_no: string; ad_soyad: string; hareket_tipi: string | null;
    kadro_id: number | null; kadro_rol: 'asil' | 'vekil' | 'yok';
    yururluk_tarihi: string | null; ise_baslama_tarihi: string | null;
    ayrilis_tarihi: string | null; yeni_gorev_yeri: string | null;
    yeni_unvan: string | null; eski_gorev_yeri: string | null;
    eski_unvan: string | null; aciklama: string | null; kayit_zamani: string;
    hareket_id: number | null; salt_okunur: boolean;
    ph_kadro_id: number | null; ph_kadro_rol: 'asil' | 'vekil' | null;
    islem_no: string;
  }

  const satirlar: Satir[] = []

  const kadroPhId = new Map<string, number>()
  for (const h of hareketler) {
    const kid = (h as { kadro_id?: number | null }).kadro_id
    const hid = (h as { id?: number }).id
    const sicil = h.sicil_no
    if (kid && hid && sicil) {
      const key = `${kid}:${sicil}`
      if (!kadroPhId.has(key)) kadroPhId.set(key, hid)
    }
  }

  kadrolar.forEach(k => {
    if (k.asil) {
      satirlar.push({
        rowKey:              `kadro-${k.id}-asil`,
        sicil_no:            k.asil,
        ad_soyad:            adMap[k.asil] ?? k.asil,
        hareket_tipi:        k.gelis_nedeni ?? k.durumu,
        kadro_id:            k.id,
        kadro_rol:           'asil',
        yururluk_tarihi:     k.memuriyet_tarihi ?? k.kuruma_giris_tarihi,
        ise_baslama_tarihi:  k.memuriyet_tarihi,
        ayrilis_tarihi:      k.ayrilis_tarihi,
        yeni_gorev_yeri:     k.gorev_mudurlugu ?? k.kadro_mudurlugu,
        yeni_unvan:          k.gorev_unvani ?? k.kadro_unvani,
        eski_gorev_yeri:     k.geldigi_yer,
        eski_unvan:          null,
        aciklama:            k.aciklama,
        kayit_zamani:        k.created_at ?? k.updated_at,
        hareket_id:          null,
        salt_okunur:         false,
        ph_kadro_id:         null,
        ph_kadro_rol:        null,
        islem_no:            personelHareketIslemNo(kadroPhId.get(`${k.id}:${k.asil}`) ?? null),
      })
    }
    if (k.vekil) {
      satirlar.push({
        rowKey:              `kadro-${k.id}-vekil`,
        sicil_no:            k.vekil,
        ad_soyad:            adMap[k.vekil] ?? k.vekil,
        hareket_tipi:        'Vekalet',
        kadro_id:            k.id,
        kadro_rol:           'vekil',
        yururluk_tarihi:     k.memuriyet_tarihi ?? k.kuruma_giris_tarihi,
        ise_baslama_tarihi:  k.memuriyet_tarihi,
        ayrilis_tarihi:      k.ayrilis_tarihi,
        yeni_gorev_yeri:     k.gorev_mudurlugu ?? k.kadro_mudurlugu,
        yeni_unvan:          k.gorev_unvani ?? k.kadro_unvani,
        eski_gorev_yeri:     null,
        eski_unvan:          null,
        aciklama:            k.aciklama,
        kayit_zamani:        k.created_at ?? k.updated_at,
        hareket_id:          null,
        salt_okunur:         false,
        ph_kadro_id:         null,
        ph_kadro_rol:        null,
        islem_no:            personelHareketIslemNo(kadroPhId.get(`${k.id}:${k.vekil}`) ?? null),
      })
    }
  })

  // Personel hareketi kayıtları listede her zaman görünsün (salt-okunur satırlar).
  const eklenenHareketId = new Set<number>()
  for (const h of hareketler) {
    const hid = Number((h as { id?: number }).id ?? 0)
    if (!Number.isFinite(hid) || hid <= 0 || eklenenHareketId.has(hid)) continue
    eklenenHareketId.add(hid)
    const sicil = String(h.sicil_no ?? '').trim()
    if (!sicil) continue
    satirlar.push({
      rowKey: `hareket-${hid}`,
      sicil_no: sicil,
      ad_soyad: adMap[sicil] ?? sicil,
      hareket_tipi: h.hareket_tipi ?? null,
      kadro_id: null,
      kadro_rol: 'yok',
      yururluk_tarihi: h.yururluk_tarihi ?? null,
      ise_baslama_tarihi: h.ise_baslama_tarihi ?? null,
      ayrilis_tarihi: h.ayrilis_tarihi ?? null,
      yeni_gorev_yeri: h.yeni_gorev_yeri ?? null,
      yeni_unvan: h.yeni_unvan ?? null,
      eski_gorev_yeri: h.eski_gorev_yeri ?? null,
      eski_unvan: h.eski_unvan ?? null,
      aciklama: h.aciklama ?? null,
      kayit_zamani: h.kayit_zamani ?? new Date(0).toISOString(),
      hareket_id: hid,
      salt_okunur: true,
      ph_kadro_id: (h as { kadro_id?: number | null }).kadro_id ?? null,
      ph_kadro_rol: ((h as { kadro_rol?: string | null }).kadro_rol === 'vekil' ? 'vekil' : (h as { kadro_rol?: string | null }).kadro_rol === 'asil' ? 'asil' : null),
      islem_no: personelHareketIslemNo(hid),
    })
  }

  satirlar.sort((a, b) => (parseInt(a.sicil_no, 10) || 0) - (parseInt(b.sicil_no, 10) || 0))

  const hareketTipleri = [...new Set(satirlar.map(h => h.hareket_tipi ?? '').filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'tr'))

  return (
    <PersonelHareketiListClient
      hareketler={satirlar}
      hareketTipleri={hareketTipleri}
    />
  )
}
