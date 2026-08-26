import { fetchAllFirmaCalisanlar } from '@/lib/supabase-sayfala'
import { createClient } from '@/lib/supabase/server'
import FirmaCalisanlarClient from '@/components/personel/FirmaCalisanlarClient'
import { firmaEkle, firmaGuncelle, firmaSil } from './actions'
import { filterOutHiddenSystemByEmail } from '@/lib/godmode-calisan'

export default async function FirmaCalisanlarPage() {
  const supabase = await createClient()

  const { data: kayitlar } = await fetchAllFirmaCalisanlar(supabase, '*')

  const kayitlarFiltreli = filterOutHiddenSystemByEmail(kayitlar ?? []).sort((a, b) =>
    String(a.ad_soyad ?? '').localeCompare(String(b.ad_soyad ?? ''), 'tr'),
  )
  const mudurluler = [...new Set(
    kayitlarFiltreli.map(k => k.gorev_mudurlugu ?? '').filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'tr'))

  return (
    <FirmaCalisanlarClient
      kayitlar={kayitlarFiltreli}
      mudurluler={mudurluler}
      onEkle={firmaEkle}
      onGuncelle={firmaGuncelle}
      onSil={firmaSil}
    />
  )
}
