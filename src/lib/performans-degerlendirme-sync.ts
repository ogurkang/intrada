import type { SupabaseClient } from '@supabase/supabase-js'
import { performansAmirEsle, type OrgBirimSatir } from '@/lib/performans-amir'
import {
  performansDegerlendirmeAmirCanli,
  performansOrgBaglamiYukle,
} from '@/lib/performans-degerlendirme-amir-canli'
import {
  kadroMudurlukIndeksi,
  mudurlukByNormHaritasi,
  performansKadroUygun,
  performansKadroSatirlariIndeksi,
  performansPersonelEtkinUnvan,
  performansMudurlukCoz,
  tumAktifKadroHareketleriYukle,
} from '@/lib/performans-kadro'
import { performansKriterKodlari, type PerformansFormTipi } from '@/lib/performans'
import { tryCreateServiceRoleClient } from '@/lib/supabase/service-role'

type KadroSatir = {
  durumu?: string | null
  statu?: string | null
  kadro_unvani?: string | null
  gorev_unvani?: string | null
  gorev_mudurlugu?: string | null
  asil?: string | null
  vekil?: string | null
  kadro_mudurlugu?: string | null
}

/** Açık dönemde kadrodaki eksik kayıtları ekler, müdürlük ve amir alanlarını günceller (revalidate yok). */
export async function performansDonemKayitlariSenkronize(
  supabase: SupabaseClient,
  donemId: number,
): Promise<{ eklenen: number; amirGuncellenen: number; mudurlukGuncellenen: number; hata?: string }> {
  const yaz = tryCreateServiceRoleClient() ?? supabase

  const { data: kriterler } = await yaz
    .from('performans_kriter')
    .select('id, kod')
    .eq('aktif', true)
  const kriterByKod = new Map<number, number>(
    (kriterler ?? []).map((k: { id: number; kod: number }) => [k.kod, k.id]),
  )

  const { data: aktifOrg } = await yaz
    .from('tanim_organizasyon')
    .select('id')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: birimRaw } = aktifOrg?.id
    ? await yaz
        .from('tanim_organizasyon_birim')
        .select(
          'id, birim_turu, mudurluk_id, personel_sicil_no, ust_birim_id, mudurluk:tanim_mudurluk(id, mudurluk_adi)',
        )
        .eq('organizasyon_id', aktifOrg.id)
    : { data: [] }
  const birimler = (birimRaw ?? []) as unknown as OrgBirimSatir[]

  const { data: mudRaw } = await yaz.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true)
  const mudurlukByNorm = mudurlukByNormHaritasi(
    (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean) as string[],
  )

  const kadroRows = await tumAktifKadroHareketleriYukle<KadroSatir>(
    yaz,
    'durumu, statu, kadro_unvani, gorev_unvani, gorev_mudurlugu, asil, vekil, kadro_mudurlugu',
  )

  const kadrolar = kadroRows.filter(k => performansKadroUygun(k))
  const kadroIndeks = kadroMudurlukIndeksi(kadrolar, mudurlukByNorm)

  const { data: mevcutRows } = await yaz
    .from('performans_degerlendirme')
    .select('id, sicil_no, mudurluk_adi, form_tipi, amir1_sicil, amir2_sicil, tek_amir')
    .eq('donem_id', donemId)

  const mevcutSet = new Set((mevcutRows ?? []).map(m => m.sicil_no))

  const eklenecek: {
    donem_id: number
    sicil_no: string
    mudurluk_adi: string | null
    form_tipi: PerformansFormTipi
    amir1_sicil: string | null
    amir2_sicil: string | null
    tek_amir: boolean
    durum: string
  }[] = []

  for (const [sicil, k] of performansKadroSatirlariIndeksi(kadrolar)) {
    if (mevcutSet.has(sicil)) continue

    const mudurlukAdi = performansMudurlukCoz(k, mudurlukByNorm)
    const unvan = performansPersonelEtkinUnvan(sicil, mudurlukAdi, kadrolar, mudurlukByNorm)
    const esleme = performansAmirEsle({
      sicilNo: sicil,
      unvan,
      mudurlukAdi,
      birimler,
      kadroRows: kadrolar,
    })

    eklenecek.push({
      donem_id: donemId,
      sicil_no: sicil,
      mudurluk_adi: mudurlukAdi,
      form_tipi: esleme.formTipi,
      amir1_sicil: esleme.amir1_sicil,
      amir2_sicil: esleme.tek_amir ? null : esleme.amir2_sicil,
      tek_amir: esleme.tek_amir,
      durum: 'beklemede_1',
    })
  }

  let eklenen = 0
  let mudurlukGuncellenen = 0
  let amirGuncellenen = 0
  if (eklenecek.length > 0) {
    const { data: inserted, error } = await yaz
      .from('performans_degerlendirme')
      .insert(eklenecek)
      .select('id, form_tipi')
    if (error) return { eklenen: 0, amirGuncellenen: 0, mudurlukGuncellenen: 0, hata: error.message }

    const puanRows: { degerlendirme_id: number; kriter_id: number }[] = []
    for (const row of inserted ?? []) {
      const kodlar = performansKriterKodlari(row.form_tipi as PerformansFormTipi)
      for (const kod of kodlar) {
        const kid = kriterByKod.get(kod)
        if (kid) puanRows.push({ degerlendirme_id: row.id, kriter_id: kid })
      }
    }
    if (puanRows.length > 0) {
      const { error: pErr } = await yaz.from('performans_puan').insert(puanRows)
      if (pErr) return { eklenen: 0, amirGuncellenen: 0, mudurlukGuncellenen: 0, hata: pErr.message }
    }
    eklenen = eklenecek.length
  }

  for (const row of mevcutRows ?? []) {
    const kadro = kadroIndeks.get(row.sicil_no)
    const mud = kadro?.mudurluk_adi ?? null
    if (!mud || row.mudurluk_adi === mud) continue
    const { error } = await yaz
      .from('performans_degerlendirme')
      .update({ mudurluk_adi: mud, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (error) return { eklenen, amirGuncellenen, mudurlukGuncellenen, hata: error.message }
    mudurlukGuncellenen++
  }

  const { birimler: orgBirimler, kadrolar: orgKadrolar, mudurlukByNorm: orgMudNorm } =
    await performansOrgBaglamiYukle(yaz)

  const { data: tumRows } = await yaz
    .from('performans_degerlendirme')
    .select('id, sicil_no, mudurluk_adi, form_tipi, amir1_sicil, amir2_sicil, tek_amir')
    .eq('donem_id', donemId)

  for (const row of tumRows ?? []) {
    const kadro = kadroIndeks.get(row.sicil_no)
    const mudurlukAdi = row.mudurluk_adi ?? kadro?.mudurluk_adi ?? null
    const esleme = performansDegerlendirmeAmirCanli(
      { sicil_no: row.sicil_no, mudurluk_adi: mudurlukAdi },
      { birimler: orgBirimler, kadrolar: orgKadrolar, mudurlukByNorm: orgMudNorm },
    )

    const patch = {
      form_tipi: esleme.formTipi,
      amir1_sicil: esleme.amir1_sicil,
      amir2_sicil: esleme.tek_amir ? null : esleme.amir2_sicil,
      tek_amir: esleme.tek_amir,
      updated_at: new Date().toISOString(),
    }

    const degisti =
      row.form_tipi !== patch.form_tipi ||
      row.amir1_sicil !== patch.amir1_sicil ||
      row.amir2_sicil !== patch.amir2_sicil ||
      row.tek_amir !== patch.tek_amir

    if (!degisti) continue

    const { error } = await yaz.from('performans_degerlendirme').update(patch).eq('id', row.id)
    if (error) return { eklenen, amirGuncellenen, mudurlukGuncellenen, hata: error.message }
    amirGuncellenen++
  }

  return { eklenen, amirGuncellenen, mudurlukGuncellenen }
}
