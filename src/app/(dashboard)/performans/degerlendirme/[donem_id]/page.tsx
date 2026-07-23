import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { hayaletProfilDurumCoz } from '@/lib/hayalet-profil-server'
import { resolvePerformansOturum } from '@/lib/performans-oturum'
import PerformansDonemDashboardClient, {
  type PersonelSatir,
} from '@/components/performans/PerformansDonemDashboardClient'
import PerformansDegerlendirmeYapilamazMesaji from '@/components/performans/PerformansDegerlendirmeYapilamazMesaji'
import { performansAmirErisimCoz } from '@/lib/performans-degerlendirme-erisim'
import { performansDonemKayitlariSenkronize } from '@/lib/performans-degerlendirme-sync'
import {
  donemIlerlemeOzet,
  mudurlukSatirlariOlustur,
  type PerformansDegOzet,
} from '@/lib/performans-istatistik'
import {
  kadroMudurlukIndeksi,
  mudurlukByNormHaritasi,
  performansKadroMudurlukEslesir,
  performansKadroUygun,
  performansMudurlukCoz,
  performansMudurlukEslesir,
  performansEtkinUnvanHaritasi,
  performansKadroSatirlariIndeksi,
  performansPersonelEtkinUnvan,
  performansMudurlukPersonelSatirindaMi,
  tumAktifKadroHareketleriYukle,
} from '@/lib/performans-kadro'
import {
  performansAmirErisimOlustur,
  performansAmirSatirGorulebilir,
  type PerformansAmirErisim,
} from '@/lib/performans-amir-erisim'
import type { OrgBirimSatir } from '@/lib/performans-amir'
import { performansAmirEsle } from '@/lib/performans-amir'

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
  const hayaletDurum = await hayaletProfilDurumCoz(supabase, access)
  const oturum = await resolvePerformansOturum(supabase, user.id, access, hayaletDurum)
  const admin = oturum.adminBypass
  const currentSicil = oturum.sicil

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: donem } = await db
    .from('performans_donem')
    .select('id, yil, sira_no, donem_adi, durum, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  if (!donem) notFound()

  if (donem.durum === 'Açık') {
    await performansDonemKayitlariSenkronize(supabase, donemId)
  }

  const { data: mudRaw } = await supabase
    .from('tanim_mudurluk')
    .select('mudurluk_adi')
    .eq('aktif', true)
    .order('mudurluk_adi')
  const mudurlukAdlari = (mudRaw ?? []).map(m => m.mudurluk_adi).filter(Boolean) as string[]
  const mudurlukByNorm = mudurlukByNormHaritasi(mudurlukAdlari)

  const kadroRaw = await tumAktifKadroHareketleriYukle<{
    asil?: string | null
    vekil?: string | null
    statu?: string | null
    durumu?: string | null
    gorev_mudurlugu?: string | null
    kadro_mudurlugu?: string | null
    kadro_unvani?: string | null
    gorev_unvani?: string | null
  }>(
    supabase,
    'asil, vekil, statu, durumu, gorev_mudurlugu, kadro_mudurlugu, kadro_unvani, gorev_unvani',
  )

  const kadroUygun = kadroRaw.filter(k => performansKadroUygun(k))
  const kadroIndeks = kadroMudurlukIndeksi(kadroUygun, mudurlukByNorm)
  const etkinUnvanMap = performansEtkinUnvanHaritasi(kadroRaw, mudurlukByNorm)
  const kadroTamMap = new Map<
    string,
    { gorev_mudurlugu: string | null; kadro_mudurlugu: string | null; mudurluk_adi: string | null }
  >()
  for (const [sicil, k] of performansKadroSatirlariIndeksi(kadroUygun)) {
    kadroTamMap.set(sicil, {
      gorev_mudurlugu: k.gorev_mudurlugu?.trim() || null,
      kadro_mudurlugu: k.kadro_mudurlugu?.trim() || null,
      mudurluk_adi: performansMudurlukCoz(k, mudurlukByNorm),
    })
  }

  const { data: rows } = await db
    .from('performans_degerlendirme')
    .select(
      'id, sicil_no, mudurluk_adi, durum, tek_amir, puan_amir1, puan_amir2, amir1_sicil, amir2_sicil, iade_notu',
    )
    .eq('donem_id', donemId)
    .order('sicil_no')

  let birimler: OrgBirimSatir[] = []
  const { data: aktifOrg } = await supabase
    .from('tanim_organizasyon')
    .select('id')
    .eq('aktif', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (aktifOrg?.id) {
    const { data: birimRaw } = await db
      .from('tanim_organizasyon_birim')
      .select(
        'id, birim_turu, mudurluk_id, personel_sicil_no, ust_birim_id, mudurluk:tanim_mudurluk(id, mudurluk_adi)',
      )
      .eq('organizasyon_id', aktifOrg.id)
    birimler = (birimRaw ?? []) as OrgBirimSatir[]
  }

  const siciller = [...new Set((rows ?? []).map((r: { sicil_no: string }) => r.sicil_no))] as string[]
  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    ;(cal ?? []).forEach(c => {
      if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
    })
  }

  type DegRow = {
    id: number
    sicil_no: string
    mudurluk_adi: string | null
    durum: string
    tek_amir: boolean
    puan_amir1: number | null
    puan_amir2: number | null
    amir1_sicil: string | null
    amir2_sicil: string | null
  }

  const liste: PerformansDegOzet[] = (rows ?? []).flatMap((r: DegRow) => {
    const kadroMemur = kadroIndeks.get(r.sicil_no)
    const kadroTam = kadroTamMap.get(r.sicil_no)

    if (!admin) {
      if (!kadroMemur) return []
      const unvan = etkinUnvanMap.get(r.sicil_no)
      if (
        !performansMudurlukPersonelSatirindaMi({
          unvan,
          sicilNo: r.sicil_no,
          currentSicil,
          birimler,
        })
      ) {
        return []
      }
    }

    const kadro = kadroMemur ?? kadroTam
    return [{
      id: r.id,
      sicil_no: r.sicil_no,
      durum: r.durum,
      tek_amir: r.tek_amir,
      mudurluk_adi: r.mudurluk_adi ?? kadro?.mudurluk_adi ?? null,
      gorev_mudurlugu: kadro?.gorev_mudurlugu ?? null,
      kadro_mudurlugu: kadro?.kadro_mudurlugu ?? null,
      puan_amir1: r.puan_amir1,
      puan_amir2: r.puan_amir2,
      amir1_sicil: r.amir1_sicil,
      amir2_sicil: r.amir2_sicil,
    }]
  })

  let amirErisim: PerformansAmirErisim | null = null

  // Amir atamalarını canlı çöz (DB senkronu gecikmiş olsa bile düğmeler doğru kalsın)
  if (birimler.length > 0) {
    for (const r of liste) {
      const unvan = etkinUnvanMap.get(r.sicil_no)
      const esleme = performansAmirEsle({
        sicilNo: r.sicil_no,
        unvan,
        mudurlukAdi: r.mudurluk_adi,
        birimler,
        kadroRows: kadroRaw,
      })
      r.amir1_sicil = esleme.amir1_sicil
      r.amir2_sicil = esleme.tek_amir ? null : esleme.amir2_sicil
      r.tek_amir = esleme.tek_amir
    }
  }

  if (!admin) {
    if (!currentSicil) return <PerformansDegerlendirmeYapilamazMesaji />

    const genelErisim = await performansAmirErisimCoz(supabase, currentSicil)
    if (!genelErisim.amir1Yetkisi && !genelErisim.amir2Yetkisi) {
      return <PerformansDegerlendirmeYapilamazMesaji />
    }

    amirErisim = performansAmirErisimOlustur(
      currentSicil,
      birimler,
      kadroRaw,
      liste,
    )
  }

  const filtreliListe =
    amirErisim == null
      ? liste
      : liste.filter(r => performansAmirSatirGorulebilir(r, currentSicil!, amirErisim!))

  const ilerleme = donemIlerlemeOzet(filtreliListe)
  const gorulebilirMudurlukAdlari =
    amirErisim == null
      ? mudurlukAdlari
      : mudurlukAdlari.filter(m =>
          filtreliListe.some(r => performansKadroMudurlukEslesir(m, r.kadro_mudurlugu)),
        )
  const mudurlukEslesir = admin
    ? (mudurlukAdi: string, r: Pick<PerformansDegOzet, 'mudurluk_adi' | 'gorev_mudurlugu' | 'kadro_mudurlugu'>) =>
        performansMudurlukEslesir(mudurlukAdi, r)
    : (mudurlukAdi: string, r: Pick<PerformansDegOzet, 'kadro_mudurlugu'>) =>
        performansKadroMudurlukEslesir(mudurlukAdi, r.kadro_mudurlugu)

  const mudurlukler = mudurlukSatirlariOlustur(
    gorulebilirMudurlukAdlari,
    filtreliListe,
    mudurlukEslesir,
  )

  if (!admin && amirErisim && gorulebilirMudurlukAdlari.length === 0) {
    return <PerformansDegerlendirmeYapilamazMesaji />
  }

  const seciliMudurluk = sp.mudurluk?.trim() || null
  if (
    seciliMudurluk &&
    amirErisim &&
    !gorulebilirMudurlukAdlari.some(m => performansKadroMudurlukEslesir(m, seciliMudurluk))
  ) {
    return <PerformansDegerlendirmeYapilamazMesaji />
  }
  let personeller: PersonelSatir[] = []

  if (seciliMudurluk) {
    const filtreli = filtreliListe.filter(r => mudurlukEslesir(seciliMudurluk, r))
    personeller = filtreli.map((r, i) => {
      const kadroUnvan = performansPersonelEtkinUnvan(
        r.sicil_no,
        seciliMudurluk,
        kadroRaw,
        mudurlukByNorm,
      )
      return {
        siraNo: i + 1,
        id: r.id!,
        sicil_no: r.sicil_no,
        ad_soyad: adMap[r.sicil_no] ?? r.sicil_no,
        kadro_unvani: kadroUnvan,
        puan_amir1: r.puan_amir1 ?? null,
        puan_amir2: r.puan_amir2 ?? null,
        tek_amir: r.tek_amir,
        durum: r.durum,
        iade_notu: (r as { iade_notu?: string | null }).iade_notu ?? null,
        amir1_sicil: r.amir1_sicil ?? null,
        amir2_sicil: r.amir2_sicil ?? null,
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
      amirErisim={amirErisim}
    />
  )
}
