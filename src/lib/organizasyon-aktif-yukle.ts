import type { SupabaseClient } from '@supabase/supabase-js'
import {
  BIRIM_TURU_ETIKET,
  birimPersonelMetni,
  birimPersonelTelefonMetni,
  organizasyonPersonelIndeksKur,
  type BirimTuru,
  type KadroUnvanSatir,
  type OrganizasyonBirimSatir,
} from '@/lib/organizasyon-birim'

type BirimRow = {
  id: number
  mudurluk_id: number | null
  birim_turu: string
  personel_sicil_no: string | null
  ust_birim_id: number | null
  sira_no: number | null
  tanim_mudurluk: { mudurluk_adi: string } | null
}

export async function aktifOrganizasyonSemasiYukle(supabase: SupabaseClient): Promise<{
  organizasyonAdi: string
  birimler: OrganizasyonBirimSatir[]
} | null> {
  const { data: organizasyon } = await supabase
    .from('tanim_organizasyon')
    .select('id, organizasyon_adi')
    .eq('aktif', true)
    .order('id')
    .limit(1)
    .maybeSingle()

  if (!organizasyon) return null

  const [{ data: birimRaw }, { data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
    supabase
      .from('tanim_organizasyon_birim')
      .select('id, mudurluk_id, birim_turu, personel_sicil_no, ust_birim_id, sira_no, tanim_mudurluk ( mudurluk_adi )')
      .eq('organizasyon_id', organizasyon.id),
    supabase
      .from('kadro_hareketleri')
      .select(
        'durumu, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu, asil, vekil, asil_calisan:calisan!kadro_hareketleri_asil_fkey ( ad_soyad ), vekil_calisan:calisan!kadro_hareketleri_vekil_fkey ( ad_soyad )',
      )
      .in('durumu', ['Dolu', 'Vekil']),
    supabase.from('calisan').select('sicil_no, telefon'),
  ])

  const indeks = organizasyonPersonelIndeksKur((kadroRaw ?? []) as unknown as KadroUnvanSatir[])
  const sicilTelefon = new Map<string, string>()
  for (const c of calisanRaw ?? []) {
    const sicil = String(c.sicil_no ?? '').trim()
    if (!sicil) continue
    sicilTelefon.set(sicil, String(c.telefon ?? '').trim())
  }

  const birimler: OrganizasyonBirimSatir[] = ((birimRaw ?? []) as BirimRow[]).map(b => {
    const birim_turu = (b.birim_turu as BirimTuru) ?? 'mudurluk'
    const mudurlukAdi = b.tanim_mudurluk?.mudurluk_adi ?? null
    const ad =
      birim_turu === 'mudurluk' ? (mudurlukAdi ?? '(silinmiş müdürlük)') : BIRIM_TURU_ETIKET[birim_turu]
    return {
      id: b.id,
      birim_turu,
      mudurluk_id: b.mudurluk_id,
      personel_sicil_no: b.personel_sicil_no,
      ad,
      personel_adi: birimPersonelMetni(indeks, birim_turu, mudurlukAdi, b.personel_sicil_no),
      personel_telefon: birimPersonelTelefonMetni(
        indeks,
        sicilTelefon,
        birim_turu,
        mudurlukAdi,
        b.personel_sicil_no,
      ),
      ust_birim_id: b.ust_birim_id,
      sira_no: b.sira_no ?? 0,
    }
  })

  return { organizasyonAdi: organizasyon.organizasyon_adi, birimler }
}
