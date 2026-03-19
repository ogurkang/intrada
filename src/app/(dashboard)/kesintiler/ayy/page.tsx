import { createClient } from '@/lib/supabase/server'
import DonemListClient, { type Donem } from '@/components/kesintiler/DonemListClient'
import { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet } from './actions'

export default async function AyyPage() {
  const supabase = await createClient()

  const { data: donemRaw } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('*')
    .order('id', { ascending: false })

  const { data: secimSayiRaw } = await supabase
    .from('aylik_yemek_yeni_secim')
    .select('donem_id')

  const secimMap: Record<number, number> = {}
  ;(secimSayiRaw ?? []).forEach(s => { secimMap[s.donem_id] = (secimMap[s.donem_id] ?? 0) + 1 })

  const donemler: Donem[] = (donemRaw ?? []).map(d => ({ ...d, secim_sayisi: secimMap[d.id] ?? 0 }))

  return (
    <DonemListClient
      baslik="Aylık Yemek Yeni (AYY)"
      kod="AYY"
      kuralMetni={'Bu ekranda statüsü memur ve sözleşmeli olan personelin durumu "iptal edildi" hariç olan tüm türdeki izinlerinin çalışma gününe denk gelen günlerinin yemekli günden çıkarıldığı, kesinti işleminin uygulandığı ekrandır.'}
      hideSecimColumn
      donemler={donemler}
      onEkle={donemEkle}
      onGuncelle={donemGuncelle}
      onKapat={donemKapat}
      onAc={donemAc}
      onSecimGetir={secimGetir}
      onSecimKaydet={secimKaydet}
      detayBase="/kesintiler/ayy"
    />
  )
}
