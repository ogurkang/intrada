import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchAllCalisan,
  fetchAllCalisanOgrenim,
  fetchAllFirmaCalisanlar,
  fetchAllKadroHareketleri,
  fetchAllPersonelHareketleri,
} from '@/lib/supabase-sayfala'
import type {
  CalisanRaporRow,
  FirmaRaporRow,
  KadroRaporRow,
  PersonelHareketRaporRow,
  TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

export const KADRO_RAPOR_SELECT =
  'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu'

export const PERSONEL_HAREKET_RAPOR_SELECT = 'sicil_no, ayrilis_tarihi, ise_baslama_tarihi'

export function birlestirPersonelHareketleri(
  phAyr: PersonelHareketRaporRow[] | null | undefined,
  phIse: PersonelHareketRaporRow[] | null | undefined,
): PersonelHareketRaporRow[] {
  const phSeen = new Set<string>()
  const personelHareketleri: PersonelHareketRaporRow[] = []
  for (const r of [...(phAyr ?? []), ...(phIse ?? [])]) {
    const key = `${r.sicil_no}|${String(r.ayrilis_tarihi ?? '')}|${String(r.ise_baslama_tarihi ?? '')}`
    if (phSeen.has(key)) continue
    phSeen.add(key)
    personelHareketleri.push({
      sicil_no: r.sicil_no,
      ayrilis_tarihi: r.ayrilis_tarihi,
      ise_baslama_tarihi: r.ise_baslama_tarihi,
    })
  }
  return personelHareketleri
}

function yilAraligi(yil: number) {
  return { bas: `${yil}-01-01`, son: `${yil}-12-31` }
}

export async function yukleYilPersonelHareketleri(
  supabase: SupabaseClient,
  yil: number,
): Promise<PersonelHareketRaporRow[]> {
  const { bas, son } = yilAraligi(yil)
  const [phAyr, phIse] = await Promise.all([
    fetchAllPersonelHareketleri<PersonelHareketRaporRow>(
      supabase,
      PERSONEL_HAREKET_RAPOR_SELECT,
      q => q.not('ayrilis_tarihi', 'is', null).gte('ayrilis_tarihi', bas).lte('ayrilis_tarihi', son),
    ),
    fetchAllPersonelHareketleri<PersonelHareketRaporRow>(
      supabase,
      PERSONEL_HAREKET_RAPOR_SELECT,
      q =>
        q.not('ise_baslama_tarihi', 'is', null).gte('ise_baslama_tarihi', bas).lte('ise_baslama_tarihi', son),
    ),
  ])
  return birlestirPersonelHareketleri(phAyr.data, phIse.data)
}

export async function yukleRaporKadroAsil<T = KadroRaporRow>(
  supabase: SupabaseClient,
  select: string = KADRO_RAPOR_SELECT,
): Promise<T[]> {
  const { data } = await fetchAllKadroHareketleri<T>(supabase, select, q => q.not('asil', 'is', null))
  return data
}

/** Statü matris raporları: kadro + çalışan + firma + yıl personel hareketleri. */
export async function yukleRaporMatrisKaynak<C = CalisanRaporRow, F = FirmaRaporRow>(
  supabase: SupabaseClient,
  yil: number,
  opts: {
    calisanSelect: string
    firmaSelect: string
    kadroSelect?: string
    withTanimStatu?: boolean
  },
): Promise<{
  tanimStatu: TanimStatuRow[]
  kadro: KadroRaporRow[]
  calisan: C[]
  firma: F[]
  personelHareketleri: PersonelHareketRaporRow[]
}> {
  const kadroSelect = opts.kadroSelect ?? KADRO_RAPOR_SELECT
  const withTanimStatu = opts.withTanimStatu !== false

  const [statuRes, kadro, calisanRes, firmaRes, personelHareketleri] = await Promise.all([
    withTanimStatu
      ? supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true)
      : Promise.resolve({ data: [] as TanimStatuRow[] }),
    yukleRaporKadroAsil<KadroRaporRow>(supabase, kadroSelect),
    fetchAllCalisan<C>(supabase, opts.calisanSelect),
    fetchAllFirmaCalisanlar<F>(supabase, opts.firmaSelect),
    yukleYilPersonelHareketleri(supabase, yil),
  ])

  return {
    tanimStatu: (statuRes.data ?? []) as TanimStatuRow[],
    kadro,
    calisan: calisanRes.data,
    firma: firmaRes.data,
    personelHareketleri,
  }
}

export async function yukleCalisanOgrenim<T>(supabase: SupabaseClient, select: string): Promise<T[]> {
  const { data } = await fetchAllCalisanOgrenim<T>(supabase, select)
  return data
}
