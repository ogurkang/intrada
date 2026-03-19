import { createClient } from '@/lib/supabase/server'
import FirmaCalisanlarClient from '@/components/personel/FirmaCalisanlarClient'
import { firmaEkle, firmaGuncelle, firmaSil } from './actions'

export default async function FirmaCalisanlarPage() {
  const supabase = await createClient()

  const { data: kayitlar } = await supabase
    .from('firma_calisanlar')
    .select('*')
    .order('ad_soyad')

  const mudurluler = [...new Set(
    (kayitlar ?? []).map(k => k.gorev_mudurlugu ?? '').filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'tr'))

  return (
    <FirmaCalisanlarClient
      kayitlar={kayitlar ?? []}
      mudurluler={mudurluler}
      onEkle={firmaEkle}
      onGuncelle={firmaGuncelle}
      onSil={firmaSil}
    />
  )
}
