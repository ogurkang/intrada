import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import AraziPuantajClient, { type AraziPersonel, type AraziDonemBilgi } from '@/components/kesintiler/AraziPuantajClient'
import { araziKayitToggle, araziKayitTopluKaydet } from './actions'
import type { Tables } from '@/types/database'

interface Props {
  params: Promise<{ donem_id: string }>
}

export default async function AraziPuantajPage({ params }: Props) {
  const { donem_id: donemIdStr } = await params
  const donem_id = parseInt(donemIdStr, 10)
  if (isNaN(donem_id)) notFound()

  const supabase = await createClient()

  // 1) Dönem bilgisi
  const { data: donemRow, error } = await supabase
    .from('arazi_donem')
    .select('*')
    .eq('id', donem_id)
    .single()

  if (error || !donemRow) notFound()
  const donem = donemRow as Tables<'arazi_donem'>

  // 2) Arazi ünvanlı (arazi=true) aktif personel + kat_sayi (oran)
  const { data: unvanRaw } = await supabase
    .from('tanim_unvan')
    .select('unvan_adi, kat_sayi')
    .eq('arazi', true)
    .eq('aktif', true)

  const unvanOranMap: Record<string, number> = {}
  ;(unvanRaw ?? []).forEach(u => {
    if (u.unvan_adi) unvanOranMap[u.unvan_adi] = Number(u.kat_sayi ?? 0) || 0
  })

  const araziUnvanlar = Object.keys(unvanOranMap)

  // 3) Bu ünvanlardan birinde görev yapan aktif personel (kadro_hareketleri üzerinden)
  let personeller: AraziPersonel[] = []
  if (araziUnvanlar.length > 0) {
    const { data: kadroRaw } = await supabase
      .from('kadro_hareketleri')
      .select('asil, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu')
      .is('ayrilis_tarihi', null)
      .in('kadro_unvani', araziUnvanlar)
      .not('asil', 'is', null)

    const sicilNolar = [...new Set((kadroRaw ?? []).map(k => k.asil).filter(Boolean))] as string[]

    if (sicilNolar.length > 0) {
      const { data: calisanRaw } = await supabase
        .from('calisan')
        .select('sicil_no, ad_soyad')
        .in('sicil_no', sicilNolar)

      const adMap: Record<string, string> = {}
      ;(calisanRaw ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })

      const mudMap: Record<string, string> = {}
      const oranMap: Record<string, number> = {}
      ;(kadroRaw ?? []).forEach(k => {
        if (k.asil) {
          mudMap[k.asil] = k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? ''
          oranMap[k.asil] = unvanOranMap[k.kadro_unvani ?? ''] ?? 0
        }
      })

      personeller = sicilNolar.map(s => ({
        sicil_no: s,
        ad_soyad: adMap[s] ?? s,
        mudurluk: mudMap[s] ?? null,
        oran: oranMap[s] ?? 0,
      })).sort((a, b) => (a.ad_soyad ?? '').localeCompare(b.ad_soyad ?? '', 'tr'))
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  let mudurlukSecenekleri: string[] | undefined
  let mudurlukSaltOkunur = false
  if (access.mode === 'kullanici') {
    const km = await getKullaniciGorevMudurlukleri(supabase, access.sicilNo)
    mudurlukSecenekleri = km.mudurlukler
    mudurlukSaltOkunur = km.tekSecimSaltOkunur
    const izin = new Set(km.mudurlukler)
    personeller = personeller.filter(p => izin.has((p.mudurluk ?? '').trim()))
  }

  // 4) Dönem içindeki resmi tatiller
  const { data: tatilRaw } = await supabase
    .from('tanim_izin_tatil')
    .select('tatil_baslangici, tatil_bitisi')
    .eq('durum', true)
    .lte('tatil_baslangici', donem.bitis_tarihi)
    .gte('tatil_bitisi', donem.baslangic_tarihi)

  // Tatil tarihlerini tek tek güne genişlet (YYYY-MM-DD, timezone-safe)
  const tatilGunler: string[] = []
  ;(tatilRaw ?? []).forEach(t => {
    if (!t.tatil_baslangici || !t.tatil_bitisi) return
    const basStr = String(t.tatil_baslangici).slice(0, 10)
    const bitStr = String(t.tatil_bitisi).slice(0, 10)
    if (basStr > bitStr) return
    let current = basStr
    while (current <= bitStr) {
      tatilGunler.push(current)
      const d = new Date(current + 'T12:00:00')
      d.setDate(d.getDate() + 1)
      current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  })

  // 5) Bu döneme ait kayıtlar
  const { data: kayitRaw } = await supabase
    .from('arazi_kayit')
    .select('sicil_no, tarih')
    .eq('donem_id', donem_id)

  const markedSet = new Set<string>(
    (kayitRaw ?? []).map(k => `${k.sicil_no}:${k.tarih}`)
  )

  // Müdürlük bazında tüm personel (Puantör/Birim Amiri/Müdür - asil+vekil, görev veya kadro müdürlüğü)
  const mudurluklerList =
    access.mode === 'kullanici' && mudurlukSecenekleri?.length
      ? mudurlukSecenekleri
      : [...new Set(personeller.map(p => p.mudurluk ?? ''))]
  const mudurlukPersonelMap: Record<string, { sicil_no: string; ad_soyad: string }[]> = {}
  const { data: kadroTumRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, gorev_mudurlugu, kadro_mudurlugu')
    .is('ayrilis_tarihi', null)
  for (const m of mudurluklerList) {
    const siciller = new Set<string>()
    for (const k of kadroTumRaw ?? []) {
      const gorevMud = (k.gorev_mudurlugu ?? '').trim()
      const kadroMud = (k.kadro_mudurlugu ?? '').trim()
      if (gorevMud === m || kadroMud === m) {
        if (k.asil) siciller.add(k.asil)
        if (k.vekil) siciller.add(k.vekil)
      }
    }
    const sicilList = [...siciller]
    let adMap: Record<string, string> = {}
    if (sicilList.length > 0) {
      const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', sicilList)
      ;(cal ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
    }
    mudurlukPersonelMap[m] = sicilList
      .map(s => ({ sicil_no: s, ad_soyad: adMap[s] ?? s }))
      .sort((a, b) => (a.ad_soyad || '').localeCompare(b.ad_soyad || '', 'tr'))
  }

  const donemBilgi: AraziDonemBilgi = {
    id:               donem.id,
    yil:              donem.yil,
    sira_no:          donem.sira_no,
    donem_adi:        donem.donem_adi,
    baslangic_tarihi: donem.baslangic_tarihi,
    bitis_tarihi:     donem.bitis_tarihi,
    durum:            donem.durum,
  }

  return (
    <AraziPuantajClient
      donem={donemBilgi}
      personeller={personeller}
      tatilGunler={tatilGunler}
      markedSet={markedSet}
      mudurlukPersonelMap={mudurlukPersonelMap}
      mudurlukSecenekleri={access.mode === 'kullanici' ? mudurlukSecenekleri : undefined}
      mudurlukSaltOkunur={access.mode === 'kullanici' ? mudurlukSaltOkunur : undefined}
      onToggle={araziKayitToggle}
      onKaydetToplu={araziKayitTopluKaydet}
    />
  )
}
