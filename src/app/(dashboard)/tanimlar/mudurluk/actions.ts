'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireTanimlarYazma } from '@/lib/tanimlar-yazma-guard'

const SAYFA = '/tanimlar/mudurluk'

export interface YerleskeEslemeInput {
  yerleske_adresi_id: number
  konum: 'İç' | 'Dış'
}

function parseKonum(raw: string): 'İç' | 'Dış' | null {
  const k = raw.trim()
  if (k === 'İç' || k === 'Dış') return k
  return null
}

function parseYerleskeEslemeleri(formData: FormData): { ok: true; eslemeler: YerleskeEslemeInput[] } | { ok: false; hata: string } {
  const eslemeler: YerleskeEslemeInput[] = []
  for (const raw of formData.getAll('yerleske_adresi_ids')) {
    const id = Number(String(raw).trim())
    if (!Number.isInteger(id) || id <= 0) continue
    const konumRaw = String(formData.get(`konum_yerleske_${id}`) ?? 'İç')
    const konum = parseKonum(konumRaw)
    if (!konum) return { ok: false, hata: 'Her seçili yerleşke için konum İç veya Dış olmalıdır.' }
    eslemeler.push({ yerleske_adresi_id: id, konum })
  }
  return { ok: true, eslemeler }
}

async function yerleskeEslemeleriniKaydet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mudurlukId: number,
  eslemeler: YerleskeEslemeInput[],
): Promise<{ hata?: string }> {
  const { error: delErr } = await supabase
    .from('tanim_mudurluk_yerleske')
    .delete()
    .eq('mudurluk_id', mudurlukId)
  if (delErr) return { hata: delErr.message }

  if (eslemeler.length === 0) return {}

  const { error: insErr } = await supabase.from('tanim_mudurluk_yerleske').insert(
    eslemeler.map(e => ({
      mudurluk_id: mudurlukId,
      yerleske_adresi_id: e.yerleske_adresi_id,
      konum: e.konum,
    })),
  )
  if (insErr) return { hata: insErr.message }
  return {}
}

export async function mudurlukEkle(
  formData: FormData
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const mudurluk_adi = String(formData.get('mudurluk_adi') ?? '').trim()
  if (!mudurluk_adi) return { hata: 'Müdürlük adı boş bırakılamaz.' }
  const tehlike_sinifi = String(formData.get('tehlike_sinifi') ?? 'Az Tehlikeli').trim()
  if (!['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'].includes(tehlike_sinifi)) {
    return { hata: 'Tehlike sınıfı geçersiz.' }
  }
  const parsed = parseYerleskeEslemeleri(formData)
  if (!parsed.ok) return { hata: parsed.hata }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('tanim_mudurluk')
    .insert({ mudurluk_adi, tehlike_sinifi, aktif: true })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  const esleme = await yerleskeEslemeleriniKaydet(supabase, inserted.id, parsed.eslemeler)
  if (esleme.hata) return esleme

  revalidatePath(SAYFA)
  return {}
}

export async function mudurlukGuncelle(
  id: number,
  formData: FormData
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const mudurluk_adi = String(formData.get('mudurluk_adi') ?? '').trim()
  if (!mudurluk_adi) return { hata: 'Müdürlük adı boş bırakılamaz.' }
  const tehlike_sinifi = String(formData.get('tehlike_sinifi') ?? 'Az Tehlikeli').trim()
  if (!['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'].includes(tehlike_sinifi)) {
    return { hata: 'Tehlike sınıfı geçersiz.' }
  }
  const parsed = parseYerleskeEslemeleri(formData)
  if (!parsed.ok) return { hata: parsed.hata }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_mudurluk')
    .update({ mudurluk_adi, tehlike_sinifi })
    .eq('id', id)

  if (error) return { hata: error.message }

  const esleme = await yerleskeEslemeleriniKaydet(supabase, id, parsed.eslemeler)
  if (esleme.hata) return esleme

  revalidatePath(SAYFA)
  return {}
}

export async function mudurlukToggleAktif(
  id: number,
  mevcutAktif: boolean
): Promise<{ hata?: string }> {
  const g = await requireTanimlarYazma()
  if (!g.ok) return { hata: g.hata }
  const supabase = await createClient()
  const { error } = await supabase
    .from('tanim_mudurluk')
    .update({ aktif: !mevcutAktif })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return {}
}
