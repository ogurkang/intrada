import { createClient } from '@/lib/supabase/server'
import PersonelHareketiDegistirClient from '@/components/personel/PersonelHareketiDegistirClient'
import { personelHareketiEkle } from '../actions'
import { yuklePersonelHareketDegistirVeri } from '@/lib/personel-hareket-degistir-yukle'

export default async function PersonelHareketiEklePage({
  searchParams,
}: {
  searchParams?: Promise<{ popup?: string; hareket_tipi?: string }>
}) {
  const sp = await searchParams?.catch(() => ({} as { popup?: string; hareket_tipi?: string }))
  const popup = String(sp?.popup ?? '').trim() === '1'
  const initialHareketTipi = String(sp?.hareket_tipi ?? '').trim()

  const supabase = await createClient()
  const veri = await yuklePersonelHareketDegistirVeri(supabase, null, { yeniKayit: true, hafif: true })

  return (
    <PersonelHareketiDegistirClient
      {...veri}
      popup={popup}
      yeniKayit
      initialHareketTipi={initialHareketTipi}
      saltOkunur={false}
      onKaydet={personelHareketiEkle}
    />
  )
}
