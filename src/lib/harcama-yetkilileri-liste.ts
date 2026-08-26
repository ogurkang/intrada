import { fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import { trNormalize } from '@/lib/turkce-search'

export interface HarcamaYetkilisiSatir {
  kadro_unvani: string
  ad_soyad: string
  sicil_no: string
  telefon: string
  e_posta: string
}

export function denetimHarcamaYetkilileriMenuMu(menu: { baslik?: string | null; slug?: string | null }): boolean {
  const slug = String(menu.slug ?? '').toLowerCase()
  if (slug === 'harcama-yetkilileri' || slug.startsWith('harcama-yetkilileri-')) return true
  return trNormalize(menu.baslik) === 'harcama yetkilileri'
}

function mudurUnvaniMi(unvan: string): boolean {
  return trNormalize(unvan).includes('muduru')
}

export async function harcamaYetkilileriSatirlariYukle(): Promise<HarcamaYetkilisiSatir[]> {
  const supabase = await createClient()
  const [{ data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
    fetchAllKadroHareketleri(supabase, 'id, kadro_unvani, asil, vekil, iptal_karar_tarihi, iptal_karar_no, durumu'),
    supabase.from('calisan').select('sicil_no, ad_soyad, telefon, e_posta'),
  ])

  const calisanBySicil = new Map<string, { ad_soyad: string; telefon: string; e_posta: string }>()
  for (const c of calisanRaw ?? []) {
    const sicil = String(c.sicil_no ?? '').trim()
    if (!sicil) continue
    calisanBySicil.set(sicil, {
      ad_soyad: String(c.ad_soyad ?? '').trim() || '—',
      telefon: String(c.telefon ?? '').trim() || '—',
      e_posta: String(c.e_posta ?? '').trim() || '—',
    })
  }

  const satirlar: HarcamaYetkilisiSatir[] = []

  for (const k of kadroRaw ?? []) {
    const unvan = String(k.kadro_unvani ?? '').trim()
    if (!mudurUnvaniMi(unvan)) continue
    if (k.iptal_karar_tarihi || k.iptal_karar_no) continue
    if (k.durumu === 'İptal') continue

    for (const sicilHam of [k.asil, k.vekil]) {
      const sicil = String(sicilHam ?? '').trim()
      if (!sicil) continue
      const c = calisanBySicil.get(sicil)
      satirlar.push({
        kadro_unvani: unvan,
        ad_soyad: c?.ad_soyad ?? '—',
        sicil_no: sicil,
        telefon: c?.telefon ?? '—',
        e_posta: c?.e_posta ?? '—',
      })
    }
  }

  satirlar.sort((a, b) => a.kadro_unvani.localeCompare(b.kadro_unvani, 'tr'))
  return satirlar
}
