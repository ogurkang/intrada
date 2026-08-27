import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchAllKadroHareketleri, fetchAllPaged } from '@/lib/supabase-sayfala'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import AraziPuantajClient, { type AraziPersonel, type AraziDonemBilgi } from '@/components/kesintiler/AraziPuantajClient'
import { araziKayitTopluKaydet } from './actions'
import type { Tables } from '@/types/database'
import { izinKodlariBySicilGunFromHareketler } from '@/lib/arazi-izin-gunleri'
import { buildTurAdiToKodMap } from '@/lib/izin-puantaj-kodu'

interface Props {
  params: Promise<{ donem_id: string }>
}

function normMudStr(v: string | null | undefined) {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

function yilAraligi(baslangic: string, bitis: string): number[] {
  const b = new Date(baslangic)
  const s = new Date(bitis)
  if (isNaN(b.getTime()) || isNaN(s.getTime())) return []
  const yillar: number[] = []
  for (let y = b.getFullYear(); y <= s.getFullYear(); y++) yillar.push(y)
  return yillar
}

function tatilleriDonemeUydur(
  tatiller: Array<{ tatil_baslangici: string | null; tatil_bitisi: string | null; tatil_yapisi?: string | null }>,
  baslangic: string,
  bitis: string,
) {
  const yillar = yilAraligi(baslangic, bitis)
  return tatiller.flatMap(t => {
    const bas = String(t.tatil_baslangici ?? '').slice(0, 10)
    const son = String(t.tatil_bitisi ?? '').slice(0, 10)
    if (!bas || !son) return []
    const yapi = String(t.tatil_yapisi ?? '').trim()
    if (yapi !== 'Sabit Tatil') return [{ baslangic: bas, bitis: son }]
    const mmddBas = bas.slice(5, 10)
    const mmddSon = son.slice(5, 10)
    return yillar.map(y => ({ baslangic: `${y}-${mmddBas}`, bitis: `${y}-${mmddSon}` }))
  })
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
    const { data: kadroRaw } = await fetchAllKadroHareketleri(supabase, 'asil, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu, statu', q => q.is('ayrilis_tarihi', null).in('kadro_unvani', araziUnvanlar).not('asil', 'is', null))

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
      const statuMap: Record<string, string> = {}
      ;(kadroRaw ?? []).forEach(k => {
        if (k.asil) {
          mudMap[k.asil] = k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? ''
          oranMap[k.asil] = unvanOranMap[k.kadro_unvani ?? ''] ?? 0
          if (k.statu) statuMap[k.asil] = String(k.statu).trim()
        }
      })

      personeller = sicilNolar.map(s => ({
        sicil_no: s,
        ad_soyad: adMap[s] ?? s,
        mudurluk: mudMap[s] ?? null,
        oran: oranMap[s] ?? 0,
        statu: statuMap[s] ?? null,
      })).sort((a, b) => {
        if (a.oran !== b.oran) return a.oran - b.oran
        return String(a.sicil_no).localeCompare(String(b.sicil_no), 'tr')
      })
    }
  }

  /** Sözleşmeli veya işçi arazi personeli olan müdürlükler (dropdown birleşik liste) */
  let mudurlukDropdown: string[] = []
  if (araziUnvanlar.length > 0) {
    const [{ data: mudKadro }, { data: mudTanimRaw }] = await Promise.all([
      fetchAllKadroHareketleri(supabase, 'gorev_mudurlugu, kadro_mudurlugu', q => q.is('ayrilis_tarihi', null).in('kadro_unvani', araziUnvanlar).in('statu', ['Sözleşmeli', 'İşçi']).not('asil', 'is', null)),
      supabase.from('tanim_mudurluk').select('mudurluk_adi').eq('aktif', true),
    ])
    const byNorm = new Map<string, string>()
    for (const m of mudTanimRaw ?? []) {
      if (m.mudurluk_adi) byNorm.set(normMudStr(m.mudurluk_adi), m.mudurluk_adi)
    }
    const mudSet = new Set<string>()
    for (const k of mudKadro ?? []) {
      const raw = String(k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '').trim()
      if (!raw) continue
      const canon = byNorm.get(normMudStr(raw)) ?? raw
      mudSet.add(canon)
    }
    mudurlukDropdown = [...mudSet].sort((a, b) => a.localeCompare(b, 'tr'))
  }

  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const kisitliKullanici = access.mode === 'kullanici' && !isAdminLike(access)
  let mudurlukSecenekleri: string[] | undefined
  let mudurlukSaltOkunur = false
  if (kisitliKullanici) {
    const km = await getKullaniciGorevMudurlukleri(supabase, access.sicilNo)
    mudurlukSecenekleri = km.mudurlukler
    mudurlukSaltOkunur = km.tekSecimSaltOkunur
    const izin = new Set(km.mudurlukler)
    personeller = personeller.filter(p => izin.has((p.mudurluk ?? '').trim()))
  }

  let mudurlukDropdownFiltered = mudurlukDropdown
  if (kisitliKullanici && mudurlukSecenekleri?.length) {
    const izinMud = new Set(mudurlukSecenekleri.map(normMudStr))
    mudurlukDropdownFiltered = mudurlukDropdown.filter(m => izinMud.has(normMudStr(m)))
  }

  // 4) Dönem içindeki resmi tatiller
  const { data: tatilRaw } = await supabase
    .from('tanim_izin_tatil')
    .select('tatil_baslangici, tatil_bitisi, tatil_yapisi')
    .eq('durum', true)

  // Tatil tarihlerini tek tek güne genişlet (YYYY-MM-DD, timezone-safe)
  const tatilGunler: string[] = []
  tatilleriDonemeUydur(tatilRaw ?? [], donem.baslangic_tarihi, donem.bitis_tarihi)
    .filter(t => t.baslangic <= donem.bitis_tarihi && t.bitis >= donem.baslangic_tarihi)
    .forEach(t => {
    const basStr = t.baslangic
    const bitStr = t.bitis
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

  // İzin hareketleri: iptal hariç (Taslak dahil), tür kodu ile dönem içi günler
  const sicilListArazi = personeller.map(p => p.sicil_no)
  let izinKodlariBySicilGun: Record<string, Record<string, string>> = {}
  if (sicilListArazi.length > 0) {
    const { data: izinTurRaw } = await supabase
      .from('tanim_izin_tur')
      .select('tur_adi, kod')
      .eq('durum', true)
    const turAdiToKod = buildTurAdiToKodMap(izinTurRaw ?? [])

    const { data: izinRaw } = await fetchAllPaged((from, to) =>
      supabase
        .from('izin_hareketleri')
        .select('sicil_no, baslama, ayrilis, tur, durum')
        .in('sicil_no', sicilListArazi)
        .neq('yil', 2025)
        .neq('durum', 'İptal Edildi')
        .lte('ayrilis', donem.bitis_tarihi)
        .gt('baslama', donem.baslangic_tarihi)
        .order('id')
        .range(from, to),
    )

    izinKodlariBySicilGun = izinKodlariBySicilGunFromHareketler(
      izinRaw ?? [],
      String(donem.baslangic_tarihi).slice(0, 10),
      String(donem.bitis_tarihi).slice(0, 10),
      turAdiToKod,
    )
  }

  // Müdürlük bazında tüm personel (Puantör/Birim Amiri/Müdür - asil+vekil, görev veya kadro müdürlüğü)
  const normMud = normMudStr
  const mudImzaKaynak = [
    ...mudurlukDropdownFiltered,
    ...personeller.map(p => (p.mudurluk ?? '').trim()).filter(Boolean),
  ]
  const mudurluklerListRaw = [...new Set(mudImzaKaynak)].sort((a, b) => a.localeCompare(b, 'tr'))
  const mudurluklerList =
    kisitliKullanici && mudurlukSecenekleri?.length
      ? mudurluklerListRaw.filter(m => mudurlukSecenekleri.some(u => normMudStr(u) === normMudStr(m)))
      : mudurluklerListRaw
  const mudurlukPersonelMap: Record<string, { sicil_no: string; ad_soyad: string }[]> = {}
  const { data: kadroTumRaw } = await fetchAllKadroHareketleri(supabase, 'asil, vekil, gorev_mudurlugu, kadro_mudurlugu', q => q.is('ayrilis_tarihi', null))
  const { data: ozetTumRaw } = await supabase
    .from('personel_kadro_ozet')
    .select('sicil_no, ad_soyad, gorev_mudurlugu')
  for (const m of mudurluklerList) {
    const hedefMud = normMud(m)
    const siciller = new Set<string>()
    const adMap: Record<string, string> = {}
    for (const k of kadroTumRaw ?? []) {
      const gorevMud = normMud(k.gorev_mudurlugu)
      const kadroMud = normMud(k.kadro_mudurlugu)
      if (gorevMud === hedefMud || kadroMud === hedefMud) {
        if (k.asil) siciller.add(k.asil)
        if (k.vekil) siciller.add(k.vekil)
      }
    }
    for (const o of ozetTumRaw ?? []) {
      if (!o.sicil_no) continue
      if (normMud(o.gorev_mudurlugu) !== hedefMud) continue
      siciller.add(o.sicil_no)
      adMap[o.sicil_no] = o.ad_soyad ?? o.sicil_no
    }
    const sicilList = [...siciller]
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
      mudurlukDropdown={mudurlukDropdownFiltered.length > 0 ? mudurlukDropdownFiltered : undefined}
      mudurlukSecenekleri={kisitliKullanici ? mudurlukSecenekleri : undefined}
      mudurlukSaltOkunur={kisitliKullanici ? mudurlukSaltOkunur : undefined}
      showAnaSayfaLink={kisitliKullanici}
      izinKodlariBySicilGun={izinKodlariBySicilGun}
      onKaydetToplu={araziKayitTopluKaydet}
    />
  )
}
