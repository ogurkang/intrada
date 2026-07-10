import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  kesintimHesapla,
  buildIzyAnnualBakiyeBeforeMap,
  applyShakIzyKsdToSonuc,
  buildShakWindowsForYear,
  isIzyRhTur,
  izyRhToplamGun,
  pickGlobalCurDonemForShak,
  type KesintimDonemRow,
  type KesintimIzinRow,
  type KesintimHesapSatir,
  type KesintimKategori,
} from '@/lib/kesinym-hesap'
import {
  buildIzyAnnualRhIzinler,
  buildShakCurrentDonemRhDays,
  mergeRhSiciller,
  shakChainDonemIdListesi,
  shakChainExtraIzySiraNolari,
} from '@/lib/sosyal-hak-izy-hesap'
import { RMY_IZIN_TURLERI } from '@/lib/kesintiler-kadro'
import { applyGridBorders, mergeSatir } from '@/lib/kesintiler-excel'
function tarih(t: string | null | undefined) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

const TIP_LABEL: Record<string, string> = {
  rmy: 'Raporlu Memur',
  ivy: 'İzinli Vekil',
  izy: 'İzinli Zabıta',
}

/** Her modül için ilgili Supabase tablo adları */
const MODUL_TABLOLAR = {
  rmy: { donem: 'raporlu_memurlar_yeni_donem',  secim: 'raporlu_memurlar_yeni_secim' },
  ivy: { donem: 'izinli_vekiller_yeni_donem',    secim: 'izinli_vekiller_yeni_secim' },
  izy: { donem: 'izinli_zabitalar_yeni_donem',   secim: 'izinli_zabitalar_yeni_secim' },
} as const

/** Modülün izin türü filtresi (null = filtre yok) */
const MODUL_TUR_FILTRE: Record<string, string[] | null> = {
  rmy: [...RMY_IZIN_TURLERI],
  ivy: null,
  izy: null,
}

type Modul = 'rmy' | 'ivy' | 'izy'

interface LeafRow {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  unvan:    string
  tip:      string
  tur:      string
  ayrilis:  string | null
  baslama:  string | null
  gun:      number
}

function sortle(arr: LeafRow[]) {
  const tipOrder: Record<string, number> = { rmy: 0, ivy: 1, izy: 2 }
  return [...arr].sort((a, b) => {
    const td = (tipOrder[a.tip] ?? 9) - (tipOrder[b.tip] ?? 9)
    if (td !== 0) return td
    const an = parseInt(a.sicil_no, 10), bn = parseInt(b.sicil_no, 10)
    return isNaN(an) || isNaN(bn) ? a.sicil_no.localeCompare(b.sicil_no, 'tr') : an - bn
  })
}

/**
 * Her modül için, verilen sira_no listesini o modülün donem/secim tabloları kullanarak
 * `kesintimHesapla` ile hesaplar ve sonuçları sira_no → KesintimHesapSatir haritası olarak döner.
 *
 * globalCurId: Sosyal Hak döneminin başlangıç tarihine karşılık gelen (ya da hemen öncesindeki)
 * modül dönemi. Bu sayede tüm izinler aynı referans dönemine göre hesaplanır; OD tutarlılığı sağlanır.
 *
 * Dönem zinciri kırılan (önceki modül döneminde tam işlenmiş, SD=0) izinler için fallback:
 * globalCurId döneminin perspektifinden OD/K/SD hesaplanır.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function hesaplaModul(
  supabase: any,
  modul: Modul,
  siraNoList: string[],
  izinlerByTip: LeafRow[],
  tatiller: { tatil_adi?: string | null; tatil_turu?: string | null; tatil_yapisi?: 'Yıllık Tatil' | 'Sabit Tatil' | null; tatil_baslangici: string; tatil_bitisi: string; durum: boolean }[],
  /** Sosyal Hak döneminin başlangıç tarihi (globalCurId seçimi için) */
  shakBasTarihi: string,
  /** Sosyal Hak döneminin bitiş tarihi (max-overlap hesabı için) */
  shakBitTarihi: string,
): Promise<Map<string, KesintimHesapSatir>> {
  if (siraNoList.length === 0) return new Map()

  const { donem: donemTablo, secim: secimTablo } = MODUL_TABLOLAR[modul]

  /* ── Modül dönemleri ────────────────────────────────────────────── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: tumDonemlerRaw } = await db
    .from(donemTablo)
    .select('id, baslangic_tarihi, bitis_tarihi')
    .order('baslangic_tarihi', { ascending: true }) as { data: { id: number; baslangic_tarihi: string; bitis_tarihi: string }[] | null }

  if (!tumDonemlerRaw || tumDonemlerRaw.length === 0) return new Map()

  const tumDonemler: KesintimDonemRow[] = tumDonemlerRaw.map((d, i) => {
    const basMs = new Date(d.baslangic_tarihi).setHours(0, 0, 0, 0)
    const bitMs = new Date(d.bitis_tarihi).setHours(23, 59, 59, 999)
    const tg    = Math.floor((new Date(d.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(d.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000) + 1
    return {
      id: d.id, baslangic_tarihi: d.baslangic_tarihi, bitis_tarihi: d.bitis_tarihi,
      baslangic_tarihi_ms: basMs, bitis_tarihi_ms: bitMs, idx: i, takvimGun: tg,
      kapasite: modul === 'izy' ? tg : Math.min(tg, 30),
    }
  })

  /* ── globalCurId: Sosyal Hak dönemiyle en fazla örtüşen modül dönemi ── */
  const shakBasMs = new Date(shakBasTarihi).setHours(0, 0, 0, 0)
  const shakBitMs = new Date(shakBitTarihi).setHours(23, 59, 59, 999)
  const { globalCurDonem, donemler: tumDonemlerResolved } = pickGlobalCurDonemForShak(
    tumDonemler,
    shakBasTarihi,
    shakBitTarihi,
    modul,
  )
  tumDonemler.length = 0
  tumDonemler.push(...tumDonemlerResolved)
  const globalCurId = globalCurDonem.id

  // idxById: sanal dönem de dahil edilmeli → tumDonemler tamamlandıktan sonra kur
  const idxById = new Map(tumDonemler.map(d => [d.id, d.idx]))

  /* ── ilkDonemIdBySiraNo: her iznin modül secim tablosundaki ilk dönemi ── */
  const { data: secimRaw } = await db
    .from(secimTablo)
    .select('donem_id, izin_sira_no, dahil')
    .in('izin_sira_no', siraNoList) as { data: { donem_id: number; izin_sira_no: string; dahil: boolean }[] | null }

  const ilkDonemIdBySiraNo: Record<string, number> = {}
  for (const s of secimRaw ?? []) {
    if (!s.dahil || !s.izin_sira_no) continue
    const idx = idxById.get(s.donem_id) ?? -1
    if (idx < 0) continue
    const prev = ilkDonemIdBySiraNo[s.izin_sira_no]
    if (prev === undefined || idx < (idxById.get(prev) ?? 9999)) {
      ilkDonemIdBySiraNo[s.izin_sira_no] = s.donem_id
    }
  }
  // Modül secim tablosunda hiç kaydı olmayan sira_nolar → globalCurId'e ata
  for (const sn of siraNoList) {
    if (!(sn in ilkDonemIdBySiraNo)) ilkDonemIdBySiraNo[sn] = globalCurId
  }

  /* ── İzin verileri (modülün tur filtresine göre) ─────────────────── */
  const turFiltre = MODUL_TUR_FILTRE[modul]
  type IzinDbRow = { sira_no: string | null; sicil_no: string | null; tur: string | null; ayrilis: string | null; baslama: string | null; gun: number | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let izinQuery: any = db
    .from('izin_hareketleri')
    .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
    .in('sira_no', siraNoList)
    .neq('durum', 'İptal Edildi')
  if (turFiltre) izinQuery = izinQuery.in('tur', turFiltre)
  const { data: izinRawAny } = await izinQuery
  const izinRaw = (izinRawAny ?? []) as IzinDbRow[]

  const siciller = [...new Set(izinRaw.map(i => i.sicil_no).filter(Boolean))] as string[]
  const adMap:    Record<string, string> = {}
  const unvanMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: cal } = await db.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    ;(cal ?? []).forEach((c: { sicil_no: string | null; ad_soyad: string | null }) => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
    const { data: kad } = await db.from('personel_kadro_ozet').select('sicil_no, kadro_unvani').in('sicil_no', siciller)
    ;(kad ?? []).forEach((k: { sicil_no: string | null; kadro_unvani: string | null }) => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
  }
  for (const r of izinlerByTip) {
    if (!adMap[r.sicil_no]    && r.ad_soyad) adMap[r.sicil_no]    = r.ad_soyad
    if (!unvanMap[r.sicil_no] && r.unvan)    unvanMap[r.sicil_no] = r.unvan
  }

  const izinler: KesintimIzinRow[] = izinRaw
    .filter(i => i.sira_no && i.ayrilis && i.baslama)
    .map(i => ({
      sira_no:  i.sira_no!,
      sicil_no: i.sicil_no ?? '',
      ad_soyad: adMap[i.sicil_no ?? ''] ?? i.sicil_no ?? '',
      unvan:    unvanMap[i.sicil_no ?? ''] ?? '',
      tur:      i.tur ?? '',
      ayrilis:  i.ayrilis,
      baslama:  i.baslama,
      gun:      i.gun ?? 0,
    }))

  let izyAnnualRhIzinler: KesintimIzinRow[] | undefined
  if (modul === 'izy') {
    let rhSiciller = [...siciller]
    const shakYilForChain = new Date(shakBasTarihi).getFullYear()
    const { data: shDonemAll } = await db
      .from('sosyal_hak_donem')
      .select('id, baslangic_tarihi, bitis_tarihi')
      .order('baslangic_tarihi', { ascending: true }) as {
        data: { id: number; baslangic_tarihi: string; bitis_tarihi: string }[] | null
      }
    const chainDonemIds = shakChainDonemIdListesi(shDonemAll ?? [], shakYilForChain, shakBitTarihi)
    if (chainDonemIds.length > 0) {
      const { data: chainSecim } = await db
        .from('sosyal_hak_secim')
        .select('izin_sira_no')
        .in('donem_id', chainDonemIds)
        .eq('tip', 'izy')
        .eq('dahil', true) as { data: { izin_sira_no: string }[] | null }
      const extraSiraNos = shakChainExtraIzySiraNolari(
        siraNoList,
        (chainSecim ?? []).map(s => s.izin_sira_no),
      )
      if (extraSiraNos.length > 0) {
        const { data: extraIzin } = await db
          .from('izin_hareketleri')
          .select('sicil_no')
          .in('sira_no', extraSiraNos)
          .neq('durum', 'İptal Edildi') as { data: { sicil_no: string | null }[] | null }
        const extraSiciller = [...new Set((extraIzin ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
        if (extraSiciller.length > 0) {
          rhSiciller = mergeRhSiciller(rhSiciller, extraSiciller)
          const missing = extraSiciller.filter(s => !adMap[s])
          if (missing.length > 0) {
            const { data: calExtra } = await db.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', missing)
            ;(calExtra ?? []).forEach((c: { sicil_no: string | null; ad_soyad: string | null }) => {
              if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
            })
            const { data: kadExtra } = await db.from('personel_kadro_ozet').select('sicil_no, kadro_unvani').in('sicil_no', missing)
            ;(kadExtra ?? []).forEach((k: { sicil_no: string | null; kadro_unvani: string | null }) => {
              if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? ''
            })
          }
        }
      }
    }

    if (rhSiciller.length > 0) {
      const { data: rhRaw } = await db
        .from('izin_hareketleri')
        .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
        .in('sicil_no', rhSiciller)
        .in('tur', ['Rapor', 'Heyet Raporu'])
        .neq('durum', 'İptal Edildi')
      izyAnnualRhIzinler = buildIzyAnnualRhIzinler(izinler, (rhRaw ?? []) as IzinDbRow[], adMap, unvanMap)
    }
  }

  /* ── kesintimHesapla: globalCurId ile tek çalıştırma ─────────────── */
  const sonuc = kesintimHesapla({
    modul,
    curId: globalCurId,
    donemler: tumDonemler,
    ilkDonemIdBySiraNo,
    izinler,
    tatiller,
    izyAnnualRhIzinler,
  })
  const resultMap = new Map<string, KesintimHesapSatir>(sonuc.satirlar.map(s => [s.sira_no, s]))

  /* ── Fallback: dönem zinciri kırılan izinler ─────────────────────── */
  // kesintimHesapla'da firstIdx < curIdx olup ara dönemde SD=0 olan izinler curRow=null döner.
  // Bu izinler globalCurId dönem perspektifinden hesaplanır:
  //   - Dönem öncesi (Takipteki): OD=miktarı, K=min(OD,kapasite), SD=kalan
  //   - Dönem içi  (Dönemdeki) : K=overlap, SD=taşan
  //   - Dönem sonrası(Askıdaki): SD=miktar
  const izinBySiraNo = new Map(izinler.map(i => [i.sira_no, i]))
  function sod2(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }

  for (const sn of siraNoList) {
    if (resultMap.has(sn)) continue
    const iv = izinBySiraNo.get(sn)
    if (!iv || !iv.ayrilis || !iv.baslama) continue

    const aD = new Date(iv.ayrilis)
    const bD = new Date(iv.baslama)
    if (isNaN(aD.getTime()) || isNaN(bD.getTime())) continue
    const startMs  = sod2(aD)
    const lastDate = new Date(bD); lastDate.setDate(lastDate.getDate() - 1)
    const lastMs   = sod2(lastDate)
    if (lastMs < startMs) continue

    const toplam = iv.gun > 0 ? iv.gun : Math.floor((lastMs - startMs) / 86_400_000) + 1
    if (toplam <= 0) continue

    const kapasite = globalCurDonem.kapasite

    const isRH = modul === 'izy' && isIzyRhTur(iv.tur)
    const annualMap = isRH && izyAnnualRhIzinler
      ? buildIzyAnnualBakiyeBeforeMap(izyAnnualRhIzinler)
      : new Map<string, number>()
    const bakiyeBefore = isRH ? (annualMap.get(sn) ?? 0) : 0
    const annualRB     = isRH ? bakiyeBefore + toplam : 0

    let od = 0, r = 0, rr = 0, hr = 0, kes = 0, sd = 0
    if (isRH) {
      if (iv.tur === 'Heyet Raporu') hr = toplam
      else r = toplam
    } else if (modul === 'rmy') {
      r  = iv.tur === 'Rapor' ? toplam : 0
      rr = (iv.tur === 'Refakatçi Raporu' || iv.tur === 'Refakatçi İzni') ? toplam : 0
    } else {
      r = toplam
    }

    const kategori: KesintimKategori =
      startMs > globalCurDonem.bitis_tarihi_ms   ? 'Askıdaki İzinler'
      : startMs >= globalCurDonem.baslangic_tarihi_ms ? 'Dönemdeki İzinler'
      : 'Takipteki İzinler'

    resultMap.set(sn, {
      sira_no:  iv.sira_no,
      sicil_no: iv.sicil_no,
      ad_soyad: iv.ad_soyad,
      unvan:    iv.unvan,
      tur:      iv.tur,
      OD: od, R: r, RR: rr, HR: hr, K: kes, SD: sd, RB: annualRB,
      kategori,
    })
  }

  if (modul === 'izy' && izyAnnualRhIzinler) {
    const shakYil = new Date(shakBasTarihi).getFullYear()
    const { data: shDonemChain } = await db
      .from('sosyal_hak_donem')
      .select('baslangic_tarihi, bitis_tarihi')
      .order('baslangic_tarihi', { ascending: true }) as {
        data: { baslangic_tarihi: string; bitis_tarihi: string }[] | null
      }

    const shakWindows = buildShakWindowsForYear(shDonemChain ?? [], shakYil, shakBitMs)

    const currentDonemRhDays = buildShakCurrentDonemRhDays(
      izinler,
      new Set(siraNoList),
    )

    const adjusted = applyShakIzyKsdToSonuc(
      { satirlar: [...resultMap.values()], personeller: [], takipteki: [], donemdeki: [], askidaki: [] },
      izyAnnualRhIzinler,
      shakWindows,
      currentDonemRhDays,
    )
    resultMap.clear()
    for (const s of adjusted.satirlar) resultMap.set(s.sira_no, s)
  }

  return resultMap
}

export async function GET(request: NextRequest) {
  const sp       = request.nextUrl.searchParams
  const donemIdP = sp.get('donem_id')
  const tipParam = sp.get('tip') ?? 'detay'   // 'detay' | 'ozet' | 'genel'
  const donemId  = parseInt(donemIdP ?? '0', 10)
  if (!donemId || isNaN(donemId)) {
    return NextResponse.json({ error: 'donem_id gerekli' }, { status: 400 })
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  /* ── Dönem bilgisi ─────────────────────────────────────────────── */
  const { data: donem } = await db
    .from('sosyal_hak_donem')
    .select('id, donem_adi, sira_no, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .single()
  if (!donem) return NextResponse.json({ error: 'Dönem bulunamadı' }, { status: 404 })

  const takvimGun  = Math.floor(
    (new Date(donem.bitis_tarihi).setHours(0, 0, 0, 0) - new Date(donem.baslangic_tarihi).setHours(0, 0, 0, 0)) / 86_400_000
  ) + 1
  const donemAdi   = donem.donem_adi ?? donem.sira_no ?? `Dönem #${donem.id}`
  const donemMetin = `Dönem: ${tarih(donem.baslangic_tarihi)} - ${tarih(donem.bitis_tarihi)} (${takvimGun} gün)`

  /* ── Seçimler ──────────────────────────────────────────────────── */
  const { data: secimRaw } = await db
    .from('sosyal_hak_secim')
    .select('izin_sira_no, tip')
    .eq('donem_id', donemId)
    .eq('dahil', true)
  const secimler = (secimRaw ?? []) as { izin_sira_no: string; tip: string }[]
  if (secimler.length === 0) {
    return NextResponse.json({ error: 'Döneme aktarılmış izin yok' }, { status: 404 })
  }
  const siraNoList = [...new Set(secimler.map(s => s.izin_sira_no))]

  /* ── Temel izin verileri (tüm tipler) ─────────────────────────── */
  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
    .in('sira_no', siraNoList)
    .neq('durum', 'İptal Edildi')

  const siciller = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
  const adMap:    Record<string, string> = {}
  const unvanMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: cal } = await supabase.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
    ;(cal ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
    const { data: kad } = await supabase.from('personel_kadro_ozet').select('sicil_no, kadro_unvani').in('sicil_no', siciller)
    ;(kad ?? []).forEach(k => { if (k.sicil_no) unvanMap[k.sicil_no] = k.kadro_unvani ?? '' })
  }

  const izinBySiraNo = new Map(
    (izinRaw ?? [])
      .filter(i => i.sira_no && i.ayrilis && i.baslama)
      .map(i => [i.sira_no!, i]),
  )

  // Aynı izin birden fazla modülde (ör. rmy + izy) → Genel Excel'de her bölümde ayrı satır
  const leafRows: LeafRow[] = []
  for (const s of secimler) {
    const i = izinBySiraNo.get(s.izin_sira_no)
    if (!i?.sira_no || !i.ayrilis || !i.baslama) continue
    leafRows.push({
      sira_no:  i.sira_no,
      sicil_no: i.sicil_no ?? '',
      ad_soyad: adMap[i.sicil_no ?? ''] ?? i.sicil_no ?? '',
      unvan:    unvanMap[i.sicil_no ?? ''] ?? '',
      tip:      s.tip,
      tur:      i.tur ?? '',
      ayrilis:  i.ayrilis,
      baslama:  i.baslama,
      gun:      i.gun ?? 0,
    })
  }

  /* ── Tatiller (hesap motorları için ortak) ────────────────────── */
  const { data: tatilRaw } = await supabase
    .from('tanim_izin_tatil')
    .select('tatil_adi, tatil_turu, tatil_yapisi, tatil_baslangici, tatil_bitisi, durum')
    .eq('durum', true)
  const tatiller = (tatilRaw ?? []).map(t => ({
    tatil_adi: t.tatil_adi, tatil_turu: t.tatil_turu, tatil_yapisi: t.tatil_yapisi,
    tatil_baslangici: t.tatil_baslangici, tatil_bitisi: t.tatil_bitisi, durum: t.durum ?? true,
  }))

  /* ── Modül bazlı kesintimHesapla (Özet + Genel için) ─────────── */
  const rmySiraNoList = secimler.filter(s => s.tip === 'rmy').map(s => s.izin_sira_no)
  const ivySiraNoList = secimler.filter(s => s.tip === 'ivy').map(s => s.izin_sira_no)
  const izySiraNoList = secimler.filter(s => s.tip === 'izy').map(s => s.izin_sira_no)

  let rmySatirMap = new Map<string, KesintimHesapSatir>()
  let ivySatirMap = new Map<string, KesintimHesapSatir>()
  let izySatirMap = new Map<string, KesintimHesapSatir>()

  if (tipParam === 'ozet' || tipParam === 'genel') {
    const rmyLeaf = leafRows.filter(r => r.tip === 'rmy')
    const ivyLeaf = leafRows.filter(r => r.tip === 'ivy')
    const izyLeaf = leafRows.filter(r => r.tip === 'izy')

    ;[rmySatirMap, ivySatirMap, izySatirMap] = await Promise.all([
      hesaplaModul(supabase, 'rmy', rmySiraNoList, rmyLeaf, tatiller, donem.baslangic_tarihi, donem.bitis_tarihi),
      hesaplaModul(supabase, 'ivy', ivySiraNoList, ivyLeaf, tatiller, donem.baslangic_tarihi, donem.bitis_tarihi),
      hesaplaModul(supabase, 'izy', izySiraNoList, izyLeaf, tatiller, donem.baslangic_tarihi, donem.bitis_tarihi),
    ])
  }

  /* ═══════════════════════════════════════════════════════════════
     DETAY Excel — per-leave records (Tip sütunu ile)
  ═══════════════════════════════════════════════════════════════ */
  if (tipParam === 'detay') {
    const satirlar = sortle(leafRows)
    const cols = ['Sıra No', 'Kayıt No', 'Sicil No', 'Adı Soyadı', 'Tip', 'Tür', 'Ayrılış', 'Başlama', 'Süre (Gün)']
    const colCount = cols.length
    const rows: (string | number | XLSX.CellObject)[][] = []
    const mergeRows: number[] = []

    rows.push(mergeSatir('Sosyal Hak Kesintileri — Dönem İçindeki İzinler', colCount, { bold: true }))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemAdi, colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemMetin, colCount))
    mergeRows.push(rows.length - 1)
    rows.push(cols)

    if (satirlar.length === 0) {
      rows.push(Array(colCount).fill('').map((_, i) => (i === 3 ? 'Kayıt Yok' : '')))
    } else {
      satirlar.forEach((s, idx) => {
        rows.push([idx + 1, s.sira_no, s.sicil_no, s.ad_soyad, TIP_LABEL[s.tip] ?? s.tip, s.tur, tarih(s.ayrilis), tarih(s.baslama), s.gun])
      })
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
    ws['!cols']   = [{ wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }]
    applyGridBorders(ws, rows.length, colCount)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dönem İçindeki İzinler')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
    return xlsxResponse(buf, `Sosyal_Hak_Kesintileri_${donemAdi}_Detay`)
  }

  /* ═══════════════════════════════════════════════════════════════
     ÖZET Excel — per-person summary (modül bazında hesaplarla)
  ═══════════════════════════════════════════════════════════════ */
  if (tipParam === 'ozet') {
    const ozetCols  = ['Sıra No', 'Sicil No', 'Ad Soyad', 'Unvan', 'Önceki Dönemden', 'İzin Süresi', 'Rap. Bakiyesi', 'Kesilen', 'Sonraki Döneme']
    const colCount  = ozetCols.length
    const rows: (string | number | XLSX.CellObject)[][] = []
    const mergeRows: number[] = []

    rows.push(mergeSatir('Sosyal Hak Kesintileri — Genel Özet', colCount, { bold: true }))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemAdi, colCount))
    mergeRows.push(rows.length - 1)
    rows.push(mergeSatir(donemMetin, colCount))
    mergeRows.push(rows.length - 1)

    const tipSirasi: Modul[] = ['rmy', 'ivy', 'izy']
    const satirMapByTip: Record<string, Map<string, KesintimHesapSatir>> = { rmy: rmySatirMap, ivy: ivySatirMap, izy: izySatirMap }

    for (const tip of tipSirasi) {
      const tipLeaf = leafRows.filter(r => r.tip === tip)
      const satirMap = satirMapByTip[tip]
      if (tipLeaf.length === 0 && satirMap.size === 0) continue

      rows.push(mergeSatir(TIP_LABEL[tip] ?? tip, colCount, { gri: true }))
      mergeRows.push(rows.length - 1)
      rows.push(ozetCols)

      // Kişi bazı toplama
      type P = { sicil_no: string; ad_soyad: string; unvan: string; OD: number; IZ: number; RB: number; K: number; SD: number }
      const pMap = new Map<string, P>()
      for (const s of satirMap.values()) {
        const ex = pMap.get(s.sicil_no)
        if (!ex) {
          pMap.set(s.sicil_no, { sicil_no: s.sicil_no, ad_soyad: s.ad_soyad, unvan: s.unvan, OD: s.OD, IZ: s.R + s.RR + s.HR, RB: s.RB, K: s.K, SD: s.SD })
        } else {
          ex.OD += s.OD; ex.IZ += s.R + s.RR + s.HR; ex.K += s.K; ex.SD += s.SD
          if (s.RB > ex.RB) ex.RB = s.RB
        }
      }
      const pArr = [...pMap.values()].sort((a, b) => {
        const na = parseInt(a.sicil_no), nb = parseInt(b.sicil_no)
        return isNaN(na) || isNaN(nb) ? a.sicil_no.localeCompare(b.sicil_no, 'tr') : na - nb
      })

      if (pArr.length === 0) {
        rows.push(Array(colCount).fill('').map((_, i) => i === 2 ? 'Kayıt Yok' : ''))
      } else {
        pArr.forEach((p, idx) => {
          rows.push([idx + 1, p.sicil_no, p.ad_soyad, p.unvan, p.OD, p.IZ, p.RB || '', p.K, p.SD])
        })
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
    ws['!cols']   = [{ wch: 8 }, { wch: 10 }, { wch: 26 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 16 }]
    applyGridBorders(ws, rows.length, colCount)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Özet')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
    return xlsxResponse(buf, `Sosyal_Hak_Kesintileri_${donemAdi}_Ozet`)
  }

  /* ═══════════════════════════════════════════════════════════════
     GENEL Excel — per-leave rows + tüm modüller için özet sütunları
     Sıra: Kayıt No, Sicil, Ad, Tip, Tür, Ayrılış, Başlama, Süre → ÖD, İZ, RB, K, SD
  ═══════════════════════════════════════════════════════════════ */
  const genelCols = [
    'Sıra No', 'Kayıt No', 'Sicil No', 'Adı Soyadı', 'Tip', 'Tür',
    'Ayrılış', 'Başlama', 'Süre (Gün)',
    'Önceki Dönemden', 'İzin Süresi', 'Rapor Bakiyesi', 'Kesilen', 'Sonraki Döneme',
  ]
  const colCount = genelCols.length
  const rows: (string | number | XLSX.CellObject)[][] = []
  const mergeRows: number[] = []

  rows.push(mergeSatir('Sosyal Hak Kesintileri — Genel', colCount, { bold: true }))
  mergeRows.push(rows.length - 1)
  rows.push(mergeSatir(donemAdi, colCount))
  mergeRows.push(rows.length - 1)
  rows.push(mergeSatir(donemMetin, colCount))
  mergeRows.push(rows.length - 1)

  const satirMapByTip: Record<string, Map<string, KesintimHesapSatir>> = { rmy: rmySatirMap, ivy: ivySatirMap, izy: izySatirMap }
  const tipSirasi: Modul[] = ['rmy', 'ivy', 'izy']

  for (const tip of tipSirasi) {
    const tipRows = sortle(leafRows.filter(r => r.tip === tip))
    if (tipRows.length === 0) continue

    rows.push(mergeSatir(TIP_LABEL[tip] ?? tip, colCount, { gri: true }))
    mergeRows.push(rows.length - 1)
    rows.push(genelCols)

    const satirMap = satirMapByTip[tip]

    tipRows.forEach((s, idx) => {
      const hs = satirMap.get(s.sira_no)
      const od: string | number = hs ? hs.OD          : ''
      const iz: string | number = hs ? (hs.R + hs.RR + hs.HR) : ''
      const rb: string | number = hs ? (hs.RB || '')  : ''
      const k:  string | number = hs ? hs.K           : ''
      const sd: string | number = hs ? hs.SD          : ''

      rows.push([idx + 1, s.sira_no, s.sicil_no, s.ad_soyad, TIP_LABEL[s.tip] ?? s.tip, s.tur,
        tarih(s.ayrilis), tarih(s.baslama), s.gun,
        od, iz, rb, k, sd])
    })
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
  ws['!cols'] = [
    { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 26 }, { wch: 18 }, { wch: 20 },
    { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 16 },
  ]
  applyGridBorders(ws, rows.length, colCount)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Genel')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
  return xlsxResponse(buf, `Sosyal_Hak_Kesintileri_${donemAdi}_Genel`)
}

function xlsxResponse(buf: Buffer, name: string) {
  const safeName     = name.replace(/[:\*\?\/\\]/g, ' ').trim().substring(0, 90) || 'Sosyal_Hak'
  const fallbackName = safeName.replace(/[^\x20-\x7E]/g, '_')
  const encodedName  = encodeURIComponent(`${safeName}.xlsx`)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fallbackName}.xlsx"; filename*=UTF-8''${encodedName}`,
    },
  })
}
