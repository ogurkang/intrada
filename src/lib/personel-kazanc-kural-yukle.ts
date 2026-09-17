import { createClient } from '@/lib/supabase/server'
import { yukleTerfiEttirKaynakVeKazanc } from '@/lib/terfi-ettir-data'
import { personelKazancKuralKartlariKur, type PersonelKazancKuralKart } from '@/lib/personel-kazanc-kural'

export async function yuklePersonelKazancKuralKartlari(): Promise<PersonelKazancKuralKart[]> {
  const supabase = await createClient()
  const { kaynaklar } = await yukleTerfiEttirKaynakVeKazanc(supabase)
  return personelKazancKuralKartlariKur(kaynaklar)
}
