import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { hayaletProfilDurumCoz } from '@/lib/hayalet-profil-server'
import { resolvePerformansOturum } from '@/lib/performans-oturum'
import { performansDegerlendirmeLandingHref, performansGuncelYilDonemId } from '@/lib/performans-donem-coz'
import {
  performansDonemListesiYukle,
  performansRaporlamaVeriYukle,
} from '@/lib/performans-raporlama-yukle'
import PerformansRaporlamaClient from '@/components/performans/PerformansRaporlamaClient'
import PerformansDegerlendirmeYapilamazMesaji from '@/components/performans/PerformansDegerlendirmeYapilamazMesaji'

export default async function PerformansRaporlamaPage({
  searchParams,
}: {
  searchParams: Promise<{ donem_id?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const access = await getAppAccess(supabase, user.id)
  const hayaletDurum = await hayaletProfilDurumCoz(supabase, access)
  const oturum = await resolvePerformansOturum(supabase, user.id, access, hayaletDurum)

  const donemler = await performansDonemListesiYukle(supabase)
  const degerlendirmeHref = oturum.hayaletAktif || !oturum.adminBypass
    ? await performansDegerlendirmeLandingHref(supabase)
    : '/performans/degerlendirme'
  let seciliDonemId = sp.donem_id ? Number(sp.donem_id) : null
  if (!seciliDonemId || !donemler.some(d => d.id === seciliDonemId)) {
    seciliDonemId =
      (await performansGuncelYilDonemId(supabase)) ?? donemler[0]?.id ?? null
  }

  const kapsam = {
    currentSicil: oturum.sicil,
    adminBypass: oturum.adminBypass,
  }

  if (!seciliDonemId) {
    return (
      <Suspense fallback={<p className="text-sm text-slate-500 p-6">Rapor yükleniyor…</p>}>
        <PerformansRaporlamaClient
          donemler={[]}
          seciliDonemId={0}
          ek3FlatListe={[]}
          mudurlukler={[]}
          ek2Satirlar={[]}
          donemEtiket="—"
          hayaletAktif={oturum.hayaletAktif}
          degerlendirmeHref={degerlendirmeHref}
        />
      </Suspense>
    )
  }

  const { veri } = await performansRaporlamaVeriYukle(supabase, seciliDonemId, kapsam)

  if (veri && !veri.erisimVar) {
    return <PerformansDegerlendirmeYapilamazMesaji />
  }

  const donem = veri?.donem ?? donemler.find(d => d.id === seciliDonemId)
  const donemEtiket = donem
    ? 'sira_no' in donem && donem.sira_no
      ? `${donem.yil} / ${donem.sira_no}`
      : String(donem.yil)
    : '—'

  return (
    <Suspense fallback={<p className="text-sm text-slate-500 p-6">Rapor yükleniyor…</p>}>
      <PerformansRaporlamaClient
        donemler={donemler}
        seciliDonemId={seciliDonemId}
        ek3FlatListe={veri?.ek3FlatListe ?? []}
        mudurlukler={veri?.mudurlukler ?? []}
        ek2Satirlar={veri?.ek2Satirlar ?? []}
        donemEtiket={donemEtiket}
        hayaletAktif={oturum.hayaletAktif}
        degerlendirmeHref={degerlendirmeHref}
      />
    </Suspense>
  )
}
