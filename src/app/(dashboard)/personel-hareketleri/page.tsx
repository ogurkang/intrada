import { createClient } from '@/lib/supabase/server'
import PersonelHareketiListClient from '@/components/personel/PersonelHareketiListClient'
import type { Tables } from '@/types/database'

type KH = Tables<'kadro_hareketleri'>

export default async function PersonelHareketiListPage() {
  const supabase = await createClient()

  const [{ data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
    supabase
      .from('kadro_hareketleri')
      .select('*')
      .eq('statu', 'Memur')
      .is('ayrilis_tarihi', null),
    supabase
      .from('calisan')
      .select('sicil_no, ad_soyad'),
  ])

  const kadrolar = (kadroRaw ?? []) as KH[]

  const adMap: Record<string, string> = {}
  ;(calisanRaw ?? []).forEach(c => { adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })

  type Satir = {
    id: number; sicil_no: string; ad_soyad: string; hareket_tipi: string | null;
    kadro_id: number; kadro_rol: 'asil' | 'vekil';
    yururluk_tarihi: string | null; ise_baslama_tarihi: string | null;
    ayrilis_tarihi: string | null; yeni_gorev_yeri: string | null;
    yeni_unvan: string | null; eski_gorev_yeri: string | null;
    eski_unvan: string | null; aciklama: string | null; kayit_zamani: string;
  }

  const satirlar: Satir[] = []

  kadrolar.forEach(k => {
    if (k.asil) {
      satirlar.push({
        id:                  k.id * 10 + 1,
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
      })
    }
    if (k.vekil) {
      satirlar.push({
        id:                  k.id * 10 + 2,
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
      })
    }
  })

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
