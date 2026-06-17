import PersonelYeniClient from '@/components/personel/PersonelYeniClient'
import { createClient } from '@/lib/supabase/server'
import { fetchAktifMahalleTanimlari } from '@/lib/personel-adres'

export const dynamic = 'force-dynamic'

export default async function PersonelYeniPage() {
  const supabase = await createClient()
  const mahalleKayitlari = await fetchAktifMahalleTanimlari(supabase)
  return <PersonelYeniClient mahalleKayitlari={mahalleKayitlari} />
}
