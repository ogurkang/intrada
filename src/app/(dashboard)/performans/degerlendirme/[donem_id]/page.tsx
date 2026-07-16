import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import PerformansDonemDashboardClient, {
  type PersonelSatir,
} from '@/components/performans/PerformansDonemDashboardClient'
import { performansDonemPersonelSeedle, performansDegerlendirmeAmirleriSenkronize } from '@/app/(dashboard)/performans/actions'
import {
  donemIlerlemeOzet,
  mudurlukSatirlariOlustur,
  type PerformansDegOzet,
} from '@/lib/performans-istatistik'
import {
  kadroMudurlukIndeksi,
  mudurlukByNormHaritasi,
  performansKadroUygun,
  performansMudurlukEslesir,
} from '@/lib/performans-kadro'

export default async function PerformansDonemDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ donem_id: string }>
  searchParams: Promise<{ mudurluk?: string }>
}) {
  const { donem_id: donemIdStr } = await params
  const sp = await searchParams
  const donemId = Number(donemIdStr)
  if (!donemId) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const access = await getAppAccess(supabase, user.id)
  const admin = isAdminLike(access)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: donem } = await db
    .from('performans_donem')
    .select('id, yil, sira_no, donem_adi, durum, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  if (!donem) notFound()

  if (admin && donem.durum === 'Açık') {
    const { count } = await db
      .from('performans_degerlendirme')
      .select('id', { count: 'exact', head: true })
      .eq('donem_id', donemId)
    if ((count ?? 0) === 0) {
      await performansDonemPersonelSeedle(donemId)
    }
  }

  if (admin) {
    await performansDegerlendirmeAmirleriSenkronize(donemId)
  }

  const { data: mudRaw } = await supabase
    .from('tanim_mudurluk')
    .select('mudurluk_adi')
    .eq('aktif', true)
    .order('mudurluk_adi')
  const mudurlukAdlari = (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean) as string[]
  const mudurlukByNorm = mudurlukByNormHaritasi(mudurlukAdlari)

  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, statu, durumu, gorev_mudurlugu, kadro_mudurlugu, kadro_unvani, gorev_unvani')
    .is('ayrilis_tarihi', null)

  const kadroIndeks = kadroMudurlukIndeksi(
    (kadroRaw ?? []).filter(k => performansKadroUygun(k)),
    mudurlukByNorm,
  )

  const kadroUnvanMap = new Map<
    string,
    { kadro_unvani: string | null; gorev_unvani: string | null }
  >()
  for (const k of kadroRaw ?? []) {
    if (!performansKadroUygun(k)) continue
    const sicil = String(k.asil ?? '').trim() || String(k.vekil ?? '').trim()
    if (!sicil || kadroUnvanMap.has(sicil)) continue
    kadroUnvanMap.set(sicil, {
      kadro_unvani: k.kadro_unvani?.trim() || null,
      gorev_unvani: k.gorev_unvani?.trim() || null,
    })
  }

  const { data: rows } = await db
    .from('performans_degerlendirme')
    .select(
      'id, sicil_no, mudurluk_adi, durum, tek_amir, puan_amir1, puan_amir2',
    )
    .eq('donem_id', donemId)
    .order('sicil_no')

  const siciller = [...new Set((rows ?? []).map((r: { sicil_no: string }) => r.sicil_no))] as string[]
  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    ;(cal ?? []).forEach(c => {
      if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
    })
  }

  const liste: PerformansDegOzet[] = (rows ?? []).map((r: {
    id: number
    sicil_no: string
    mudurluk_adi: string | null
    durum: string
    tek_amir: boolean
    puan_amir1: number | null
    puan_amir2: number | null
  }) => {
    const kadro = kadroIndeks.get(r.sicil_no)
    return {
      id: r.id,
      sicil_no: r.sicil_no,
      durum: r.durum,
      tek_amir: r.tek_amir,
      mudurluk_adi: r.mudurluk_adi ?? kadro?.mudurluk_adi ?? null,
      gorev_mudurlugu: kadro?.gorev_mudurlugu ?? null,
      kadro_mudurlugu: kadro?.kadro_mudurlugu ?? null,
      puan_amir1: r.puan_amir1,
      puan_amir2: r.puan_amir2,
    }
  })

  const ilerleme = donemIlerlemeOzet(liste)
  const mudurlukler = mudurlukSatirlariOlustur(mudurlukAdlari, liste, performansMudurlukEslesir)

  const seciliMudurluk = sp.mudurluk?.trim() || null
  let personeller: PersonelSatir[] = []

  if (seciliMudurluk) {
    const filtreli = liste.filter(r =>
      performansMudurlukEslesir(seciliMudurluk, {
        mudurluk_adi: r.mudurluk_adi,
        gorev_mudurlugu: r.gorev_mudurlugu,
        kadro_mudurlugu: r.kadro_mudurlugu,
      }),
    )
    personeller = filtreli.map((r, i) => {
      const unvan = kadroUnvanMap.get(r.sicil_no)
      return {
        siraNo: i + 1,
        id: r.id!,
        sicil_no: r.sicil_no,
        ad_soyad: adMap[r.sicil_no] ?? r.sicil_no,
        kadro_unvani: unvan?.kadro_unvani ?? null,
        gorev_unvani: unvan?.gorev_unvani ?? null,
        puan_amir1: r.puan_amir1 ?? null,
        puan_amir2: r.puan_amir2 ?? null,
        tek_amir: r.tek_amir,
        durum: r.durum,
      }
    })
  }

  return (
    <PerformansDonemDashboardClient
      donem={donem}
      ilerleme={ilerleme}
      mudurlukler={mudurlukler}
      personeller={personeller}
      seciliMudurluk={seciliMudurluk}
      isAdmin={admin}
    />
  )
}
