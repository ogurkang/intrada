import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { hayaletProfilDurumCoz } from '@/lib/hayalet-profil-server'
import { resolvePerformansOturum } from '@/lib/performans-oturum'
import PerformansDonemDashboardClient, {
  type MudurlukPersonelGrubu,
  type PersonelSatir,
  type PerformansLandingModu,
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
  performansMudurlukKayitEslesir,
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
  performansBaskanDogrudanSatirlari,
  performansBaskanLandingMi,
  performansBaskanPersonelSatirlari,
  performansBbyAmir1LandingMi,
  performansBbyAmir1MudurSatirlari,
  performansBbyAmir2FlatListeOlustur,
  performansBbyAmir2LandingMi,
  performansBbyAmir2MudurGruplariOlustur,
  performansBbyAmir2PersonelSatirlari,
  performansMudurLandingMi,
  type PerformansAmirErisim,
} from '@/lib/performans-amir-erisim'
import type { OrgBirimSatir } from '@/lib/performans-amir'
import { performansAmirEsle } from '@/lib/performans-amir'

export default async function PerformansDonemDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ donem_id: string }>
  searchParams: Promise<{ mudurluk?: string; bby2?: string; baskan?: string }>
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
    iade_notu: string | null
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
      iade_notu: r.iade_notu,
    }]
  })

  let amirErisim: PerformansAmirErisim | null = null

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

  const mudurLanding =
    !admin &&
    amirErisim != null &&
    currentSicil != null &&
    performansMudurLandingMi(
      currentSicil,
      birimler,
      kadroRaw,
      filtreliListe,
      etkinUnvanMap,
      amirErisim,
    )

  const baskanLanding =
    !admin &&
    !mudurLanding &&
    currentSicil != null &&
    performansBaskanLandingMi(currentSicil, birimler, kadroRaw, filtreliListe)

  const bbyAmir1Goster =
    !admin &&
    !mudurLanding &&
    !baskanLanding &&
    amirErisim != null &&
    currentSicil != null &&
    performansBbyAmir1LandingMi(
      currentSicil,
      birimler,
      filtreliListe,
      etkinUnvanMap,
      amirErisim,
    )

  const bbyAmir2Goster =
    !admin &&
    !mudurLanding &&
    !baskanLanding &&
    amirErisim != null &&
    currentSicil != null &&
    performansBbyAmir2LandingMi(
      currentSicil,
      birimler,
      filtreliListe,
      etkinUnvanMap,
      amirErisim,
    )

  const ozelLanding = mudurLanding || baskanLanding || bbyAmir1Goster || bbyAmir2Goster

  const bbyAmir2Satirlar =
    bbyAmir2Goster && currentSicil
      ? performansBbyAmir2PersonelSatirlari(currentSicil, filtreliListe, etkinUnvanMap)
      : []

  const baskanPersonelSatirlar =
    baskanLanding && currentSicil
      ? performansBaskanPersonelSatirlari(currentSicil, filtreliListe, etkinUnvanMap, birimler)
      : []

  const baskanDogrudanSatirlar =
    baskanLanding && currentSicil
      ? performansBaskanDogrudanSatirlari(currentSicil, birimler, filtreliListe, etkinUnvanMap)
      : []

  const gorulebilirMudurlukAdlari =
    amirErisim == null
      ? mudurlukAdlari
      : baskanLanding
        ? mudurlukAdlari.filter(m =>
            baskanPersonelSatirlar.some(r => performansKadroMudurlukEslesir(m, r.kadro_mudurlugu)),
          )
        : bbyAmir2Goster
          ? mudurlukAdlari.filter(m =>
              bbyAmir2Satirlar.some(r => performansKadroMudurlukEslesir(m, r.kadro_mudurlugu)),
            )
          : mudurlukAdlari.filter(m =>
              filtreliListe.some(r => performansKadroMudurlukEslesir(m, r.kadro_mudurlugu)),
            )

  const mudurlukEslesir = admin
    ? (mudurlukAdi: string, r: Pick<PerformansDegOzet, 'mudurluk_adi' | 'gorev_mudurlugu' | 'kadro_mudurlugu'>) =>
        performansMudurlukEslesir(mudurlukAdi, r)
    : (mudurlukAdi: string, r: Pick<PerformansDegOzet, 'kadro_mudurlugu'>) =>
        performansKadroMudurlukEslesir(mudurlukAdi, r.kadro_mudurlugu)

  const hubKaynakListe = baskanLanding
    ? baskanPersonelSatirlar
    : bbyAmir2Goster
      ? bbyAmir2Satirlar
      : filtreliListe

  const mudurlukler = mudurlukSatirlariOlustur(
    gorulebilirMudurlukAdlari,
    hubKaynakListe,
    mudurlukEslesir,
  )

  if (!admin && amirErisim && filtreliListe.length === 0) {
    return <PerformansDegerlendirmeYapilamazMesaji />
  }

  const seciliMudurluk = sp.mudurluk?.trim() || null
  const bby2Detay = sp.bby2 === '1'
  const baskanDetay = sp.baskan === '1'

  if (
    seciliMudurluk &&
    !ozelLanding &&
    amirErisim &&
    !gorulebilirMudurlukAdlari.some(m => performansKadroMudurlukEslesir(m, seciliMudurluk))
  ) {
    return <PerformansDegerlendirmeYapilamazMesaji />
  }

  if (
    seciliMudurluk &&
    bbyAmir2Goster &&
    bby2Detay &&
    !bbyAmir2Satirlar.some(r => performansMudurlukKayitEslesir(seciliMudurluk, r))
  ) {
    return <PerformansDegerlendirmeYapilamazMesaji />
  }

  if (
    seciliMudurluk &&
    baskanLanding &&
    baskanDetay &&
    !baskanPersonelSatirlar.some(r => performansKadroMudurlukEslesir(seciliMudurluk, r.kadro_mudurlugu))
  ) {
    return <PerformansDegerlendirmeYapilamazMesaji />
  }

  function personelSatirOlustur(
    r: PerformansDegOzet,
    siraNo: number,
    mudurlukAdi: string,
  ): PersonelSatir {
    const kadroUnvan = performansPersonelEtkinUnvan(
      r.sicil_no,
      mudurlukAdi,
      kadroRaw,
      mudurlukByNorm,
    )
    return {
      siraNo,
      id: r.id!,
      sicil_no: r.sicil_no,
      ad_soyad: adMap[r.sicil_no] ?? r.sicil_no,
      kadro_unvani: kadroUnvan,
      puan_amir1: r.puan_amir1 ?? null,
      puan_amir2: r.puan_amir2 ?? null,
      tek_amir: r.tek_amir,
      durum: r.durum,
      iade_notu: r.iade_notu ?? null,
      amir1_sicil: r.amir1_sicil ?? null,
      amir2_sicil: r.amir2_sicil ?? null,
    }
  }

  let personeller: PersonelSatir[] = []
  let mudurlukGruplari: MudurlukPersonelGrubu[] = []
  let bbyMudurListesi: PersonelSatir[] = []
  let bbyAmir2FlatListe: import('@/lib/performans-amir-erisim').BbyAmir2FlatSatir[] = []
  let baskanDogrudanListesi: PersonelSatir[] = []

  const bbyAmir1Satirlar =
    bbyAmir1Goster && currentSicil
      ? performansBbyAmir1MudurSatirlari(currentSicil, filtreliListe, etkinUnvanMap)
      : []

  let gosterimIlerleme = ilerleme
  if (bbyAmir1Goster && !bbyAmir2Goster) {
    gosterimIlerleme = donemIlerlemeOzet(bbyAmir1Satirlar)
  } else if (bbyAmir2Goster && !bbyAmir1Goster) {
    gosterimIlerleme = donemIlerlemeOzet(bbyAmir2Satirlar)
  } else if (baskanLanding) {
    gosterimIlerleme = donemIlerlemeOzet([...baskanDogrudanSatirlar, ...baskanPersonelSatirlar])
  }

  const seciliMudurlukBby2Mi =
    seciliMudurluk != null &&
    bbyAmir2Goster &&
    bbyAmir2Satirlar.some(r => performansMudurlukKayitEslesir(seciliMudurluk, r))

  const seciliMudurlukBaskanPersonelMi =
    seciliMudurluk != null &&
    baskanLanding &&
    baskanPersonelSatirlar.some(r => performansKadroMudurlukEslesir(seciliMudurluk, r.kadro_mudurlugu))

  const efektifBby2Detay = bby2Detay || seciliMudurlukBby2Mi

  if (mudurLanding) {
    mudurlukGruplari = gorulebilirMudurlukAdlari.flatMap(mudurlukAdi => {
      const filtreli = filtreliListe.filter(r =>
        performansKadroMudurlukEslesir(mudurlukAdi, r.kadro_mudurlugu),
      )
      if (filtreli.length === 0) return []
      return [{
        mudurlukAdi,
        personeller: filtreli.map((r, i) => personelSatirOlustur(r, i + 1, mudurlukAdi)),
      }]
    })
  } else if (seciliMudurluk) {
    const kaynak = seciliMudurlukBby2Mi
      ? bbyAmir2Satirlar
      : seciliMudurlukBaskanPersonelMi
        ? baskanPersonelSatirlar
        : filtreliListe
    const filtreli = kaynak.filter(r =>
      seciliMudurlukBby2Mi || seciliMudurlukBaskanPersonelMi
        ? performansMudurlukKayitEslesir(seciliMudurluk, r)
        : mudurlukEslesir(seciliMudurluk, r),
    )
    personeller = filtreli.map((r, i) => personelSatirOlustur(r, i + 1, seciliMudurluk))
  } else {
    if (bbyAmir1Goster) {
      bbyMudurListesi = bbyAmir1Satirlar.map((r, i) => {
        const mud = r.mudurluk_adi ?? r.kadro_mudurlugu ?? ''
        return {
          ...personelSatirOlustur(r, i + 1, mud),
          mudurluk_adi: r.mudurluk_adi ?? r.kadro_mudurlugu ?? null,
        }
      })
    }
    if (bbyAmir2Goster) {
      bbyAmir2FlatListe = performansBbyAmir2FlatListeOlustur(bbyAmir2Satirlar, adMap)
    }
    if (baskanLanding) {
      baskanDogrudanListesi = baskanDogrudanSatirlar.map((r, i) => {
        const mud = r.mudurluk_adi ?? r.kadro_mudurlugu ?? ''
        return {
          ...personelSatirOlustur(r, i + 1, mud),
          mudurluk_adi: r.mudurluk_adi ?? r.kadro_mudurlugu ?? null,
        }
      })
    }
  }

  const landingModu: PerformansLandingModu = mudurLanding
    ? 'mudur'
    : baskanLanding
      ? 'baskan'
      : bbyAmir1Goster
        ? 'bby1'
        : bbyAmir2Goster
          ? 'bby2'
          : 'normal'

  return (
    <PerformansDonemDashboardClient
      donem={donem}
      ilerleme={gosterimIlerleme}
      mudurlukler={mudurlukler}
      personeller={personeller}
      mudurlukGruplari={mudurlukGruplari}
      bbyMudurListesi={bbyMudurListesi}
      bbyAmir2FlatListe={bbyAmir2FlatListe}
      baskanDogrudanListesi={baskanDogrudanListesi}
      seciliMudurluk={mudurLanding ? null : seciliMudurluk}
      landingModu={landingModu}
      bby2Detay={efektifBby2Detay}
      baskanDetay={baskanDetay}
      isAdmin={admin}
      amirErisim={amirErisim}
    />
  )
}
