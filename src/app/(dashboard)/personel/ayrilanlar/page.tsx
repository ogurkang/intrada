import { createClient } from '@/lib/supabase/server'
import { filterOutGodmodeSicilList } from '@/lib/godmode-calisan'
import AyrılanlarClient from '@/components/personel/AyrılanlarClient'
import { personelAktifEt } from './actions'
import { personelPasifMi } from '@/lib/personel-ayrilis'

export interface AyrılanSatır {
  sicil_no:        string
  public_id:       string | null
  ad_soyad:        string
  statu:           string | null
  kadro_unvani:    string | null
  gorev_mudurlugu: string | null
  ayrilis_tarihi:  string | null
  ayrilis_nedeni:  string | null
}

export default async function AyrılanlarPage() {
  const supabase = await createClient()

  // Ayrılan personeli personel_hareketleri üzerinden bul
  const { data: phRaw } = await supabase
    .from('personel_hareketleri')
    .select('sicil_no, ayrilis_tarihi, ayrilis_nedeni, yururluk_tarihi, kayit_zamani')
    .order('yururluk_tarihi', { ascending: false })
    .order('kayit_zamani', { ascending: false })

  if (!phRaw || phRaw.length === 0) {
    return <AyrılanlarClient ayrilanlar={[]} />
  }

  // Tekil sicil_no listesi (en son hareket kaydı; pasif = tarih + nedeni birlikte dolu)
  const sicilMap = new Map<string, { ayrilis_tarihi: string | null; ayrilis_nedeni: string | null }>()
  for (const r of phRaw) {
    if (!sicilMap.has(r.sicil_no)) {
      sicilMap.set(r.sicil_no, {
        ayrilis_tarihi: r.ayrilis_tarihi,
        ayrilis_nedeni: r.ayrilis_nedeni,
      })
    }
  }
  const pasifSiciller = [...sicilMap.entries()]
    .filter(([, ozet]) => personelPasifMi(ozet))
    .map(([sicil]) => sicil)

  if (pasifSiciller.length === 0) {
    return <AyrılanlarClient ayrilanlar={[]} />
  }
  const siciller = filterOutGodmodeSicilList(pasifSiciller)

  // Calisan temel bilgilerini çek
  const { data: calisanRaw } = await supabase
    .from('calisan')
    .select('sicil_no, public_id, ad_soyad')
    .in('sicil_no', siciller)

  // Kadro bilgilerini çek (son kayıt)
  const { data: kadroRaw } = await supabase
    .from('personel_kadro_ozet')
    .select('sicil_no, statu, kadro_unvani, gorev_mudurlugu')
    .in('sicil_no', siciller)

  const calisanMap = new Map((calisanRaw ?? []).map(c => [c.sicil_no, c]))
  const kadroMap   = new Map((kadroRaw   ?? []).map(k => [k.sicil_no, k]))

  const ayrilanlar: AyrılanSatır[] = siciller.map(sicil => {
    const calisan = calisanMap.get(sicil)
    const kadro   = kadroMap.get(sicil)
    const ph      = sicilMap.get(sicil)!
    return {
      sicil_no:        sicil,
      public_id:       calisan?.public_id ?? null,
      ad_soyad:        calisan?.ad_soyad ?? sicil,
      statu:           kadro?.statu ?? null,
      kadro_unvani:    kadro?.kadro_unvani ?? null,
      gorev_mudurlugu: kadro?.gorev_mudurlugu ?? null,
      ayrilis_tarihi:  ph.ayrilis_tarihi,
      ayrilis_nedeni:  ph.ayrilis_nedeni,
    }
  }).sort((a, b) => (b.ayrilis_tarihi ?? '').localeCompare(a.ayrilis_tarihi ?? '', 'tr'))

  return <AyrılanlarClient ayrilanlar={ayrilanlar} onAktifEt={personelAktifEt} />
}
