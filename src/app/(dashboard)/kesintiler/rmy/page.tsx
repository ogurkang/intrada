import { createClient } from '@/lib/supabase/server'
import DonemListClient, { type Donem } from '@/components/kesintiler/DonemListClient'
import { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet } from './actions'

export default async function RmyPage() {
  const supabase = await createClient()

  const { data: donemRaw } = await supabase
    .from('raporlu_memurlar_yeni_donem')
    .select('*')
    .order('id', { ascending: false })

  const { data: secimSayiRaw } = await supabase
    .from('raporlu_memurlar_yeni_secim')
    .select('donem_id')

  const secimMap: Record<number, number> = {}
  ;(secimSayiRaw ?? []).forEach(s => { secimMap[s.donem_id] = (secimMap[s.donem_id] ?? 0) + 1 })

  const donemler: Donem[] = (donemRaw ?? []).map(d => ({ ...d, secim_sayisi: secimMap[d.id] ?? 0 }))

  return (
    <DonemListClient
      baslik="Raporlu Memurlar (RMY)"
      kod="RMY"
      donemler={donemler}
      onEkle={donemEkle}
      onGuncelle={donemGuncelle}
      onKapat={donemKapat}
      onAc={donemAc}
      onSecimGetir={secimGetir}
      onSecimKaydet={secimKaydet}
      detayBase="/kesintiler/rmy"
      kuralMetni={'Bu ekranda statüsü Memur olan personelin izin durumu "iptal edildi" hariç olmak üzere izin türü Rapor ve Refakatçi Raporu olanlar listelenir.'}
      hideSecimColumn
    />
  )
}
