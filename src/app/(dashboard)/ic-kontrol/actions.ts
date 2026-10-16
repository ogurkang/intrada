'use server'

import { createHash, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ickEylemGonderebilir, ickEylemYazabilir, ickHataMetni, ickPlanKoordinatoru, ickYetkiYukle, type IckDb, type IckYetki } from '@/lib/ick/erisim'
import { ickAktarimOnizle, type IckAktarimOnizleme } from '@/lib/ick/aktarim'
import { ickGorunenAd, ickKullaniciAdlari, ickMudurlukPersoneliYukle, ickSicilAdlari, ickTumMudurlukHaritasi, type IckPersonel } from '@/lib/ick/yukle'
import {
  ICK_IZLEME_SIKLIGI_ETIKET,
  ICK_PLAN_DURUM_ETIKET,
  ickKodNorm,
  ickTerminCoz,
  ICK_EYLEM_DURUM_ETIKET,
  type IckBeyanDurum,
  type IckEylemDurum,
  type IckEylemKisiRol,
  type IckIsbirligiKapsam,
  type IckKanitYeterlilik,
  type IckPlanDurum,
  type IckVekaletKaynak,
} from '@/lib/ick/tanim'

type Sonuc<T = object> = ({ hata: string } & Partial<T>) | ({ hata?: undefined } & T)

async function baglam(): Promise<{ hata: string } | { db: IckDb; yetki: IckYetki }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' }
  const { yetki, hata } = await ickYetkiYukle(supabase, user.id, user.email)
  if (hata) return { hata }
  if (!yetki.okuyabilir) return { hata: 'İç kontrol rolünüz tanımlı değil.' }
  return { db: supabase as IckDb, yetki }
}

function tazele() {
  revalidatePath('/ic-kontrol', 'layout')
}

function metin(v: unknown, uzunluk = 4000): string {
  return String(v ?? '').trim().slice(0, uzunluk)
}

function tarihGecerli(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
}

// ---------------------------------------------------------------------------
// Tanımlar
// ---------------------------------------------------------------------------

/** Müdürlüğün görevdeki personeli; koordinatör seçim listeleri için */
export async function ickMudurlukPersoneli(mudurlukId: number): Promise<Sonuc<{ personel: IckPersonel[] }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!(b.yetki.admin || b.yetki.koordinator)) return { hata: 'Personel listesini yönetici veya iç kontrol koordinatörü görür.' }
  const { personel, hata } = await ickMudurlukPersoneliYukle(b.db, mudurlukId)
  if (hata) return { hata }
  return { personel }
}

async function seciliPersonel(db: IckDb, mudurlukId: number, siciller: string[]): Promise<{ hata: string } | { secilen: IckPersonel[] }> {
  const istenen = [...new Set(siciller.map(s => String(s).trim()).filter(Boolean))]
  const { personel, hata } = await ickMudurlukPersoneliYukle(db, mudurlukId)
  if (hata) return { hata }
  const harita = new Map(personel.map(p => [p.sicil, p]))
  const yabanci = istenen.filter(s => !harita.has(s))
  if (yabanci.length) return { hata: `Seçilen kişi bu müdürlüğün personeli değil: ${yabanci.join(', ')}` }
  return { secilen: istenen.map(s => harita.get(s)!) }
}

/** Seçili sicilleri tabloya yazar: listede olmayanlar çıkarılır, yeniler eklenir */
async function sicilListesiYaz(
  db: IckDb,
  tablo: 'ick_plan_koordinator',
  anahtar: { plan_id: number },
  secilen: IckPersonel[],
  userId: string,
): Promise<string | null> {
  const [alan, deger] = Object.entries(anahtar)[0] as [string, number]
  const { data: mevcut, error: mErr } = await db.from(tablo).select('id, sicil_no').eq(alan, deger)
  if (mErr) return ickHataMetni(mErr.message)
  const yeni = new Set(secilen.map(p => p.sicil))
  const eskiler = ((mevcut as { id: number; sicil_no: string }[] | null) ?? [])
  const silinecek = eskiler.filter(r => !yeni.has(r.sicil_no)).map(r => r.id)
  if (silinecek.length) {
    const { error } = await db.from(tablo).delete().in('id', silinecek)
    if (error) return ickHataMetni(error.message)
  }
  const varOlan = new Set(eskiler.map(r => r.sicil_no))
  const eklenecek = secilen.filter(p => !varOlan.has(p.sicil)).map(p => ({ [alan]: deger, sicil_no: p.sicil, ad_soyad: p.ad, created_by: userId }))
  if (eklenecek.length) {
    const { error } = await db.from(tablo).insert(eklenecek)
    if (error) return ickHataMetni(error.message)
  }
  return null
}

type EylemKisiSecim = { sicil: string; ad: string; rol: IckEylemKisiRol }

/** Eylemlerin kişilerini seçimle eşitler: çıkarılanlar silinir, rolü değişen güncellenir, yeniler eklenir */
async function eylemKisileriYaz(db: IckDb, eylemIdler: number[], secim: EylemKisiSecim[], userId: string): Promise<string | null> {
  if (!eylemIdler.length) return null
  const { data: mevcut, error: mErr } = await db.from('ick_eylem_kisi').select('id, eylem_id, sicil_no, rol').in('eylem_id', eylemIdler)
  if (mErr) return ickHataMetni(mErr.message)
  const satirlar = (mevcut as { id: number; eylem_id: number; sicil_no: string; rol: IckEylemKisiRol }[] | null) ?? []
  const istenen = new Map(secim.map(s => [s.sicil, s]))
  const silinecek = satirlar.filter(r => !istenen.has(r.sicil_no)).map(r => r.id)
  if (silinecek.length) {
    const { error } = await db.from('ick_eylem_kisi').delete().in('id', silinecek)
    if (error) return ickHataMetni(error.message)
  }
  for (const r of satirlar) {
    const s = istenen.get(r.sicil_no)
    if (!s || s.rol === r.rol) continue
    const { error } = await db.from('ick_eylem_kisi').update({ rol: s.rol }).eq('id', r.id)
    if (error) return ickHataMetni(error.message)
  }
  const varOlan = new Set(satirlar.map(r => `${r.eylem_id}:${r.sicil_no}`))
  const eklenecek = eylemIdler.flatMap(eid =>
    secim
      .filter(s => !varOlan.has(`${eid}:${s.sicil}`))
      .map(s => ({ eylem_id: eid, rol: s.rol, sicil_no: s.sicil, ad_soyad: s.ad, created_by: userId })),
  )
  if (eklenecek.length) {
    const { error } = await db.from('ick_eylem_kisi').insert(eklenecek)
    if (error) return ickHataMetni(error.message)
  }
  return null
}

export async function ickBelgeTuruKaydet(girdi: {
  id?: number
  ad: string
  aciklama: string
  sira: number
  aktif: boolean
}): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!(b.yetki.admin || b.yetki.koordinator)) return { hata: 'Belge türlerini iç kontrol koordinatörü düzenler.' }
  const ad = metin(girdi.ad, 120)
  if (!ad) return { hata: 'Ad boş olamaz.' }
  const satir = { ad, aciklama: metin(girdi.aciklama, 500), sira: Math.max(1, Math.trunc(girdi.sira || 1)), aktif: girdi.aktif }
  const { error } = girdi.id
    ? await b.db.from('ick_belge_turu').update(satir).eq('id', girdi.id)
    : await b.db.from('ick_belge_turu').insert(satir)
  if (error) return { hata: error.message.includes('duplicate') ? 'Bu adla belge türü var.' : ickHataMetni(error.message) }
  tazele()
  return {}
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export type IckPlanGirdi = {
  id?: number
  ad: string
  kapsam: 'idare' | 'birim'
  mudurlukId: number | null
  basYil: number
  bitYil: number
  koordinatorMudurlukId: number | null
  koordinatorSiciller: string[]
  izlemeSikligi: number
  durum: IckPlanDurum
  onayTarihi: string
  onaySayi: string
  bakanlikGonderimTarihi: string
  aciklama: string
}

export async function ickPlanKaydet(g: IckPlanGirdi): Promise<Sonuc<{ id: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (g.id ? !(b.yetki.admin || ickPlanKoordinatoru(b.yetki, g.id)) : !(b.yetki.admin || b.yetki.koordinator)) {
    return { hata: 'Planı yönetici veya planın iç kontrol koordinatörü düzenler.' }
  }
  const ad = metin(g.ad, 300)
  if (!ad) return { hata: 'Plan adı boş olamaz.' }
  if (!Number.isInteger(g.basYil) || !Number.isInteger(g.bitYil) || g.bitYil < g.basYil) return { hata: 'Plan yılları geçersiz.' }
  if (g.kapsam === 'birim' && !g.mudurlukId) return { hata: 'Birim planı için müdürlük seçin.' }
  if (![1, 2, 4].includes(g.izlemeSikligi)) return { hata: 'İzleme sıklığını seçin.' }
  if (!g.koordinatorMudurlukId) return { hata: 'Koordinasyon müdürlüğünü seçin.' }
  if (!g.koordinatorSiciller.length) return { hata: 'En az bir iç kontrol koordinatörü seçin.' }
  const secim = await seciliPersonel(b.db, g.koordinatorMudurlukId, g.koordinatorSiciller)
  if ('hata' in secim) return { hata: secim.hata }
  for (const t of [g.onayTarihi, g.bakanlikGonderimTarihi]) {
    if (t && !tarihGecerli(t)) return { hata: 'Tarih alanı geçersiz.' }
  }
  if (g.durum === 'yururlukte' && !g.onayTarihi) return { hata: 'Yürürlüğe almak için onay tarihini yazın.' }

  const { data: surum } = await b.db.from('ick_mevzuat_surumu').select('id').eq('aktif', true).order('id', { ascending: false }).limit(1).maybeSingle()
  if (!surum) return { hata: 'Aktif mevzuat sürümü bulunamadı.' }

  const satir = {
    ad,
    kapsam: g.kapsam,
    mudurluk_id: g.kapsam === 'birim' ? g.mudurlukId : null,
    bas_yil: g.basYil,
    bit_yil: g.bitYil,
    koordinator_mudurluk_id: g.koordinatorMudurlukId,
    izleme_sikligi: g.izlemeSikligi,
    durum: g.durum,
    onay_tarihi: g.onayTarihi || null,
    onay_sayi: metin(g.onaySayi, 120),
    bakanlik_gonderim_tarihi: g.bakanlikGonderimTarihi || null,
    aciklama: metin(g.aciklama, 2000),
    updated_at: new Date().toISOString(),
  }
  if (g.id) {
    const { error } = await b.db.from('ick_plan').update(satir).eq('id', g.id)
    if (error) return { hata: ickHataMetni(error.message) }
    const koordHata = await sicilListesiYaz(b.db, 'ick_plan_koordinator', { plan_id: g.id }, secim.secilen, b.yetki.userId)
    if (koordHata) return { hata: koordHata }
    tazele()
    return { id: g.id }
  }
  const { data, error } = await b.db
    .from('ick_plan')
    .insert({ ...satir, surum_id: surum.id, created_by: b.yetki.userId })
    .select('id')
    .single()
  if (error) return { hata: ickHataMetni(error.message) }
  const koordHata = await sicilListesiYaz(b.db, 'ick_plan_koordinator', { plan_id: Number(data.id) }, secim.secilen, b.yetki.userId)
  if (koordHata) return { hata: `Plan açıldı ancak koordinatörler yazılamadı: ${koordHata}` }
  await b.db.from('ick_plan_versiyon').insert({
    plan_id: data.id,
    versiyon_no: 1,
    tur: 'ilk',
    gerekce: 'Plan kaydı açıldı.',
    created_by: b.yetki.userId,
  })
  tazele()
  return { id: Number(data.id) }
}

export type IckPlanGecmisSatir = { id: number; zaman: string; kim: string; ne: string; degisen: string[] }

const PLAN_ALAN_ETIKET: Record<string, string> = {
  ad: 'Plan adı',
  kapsam: 'Kapsam',
  mudurluk_id: 'Harcama birimi',
  bas_yil: 'Başlangıç yılı',
  bit_yil: 'Bitiş yılı',
  koordinator_mudurluk_id: 'Koordinasyon birimi',
  izleme_sikligi: 'İzleme sıklığı',
  durum: 'Durum',
  onay_tarihi: 'Onay tarihi',
  onay_sayi: 'Onay sayısı',
  bakanlik_gonderim_tarihi: 'Bakanlığa gönderim tarihi',
  aciklama: 'Açıklama',
}

function planAlanDegeri(alan: string, v: unknown, mudAd: Map<number, string>): string {
  if (v == null || v === '') return '—'
  if (alan === 'durum') return ICK_PLAN_DURUM_ETIKET[v as IckPlanDurum] ?? String(v)
  if (alan === 'kapsam') return v === 'idare' ? 'İdare' : 'Birim'
  if (alan === 'izleme_sikligi') return ICK_IZLEME_SIKLIGI_ETIKET[Number(v)] ?? String(v)
  if (alan === 'mudurluk_id' || alan === 'koordinator_mudurluk_id') return mudAd.get(Number(v)) ?? String(v)
  return String(v)
}

export async function ickPlanGecmisi(planId: number): Promise<Sonuc<{ satirlar: IckPlanGecmisSatir[] }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!(b.yetki.admin || b.yetki.koordinator || b.yetki.izleyici)) return { hata: 'Geçmişi koordinatör, izleyici ve yönetici görür.' }
  const [planR, koordR] = await Promise.all([
    b.db
      .from('ick_audit_log')
      .select('id, tablo, islem, onceki, sonraki, actor_id, created_at')
      .eq('tablo', 'ick_plan')
      .eq('kayit_id', String(planId))
      .order('created_at', { ascending: false })
      .limit(200),
    b.db
      .from('ick_audit_log')
      .select('id, tablo, islem, onceki, sonraki, actor_id, created_at')
      .eq('tablo', 'ick_plan_koordinator')
      .or(`sonraki->>plan_id.eq.${planId},onceki->>plan_id.eq.${planId}`)
      .order('created_at', { ascending: false })
      .limit(200),
  ])
  if (planR.error) return { hata: ickHataMetni(planR.error.message) }
  type Kayit = { id: number; tablo: string; islem: string; onceki: Record<string, unknown> | null; sonraki: Record<string, unknown> | null; actor_id: string | null; created_at: string }
  const kayitlar = [...((planR.data as Kayit[] | null) ?? []), ...((koordR.data as Kayit[] | null) ?? [])].sort((x, y) =>
    y.created_at.localeCompare(x.created_at),
  )
  const kisiSiciller = kayitlar.flatMap(k => {
    const no = (k.sonraki ?? k.onceki)?.sicil_no
    return no ? [String(no)] : []
  })
  const [adlar, mudAd, kisiAdlari] = await Promise.all([
    ickKullaniciAdlari(b.db, kayitlar.map(k => k.actor_id).filter((x): x is string => Boolean(x))),
    ickTumMudurlukHaritasi(b.db),
    ickSicilAdlari(b.db, kisiSiciller),
  ])
  const satirlar = kayitlar.map(k => {
    if (k.tablo === 'ick_plan_koordinator') {
      const ham = k.sonraki ?? k.onceki
      const kisi = ickGorunenAd(String(ham?.sicil_no ?? ''), String(ham?.ad_soyad ?? ''), kisiAdlari)
      return {
        id: k.id,
        zaman: k.created_at,
        kim: k.actor_id ? adlar.get(k.actor_id) ?? 'Kullanıcı' : 'Sistem',
        ne: k.islem === 'DELETE' ? 'Koordinatör çıkarıldı' : 'Koordinatör eklendi',
        degisen: [kisi],
      }
    }
    const degisen =
      k.islem === 'UPDATE' && k.onceki && k.sonraki
        ? Object.keys(PLAN_ALAN_ETIKET)
            .filter(a => JSON.stringify(k.onceki?.[a] ?? null) !== JSON.stringify(k.sonraki?.[a] ?? null))
            .map(a => `${PLAN_ALAN_ETIKET[a]}: ${planAlanDegeri(a, k.onceki?.[a], mudAd)} → ${planAlanDegeri(a, k.sonraki?.[a], mudAd)}`)
        : []
    return {
      id: k.id,
      zaman: k.created_at,
      kim: k.actor_id ? adlar.get(k.actor_id) ?? 'Kullanıcı' : 'Sistem',
      ne: k.islem === 'INSERT' ? 'Oluşturuldu' : k.islem === 'UPDATE' ? 'Düzenlendi' : 'Silindi',
      degisen,
    }
  })
  return { satirlar: satirlar.filter(s => s.ne !== 'Düzenlendi' || s.degisen.length > 0) }
}

export async function ickGenelSartDegerlendirmeKaydet(g: {
  planId: number
  genelSartId: number
  mevcutDurum: string
  guvence: 'makul_guvence' | 'eylem_gerekli'
  aciklama: string
}): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!ickPlanKoordinatoru(b.yetki, g.planId)) return { hata: 'Değerlendirmeyi planın iç kontrol koordinatörü düzenler.' }
  const { error } = await b.db.from('ick_genel_sart_degerlendirme').upsert(
    {
      plan_id: g.planId,
      genel_sart_id: g.genelSartId,
      mevcut_durum: metin(g.mevcutDurum),
      guvence: g.guvence,
      aciklama: metin(g.aciklama, 2000),
    },
    { onConflict: 'plan_id,genel_sart_id' },
  )
  if (error) return { hata: ickHataMetni(error.message) }
  tazele()
  return {}
}

// ---------------------------------------------------------------------------
// Eylem
// ---------------------------------------------------------------------------

export type IckEylemGirdi = {
  id?: number
  planId: number
  genelSartId: number
  kod: string
  ongorulenEylem: string
  sorumluTur: 'mudurluk' | 'ust_yonetim'
  sorumluMudurlukId: number | null
  sorumluMetin: string
  isbirligiKapsam: IckIsbirligiKapsam
  isbirligiMudurlukIdleri: number[]
  isbirligiMetin: string
  cikti: string
  terminMetin: string
  aciklama: string
  revizyonNotu: string
  koordinatorSiciller: string[]
  islemciSiciller: string[]
  /** Kişi seçimini bu plandaki aynı müdürlüğün açık eylemlerine de uygula */
  kisileriMudurlugeUygula: boolean
}

export async function ickEylemKaydet(g: IckEylemGirdi): Promise<Sonuc<{ id: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!ickPlanKoordinatoru(b.yetki, g.planId)) return { hata: 'Eylemi planın iç kontrol koordinatörü düzenler.' }
  const kodNorm = ickKodNorm(g.kod)
  if (!kodNorm) return { hata: 'Eylem kodu boş olamaz.' }
  if (!metin(g.ongorulenEylem)) return { hata: 'Öngörülen eylem boş olamaz.' }
  if (g.sorumluTur === 'mudurluk' && !g.sorumluMudurlukId) return { hata: 'Sorumlu müdürlüğü seçin.' }

  let kisiSecim: EylemKisiSecim[] = []
  if (g.sorumluTur === 'mudurluk' && g.sorumluMudurlukId) {
    const koord = [...new Set(g.koordinatorSiciller.map(s => String(s).trim()).filter(Boolean))]
    const islemci = [...new Set(g.islemciSiciller.map(s => String(s).trim()).filter(Boolean))]
    if (koord.some(s => islemci.includes(s))) return { hata: 'Bir kişi aynı eylemde hem müdürlük koordinatörü hem işlemci olamaz.' }
    const secim = await seciliPersonel(b.db, g.sorumluMudurlukId, [...koord, ...islemci])
    if ('hata' in secim) return { hata: secim.hata }
    kisiSecim = secim.secilen.map(p => ({ sicil: p.sicil, ad: p.ad, rol: koord.includes(p.sicil) ? 'mudurluk_koordinatoru' : 'mudurluk_islemcisi' }))
  }

  const { data: plan } = await b.db.from('ick_plan').select('bas_yil').eq('id', g.planId).maybeSingle()
  if (!plan) return { hata: 'Plan bulunamadı.' }
  const termin = ickTerminCoz(g.terminMetin, Number(plan.bas_yil))
  if (!termin.ok) return { hata: termin.hata }

  const satir: Record<string, unknown> = {
    genel_sart_id: g.genelSartId,
    kod: metin(g.kod, 40),
    kod_norm: kodNorm,
    ongorulen_eylem: metin(g.ongorulenEylem),
    sorumlu_tur: g.sorumluTur,
    sorumlu_mudurluk_id: g.sorumluTur === 'mudurluk' ? g.sorumluMudurlukId : null,
    sorumlu_metin: metin(g.sorumluMetin, 500),
    isbirligi_kapsam: g.isbirligiKapsam,
    isbirligi_metin: metin(g.isbirligiMetin, 2000),
    cikti: metin(g.cikti, 2000),
    termin_tipi: termin.tip,
    termin_metin: termin.metin,
    aciklama: metin(g.aciklama, 2000),
  }

  let eylemId = g.id
  if (g.id) {
    const { data: eski } = await b.db.from('ick_eylem').select('termin_ilk, termin_guncel, durum').eq('id', g.id).maybeSingle()
    if (!eski) return { hata: 'Eylem bulunamadı.' }
    if (eski.durum === 'devredildi') return { hata: 'Yeni plana devredilen eylem değiştirilemez.' }
    if ((eski.termin_guncel ?? null) !== termin.ilk) {
      const not = metin(g.revizyonNotu, 1000)
      if (!not) return { hata: 'Tamamlanma tarihi değişikliği için revizyon gerekçesi yazın.' }
      satir.termin_guncel = termin.ilk
      satir.revizyon_notu = `${new Date().toISOString().slice(0, 10)} tamamlanma tarihi: ${not}`
      if (!eski.termin_ilk) satir.termin_ilk = termin.ilk
    }
    const { error } = await b.db.from('ick_eylem').update(satir).eq('id', g.id)
    if (error) return { hata: error.message.includes('duplicate') ? 'Bu planda aynı eylem kodu var.' : ickHataMetni(error.message) }
  } else {
    const { count } = await b.db.from('ick_eylem').select('id', { count: 'exact', head: true }).eq('plan_id', g.planId)
    const { data, error } = await b.db
      .from('ick_eylem')
      .insert({
        ...satir,
        plan_id: g.planId,
        sira: (count ?? 0) + 1,
        termin_ilk: termin.ilk,
        termin_guncel: termin.ilk,
        created_by: b.yetki.userId,
      })
      .select('id')
      .single()
    if (error) return { hata: error.message.includes('duplicate') ? 'Bu planda aynı eylem kodu var.' : ickHataMetni(error.message) }
    eylemId = Number(data.id)
  }

  await b.db.from('ick_eylem_isbirligi').delete().eq('eylem_id', eylemId)
  const ids = [...new Set(g.isbirligiMudurlukIdleri.filter(i => i > 0 && i !== g.sorumluMudurlukId))]
  if (ids.length) {
    const { error } = await b.db.from('ick_eylem_isbirligi').insert(ids.map(m => ({ eylem_id: eylemId, mudurluk_id: m })))
    if (error) return { hata: ickHataMetni(error.message) }
  }

  let hedefler = [Number(eylemId)]
  if (g.kisileriMudurlugeUygula && g.sorumluTur === 'mudurluk' && g.sorumluMudurlukId) {
    const { data: ayni } = await b.db
      .from('ick_eylem')
      .select('id')
      .eq('plan_id', g.planId)
      .eq('sorumlu_tur', 'mudurluk')
      .eq('sorumlu_mudurluk_id', g.sorumluMudurlukId)
      .not('durum', 'in', '(iptal,devredildi)')
    hedefler = [...new Set([...hedefler, ...((ayni as { id: number }[] | null) ?? []).map(r => Number(r.id))])]
  }
  const kisiHata = await eylemKisileriYaz(b.db, hedefler, kisiSecim, b.yetki.userId)
  if (kisiHata) return { hata: `Eylem kaydedildi ancak kişiler yazılamadı: ${kisiHata}` }
  tazele()
  return { id: Number(eylemId) }
}

export type IckEylemGecmisSatir = { id: number; zaman: string; kim: string; ne: string; degisen: string[] }

const EYLEM_ALAN_ETIKET: Record<string, string> = {
  kod_norm: 'Eylem kodu',
  genel_sart_id: 'Genel şart',
  ongorulen_eylem: 'Öngörülen eylem',
  sorumlu_tur: 'Sorumlu türü',
  sorumlu_mudurluk_id: 'Sorumlu müdürlük',
  sorumlu_metin: 'Sorumlu (metin)',
  isbirligi_kapsam: 'İşbirliği',
  isbirligi_metin: 'İşbirliği metni',
  cikti: 'Çıktı / sonuç',
  termin_metin: 'Tamamlanma tarihi',
  termin_guncel: 'Güncel tamamlanma tarihi',
  revizyon_notu: 'Revizyon notu',
  aciklama: 'Açıklama',
  durum: 'Durum',
  ilerleme: 'İlerleme',
  devir_notu: 'Devir notu',
}

const KISI_ROL_ETIKET: Record<IckEylemKisiRol, string> = {
  mudurluk_koordinatoru: 'Müdürlük koordinatörü',
  mudurluk_islemcisi: 'Müdürlük işlemcisi',
}

/** Eylemin bilgi ve kişi değişiklikleri (bildirim geçmişi eylem detayındadır) */
export async function ickEylemGecmisi(eylemId: number): Promise<Sonuc<{ satirlar: IckEylemGecmisSatir[] }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!(b.yetki.admin || b.yetki.koordinator || b.yetki.izleyici)) return { hata: 'Geçmişi koordinatör, izleyici ve yönetici görür.' }
  const kolon = 'id, tablo, islem, onceki, sonraki, actor_id, created_at'
  const [eylemR, kisiR] = await Promise.all([
    b.db.from('ick_audit_log').select(kolon).eq('tablo', 'ick_eylem').eq('kayit_id', String(eylemId)).order('created_at', { ascending: false }).limit(300),
    b.db
      .from('ick_audit_log')
      .select(kolon)
      .eq('tablo', 'ick_eylem_kisi')
      .or(`sonraki->>eylem_id.eq.${eylemId},onceki->>eylem_id.eq.${eylemId}`)
      .order('created_at', { ascending: false })
      .limit(300),
  ])
  if (eylemR.error) return { hata: ickHataMetni(eylemR.error.message) }
  type Kayit = { id: number; tablo: string; islem: string; onceki: Record<string, unknown> | null; sonraki: Record<string, unknown> | null; actor_id: string | null; created_at: string }
  const kayitlar = [...((eylemR.data as Kayit[] | null) ?? []), ...((kisiR.data as Kayit[] | null) ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))
  const gsIdler = new Set<number>()
  for (const k of kayitlar) {
    if (k.tablo !== 'ick_eylem') continue
    for (const v of [k.onceki?.genel_sart_id, k.sonraki?.genel_sart_id]) if (v != null) gsIdler.add(Number(v))
  }
  const kisiSiciller = kayitlar.flatMap(k => {
    const no = (k.sonraki ?? k.onceki)?.sicil_no
    return no ? [String(no)] : []
  })
  const [adlar, mudAd, gsR, kisiAdlari] = await Promise.all([
    ickKullaniciAdlari(b.db, kayitlar.map(k => k.actor_id).filter((x): x is string => Boolean(x))),
    ickTumMudurlukHaritasi(b.db),
    gsIdler.size ? b.db.from('ick_genel_sart').select('id, kod').in('id', [...gsIdler]) : Promise.resolve({ data: [] }),
    ickSicilAdlari(b.db, kisiSiciller),
  ])
  const gsKod = new Map(((gsR.data as { id: number; kod: string }[] | null) ?? []).map(g => [Number(g.id), g.kod]))
  function deger(alan: string, v: unknown): string {
    if (v == null || v === '') return '—'
    if (alan === 'durum') return ICK_EYLEM_DURUM_ETIKET[v as IckEylemDurum] ?? String(v)
    if (alan === 'sorumlu_mudurluk_id') return mudAd.get(Number(v)) ?? String(v)
    if (alan === 'genel_sart_id') return gsKod.get(Number(v)) ?? String(v)
    if (alan === 'sorumlu_tur') return v === 'ust_yonetim' ? 'Üst yönetim' : 'Müdürlük'
    if (alan === 'isbirligi_kapsam') return v === 'tum_mudurlukler' ? 'Tüm müdürlükler' : v === 'ilgili_mudurlukler' ? 'İlgili müdürlükler' : 'Yok'
    if (alan === 'ilerleme') return `%${Math.round(Number(v))}`
    return String(v)
  }
  const satirlar = kayitlar.map(k => {
    const kim = k.actor_id ? adlar.get(k.actor_id) ?? 'Kullanıcı' : 'Sistem'
    if (k.tablo === 'ick_eylem_kisi') {
      const r = (k.sonraki ?? k.onceki) as { ad_soyad?: string; sicil_no?: string; rol?: IckEylemKisiRol } | null
      const kisi = ickGorunenAd(String(r?.sicil_no ?? ''), r?.ad_soyad, kisiAdlari)
      const rol = r?.rol ? KISI_ROL_ETIKET[r.rol] : 'Kişi'
      const ne =
        k.islem === 'INSERT'
          ? `${rol} eklendi`
          : k.islem === 'DELETE'
            ? `${rol} çıkarıldı`
            : `Rol değişti: ${KISI_ROL_ETIKET[(k.onceki?.rol as IckEylemKisiRol) ?? 'mudurluk_islemcisi']} → ${rol}`
      return { id: k.id, zaman: k.created_at, kim, ne, degisen: [kisi] }
    }
    const degisen =
      k.islem === 'UPDATE' && k.onceki && k.sonraki
        ? Object.keys(EYLEM_ALAN_ETIKET)
            .filter(a => JSON.stringify(k.onceki?.[a] ?? null) !== JSON.stringify(k.sonraki?.[a] ?? null))
            .map(a => `${EYLEM_ALAN_ETIKET[a]}: ${deger(a, k.onceki?.[a])} → ${deger(a, k.sonraki?.[a])}`)
        : []
    return {
      id: k.id,
      zaman: k.created_at,
      kim,
      ne: k.islem === 'INSERT' ? 'Oluşturuldu' : k.islem === 'UPDATE' ? 'Düzenlendi' : 'Silindi',
      degisen,
    }
  })
  return { satirlar: satirlar.filter(s => s.ne !== 'Düzenlendi' || s.degisen.length > 0) }
}

export async function ickEylemIptal(id: number, gerekce: string): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const { data: e } = await b.db.from('ick_eylem').select('plan_id, durum').eq('id', id).maybeSingle()
  if (!e) return { hata: 'Eylem bulunamadı.' }
  if (!ickPlanKoordinatoru(b.yetki, Number(e.plan_id))) return { hata: 'Eylemi planın iç kontrol koordinatörü iptal eder.' }
  if (e.durum === 'devredildi') return { hata: 'Yeni plana devredilen eylem iptal edilemez.' }
  const not = metin(gerekce, 1000)
  if (!not) return { hata: 'İptal gerekçesi yazın.' }
  const { error } = await b.db.from('ick_eylem').update({ durum: 'iptal', revizyon_notu: `İptal: ${not}` }).eq('id', id)
  if (error) return { hata: ickHataMetni(error.message) }
  tazele()
  return {}
}

// ---------------------------------------------------------------------------
// Aktarım
// ---------------------------------------------------------------------------

async function aktarimHazirla(
  b: { db: IckDb; yetki: IckYetki },
  form: FormData,
): Promise<{ hata: string } | { onizleme: IckAktarimOnizleme; planId: number; dosyaAdi: string; sha: string; buffer: ArrayBuffer }> {
  const planId = Number(form.get('planId'))
  if (!ickPlanKoordinatoru(b.yetki, planId)) return { hata: 'Aktarımı planın iç kontrol koordinatörü yapar.' }
  const dosya = form.get('dosya')
  if (!(dosya instanceof File) || dosya.size === 0) return { hata: 'Excel dosyası seçin.' }
  if (!dosya.name.toLowerCase().endsWith('.xlsx')) return { hata: 'Yalnızca .xlsx dosyası aktarılır.' }
  let eslesme: Record<string, string> = {}
  try {
    eslesme = JSON.parse(String(form.get('eslesme') || '{}'))
  } catch {
    eslesme = {}
  }
  const { data: plan } = await b.db.from('ick_plan').select('id, bas_yil, surum_id').eq('id', planId).maybeSingle()
  if (!plan) return { hata: 'Plan bulunamadı.' }
  const [mud, gs] = await Promise.all([
    b.db.from('tanim_mudurluk').select('id, mudurluk_adi'),
    b.db.from('ick_genel_sart').select('id, kod').eq('surum_id', plan.surum_id),
  ])
  if (gs.error) return { hata: ickHataMetni(gs.error.message) }
  const buffer = await dosya.arrayBuffer()
  const sha = createHash('sha256').update(Buffer.from(buffer)).digest('hex')
  try {
    const onizleme = await ickAktarimOnizle(buffer, Number(plan.bas_yil), mud.data ?? [], gs.data ?? [], eslesme)
    return { onizleme, planId, dosyaAdi: dosya.name, sha, buffer }
  } catch {
    return { hata: 'Excel dosyası okunamadı. Şablon biçimini kontrol edin.' }
  }
}

export async function ickAktarimOnizleAction(form: FormData): Promise<Sonuc<{ onizleme: IckAktarimOnizleme }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const h = await aktarimHazirla(b, form)
  if ('hata' in h) return { hata: h.hata }
  return { onizleme: h.onizleme }
}

export async function ickAktarimUygula(form: FormData): Promise<Sonuc<{ eylem: number; gerceklesme: number; kapatilanDonem: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const h = await aktarimHazirla(b, form)
  if ('hata' in h) return { hata: h.hata }
  const { onizleme, planId } = h
  if (onizleme.hataSayisi > 0) return { hata: `Önizlemede ${onizleme.hataSayisi} hata var; aktarım yapılmadı.` }
  if (!onizleme.eylemler.length) return { hata: 'Aktarılacak eylem yok.' }

  const { count } = await b.db
    .from('ick_eylem')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', planId)
    .is('onceki_eylem_id', null)
  if ((count ?? 0) > 0) return { hata: 'Bu planda eylem var. Aktarım yalnızca boş plana yapılır (önceki plandan devralınan eylemler hariç).' }

  const { data: aktarim, error: aErr } = await b.db
    .from('ick_aktarim')
    .insert({
      plan_id: planId,
      dosya_adi: h.dosyaAdi,
      dosya_sha256: h.sha,
      satir_sayisi: onizleme.eylemler.length,
      ham: { genelSartlar: onizleme.genelSartlar, eylemler: onizleme.eylemler, gerceklesmeler: onizleme.gerceklesmeler },
      ozet: `${onizleme.genelSartlar.length} genel şart, ${onizleme.eylemler.length} eylem, ${onizleme.gerceklesmeler.length} gerçekleşme`,
      created_by: b.yetki.userId,
    })
    .select('id')
    .single()
  if (aErr) return { hata: ickHataMetni(aErr.message) }

  if (onizleme.genelSartlar.length) {
    const { error } = await b.db.from('ick_genel_sart_degerlendirme').upsert(
      onizleme.genelSartlar.map(g => ({
        plan_id: planId,
        genel_sart_id: g.genelSartId,
        mevcut_durum: g.mevcutDurum,
        guvence: g.guvence,
        aciklama: g.aciklama,
      })),
      { onConflict: 'plan_id,genel_sart_id' },
    )
    if (error) return { hata: `Genel şart değerlendirmeleri yazılamadı: ${error.message}` }
  }

  const { data: eklenen, error: eErr } = await b.db
    .from('ick_eylem')
    .insert(
      onizleme.eylemler.map((e, i) => ({
        plan_id: planId,
        genel_sart_id: e.genelSartId,
        kod: e.kod,
        kod_norm: e.kodNorm,
        sira: i + 1,
        ongorulen_eylem: e.ongorulenEylem,
        sorumlu_tur: e.sorumluTur,
        sorumlu_mudurluk_id: e.sorumluMudurlukId,
        sorumlu_metin: e.sorumluMetin,
        isbirligi_kapsam: e.isbirligiKapsam,
        isbirligi_metin: e.isbirligiMetin,
        cikti: e.cikti,
        termin_tipi: e.terminTipi,
        termin_ilk: e.terminIlk,
        termin_guncel: e.terminIlk,
        termin_metin: e.terminMetin,
        aciklama: e.aciklama,
        aktarim_id: aktarim.id,
        aktarim_satir: e.satir,
        created_by: b.yetki.userId,
      })),
    )
    .select('id, kod_norm')
  if (eErr) {
    if (eErr.message.includes('duplicate')) return { hata: 'Excel’deki bir eylem kodu, önceki plandan devralınan bir eylemle çakışıyor. Excel’de kodu değiştirip yeniden deneyin.' }
    return { hata: `Eylemler yazılamadı: ${eErr.message}` }
  }
  const idHarita = new Map<string, number>(((eklenen as { id: number; kod_norm: string }[]) ?? []).map(r => [r.kod_norm, Number(r.id)]))

  const isbirligi = onizleme.eylemler.flatMap(e =>
    e.isbirligiMudurlukIdleri.map(m => ({ eylem_id: idHarita.get(e.kodNorm), mudurluk_id: m })),
  )
  if (isbirligi.length) {
    const { error } = await b.db.from('ick_eylem_isbirligi').insert(isbirligi)
    if (error) return { hata: `İşbirliği birimleri yazılamadı: ${error.message}` }
  }

  let gerceklesme = 0
  for (const g of onizleme.gerceklesmeler) {
    const eylemId = idHarita.get(g.kodNorm)
    if (!eylemId || !g.durum) continue
    const { error } = await b.db.from('ick_gerceklesme').insert({
      eylem_id: eylemId,
      donem_yili: g.yil,
      beyan_durum: g.durum,
      beyan_ilerleme: g.durum === 'tamamlandi' ? 100 : 0,
      calisma: g.calisma,
      kanit_aciklama: g.kanit,
      degerlendirme: g.degerlendirme,
      sonuc: g.sonuc,
      akis: 'kesinlesti',
      kaynak: 'aktarim',
      olusturan_id: b.yetki.userId,
      olusturan_ad: b.yetki.adSoyad,
      karar_veren_ad: b.yetki.adSoyad,
      istisna_gerekcesi: `${g.yil} yılı onaylı izleme raporundan aktarıldı.`,
    })
    if (error) return { hata: `${g.kodNorm} gerçekleşmesi yazılamadı: ${error.message}` }
    gerceklesme++
  }

  let kapatilanDonem = 0
  const yillar = onizleme.gerceklesmeler.map(g => g.yil).filter((y): y is number => typeof y === 'number')
  if (yillar.length) {
    const { data: kapanan, error: kErr } = await b.db.rpc('ick_donem_aktarim_kapat', { p_plan_id: planId, p_son_yil: Math.max(...yillar) })
    if (kErr) return { hata: `Eylemler aktarıldı ancak geçmiş dönemler kapatılamadı: ${ickHataMetni(kErr.message)}` }
    kapatilanDonem = Number(kapanan ?? 0)
  }

  tazele()
  return { eylem: idHarita.size, gerceklesme, kapatilanDonem }
}

// ---------------------------------------------------------------------------
// Gerçekleşme
// ---------------------------------------------------------------------------

export type IckGerceklesmeGirdi = {
  id?: number
  eylemId: number
  donemYili: number | null
  beyanDurum: IckBeyanDurum
  beyanIlerleme: number
  calisma: string
  kanitAciklama: string
  vekaletKaynak?: IckVekaletKaynak | ''
  vekaletAciklama?: string
}

export async function ickGerceklesmeKaydet(g: IckGerceklesmeGirdi): Promise<Sonuc<{ id: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const calisma = metin(g.calisma)
  if (!calisma) return { hata: 'Gerçekleştirilen çalışmayı yazın.' }
  const ilerleme = g.beyanDurum === 'tamamlandi' ? 100 : g.beyanDurum === 'baslanmadi' ? 0 : Math.min(99, Math.max(1, Math.round(g.beyanIlerleme || 0)))

  let vekaleten: boolean
  if (g.id) {
    const { data: mevcut } = await b.db.from('ick_gerceklesme').select('vekaleten').eq('id', g.id).maybeSingle()
    if (!mevcut) return { hata: 'Bildirim bulunamadı.' }
    vekaleten = Boolean(mevcut.vekaleten)
  } else {
    const { data: eylem } = await b.db.from('ick_eylem').select('id, plan_id, sorumlu_tur').eq('id', g.eylemId).maybeSingle()
    if (!eylem) return { hata: 'Eylem bulunamadı.' }
    vekaleten = !ickEylemYazabilir(b.yetki, eylem) && ickPlanKoordinatoru(b.yetki, Number(eylem.plan_id))
  }
  const vekaletAciklama = metin(g.vekaletAciklama, 2000)
  if (vekaleten && (!g.vekaletKaynak || !vekaletAciklama)) {
    return { hata: 'Müdürlük adına girilen bildirimde bilginin kaynağını seçin ve açıklamasını yazın.' }
  }

  const satir = {
    donem_yili: g.donemYili,
    beyan_durum: g.beyanDurum,
    beyan_ilerleme: ilerleme,
    calisma,
    kanit_aciklama: metin(g.kanitAciklama, 2000),
    ...(vekaleten ? { vekalet_kaynak: g.vekaletKaynak, vekalet_aciklama: vekaletAciklama } : {}),
  }
  if (g.id) {
    const { data, error } = await b.db.from('ick_gerceklesme').update({ ...satir, akis: 'taslak' }).eq('id', g.id).select('id')
    if (error) return { hata: ickHataMetni(error.message) }
    if (!data?.length) {
      return { hata: 'Kayıt güncellenemedi. Taslak veya iade edilen bildirimi, giren kişi ya da müdürlük koordinatörü düzenler.' }
    }
    tazele()
    return { id: g.id }
  }
  const { data: acik } = await b.db
    .from('ick_gerceklesme')
    .select('id')
    .eq('eylem_id', g.eylemId)
    .in('akis', ['taslak', 'incelemede', 'iade'])
    .limit(1)
  if (acik?.length) return { hata: 'Bu eylemde sonuçlanmamış bir bildirim var. Önce onu tamamlayın.' }
  const { data, error } = await b.db
    .from('ick_gerceklesme')
    .insert({ ...satir, eylem_id: g.eylemId, akis: 'taslak', olusturan_id: b.yetki.userId, olusturan_ad: b.yetki.adSoyad, vekaleten })
    .select('id')
    .single()
  if (error) return { hata: error.message.includes('row-level security') ? 'Bu eyleme bildirim girme yetkiniz yok.' : ickHataMetni(error.message) }
  tazele()
  return { id: Number(data.id) }
}

export async function ickGerceklesmeGonder(id: number): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const { data: kayit } = await b.db.from('ick_gerceklesme').select('eylem_id, vekaleten').eq('id', id).maybeSingle()
  const { data: eylem } = kayit
    ? await b.db.from('ick_eylem').select('id, plan_id, sorumlu_tur, sorumlu_mudurluk_id').eq('id', kayit.eylem_id).maybeSingle()
    : { data: null }
  if (!eylem) return { hata: 'Bildirim bulunamadı.' }
  if (kayit.vekaleten) {
    if (!ickPlanKoordinatoru(b.yetki, Number(eylem.plan_id))) return { hata: 'Müdürlük adına girilen bildirimi iç kontrol koordinatörü gönderir.' }
  } else if (!ickEylemGonderebilir(b.yetki, eylem)) {
    return { hata: 'Bildirimi koordinatöre müdürlük koordinatörü gönderir. Taslağınız kaydedildi; müdürlük koordinatörünüze haber verin.' }
  }
  const { data, error } = await b.db
    .from('ick_gerceklesme')
    .update({ akis: 'incelemede', gonderen_ad: b.yetki.adSoyad, iade_gerekcesi: '' })
    .eq('id', id)
    .select('id')
  if (error) return { hata: ickHataMetni(error.message) }
  if (!data?.length) return { hata: 'Bildirim gönderilemedi. Yalnızca taslak veya iade edilen bildirim gönderilir.' }
  tazele()
  return {}
}

export async function ickGerceklesmeSil(id: number): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const { data, error } = await b.db.from('ick_gerceklesme').delete().eq('id', id).select('id')
  if (error) return { hata: error.message.includes('foreign key') ? 'Belgesi olan taslak silinemez; belgeyi pasife alın veya bildirimi gönderin.' : ickHataMetni(error.message) }
  if (!data?.length) return { hata: 'Taslağı giren kişi veya müdürlük koordinatörü siler.' }
  tazele()
  return {}
}

export async function ickGerceklesmeKarar(g: {
  id: number
  karar: 'kesinlesti' | 'iade'
  kanitYeterlilik: IckKanitYeterlilik | null
  degerlendirme: string
  sonuc: string
  iadeGerekcesi: string
  istisnaGerekcesi: string
}): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const { data: kayit } = await b.db.from('ick_gerceklesme').select('eylem_id').eq('id', g.id).maybeSingle()
  const { data: eylem } = kayit ? await b.db.from('ick_eylem').select('plan_id').eq('id', kayit.eylem_id).maybeSingle() : { data: null }
  if (!eylem) return { hata: 'Bildirim bulunamadı.' }
  if (!ickPlanKoordinatoru(b.yetki, Number(eylem.plan_id))) return { hata: 'Karar yetkisi bu planın iç kontrol koordinatörlerindedir.' }
  const guncelle: Record<string, unknown> = {
    akis: g.karar,
    karar_veren_ad: b.yetki.adSoyad,
    kanit_yeterlilik: g.kanitYeterlilik,
    degerlendirme: metin(g.degerlendirme),
    sonuc: metin(g.sonuc, 2000),
  }
  if (g.karar === 'iade') {
    const gerekce = metin(g.iadeGerekcesi, 2000)
    if (!gerekce) return { hata: 'İade gerekçesini yazın.' }
    guncelle.iade_gerekcesi = gerekce
  } else {
    if (!g.kanitYeterlilik) return { hata: 'Kanıt yeterliliğini seçin.' }
    guncelle.istisna_gerekcesi = metin(g.istisnaGerekcesi, 2000)
  }
  const { data, error } = await b.db.from('ick_gerceklesme').update(guncelle).eq('id', g.id).select('id')
  if (error) {
    if (error.message.includes('ick_gerceklesme_kesin_kanit')) return { hata: 'Tamamlandı kararı için kanıt "Yeterli" olmalı veya istisna gerekçesi yazılmalı.' }
    return { hata: ickHataMetni(error.message) }
  }
  if (!data?.length) return { hata: 'Karar kaydedilemedi. Kayıt incelemede değil.' }
  tazele()
  return {}
}

// ---------------------------------------------------------------------------
// Belge
// ---------------------------------------------------------------------------

const IZINLI_UZANTI = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg']

const ICK_BELGE_MAX = 20 * 1024 * 1024

/**
 * 1. adım: belge kaydı (yeni ise) ve imzalı yükleme adresi. Dosya tarayıcıdan
 * doğrudan Storage'a gider; sunucu aksiyonu gövde sınırına takılmaz.
 */
export async function ickBelgeYuklemeBaslat(g: {
  belgeId?: number
  eylemId?: number
  gerceklesmeId?: number
  baslik: string
  belgeTuruId: number
  dosyaAdi: string
  boyut: number
}): Promise<Sonuc<{ belgeId: number; path: string; token: string }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!b.yetki.yukleyebilir) return { hata: 'Belge yükleme yetkiniz yok.' }
  if (!g.dosyaAdi || !(g.boyut > 0)) return { hata: 'Dosya seçin.' }
  if (g.boyut > ICK_BELGE_MAX) return { hata: 'Dosya 20 MB sınırını aşıyor.' }
  const uzanti = (g.dosyaAdi.split('.').pop() ?? '').toLowerCase()
  if (!IZINLI_UZANTI.includes(uzanti)) return { hata: 'PDF, Word, Excel, PNG veya JPEG yükleyin.' }

  let belgeId = Number(g.belgeId || 0)
  if (belgeId) {
    const { data: belge } = await b.db.from('ick_belge').select('id, aktif, created_by').eq('id', belgeId).maybeSingle()
    if (!belge?.aktif) return { hata: 'Belge bulunamadı veya pasif.' }
    if (!b.yetki.koordinator && belge.created_by !== b.yetki.userId) return { hata: 'Yeni sürümü belgeyi yükleyen veya koordinatör ekler.' }
  } else {
    if (!g.belgeTuruId) return { hata: 'Belge türünü seçin.' }
    const { data, error } = await b.db
      .from('ick_belge')
      .insert({
        belge_turu_id: g.belgeTuruId,
        eylem_id: g.gerceklesmeId ? null : g.eylemId ?? null,
        gerceklesme_id: g.gerceklesmeId ?? null,
        baslik: metin(g.baslik, 300) || g.dosyaAdi,
        created_by: b.yetki.userId,
        created_by_ad: b.yetki.adSoyad,
      })
      .select('id')
      .single()
    if (error) return { hata: error.message.includes('row-level security') ? 'Bu kayda belge ekleme yetkiniz yok.' : ickHataMetni(error.message) }
    belgeId = Number(data.id)
  }

  const yol = `${belgeId}/${randomUUID()}.${uzanti}`
  const { data, error } = await b.db.storage.from('ick-belgeler').createSignedUploadUrl(yol)
  if (error || !data) return { hata: error?.message ?? 'Yükleme adresi oluşturulamadı.' }
  return { belgeId, path: data.path as string, token: data.token as string }
}

/** 2. adım: dosya Storage'dan okunur, özeti sunucuda hesaplanır, sürüm yazılır. */
export async function ickBelgeYuklemeTamamla(g: { belgeId: number; path: string; dosyaAdi: string; mime: string }): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!g.path.startsWith(`${g.belgeId}/`)) return { hata: 'Dosya yolu belgeyle uyuşmuyor.' }
  const { data: blob, error: dErr } = await b.db.storage.from('ick-belgeler').download(g.path)
  if (dErr || !blob) return { hata: 'Yüklenen dosya okunamadı.' }
  const buffer = Buffer.from(await (blob as Blob).arrayBuffer())
  const sha = createHash('sha256').update(buffer).digest('hex')
  const { data: son } = await b.db
    .from('ick_belge_versiyon')
    .select('versiyon')
    .eq('belge_id', g.belgeId)
    .order('versiyon', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { error } = await b.db.from('ick_belge_versiyon').insert({
    belge_id: g.belgeId,
    versiyon: Number(son?.versiyon ?? 0) + 1,
    dosya_adi: metin(g.dosyaAdi, 300),
    storage_path: g.path,
    mime_type: g.mime || null,
    boyut_byte: buffer.length,
    sha256: sha,
    yukleyen_id: b.yetki.userId,
    yukleyen_ad: b.yetki.adSoyad,
  })
  if (error) return { hata: `Belge sürümü kaydedilemedi: ${error.message}` }
  tazele()
  return {}
}

export async function ickBelgePasif(id: number, gerekce: string): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const not = metin(gerekce, 1000)
  if (!not) return { hata: 'Pasife alma gerekçesini yazın.' }
  const { data, error } = await b.db.from('ick_belge').update({ aktif: false, pasif_gerekce: not }).eq('id', id).select('id')
  if (error) return { hata: ickHataMetni(error.message) }
  if (!data?.length) return { hata: 'Belgeyi yükleyen veya koordinatör pasife alır.' }
  tazele()
  return {}
}

// ---------------------------------------------------------------------------
// İzleme dönemi
// ---------------------------------------------------------------------------

export async function ickDonemKilitle(id: number): Promise<Sonuc<{ adet: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!b.yetki.koordinator) return { hata: 'Dönemi planın iç kontrol koordinatörü kapatır.' }
  const { data, error } = await b.db.rpc('ick_donem_kilitle', { p_donem_id: id })
  if (error) return { hata: ickHataMetni(error.message) }
  tazele()
  return { adet: Number(data ?? 0) }
}
