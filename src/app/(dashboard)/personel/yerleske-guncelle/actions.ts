'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { gecerliYerleskeId, mudurlukYerleskeHaritasi, fetchMudurlukYerleskeTanimSatirlari } from '@/lib/yerleske-adresi'

export interface YerleskeGuncelleSatir {
  sicil_no: string
  yerleske_adresi_id: number | null
}

async function revalidateYerleskeGiris(sicil_no: string) {
  await revalidatePersonelDetayPaths(sicil_no)
  revalidatePath('/personel')
  revalidatePath('/personel/yerleske-guncelle')
}

function parseYerleskeId(raw: unknown): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

export async function yerleskeGuncelleSatirKaydet(
  sicil_no: string,
  fd: FormData,
): Promise<{ hata?: string }> {
  const yerleskeId = parseYerleskeId(fd.get('yerleske_adresi_id'))
  const supabase = await createClient()

  const tanimSatirlar = await fetchMudurlukYerleskeTanimSatirlari(supabase)
  const harita = mudurlukYerleskeHaritasi(tanimSatirlar)

  const D = new Date().toISOString().slice(0, 10)
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, gorev_mudurlugu, kadro_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
    .eq('asil', sicil_no)

  const { secilenKadroSatirAsil } = await import('@/lib/kadro-statu-sec')
  const sec = secilenKadroSatirAsil((kadroRaw ?? []) as Parameters<typeof secilenKadroSatirAsil>[0], D)
  const mudurluk = String(sec?.gorev_mudurlugu ?? sec?.kadro_mudurlugu ?? '').trim()

  if (yerleskeId != null && !gecerliYerleskeId(harita, mudurluk, yerleskeId)) {
    return { hata: 'Seçilen yerleşke, personelin görev müdürlüğü ile eşleşmiyor.' }
  }

  const { error } = await supabase
    .from('calisan')
    .update({ yerleske_adresi_id: yerleskeId })
    .eq('sicil_no', sicil_no)

  if (error) return { hata: error.message }
  await revalidateYerleskeGiris(sicil_no)
  return {}
}

export async function yerleskeGuncelleTopluKaydet(
  satirlar: YerleskeGuncelleSatir[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }

  const supabase = await createClient()
  const tanimSatirlar = await fetchMudurlukYerleskeTanimSatirlari(supabase)
  const harita = mudurlukYerleskeHaritasi(tanimSatirlar)
  const D = new Date().toISOString().slice(0, 10)
  const { secilenKadroSatirAsil } = await import('@/lib/kadro-statu-sec')

  const siciller = [...new Set(satirlar.map(s => s.sicil_no))]
  const kadroByAsil = new Map<string, Parameters<typeof secilenKadroSatirAsil>[0]>()
  for (let i = 0; i < siciller.length; i += 120) {
    const part = siciller.slice(i, i + 120)
    const { data: kRows, error: kErr } = await supabase
      .from('kadro_hareketleri')
      .select('asil, gorev_mudurlugu, kadro_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .in('asil', part)
    if (kErr) return { hata: kErr.message }
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as Parameters<typeof secilenKadroSatirAsil>[0][number])
      kadroByAsil.set(r.asil, list)
    }
  }

  let kaydedilen = 0
  for (const s of satirlar) {
    const sec = secilenKadroSatirAsil(kadroByAsil.get(s.sicil_no) ?? [], D)
    const mudurluk = String(sec?.gorev_mudurlugu ?? sec?.kadro_mudurlugu ?? '').trim()
    if (s.yerleske_adresi_id != null && !gecerliYerleskeId(harita, mudurluk, s.yerleske_adresi_id)) {
      return { hata: `${s.sicil_no}: yerleşke seçimi görev müdürlüğü ile uyumsuz.` }
    }
    const { error } = await supabase
      .from('calisan')
      .update({ yerleske_adresi_id: s.yerleske_adresi_id })
      .eq('sicil_no', s.sicil_no)
    if (error) return { hata: error.message }
    kaydedilen++
  }

  for (const sicil of siciller) {
    await revalidateYerleskeGiris(sicil)
  }
  return { kaydedilen }
}
