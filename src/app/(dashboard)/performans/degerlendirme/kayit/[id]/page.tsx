import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { hayaletProfilDurumCoz } from '@/lib/hayalet-profil-server'
import { resolvePerformansOturum } from '@/lib/performans-oturum'
import PerformansFormClient from '@/components/performans/PerformansFormClient'
import type { PerformansFormTipi } from '@/lib/performans'
import {
  performansOrgBaglamiYukle,
  performansDegerlendirmeAmirCanli,
  performansDegerlendirmeErisimVar,
} from '@/lib/performans-degerlendirme-amir-canli'
import { performansKadroSatirSec, performansMudurlukCoz } from '@/lib/performans-kadro'
import { degerlendirmeTamamlandi } from '@/lib/performans-istatistik'
import { performansDonemKayitlariSenkronize } from '@/lib/performans-degerlendirme-sync'

export default async function PerformansKayitDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ rol?: string; donem?: string; mudurluk?: string; vekalet?: string; bby?: string; bby2?: string; baskan?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const rol = sp.rol === 'amir2' ? 'amir2' : 'amir1'
  const degId = Number(id)
  if (!degId) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const access = await getAppAccess(supabase, user.id)
  const hayaletDurum = await hayaletProfilDurumCoz(supabase, access)
  const oturum = await resolvePerformansOturum(supabase, user.id, access, hayaletDurum)
  const admin = oturum.adminBypass
  const currentSicil = oturum.sicil

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: deg } = await db
    .from('performans_degerlendirme')
    .select('*, donem:performans_donem(id, yil, durum)')
    .eq('id', degId)
    .maybeSingle()
  if (!deg) notFound()

  if (deg.donem?.durum === 'Açık') {
    await performansDonemKayitlariSenkronize(supabase, deg.donem_id)
  }

  const adminVekalet = admin && sp.vekalet === '1' && !oturum.hayaletAktif
  const baglam = await performansOrgBaglamiYukle(supabase)
  const canli = performansDegerlendirmeAmirCanli(
    { sicil_no: deg.sicil_no, mudurluk_adi: deg.mudurluk_adi },
    baglam,
  )

  if (
    !admin &&
    (!currentSicil ||
      !performansDegerlendirmeErisimVar(
        currentSicil,
        { sicil_no: deg.sicil_no, mudurluk_adi: deg.mudurluk_adi },
        baglam,
      ))
  ) {
    notFound()
  }

  const { data: cal } = await supabase
    .from('calisan')
    .select('ad_soyad')
    .eq('sicil_no', deg.sicil_no)
    .maybeSingle()

  const { data: puanRows } = await db
    .from('performans_puan')
    .select('kriter_id, puan_amir1, puan_amir2, kriter:performans_kriter(id, kod, baslik, aciklama)')
    .eq('degerlendirme_id', degId)

  const kriterler = (puanRows ?? [])
    .map((p: {
      kriter_id: number
      puan_amir1: number | null
      puan_amir2: number | null
      kriter: { id: number; kod: number; baslik: string; aciklama: string | null } | null
    }) => ({
      id: p.kriter?.id ?? p.kriter_id,
      kod: p.kriter?.kod ?? 0,
      baslik: p.kriter?.baslik ?? '—',
      aciklama: p.kriter?.aciklama ?? null,
      puan_amir1: p.puan_amir1,
      puan_amir2: p.puan_amir2,
    }))
    .sort((a: { kod: number }, b: { kod: number }) => a.kod - b.kod)

  let kaydedilebilir = false
  const tamamlandi = degerlendirmeTamamlandi(deg)
  if (deg.donem?.durum === 'Açık' && !tamamlandi) {
    if (rol === 'amir1') {
      kaydedilebilir =
        (adminVekalet || canli.amir1_sicil === currentSicil) &&
        ['beklemede_1', 'iade'].includes(deg.durum)
    } else {
      kaydedilebilir =
        (adminVekalet || (!canli.tek_amir && canli.amir2_sicil === currentSicil)) &&
        deg.durum === 'amir1_gonderildi'
    }
  }

  let geriHref = '/performans/degerlendirme'
  const donemId = deg.donem?.id ?? (sp.donem ? Number(sp.donem) : null)
  const kadroSatir = performansKadroSatirSec(deg.sicil_no, baglam.kadrolar)
  const kadroMudurluk = kadroSatir
    ? performansMudurlukCoz(kadroSatir, baglam.mudurlukByNorm)
    : null
  const mudurlukAdi =
    sp.mudurluk?.trim() || kadroMudurluk || deg.mudurluk_adi?.trim() || null
  const bbyAmir1Mudur = sp.bby === '1'
  const bbyAmir2Mod = sp.bby2 === '1'
  const baskanMod = sp.baskan === '1'
  if (sp.donem) {
    geriHref = `/performans/degerlendirme/${sp.donem}`
    if (bbyAmir2Mod || baskanMod) {
      const q = new URLSearchParams()
      if (mudurlukAdi) q.set('mudurluk', mudurlukAdi)
      if (bbyAmir2Mod) q.set('bby2', '1')
      if (baskanMod) q.set('baskan', '1')
      geriHref += `?${q.toString()}`
    } else if (!bbyAmir1Mudur && mudurlukAdi) {
      geriHref += `?mudurluk=${encodeURIComponent(mudurlukAdi)}`
    }
  }

  return (
    <PerformansFormClient
      degerlendirme={{
        id: deg.id,
        sicil_no: deg.sicil_no,
        ad_soyad: cal?.ad_soyad ?? deg.sicil_no,
        form_tipi: deg.form_tipi as PerformansFormTipi,
        durum: deg.durum,
        tek_amir: canli.tek_amir,
        iade_notu: deg.iade_notu,
        puan_amir1: deg.puan_amir1,
        puan_amir2: deg.puan_amir2,
        ortalama: deg.ortalama,
        donem_yil: deg.donem?.yil ?? 0,
      }}
      kriterler={kriterler}
      rol={rol}
      kaydedilebilir={kaydedilebilir}
      tamamlandi={tamamlandi}
      geriHref={geriHref}
      donemId={donemId}
      mudurlukAdi={mudurlukAdi}
      adminVekalet={adminVekalet}
      bbyAmir1Mudur={bbyAmir1Mudur}
      bbyAmir2Mod={bbyAmir2Mod}
      baskanMod={baskanMod}
    />
  )
}
