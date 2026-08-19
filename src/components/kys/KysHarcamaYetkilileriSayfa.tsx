import { createClient } from '@/lib/supabase/server'
import { trNormalize } from '@/lib/turkce-search'
import KysHarcamaYetkilileriClient from './KysHarcamaYetkilileriClient'

export interface HarcamaYetkilisiSatir {
  kadro_unvani: string
  ad_soyad: string
  sicil_no: string
  telefon: string
  e_posta: string
}

function mudurMu(unvan: string): boolean {
  const n = trNormalize(unvan)
  return n.includes('muduru') || n.includes('mudurlugu')
}

export default async function KysHarcamaYetkilileriSayfa({ menuLabel }: { menuLabel: string }) {
  const supabase = await createClient()

  const [{ data: kadroRaw }, { data: calisanRaw }] = await Promise.all([
    supabase
      .from('kadro_hareketleri')
      .select('id, kadro_unvani, asil, vekil, iptal_karar_tarihi, iptal_karar_no, durumu')
      .order('id', { ascending: true }),
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
  const gorulmusSicil = new Set<string>()

  for (const k of kadroRaw ?? []) {
    const unvan = String(k.kadro_unvani ?? '').trim()
    if (!mudurMu(unvan)) continue
    if (k.iptal_karar_tarihi || k.iptal_karar_no) continue
    if (k.durumu === 'İptal') continue

    const sicil = String(k.asil ?? '').trim() || String(k.vekil ?? '').trim()
    if (!sicil || gorulmusSicil.has(sicil)) continue
    gorulmusSicil.add(sicil)

    const c = calisanBySicil.get(sicil)
    satirlar.push({
      kadro_unvani: unvan,
      ad_soyad: c?.ad_soyad ?? '—',
      sicil_no: sicil,
      telefon: c?.telefon ?? '—',
      e_posta: c?.e_posta ?? '—',
    })
  }

  satirlar.sort((a, b) => a.kadro_unvani.localeCompare(b.kadro_unvani, 'tr'))

  return <KysHarcamaYetkilileriClient menuLabel={menuLabel} satirlar={satirlar} />
}
