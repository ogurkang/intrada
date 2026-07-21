import type { Tables } from '@/types/database'

type TH = Tables<'terfi_hareketleri'>

export type TerfiKadroBaglam = {
  kadro_id?: number | null
  kadro_rol?: 'asil' | 'vekil' | string | null
  kadro_sira_no?: string | null
}

export function terfiRolEtiketi(rol: string | null | undefined): 'Asil' | 'Vekil' | null {
  const r = String(rol ?? '').trim().toLowerCase()
  if (r === 'vekil') return 'Vekil'
  if (r === 'asil') return 'Asil'
  const ham = String(rol ?? '').trim()
  if (ham === 'Vekil' || ham === 'Asil') return ham
  return null
}

export function terfiKadroAnahtari(
  sicil_no: string,
  rol: string | null | undefined,
  kadro_sira_no: string | null | undefined,
): string {
  const rolEtiket = terfiRolEtiketi(rol) ?? ''
  const sira = String(kadro_sira_no ?? '').trim()
  return `${String(sicil_no).trim()}|${rolEtiket}|${sira}`
}

export function terfiKadroIdAnahtari(kadro_id: number | null | undefined): string | null {
  const id = Number(kadro_id ?? 0)
  if (!Number.isFinite(id) || id <= 0) return null
  return `kh:${id}`
}

export function terfiKayitlariIndeksle(kayitlar: TH[]): Map<string, TH> {
  const map = new Map<string, TH>()
  for (const k of kayitlar) {
    const khKey = terfiKadroIdAnahtari((k as TH & { kadro_id?: number | null }).kadro_id)
    const keys = khKey
      ? [khKey, terfiKadroAnahtari(k.sicil_no, k.rol, k.kadro_sira_no)]
      : [terfiKadroAnahtari(k.sicil_no, k.rol, k.kadro_sira_no)]
    for (const key of keys) {
      const mevcut = map.get(key)
      if (!mevcut || k.kayit_zamani > mevcut.kayit_zamani) map.set(key, k)
    }
  }
  return map
}

/** Yalnızca kadro_id veya sicil+rol+kadro_sira_no tam eşleşmesi; rol-only fallback yok. */
export function terfiKaydiEsle(
  indeks: Map<string, TH>,
  sicil_no: string,
  rol: string | null | undefined,
  kadro_sira_no: string | null | undefined,
  kadro_id?: number | null,
): TH | null {
  const khKey = terfiKadroIdAnahtari(kadro_id)
  if (khKey) {
    const kadroIle = indeks.get(khKey)
    if (kadroIle && kadroIle.sicil_no.trim() === String(sicil_no).trim()) return kadroIle
  }

  const rolEtiket = terfiRolEtiketi(rol)
  const sira = String(kadro_sira_no ?? '').trim()
  if (rolEtiket && sira) {
    return indeks.get(terfiKadroAnahtari(sicil_no, rolEtiket, sira)) ?? null
  }

  return null
}

export async function terfiKaydiBul(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  sicil_no: string,
  ctx: TerfiKadroBaglam,
): Promise<TH | null> {
  const sicil = sicil_no.trim()
  if (!sicil) return null

  const kadroId = Number(ctx.kadro_id ?? 0)
  if (Number.isFinite(kadroId) && kadroId > 0) {
    const { data } = await supabase
      .from('terfi_hareketleri')
      .select('*')
      .eq('kadro_id', kadroId)
      .eq('sicil_no', sicil)
      .order('kayit_zamani', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) return data as TH
  }

  const rolEtiket = terfiRolEtiketi(ctx.kadro_rol)
  const sira = String(ctx.kadro_sira_no ?? '').trim()

  if (rolEtiket && sira) {
    const { data } = await supabase
      .from('terfi_hareketleri')
      .select('*')
      .eq('sicil_no', sicil)
      .eq('rol', rolEtiket)
      .eq('kadro_sira_no', sira)
      .order('kayit_zamani', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) return data as TH
  }

  const { data: bySicil } = await supabase
    .from('terfi_hareketleri')
    .select('*')
    .eq('sicil_no', sicil)
    .order('kayit_zamani', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (bySicil ?? null) as TH | null
}
