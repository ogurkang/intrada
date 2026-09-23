import { createClient } from '@/lib/supabase/server'
import TespitOneriFormClient from '@/components/isg/TespitOneriFormClient'
import { aktifMudurlukleriGetir } from '@/lib/yerel-bilgi-butce-mudurluk'
import { tespitOneriEkle } from '../actions'

export const dynamic = 'force-dynamic'

export default async function TespitOneriYeniPage() {
  const supabase = await createClient()
  const mudurlukler = await aktifMudurlukleriGetir(supabase)
  return (
    <TespitOneriFormClient
      mudurlukler={mudurlukler}
      baslik="Tespit/Öneri Ekle"
      onKaydet={tespitOneriEkle}
    />
  )
}
