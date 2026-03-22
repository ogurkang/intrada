import { createClient } from '@/lib/supabase/server'
import AileYeniClient from '@/components/bildirim/AileYeniClient'
import { aileKaydet } from '../actions'

export default async function AileYeniPage() {
  const supabase = await createClient()
  const { data: calisanlar } = await supabase
    .from('calisan')
    .select('sicil_no, ad_soyad')
    .order('ad_soyad', { ascending: true })

  const personeller = (calisanlar ?? []).map(c => ({
    sicil_no: c.sicil_no,
    ad_soyad: c.ad_soyad ?? c.sicil_no,
  }))

  return <AileYeniClient personeller={personeller} onKaydet={aileKaydet} />
}
