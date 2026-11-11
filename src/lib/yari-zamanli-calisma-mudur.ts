import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mudurlukBazEslesir,
  mudurlukEslesmeBaz,
  unvanMudurEslesmeBaz,
} from '@/lib/organizasyon-birim'
import { performansMudurUnvaniMi } from '@/lib/performans-unvan'
import { fetchAllCalisan, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'

export type YzcMudurBilgi = { ad_soyad: string; unvan: string }

type KadroSatir = {
  asil: string | null
  vekil: string | null
  kadro_unvani: string | null
  gorev_unvani: string | null
  kadro_mudurlugu: string | null
  gorev_mudurlugu: string | null
}

/**
 * Personelin görev müdürlüğünde unvanında «müdürü» geçen aktif kadro kaydını bulur.
 * Önce görev unvanı, yoksa kadro unvanı; asil tercih edilir.
 */
export async function yzcMudurlukMuduruBul(
  supabase: SupabaseClient,
  mudurlukAdi: string,
): Promise<YzcMudurBilgi | null> {
  const hedefBaz = mudurlukEslesmeBaz(mudurlukAdi)
  if (!hedefBaz) return null

  const [kadroRes, calisanRes] = await Promise.all([
    fetchAllKadroHareketleri<KadroSatir>(
      supabase,
      'asil, vekil, kadro_unvani, gorev_unvani, kadro_mudurlugu, gorev_mudurlugu',
      q => q.is('ayrilis_tarihi', null),
    ),
    fetchAllCalisan<{ sicil_no: string; ad_soyad: string | null }>(supabase, 'sicil_no, ad_soyad'),
  ])

  const adBySicil = new Map(
    (calisanRes.data ?? []).map(c => [String(c.sicil_no).trim(), String(c.ad_soyad ?? '').trim()]),
  )

  type Aday = { sicil: string; ad: string; unvan: string; asilMi: boolean; skor: number }
  const adaylar: Aday[] = []

  for (const r of kadroRes.data ?? []) {
    const gorevUnvan = String(r.gorev_unvani ?? '').trim()
    const kadroUnvan = String(r.kadro_unvani ?? '').trim()
    const mudurUnvan = performansMudurUnvaniMi(gorevUnvan)
      ? gorevUnvan
      : performansMudurUnvaniMi(kadroUnvan)
        ? kadroUnvan
        : ''
    if (!mudurUnvan) continue

    const mudBaz =
      mudurlukEslesmeBaz(r.gorev_mudurlugu) || mudurlukEslesmeBaz(r.kadro_mudurlugu)
    const unvanBaz = unvanMudurEslesmeBaz(mudurUnvan)
    const mudEslesir = mudBaz ? mudurlukBazEslesir(hedefBaz, mudBaz) : false
    const unvanEslesir = unvanBaz ? mudurlukBazEslesir(hedefBaz, unvanBaz) : false
    if (!mudEslesir && !unvanEslesir) continue

    const asil = String(r.asil ?? '').trim()
    const vekil = String(r.vekil ?? '').trim()
    const sicil = asil || vekil
    if (!sicil) continue
    const ad = adBySicil.get(sicil) || ''
    if (!ad) continue

    let skor = 0
    if (unvanEslesir) skor += 4
    if (mudEslesir) skor += 2
    if (asil) skor += 1
    if (performansMudurUnvaniMi(gorevUnvan)) skor += 1

    adaylar.push({ sicil, ad, unvan: mudurUnvan, asilMi: Boolean(asil), skor })
  }

  if (!adaylar.length) return null
  adaylar.sort((a, b) => b.skor - a.skor || a.ad.localeCompare(b.ad, 'tr'))
  const secilen = adaylar[0]
  return { ad_soyad: secilen.ad, unvan: secilen.unvan }
}
