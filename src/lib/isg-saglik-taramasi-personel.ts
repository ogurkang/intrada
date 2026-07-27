import type { SupabaseClient } from '@supabase/supabase-js'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'

const IZIN_STATULER = new Set(['Memur', 'Sözleşmeli', 'İşçi'])

export type IsgSaglikTaramasiPersonel = {
  sicil_no: string
  ad_soyad: string
  statu: string
  mudurluk: string | null
}

/** Memur, sözleşmeli ve işçi statüsündeki aktif kadro personeli. */
export async function isgSaglikTaramasiAktifPersonelYukle(
  supabase: SupabaseClient,
): Promise<IsgSaglikTaramasiPersonel[]> {
  const D = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw }, { data: phRaw }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
  ])

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) {
      sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw as any ?? []) as {
    sicil_no: string
    ad_soyad: string | null
  }[]
  const aktifSiciller = new Set<string>()
  for (const c of calisanFiltreli) {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis || sonAyrilis > D) aktifSiciller.add(c.sicil_no)
  }

  const adMap = new Map(calisanFiltreli.map(c => [c.sicil_no, c.ad_soyad ?? c.sicil_no]))

  const sicilList = [...aktifSiciller]
  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (let i = 0; i < sicilList.length; i += 120) {
    const part = sicilList.slice(i, i + 120)
    const { data: kRows } = await supabase
      .from('kadro_hareketleri')
      .select(
        'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, kadro_mudurlugu, gorev_mudurlugu',
      )
      .in('asil', part)
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as KadroRaporRow)
      kadroByAsil.set(r.asil, list)
    }
  }

  const personeller: IsgSaglikTaramasiPersonel[] = []
  for (const sicil of sicilList) {
    const rows = kadroByAsil.get(sicil) ?? []
    const sec = secilenKadroSatirAsil(rows, D)
    if (!sec?.statu || !IZIN_STATULER.has(sec.statu)) continue
    personeller.push({
      sicil_no: sicil,
      ad_soyad: adMap.get(sicil) ?? sicil,
      statu: sec.statu,
      mudurluk: sec.gorev_mudurlugu ?? sec.kadro_mudurlugu ?? null,
    })
  }

  return personeller.sort((a, b) => {
    const sm = (a.mudurluk ?? '').localeCompare(b.mudurluk ?? '', 'tr')
    if (sm !== 0) return sm
    return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
  })
}
