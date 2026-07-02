import { createClient } from '@/lib/supabase/server'
import PersonelHareketiDegistirClient from '@/components/personel/PersonelHareketiDegistirClient'
import { personelHareketiEkle } from '../actions'
import { yuklePersonelHareketDegistirVeri } from '@/lib/personel-hareket-degistir-yukle'

export default async function PersonelHareketiEklePage({
  searchParams,
}: {
  searchParams?: Promise<{ popup?: string }>
}) {
  const sp = await searchParams?.catch(() => ({} as { popup?: string }))
  const popup = String(sp?.popup ?? '').trim() === '1'

  const supabase = await createClient()
  const veri = await yuklePersonelHareketDegistirVeri(supabase, null, { yeniKayit: true })

  return (
    <PersonelHareketiDegistirClient
      {...veri}
      popup={popup}
      yeniKayit
      saltOkunur={false}
      onKaydet={personelHareketiEkle}
    />
  )
}
