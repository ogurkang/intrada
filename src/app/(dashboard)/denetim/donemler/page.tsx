import { createClient } from '@/lib/supabase/server'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import DenetimDonemListeClient, {
  type DenetimDonemSatir,
} from '@/components/denetim/DenetimDonemListeClient'

export default async function DenetimDonemlerPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('denetim_donem')
    .select('id, sira_no, donem_adi, baslangic_tarihi, bitis_tarihi, durum')
    .order('sira_no', { ascending: false })

  const donemler: DenetimDonemSatir[] = (data ?? []).map(d => ({
    id: d.id,
    sira_no: d.sira_no,
    donem_adi: d.donem_adi,
    baslangic_tarihi: d.baslangic_tarihi,
    bitis_tarihi: d.bitis_tarihi,
    durum: d.durum as 'Açık' | 'Kapalı',
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
    />
  )
}
