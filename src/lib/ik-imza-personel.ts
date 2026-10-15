import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllCalisan, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'

export const IK_GOREV_MUDURLUGU = 'İnsan Kaynakları ve Eğitim Müdürlüğü'

export type IkImzaPersonel = { sicil_no: string; ad_soyad: string }

function normMud(v: string | null | undefined): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

/** Görev müdürlüğü İnsan Kaynakları ve Eğitim Müdürlüğü olan aktif personel. */
export async function ikGorevPersonelleri(supabase: SupabaseClient): Promise<IkImzaPersonel[]> {
  const hedef = normMud(IK_GOREV_MUDURLUGU)
  const [kadroRes, calisanRes] = await Promise.all([
    fetchAllKadroHareketleri<{ asil: string | null; vekil: string | null; gorev_mudurlugu: string | null }>(
      supabase,
      'asil, vekil, gorev_mudurlugu',
      q => q.is('ayrilis_tarihi', null),
    ),
    fetchAllCalisan<{ sicil_no: string; ad_soyad: string | null }>(supabase, 'sicil_no, ad_soyad'),
  ])
  const adlar = new Map(
    (calisanRes.data ?? []).map(c => [String(c.sicil_no).trim(), String(c.ad_soyad ?? '').trim()]),
  )
  const siciller = new Set<string>()
  for (const k of kadroRes.data ?? []) {
    if (normMud(k.gorev_mudurlugu) !== hedef) continue
    const asil = String(k.asil ?? '').trim()
    const vekil = String(k.vekil ?? '').trim()
    if (asil) siciller.add(asil)
    if (vekil) siciller.add(vekil)
  }
  return [...siciller]
    .map(sicil_no => ({ sicil_no, ad_soyad: adlar.get(sicil_no) || sicil_no }))
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr') || a.sicil_no.localeCompare(b.sicil_no, 'tr'))
}

export async function ikImzaAdlari(
  supabase: SupabaseClient,
  duzenleyenSicil: string,
  gorevliSicil: string,
): Promise<{ duzenleyen: string; gerceklestirme: string }> {
  const liste = await ikGorevPersonelleri(supabase)
  const ad = (sicil: string) => liste.find(p => p.sicil_no === sicil.trim())?.ad_soyad ?? ''
  return { duzenleyen: ad(duzenleyenSicil), gerceklestirme: ad(gorevliSicil) }
}
