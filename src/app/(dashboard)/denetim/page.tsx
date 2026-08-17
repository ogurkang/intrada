import { createClient } from '@/lib/supabase/server'
import { isCurrentDisDenetci } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import DenetimDonemListeClient, {
  type DenetimAnaMenuSecenek,
  type DenetimDonemSatir,
} from '@/components/denetim/DenetimDonemListeClient'

export default async function DenetimYonetimiPage() {
  const supabase = await createClient()
  const saltOkunur = await isCurrentDisDenetci(supabase)
  const [{ data }, menuRes] = await Promise.all([
    supabase
      .from('denetim_donem')
      .select('id, sira_no, donem_adi, baslangic_tarihi, bitis_tarihi, durum')
      .order('sira_no', { ascending: false }),
    supabase
      .from('denetim_donem_menu')
      .select('id, donem_id, baslik, parent_id')
      .is('parent_id', null)
      .order('sira_no'),
  ])
  const menuler = menuRes.error ? [] : menuRes.data

  const donemler: DenetimDonemSatir[] = (data ?? []).map(d => ({
    id: d.id,
    sira_no: d.sira_no,
    donem_adi: d.donem_adi,
    baslangic_tarihi: d.baslangic_tarihi,
    bitis_tarihi: d.bitis_tarihi,
    durum: d.durum as 'Açık' | 'Kapalı',
  }))
  const donemAd = new Map(donemler.map(d => [d.id, d]))

  const anaMenuler: DenetimAnaMenuSecenek[] = (menuler ?? []).map(m => ({
    id: m.id,
    donem_id: m.donem_id,
    donem_adi: donemAd.get(m.donem_id)?.donem_adi ?? '',
    baslik: m.baslik,
    donemKapali: donemAd.get(m.donem_id)?.durum === 'Kapalı',
  }))

  const acikDonemVar = donemler.some(d => d.durum === 'Açık')
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'denetim_donem',
    donemler.map(d => String(d.id)),
  )

  return (
    <DenetimDonemListeClient
      donemler={donemler}
      acikDonemVar={acikDonemVar}
      auditLoglarByRefId={auditLoglarByRefId}
      anaMenuler={anaMenuler}
      saltOkunur={saltOkunur}
    />
  )
}
