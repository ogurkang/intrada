import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IsgSaglikTaramasiDetayShell from '@/components/isg/IsgSaglikTaramasiDetayShell'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { isgSaglikKayitAuditRefId } from '@/lib/isg-saglik-taramasi-kayit-audit'
import { isgSaglikTaramasiAktifPersonelYukle } from '@/lib/isg-saglik-taramasi-personel'
import { isgSaglikTaramasiKayitKaydet } from './actions'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ donem_id: string }>
}

export default async function IsgSaglikTaramasiDetayPage({ params }: Props) {
  const { donem_id: donemIdStr } = await params
  const donemId = parseInt(donemIdStr, 10)
  if (!Number.isFinite(donemId)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: donemRaw }, personeller] = await Promise.all([
    sb
      .from('isg_saglik_taramasi_donem')
      .select('id, sira_no, donem_adi, baslangic_tarihi, bitis_tarihi')
      .eq('id', donemId)
      .maybeSingle(),
    isgSaglikTaramasiAktifPersonelYukle(supabase),
  ])

  if (!donemRaw) notFound()

  const { data: kayitRaw } = await sb
    .from('isg_saglik_taramasi_kayit')
    .select('sicil_no, tarama, muayene')
    .eq('donem_id', donemId)

  const taramaKeys: string[] = []
  const muayeneKeys: string[] = []
  const auditRefIds: string[] = []

  for (const k of kayitRaw ?? []) {
    if (k.tarama) {
      taramaKeys.push(k.sicil_no)
      auditRefIds.push(isgSaglikKayitAuditRefId(k.sicil_no, 'tarama', donemId))
    }
    if (k.muayene) {
      muayeneKeys.push(k.sicil_no)
      auditRefIds.push(isgSaglikKayitAuditRefId(k.sicil_no, 'muayene', donemId))
    }
  }

  const kayitAuditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'isg_saglik_taramasi_kayit',
    auditRefIds,
  )

  return (
    <IsgSaglikTaramasiDetayShell
      donem={{
        id: donemRaw.id,
        sira_no: donemRaw.sira_no,
        donem_adi: donemRaw.donem_adi,
        baslangic_tarihi: donemRaw.baslangic_tarihi,
        bitis_tarihi: donemRaw.bitis_tarihi,
      }}
      personeller={personeller}
      taramaKeys={taramaKeys}
      muayeneKeys={muayeneKeys}
      kayitAuditLoglarByRefId={kayitAuditLoglarByRefId}
      onKaydet={isgSaglikTaramasiKayitKaydet}
    />
  )
}
