import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'

type KH = Tables<'kadro_hareketleri'>

export interface PasaportKadro {
  kadro_id: number
  derece: string
  unvan: string
  mudurluk: string
  statu: string
  durumu: string
  rol: 'Asıl' | 'Vekil'
}

export interface PasaportPersonel {
  sicil_no: string
  ad_soyad: string
  tckn: string | null
  telefon: string | null
  /** Personelin memur statüsündeki kadroları (form için seçilebilir). */
  kadrolar: PasaportKadro[]
}

const KADRO_SELECT =
  'id, asil, vekil, durumu, statu, kadro_derecesi, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu'

function normStatu(s: string | null | undefined): string {
  return String(s ?? '').trim().toLocaleLowerCase('tr-TR')
}

export function memurStatuMu(s: string | null | undefined): boolean {
  return normStatu(s) === 'memur'
}

function khToKadro(kh: KH, rol: 'Asıl' | 'Vekil'): PasaportKadro {
  return {
    kadro_id: kh.id,
    derece: String(kh.kadro_derecesi ?? '').trim(),
    unvan: String(kh.gorev_unvani ?? kh.kadro_unvani ?? '').trim(),
    mudurluk: String(kh.gorev_mudurlugu ?? kh.kadro_mudurlugu ?? '').trim(),
    statu: String(kh.statu ?? '').trim(),
    durumu: String(kh.durumu ?? '').trim(),
    rol,
  }
}

/** Bir sicile ait memur kadroları (asıl + vekil, ayrılmamış). */
function sicilMemurKadrolari(sicil: string, kadrolar: KH[]): PasaportKadro[] {
  const out: PasaportKadro[] = []
  for (const kh of kadrolar) {
    if (!memurStatuMu(kh.statu)) continue
    if (String(kh.asil ?? '').trim() === sicil) out.push(khToKadro(kh, 'Asıl'))
    else if (String(kh.vekil ?? '').trim() === sicil) out.push(khToKadro(kh, 'Vekil'))
  }
  // Önce asıl, sonra dereceye göre.
  out.sort((a, b) => {
    if (a.rol !== b.rol) return a.rol === 'Asıl' ? -1 : 1
    return parseInt(a.derece || '999999', 10) - parseInt(b.derece || '999999', 10)
  })
  return out
}

/** Yalnızca memur statüsünde kadrosu olan personel — kadrolarıyla birlikte (admin seçim listesi). */
export async function listPasaportPersonel(
  supabase: SupabaseClient,
): Promise<PasaportPersonel[]> {
  const { data: khRows } = await supabase
    .from('kadro_hareketleri')
    .select(KADRO_SELECT)
    .is('ayrilis_tarihi', null)

  const kadrolarBySicil = new Map<string, KH[]>()
  for (const raw of khRows ?? []) {
    const kh = raw as unknown as KH
    if (!memurStatuMu(kh.statu)) continue
    for (const sic of [kh.asil, kh.vekil]) {
      const s = String(sic ?? '').trim()
      if (!s) continue
      const list = kadrolarBySicil.get(s) ?? []
      list.push(kh)
      kadrolarBySicil.set(s, list)
    }
  }

  const siciller = [...kadrolarBySicil.keys()]
  if (siciller.length === 0) return []

  const { data: calisanlar } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad, tckn, telefon')
    .in('sicil_no', siciller)

  const list: PasaportPersonel[] = (calisanlar ?? []).map(c => ({
    sicil_no: c.sicil_no,
    ad_soyad: c.ad_soyad ?? c.sicil_no,
    tckn: c.tckn ?? null,
    telefon: c.telefon ?? null,
    kadrolar: sicilMemurKadrolari(c.sicil_no, kadrolarBySicil.get(c.sicil_no) ?? []),
  }))

  return list
    .filter(p => p.kadrolar.length > 0)
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))
}

/** Tek personel + memur kadroları (kullanıcı kendi formu / düzenleme ekranı). */
export async function getPasaportPersonel(
  supabase: SupabaseClient,
  sicil_no: string,
): Promise<PasaportPersonel | null> {
  const sicil = String(sicil_no ?? '').trim()
  if (!sicil) return null

  const { data: calisan } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad, tckn, telefon')
    .eq('sicil_no', sicil)
    .maybeSingle()

  if (!calisan) return null

  const { data: khRows } = await supabase
    .from('kadro_hareketleri')
    .select(KADRO_SELECT)
    .or(`asil.eq.${sicil},vekil.eq.${sicil}`)
    .is('ayrilis_tarihi', null)

  const kadrolar = (khRows ?? []).map(r => r as unknown as KH)
  return {
    sicil_no: calisan.sicil_no,
    ad_soyad: calisan.ad_soyad ?? calisan.sicil_no,
    tckn: calisan.tckn ?? null,
    telefon: calisan.telefon ?? null,
    kadrolar: sicilMemurKadrolari(sicil, kadrolar),
  }
}
