import { createClient } from '@/lib/supabase/server'
import DonemListClient, { type Donem } from '@/components/kesintiler/DonemListClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet } from './actions'

export default async function SosyalHakPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: raw } = await (supabase as any)
    .from('sosyal_hak_donem')
    .select('*')
    .order('id', { ascending: false })

  const donemler: Donem[] = (raw ?? []) as Donem[]

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'sosyal_hak_donem',
    donemler.map(d => String(d.id)),
  )

  return (
    <DonemListClient
      baslik="Sosyal Hak Kesintileri"
      kod="SHK"
      donemler={donemler}
      kuralMetni="Raporlu Memurlar (RMY), İzinli Vekiller (IVY) ve İzinli Zabıtalar (IZY) izinleri tek dönem ekranında birleşik olarak görüntülenir ve işleme alınır. Dönem tarihleri kesişemez; bir dönemin bitişinden sonraki gün, izleyen dönemin başlangıcı olmalıdır (arada boşluk veya aynı gün olamaz)."
      hideSecimColumn
      detayBase="/kesintiler/sosyal-hak"
      onEkle={donemEkle}
      onGuncelle={donemGuncelle}
      onKapat={donemKapat}
      onAc={donemAc}
      onSecimGetir={secimGetir}
      onSecimKaydet={secimKaydet}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
