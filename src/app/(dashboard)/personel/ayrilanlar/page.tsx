import { createClient } from '@/lib/supabase/server'
import { filterOutGodmodeSicilList } from '@/lib/godmode-calisan'
import AyrılanlarClient from '@/components/personel/AyrılanlarClient'
import { personelAktifEt } from './actions'

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
    .select('sicil_no, ayrilis_tarihi')
    .not('ayrilis_tarihi', 'is', null)
    .order('ayrilis_tarihi', { ascending: false })

  if (!phRaw || phRaw.length === 0) {
    return <AyrılanlarClient ayrilanlar={[]} />
  }

  // Tekil sicil_no listesi (en son ayrılış kaydını al)
  const sicilMap = new Map<string, { ayrilis_tarihi: string | null }>()
  for (const r of phRaw) {
    if (!sicilMap.has(r.sicil_no)) {
      sicilMap.set(r.sicil_no, { ayrilis_tarihi: r.ayrilis_tarihi })
    }
  }
  const siciller = filterOutGodmodeSicilList([...sicilMap.keys()])

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
      ayrilis_nedeni:  null,
    }
  }).sort((a, b) => (b.ayrilis_tarihi ?? '').localeCompare(a.ayrilis_tarihi ?? '', 'tr'))

  return <AyrılanlarClient ayrilanlar={ayrilanlar} onAktifEt={personelAktifEt} />
}
