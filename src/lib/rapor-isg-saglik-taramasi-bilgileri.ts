import type { SupabaseClient } from '@supabase/supabase-js'
import { isgSaglikTaramasiAktifPersonelYukle } from '@/lib/isg-saglik-taramasi-personel'
import type { TehlikeSinifi } from '@/lib/rapor-tehlike-sinifi'

export type IsgSaglikTaramasiBilgiSatir = {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  tehlike_sinifi: string
  tarama: 'Evet' | 'Hayır'
  muayene: 'Evet' | 'Hayır'
}

const TEHLIKE_DEFAULT: TehlikeSinifi = 'Az Tehlikeli'

function donemYildaMi(baslangic: string, bitis: string, yil: number): boolean {
  const bY = Number.parseInt(baslangic.slice(0, 4), 10)
  const eY = Number.parseInt(bitis.slice(0, 4), 10)
  return bY <= yil && eY >= yil
}

/** Seçilen yıldaki sağlık taraması dönemlerine göre aktif personel özeti. */
export async function isgSaglikTaramasiBilgiSnapshot(
  supabase: SupabaseClient,
  yil: number,
): Promise<IsgSaglikTaramasiBilgiSatir[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: donemRaw }, { data: mudRaw }, personeller] = await Promise.all([
    sb
      .from('isg_saglik_taramasi_donem')
      .select('id, baslangic_tarihi, bitis_tarihi')
      .order('baslangic_tarihi', { ascending: true }),
    supabase.from('tanim_mudurluk').select('mudurluk_adi, tehlike_sinifi').eq('aktif', true),
    isgSaglikTaramasiAktifPersonelYukle(supabase),
  ])

  const donemIds = (donemRaw ?? [])
    .filter((d: { baslangic_tarihi: string; bitis_tarihi: string }) =>
      donemYildaMi(d.baslangic_tarihi, d.bitis_tarihi, yil),
    )
    .map((d: { id: number }) => d.id)

  const tehlikeByMud = new Map<string, string>()
  for (const m of mudRaw ?? []) {
    tehlikeByMud.set(m.mudurluk_adi, m.tehlike_sinifi ?? TEHLIKE_DEFAULT)
  }

  const taramaBySicil = new Map<string, boolean>()
  const muayeneBySicil = new Map<string, boolean>()

  if (donemIds.length) {
    const { data: kayitRaw } = await sb
      .from('isg_saglik_taramasi_kayit')
      .select('sicil_no, tarama, muayene')
      .in('donem_id', donemIds)

    for (const k of kayitRaw ?? []) {
      const sicil = String(k.sicil_no ?? '').trim()
      if (!sicil) continue
      if (k.tarama) taramaBySicil.set(sicil, true)
      if (k.muayene) muayeneBySicil.set(sicil, true)
    }
  }

  return personeller.map(p => {
    const mud = p.mudurluk ?? 'Belirtilmemiş'
    return {
      sicil_no: p.sicil_no,
      ad_soyad: p.ad_soyad,
      mudurluk: mud,
      tehlike_sinifi: tehlikeByMud.get(mud) ?? TEHLIKE_DEFAULT,
      tarama: taramaBySicil.get(p.sicil_no) ? 'Evet' : 'Hayır',
      muayene: muayeneBySicil.get(p.sicil_no) ? 'Evet' : 'Hayır',
    }
  })
}
