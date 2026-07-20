import type { SupabaseClient } from '@supabase/supabase-js'
import { getPasaportPersonel, listPasaportPersonel } from '@/lib/pasaport-personel'
import { personelAdresGosterimMetni, type MahalleTanimSatir } from '@/lib/personel-adres'

export interface MemurBildirimPersonel {
  sicil_no: string
  ad_soyad: string
  tckn: string | null
  adres: string | null
}

async function mahalleHaritasi(
  supabase: SupabaseClient,
  mahalleIds: number[],
): Promise<Map<number, MahalleTanimSatir>> {
  const map = new Map<number, MahalleTanimSatir>()
  const ids = [...new Set(mahalleIds.filter(id => Number.isInteger(id) && id > 0))]
  if (!ids.length) return map

  const { data } = await supabase
    .from('tanim_adres_mahalle')
    .select('id, il, ilce, mahalle_adi, aktif')
    .in('id', ids)

  for (const row of data ?? []) {
    map.set(row.id, row as MahalleTanimSatir)
  }
  return map
}

function calisanAdresMetni(
  calisan: { adresi?: string | null; mahalle_id?: number | null; adres_detay?: string | null },
  mahalleMap: Map<number, MahalleTanimSatir>,
): string | null {
  const mahalle =
    calisan.mahalle_id != null ? mahalleMap.get(calisan.mahalle_id) ?? null : null
  const metin = personelAdresGosterimMetni(mahalle, calisan.adres_detay, calisan.adresi)
  if (!metin || metin === '—') return null
  return metin
}

/** Yalnızca memur statüsünde kadrosu olan personel — adres dahil. */
export async function listMemurBildirimPersonel(
  supabase: SupabaseClient,
): Promise<MemurBildirimPersonel[]> {
  const pasaportList = await listPasaportPersonel(supabase)
  if (!pasaportList.length) return []

  const siciller = pasaportList.map(p => p.sicil_no)
  const { data: calisanlar } = await supabase
    .from('calisan')
    .select('sicil_no, adresi, mahalle_id, adres_detay')
    .in('sicil_no', siciller)

  const mahalleIds = (calisanlar ?? [])
    .map(c => c.mahalle_id)
    .filter((id): id is number => id != null)
  const mahalleMap = await mahalleHaritasi(supabase, mahalleIds)

  const adresBySicil = new Map<string, string | null>()
  for (const c of calisanlar ?? []) {
    adresBySicil.set(c.sicil_no, calisanAdresMetni(c, mahalleMap))
  }

  return pasaportList.map(p => ({
    sicil_no: p.sicil_no,
    ad_soyad: p.ad_soyad,
    tckn: p.tckn,
    adres: adresBySicil.get(p.sicil_no) ?? null,
  }))
}

/** Tek memur personel + adres (kullanıcı kendi formu). */
export async function getMemurBildirimPersonel(
  supabase: SupabaseClient,
  sicil_no: string,
): Promise<MemurBildirimPersonel | null> {
  const pasaport = await getPasaportPersonel(supabase, sicil_no)
  if (!pasaport || pasaport.kadrolar.length === 0) return null

  const { data: calisan } = await supabase
    .from('calisan')
    .select('sicil_no, adresi, mahalle_id, adres_detay')
    .eq('sicil_no', pasaport.sicil_no)
    .maybeSingle()

  let adres: string | null = null
  if (calisan) {
    const mahalleMap = await mahalleHaritasi(
      supabase,
      calisan.mahalle_id != null ? [calisan.mahalle_id] : [],
    )
    adres = calisanAdresMetni(calisan, mahalleMap)
  }

  return {
    sicil_no: pasaport.sicil_no,
    ad_soyad: pasaport.ad_soyad,
    tckn: pasaport.tckn,
    adres,
  }
}
