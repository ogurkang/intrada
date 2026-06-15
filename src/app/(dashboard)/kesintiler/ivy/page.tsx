import { createClient } from '@/lib/supabase/server'
import DonemListClient, { type Donem } from '@/components/kesintiler/DonemListClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet } from './actions'

export default async function IvyPage() {
  const supabase = await createClient()

  const { data: donemRaw } = await supabase
    .from('izinli_vekiller_yeni_donem')
    .select('*')
    .order('id', { ascending: false })

  const { data: secimSayiRaw } = await supabase
    .from('izinli_vekiller_yeni_secim')
    .select('donem_id')

  const secimMap: Record<number, number> = {}
  ;(secimSayiRaw ?? []).forEach(s => { secimMap[s.donem_id] = (secimMap[s.donem_id] ?? 0) + 1 })

  const donemler: Donem[] = (donemRaw ?? []).map(d => ({ ...d, secim_sayisi: secimMap[d.id] ?? 0 }))

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'izinli_vekiller_yeni_donem',
    donemler.map(d => String(d.id)),
  )

  return (
    <DonemListClient
      baslik="İzinli Vekiller (İVY)"
      kod="İVY"
      donemler={donemler}
      onEkle={donemEkle}
      onGuncelle={donemGuncelle}
      onKapat={donemKapat}
      onAc={donemAc}
      onSecimGetir={secimGetir}
      onSecimKaydet={secimKaydet}
      detayBase="/kesintiler/ivy"
      kuralMetni={'Bu ekranda, Kadro Hareketlerinde vekil olarak yer alan personelin izin durumu "iptal edildi" hariç tüm türlere ait izinleri listelenir.'}
      hideSecimColumn
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
