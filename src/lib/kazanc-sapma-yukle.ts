import { createClient } from '@/lib/supabase/server'
import { yukleTerfiEttirKaynakVeKazanc } from '@/lib/terfi-ettir-data'
import { kazancSapmaHesapla, type KazancSapmaSonuc } from '@/lib/kazanc-sapma'
import { tasinirGoreviNormalize } from '@/lib/tasinir-gorevi'
import { fetchAllCalisan, fetchAllPaged } from '@/lib/supabase-sayfala'

export async function yukleKazancSapmaSonuc(): Promise<KazancSapmaSonuc & { toplamPersonel: number }> {
  const supabase = await createClient()
  const [{ kaynaklar, kazancLookup, teknisyenEkGosterge }, { data: calisanTasinir }, { data: tasinirTanim }] = await Promise.all([
    yukleTerfiEttirKaynakVeKazanc(supabase),
    fetchAllCalisan<{ sicil_no: string; tasinir_gorevi: string | null }>(supabase, 'sicil_no, tasinir_gorevi'),
    fetchAllPaged<{ gorev_adi: string; tutar: string | null }>((from, to) =>
      supabase
        .from('tanim_kazanc_tasinir_yetkili')
        .select('gorev_adi, tutar')
        .order('gorev_adi')
        .range(from, to),
    ),
  ])

  const tasinirGoreviBySicil = new Map<string, string | null>()
  for (const c of calisanTasinir ?? []) {
    tasinirGoreviBySicil.set(String(c.sicil_no).trim(), c.tasinir_gorevi ?? null)
  }
  const tasinirTutarByGorev: Record<string, string> = {}
  for (const t of tasinirTanim ?? []) {
    const gorev = tasinirGoreviNormalize(t.gorev_adi)
    const puan = String(t.tutar ?? '').trim()
    if (gorev && puan) tasinirTutarByGorev[gorev] = puan
  }

  const sonuc = kazancSapmaHesapla(kaynaklar, kazancLookup, {
    tasinirGoreviBySicil,
    tasinirTutarByGorev,
  }, teknisyenEkGosterge)
  return { ...sonuc, toplamPersonel: kaynaklar.length }
}
