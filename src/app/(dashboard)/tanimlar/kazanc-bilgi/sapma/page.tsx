import { createClient } from '@/lib/supabase/server'
import { yukleTerfiEttirKaynakVeKazanc } from '@/lib/terfi-ettir-data'
import { kazancSapmaHesapla } from '@/lib/kazanc-sapma'
import KazancSapmaClient from '@/components/tanimlar/KazancSapmaClient'
import { tasinirGoreviNormalize } from '@/lib/tasinir-gorevi'

export default async function KazancSapmaPage() {
  const supabase = await createClient()
  const [{ kaynaklar, kazancLookup }, { data: calisanTasinir }, { data: tasinirTanim }] = await Promise.all([
    yukleTerfiEttirKaynakVeKazanc(supabase),
    supabase.from('calisan').select('sicil_no, tasinir_gorevi'),
    supabase.from('tanim_kazanc_tasinir_yetkili').select('gorev_adi, tutar'),
  ])

  const tasinirGoreviBySicil = new Map<string, string | null>()
  for (const c of calisanTasinir ?? []) {
    tasinirGoreviBySicil.set(c.sicil_no, c.tasinir_gorevi ?? null)
  }
  const tasinirTutarByGorev: Record<string, string> = {}
  for (const t of tasinirTanim ?? []) {
    const gorev = tasinirGoreviNormalize(t.gorev_adi)
    const puan = String(t.tutar ?? '').trim()
    if (gorev && puan) tasinirTutarByGorev[gorev] = puan
  }

  const { sapanlar, tanimsizlar, kontrolEdilen } = kazancSapmaHesapla(kaynaklar, kazancLookup, {
    tasinirGoreviBySicil,
    tasinirTutarByGorev,
  })

  return (
    <KazancSapmaClient
      sapanlar={sapanlar}
      tanimsizlar={tanimsizlar}
      kontrolEdilen={kontrolEdilen}
      toplamPersonel={kaynaklar.length}
    />
  )
}
