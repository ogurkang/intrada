import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { hayaletProfilDurumCoz } from '@/lib/hayalet-profil-server'
import { resolvePerformansOturum } from '@/lib/performans-oturum'
import { performansDegerlendirmeYapabilir } from '@/lib/performans-degerlendirme-erisim'
import { performansGuncelYilDonemId } from '@/lib/performans-donem-coz'
import PerformansDegerlendirmeYapilamazMesaji from '@/components/performans/PerformansDegerlendirmeYapilamazMesaji'
import PerformansGuncelDonemYokMesaji from '@/components/performans/PerformansGuncelDonemYokMesaji'
import PerformansDonemClient from '@/components/performans/PerformansDonemClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import {
  performansDonemAc,
  performansDonemEkle,
  performansDonemGuncelle,
  performansDonemKapat,
} from '@/app/(dashboard)/performans/donem/actions'

export default async function PerformansDegerlendirmePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const hayaletDurum = user ? await hayaletProfilDurumCoz(supabase, access) : null
  const oturum = user
    ? await resolvePerformansOturum(supabase, user.id, access, hayaletDurum)
    : { sicil: null, adminBypass: true, hayaletAktif: false }
  const saltOkunur = access.mode === 'kullanici' || hayaletDurum?.aktif === true

  if (!oturum.adminBypass && oturum.sicil) {
    const yapabilir = await performansDegerlendirmeYapabilir(supabase, oturum.sicil)
    if (!yapabilir) return <PerformansDegerlendirmeYapilamazMesaji />

    const guncelYil = new Date().getFullYear()
    const donemId = await performansGuncelYilDonemId(supabase, guncelYil)
    if (donemId) redirect(`/performans/degerlendirme/${donemId}`)
    return <PerformansGuncelDonemYokMesaji yil={guncelYil} />
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: donemRaw } = await db
    .from('performans_donem')
    .select('*')
    .order('id', { ascending: false })

  const { data: degSayiRaw } = await db.from('performans_degerlendirme').select('donem_id')
  const sayiMap: Record<number, number> = {}
  ;(degSayiRaw ?? []).forEach((p: { donem_id: number }) => {
    sayiMap[p.donem_id] = (sayiMap[p.donem_id] ?? 0) + 1
  })

  const donemler = (donemRaw ?? []).map((d: { id: number }) => ({
    ...d,
    degerlendirme_sayisi: sayiMap[d.id] ?? 0,
  }))

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'performans_donem',
    donemler.map((d: { id: number }) => String(d.id)),
  )

  return (
    <PerformansDonemClient
      donemler={donemler}
      onEkle={performansDonemEkle}
      onGuncelle={performansDonemGuncelle}
      onKapat={performansDonemKapat}
      onAc={performansDonemAc}
      saltOkunur={saltOkunur}
      auditLoglarByRefId={auditLoglarByRefId}
    />
  )
}
