import { fetchAllFirmaCalisanlar } from '@/lib/supabase-sayfala'
import type { SupabaseClient } from '@supabase/supabase-js'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import {
  mudurlukByNormHaritasi,
  personelKadroGorevIndeksi,
  performansKadroUygun,
  performansMudurKadroIndeksi,
  tumAktifKadroHareketleriYukle,
} from '@/lib/performans-kadro'
import { trNormalize } from '@/lib/turkce-search'

export type HayaletProfilPersonelSatir = {
  sicil_no: string
  ad_soyad: string
  gorev_unvani: string | null
  gorev_mudurlugu: string | null
}

type KadroSatir = {
  asil?: string | null
  vekil?: string | null
  statu?: string | null
  durumu?: string | null
  gorev_unvani?: string | null
  kadro_unvani?: string | null
  gorev_mudurlugu?: string | null
  kadro_mudurlugu?: string | null
}

/** Hayalet profil listesine dahil statüler (işçi / firma personeli hariç). */
const HAYALET_PROFIL_STATU_NORM = new Set(
  ['Belediye Başkanı', 'Meclis Üyesi', 'Memur', 'Sözleşmeli'].map(trNormalize),
)

function hayaletProfilStatuUygun(statu: string | null | undefined): boolean {
  return HAYALET_PROFIL_STATU_NORM.has(trNormalize(statu))
}

function hayaletKadroSatirGosterim(k: KadroSatir): { unvan: string | null; mudurluk: string | null } {
  const unvan = String(k.gorev_unvani ?? k.kadro_unvani ?? '').trim() || null
  const mudurluk = String(k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '').trim() || null
  return { unvan, mudurluk }
}

/** Hayalet profil seçim listesi: aktif kadrolu personel (asil/vekil); yalnızca izinli statüler. */
export async function hayaletProfilPersonelListesi(
  supabase: SupabaseClient,
): Promise<HayaletProfilPersonelSatir[]> {
  const [{ data: calisanlarRaw }, { data: phRaw }, kadroRaw, { data: firmaRaw }, { data: mudRaw }] =
    await Promise.all([
      supabase.from('calisan').select('sicil_no, ad_soyad').order('sicil_no'),
      supabase
        .from('personel_hareketleri')
        .select('sicil_no, ayrilis_tarihi')
        .order('yururluk_tarihi', { ascending: false }),
      tumAktifKadroHareketleriYukle<KadroSatir>(
        supabase,
        'asil, vekil, statu, durumu, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu',
        { durumu: ['Dolu', 'Vekil'] },
      ),
      fetchAllFirmaCalisanlar(supabase, 'sicil_no'),
      supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true),
    ])

  const calisanlar = filterOutGodmodeCalisan(calisanlarRaw ?? [])
  const calisanMap = new Map(calisanlar.map(c => [c.sicil_no, c]))

  // Personel hareketi olmayan (başkan/BY vb.) veya son hareketi açık olan siciller aktif sayılır.
  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) {
      sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
    }
  }
  const aktifSiciller = new Set<string>()
  for (const c of calisanlar) {
    const ayrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (ayrilis === undefined || ayrilis === null) {
      aktifSiciller.add(c.sicil_no)
    }
  }

  const firmaSiciller = new Set(
    (firmaRaw ?? []).map(f => String(f.sicil_no ?? '').trim()).filter(Boolean),
  )

  const mudurlukByNorm = mudurlukByNormHaritasi(
    (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean) as string[],
  )

  const kadroHayalet = kadroRaw.filter(
    k => hayaletProfilStatuUygun(k.statu) && (k.durumu === 'Dolu' || k.durumu === 'Vekil'),
  )
  const kadroMemur = kadroHayalet.filter(k => performansKadroUygun(k))

  const mudurIndeks = performansMudurKadroIndeksi(kadroMemur, mudurlukByNorm)
  const gorevIndeks = personelKadroGorevIndeksi(kadroHayalet, mudurlukByNorm, mudurIndeks)

  const sicilSet = new Set<string>()
  for (const k of kadroHayalet) {
    for (const sicil of [k.asil, k.vekil]) {
      const sn = String(sicil ?? '').trim()
      if (!sn || !aktifSiciller.has(sn) || firmaSiciller.has(sn)) continue
      sicilSet.add(sn)
    }
  }

  const personeller: HayaletProfilPersonelSatir[] = []
  for (const sn of sicilSet) {
    const c = calisanMap.get(sn)
    if (!c) continue

    const gorev = gorevIndeks.get(sn)
    if (gorev?.unvan) {
      personeller.push({
        sicil_no: sn,
        ad_soyad: c.ad_soyad ?? sn,
        gorev_unvani: gorev.unvan,
        gorev_mudurlugu: gorev.mudurluk_adi,
      })
      continue
    }

    for (const k of kadroHayalet) {
      const asil = String(k.asil ?? '').trim()
      const vekil = String(k.vekil ?? '').trim()
      if (asil !== sn && vekil !== sn) continue
      const { unvan, mudurluk } = hayaletKadroSatirGosterim(k)
      personeller.push({
        sicil_no: sn,
        ad_soyad: c.ad_soyad ?? sn,
        gorev_unvani: unvan,
        gorev_mudurlugu: mudurluk,
      })
      break
    }
  }

  return personeller.sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))
}
