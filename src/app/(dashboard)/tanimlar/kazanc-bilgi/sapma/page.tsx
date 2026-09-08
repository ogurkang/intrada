import { createClient } from '@/lib/supabase/server'
import { yukleTerfiEttirKaynakVeKazanc } from '@/lib/terfi-ettir-data'
import { kazancSapmaHesapla } from '@/lib/kazanc-sapma'
import KazancSapmaClient from '@/components/tanimlar/KazancSapmaClient'

export default async function KazancSapmaPage() {
  const supabase = await createClient()
  const { kaynaklar, kazancLookup } = await yukleTerfiEttirKaynakVeKazanc(supabase)
  const { sapanlar, tanimsizlar, kontrolEdilen } = kazancSapmaHesapla(kaynaklar, kazancLookup)

  return (
    <KazancSapmaClient
      sapanlar={sapanlar}
      tanimsizlar={tanimsizlar}
      kontrolEdilen={kontrolEdilen}
      toplamPersonel={kaynaklar.length}
    />
  )
}
