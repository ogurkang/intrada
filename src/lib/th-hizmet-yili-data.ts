import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { unvanSinifiThMi } from '@/lib/kazanc-yan-odeme'
import { personelAktifMi, sonAyrilisHaritasiOlustur } from '@/lib/personel-ayrilis'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import type { ThHizmetYiliSatir } from '@/lib/th-hizmet-yili'

export type { ThHizmetYiliSatir }

function kadroAktifMi(ayrilis: string | null | undefined, bugun: string): boolean {
  const t = String(ayrilis ?? '').trim().slice(0, 10)
  if (!t) return true
  return t > bugun
}

export async function yukleThHizmetYiliBekleyenler(
  supabase: SupabaseClient<Database>,
): Promise<ThHizmetYiliSatir[]> {
  const bugun = new Date().toISOString().slice(0, 10)
  const { data: unvanlar } = await supabase.from('tanim_unvan').select('id, sinif_adi').eq('aktif', true)
  const thIds = (unvanlar ?? []).filter(u => unvanSinifiThMi(u.sinif_adi)).map(u => u.id)
  if (!thIds.length) return []

  const { data: khRows } = await supabase
    .from('kadro_hareketleri')
    .select('asil, kadro_unvani, gorev_unvani, ayrilis_tarihi')
    .in('kadro_unvan_id', thIds)
    .eq('durumu', 'Dolu')
    .not('asil', 'is', null)

  const thAsil = new Map<string, { kadro_unvani: string | null; gorev_unvani: string | null }>()
  for (const k of khRows ?? []) {
    const sicil = String(k.asil ?? '').trim()
    if (!sicil || !kadroAktifMi(k.ayrilis_tarihi, bugun)) continue
    if (!thAsil.has(sicil)) thAsil.set(sicil, { kadro_unvani: k.kadro_unvani, gorev_unvani: k.gorev_unvani })
  }
  const siciller = [...thAsil.keys()]
  if (!siciller.length) return []

  const [{ data: calisanlar }, { data: phRaw }] = await Promise.all([
    supabase
      .from('calisan')
      .select('sicil_no, public_id, ad_soyad, tckn, th_hizmet_baslangic')
      .in('sicil_no', siciller)
      .is('th_hizmet_baslangic', null),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi, ayrilis_nedeni, yururluk_tarihi')
      .in('sicil_no', siciller)
      .order('yururluk_tarihi', { ascending: false }),
  ])

  const sonAyrilis = sonAyrilisHaritasiOlustur(phRaw ?? [])
  const calisanBySicil = new Map((calisanlar ?? []).map(c => [c.sicil_no, c]))

  const out: ThHizmetYiliSatir[] = []
  for (const [sicil, unvan] of thAsil) {
    if (!personelAktifMi(sonAyrilis.get(sicil))) continue
    const c = calisanBySicil.get(sicil)
    if (!c) continue
    out.push({
      sicil_no: c.sicil_no,
      public_id: c.public_id,
      ad_soyad: c.ad_soyad,
      tckn: c.tckn ?? null,
      deger: null,
      kadro_unvani: unvan.kadro_unvani,
      gorev_unvani: unvan.gorev_unvani,
    })
  }

  return filterOutGodmodeCalisan(out)
}

export async function thHizmetYiliMenuAcikMi(
  supabase: SupabaseClient<Database>,
): Promise<boolean> {
  const liste = await yukleThHizmetYiliBekleyenler(supabase)
  return liste.length > 0
}

export async function asilKadroThMi(
  supabase: SupabaseClient<Database>,
  sicilNo: string,
): Promise<boolean> {
  const bugun = new Date().toISOString().slice(0, 10)
  const { data: kh } = await supabase
    .from('kadro_hareketleri')
    .select('kadro_unvan_id, durumu, ayrilis_tarihi')
    .eq('asil', sicilNo.trim())
    .eq('durumu', 'Dolu')
    .limit(5)
  const aktif = (kh ?? []).find(k => kadroAktifMi(k.ayrilis_tarihi, bugun))
  if (!aktif?.kadro_unvan_id) return false
  const { data: unvan } = await supabase
    .from('tanim_unvan')
    .select('sinif_adi')
    .eq('id', aktif.kadro_unvan_id)
    .maybeSingle()
  return unvanSinifiThMi(unvan?.sinif_adi)
}
