import { createClient } from '@/lib/supabase/server'
import DonemListClient, { type Donem } from '@/components/kesintiler/DonemListClient'
import { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet } from './actions'

export default async function IzyPage() {
  const supabase = await createClient()

  const { data: donemRaw } = await supabase
    .from('izinli_zabitalar_yeni_donem')
    .select('*')
    .order('id', { ascending: false })

  const { data: secimSayiRaw } = await supabase
    .from('izinli_zabitalar_yeni_secim')
    .select('donem_id')

  const secimMap: Record<number, number> = {}
  ;(secimSayiRaw ?? []).forEach(s => { secimMap[s.donem_id] = (secimMap[s.donem_id] ?? 0) + 1 })

  const donemler: Donem[] = (donemRaw ?? []).map(d => ({ ...d, secim_sayisi: secimMap[d.id] ?? 0 }))

  return (
    <DonemListClient
      baslik="İzinli Zabıtalar (İZY)"
      kod="İZY"
      kuralMetni={'Bu ekranda, Zabıta Müdürlüğü ile ilişkilendirilmiş personelin izin durumu "iptal edildi" hariç Yıllık İzin, Ölüm İzni, Evlilik İzni, Babalık İzni, Mehil İzni, Mazeret İzni, İdari İzin, Doğum Öncesi Çalışamaz ve Doğum Sonrası Çalışamaz türündeki izinleri listelenir.'}
      hideSecimColumn
      donemler={donemler}
      onEkle={donemEkle}
      onGuncelle={donemGuncelle}
      onKapat={donemKapat}
      onAc={donemAc}
      onSecimGetir={secimGetir}
      onSecimKaydet={secimKaydet}
      detayBase="/kesintiler/izy"
    />
  )
}
