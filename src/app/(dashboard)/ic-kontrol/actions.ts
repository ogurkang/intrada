'use server'

import { createHash, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ickHataMetni, ickYetkiYukle, type IckDb, type IckYetki } from '@/lib/ick/erisim'
import { ickAktarimOnizle, type IckAktarimOnizleme } from '@/lib/ick/aktarim'
import { ickKullaniciAdlari, ickTumMudurlukHaritasi } from '@/lib/ick/yukle'
import {
  ICK_PLAN_DURUM_ETIKET,
  ickKodNorm,
  ickTerminCoz,
  type IckBeyanDurum,
  type IckIsbirligiKapsam,
  type IckKanitYeterlilik,
  type IckPlanDurum,
  type IckRol,
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

export async function ickRolAtamaEkle(girdi: {
  userId: string
  rol: IckRol
  mudurlukId: number | null
  baslangic: string
  bitis: string | null
  aciklama: string
}): Promise<Sonuc> {
  const b = await baglamYonetici()
  if ('hata' in b) return { hata: b.hata }
  const birimRolu = girdi.rol === 'birim_yonetici' || girdi.rol === 'birim_irtibat'
  if (!girdi.userId) return { hata: 'Kullanıcı seçin.' }
  if (birimRolu && !girdi.mudurlukId) return { hata: 'Birim rolü için müdürlük seçin.' }
  if (!tarihGecerli(girdi.baslangic)) return { hata: 'Başlangıç tarihi geçersiz.' }
  if (girdi.bitis && (!tarihGecerli(girdi.bitis) || girdi.bitis < girdi.baslangic)) return { hata: 'Bitiş tarihi geçersiz.' }
  const { error } = await b.db.from('ick_rol_atama').insert({
    user_id: girdi.userId,
    rol: girdi.rol,
    mudurluk_id: birimRolu ? girdi.mudurlukId : null,
    baslangic: girdi.baslangic,
    bitis: girdi.bitis || null,
    aciklama: metin(girdi.aciklama, 500),
    created_by: b.userId,
  })
  if (error) return { hata: ickHataMetni(error.message) }
  tazele()
  return {}
}

export async function ickRolAtamaBitir(id: number, bitis: string): Promise<Sonuc> {
  const b = await baglamYonetici()
  if ('hata' in b) return { hata: b.hata }
  if (!tarihGecerli(bitis)) return { hata: 'Bitiş tarihi geçersiz.' }
  const { error } = await b.db.from('ick_rol_atama').update({ bitis }).eq('id', id)
  if (error) return { hata: ickHataMetni(error.message) }
  tazele()
  return {}
}

async function baglamYonetici(): Promise<{ hata: string } | { db: IckDb; userId: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' }
  const { yetki } = await ickYetkiYukle(supabase, user.id, user.email)
  if (!yetki.admin) return { hata: 'Rol atamasını yalnızca yönetici yapar.' }
  return { db: supabase as IckDb, userId: user.id }
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
  if (!b.yetki.koordinator) return { hata: 'Belge türlerini iç kontrol koordinatörü düzenler.' }
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
  durum: IckPlanDurum
  onayTarihi: string
  onaySayi: string
  bakanlikGonderimTarihi: string
  aciklama: string
}

export async function ickPlanKaydet(g: IckPlanGirdi): Promise<Sonuc<{ id: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!b.yetki.koordinator) return { hata: 'Planı iç kontrol koordinatörü düzenler.' }
  const ad = metin(g.ad, 300)
  if (!ad) return { hata: 'Plan adı boş olamaz.' }
  if (!Number.isInteger(g.basYil) || !Number.isInteger(g.bitYil) || g.bitYil < g.basYil) return { hata: 'Plan yılları geçersiz.' }
  if (g.kapsam === 'birim' && !g.mudurlukId) return { hata: 'Birim planı için müdürlük seçin.' }
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
    tazele()
    return { id: g.id }
  }
  const { data, error } = await b.db
    .from('ick_plan')
    .insert({ ...satir, surum_id: surum.id, created_by: b.yetki.userId })
    .select('id')
    .single()
  if (error) return { hata: ickHataMetni(error.message) }
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
  if (alan === 'mudurluk_id' || alan === 'koordinator_mudurluk_id') return mudAd.get(Number(v)) ?? String(v)
  return String(v)
}

export async function ickPlanGecmisi(planId: number): Promise<Sonuc<{ satirlar: IckPlanGecmisSatir[] }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!(b.yetki.admin || b.yetki.koordinator || b.yetki.izleyici)) return { hata: 'Geçmişi koordinatör, izleyici ve yönetici görür.' }
  const { data, error } = await b.db
    .from('ick_audit_log')
    .select('id, islem, onceki, sonraki, actor_id, created_at')
    .eq('tablo', 'ick_plan')
    .eq('kayit_id', String(planId))
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { hata: ickHataMetni(error.message) }
  const kayitlar = (data as { id: number; islem: string; onceki: Record<string, unknown> | null; sonraki: Record<string, unknown> | null; actor_id: string | null; created_at: string }[] | null) ?? []
  const [adlar, mudAd] = await Promise.all([
    ickKullaniciAdlari(b.db, kayitlar.map(k => k.actor_id).filter((x): x is string => Boolean(x))),
    ickTumMudurlukHaritasi(b.db),
  ])
  const satirlar = kayitlar.map(k => {
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
  if (!b.yetki.koordinator) return { hata: 'Değerlendirmeyi iç kontrol koordinatörü düzenler.' }
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
}

export async function ickEylemKaydet(g: IckEylemGirdi): Promise<Sonuc<{ id: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!b.yetki.koordinator) return { hata: 'Eylemi iç kontrol koordinatörü düzenler.' }
  const kodNorm = ickKodNorm(g.kod)
  if (!kodNorm) return { hata: 'Eylem kodu boş olamaz.' }
  if (!metin(g.ongorulenEylem)) return { hata: 'Öngörülen eylem boş olamaz.' }
  if (g.sorumluTur === 'mudurluk' && !g.sorumluMudurlukId) return { hata: 'Sorumlu müdürlüğü seçin.' }

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
    const { data: eski } = await b.db.from('ick_eylem').select('termin_ilk, termin_guncel').eq('id', g.id).maybeSingle()
    if (!eski) return { hata: 'Eylem bulunamadı.' }
    if ((eski.termin_guncel ?? null) !== termin.ilk) {
      const not = metin(g.revizyonNotu, 1000)
      if (!not) return { hata: 'Termin değişikliği için revizyon gerekçesi yazın.' }
      satir.termin_guncel = termin.ilk
      satir.revizyon_notu = `${new Date().toISOString().slice(0, 10)} termin: ${not}`
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
  tazele()
  return { id: Number(eylemId) }
}

export async function ickEylemIptal(id: number, gerekce: string): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!b.yetki.koordinator) return { hata: 'Eylemi iç kontrol koordinatörü iptal eder.' }
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
  if (!b.yetki.koordinator) return { hata: 'Aktarımı iç kontrol koordinatörü yapar.' }
  const planId = Number(form.get('planId'))
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

export async function ickAktarimUygula(form: FormData): Promise<Sonuc<{ eylem: number; gerceklesme: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const h = await aktarimHazirla(b, form)
  if ('hata' in h) return { hata: h.hata }
  const { onizleme, planId } = h
  if (onizleme.hataSayisi > 0) return { hata: `Önizlemede ${onizleme.hataSayisi} hata var; aktarım yapılmadı.` }
  if (!onizleme.eylemler.length) return { hata: 'Aktarılacak eylem yok.' }

  const { count } = await b.db.from('ick_eylem').select('id', { count: 'exact', head: true }).eq('plan_id', planId)
  if ((count ?? 0) > 0) return { hata: 'Bu planda eylem var. Aktarım yalnızca boş plana yapılır.' }

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
  if (eErr) return { hata: `Eylemler yazılamadı: ${eErr.message}` }
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
      istisna_gerekcesi: `${g.yil} yılı onaylı izleme raporundan aktarıldı; kanıt belgeleri sistem dışında.`,
    })
    if (error) return { hata: `${g.kodNorm} gerçekleşmesi yazılamadı: ${error.message}` }
    gerceklesme++
  }

  tazele()
  return { eylem: idHarita.size, gerceklesme }
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
}

export async function ickGerceklesmeKaydet(g: IckGerceklesmeGirdi): Promise<Sonuc<{ id: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const calisma = metin(g.calisma)
  if (!calisma) return { hata: 'Gerçekleştirilen çalışmayı yazın.' }
  const ilerleme = g.beyanDurum === 'tamamlandi' ? 100 : g.beyanDurum === 'baslanmadi' ? 0 : Math.min(99, Math.max(1, Math.round(g.beyanIlerleme || 0)))
  const satir = {
    donem_yili: g.donemYili,
    beyan_durum: g.beyanDurum,
    beyan_ilerleme: ilerleme,
    calisma,
    kanit_aciklama: metin(g.kanitAciklama, 2000),
  }
  if (g.id) {
    const { data, error } = await b.db.from('ick_gerceklesme').update({ ...satir, akis: 'taslak' }).eq('id', g.id).select('id')
    if (error) return { hata: ickHataMetni(error.message) }
    if (!data?.length) return { hata: 'Kayıt güncellenemedi. Yalnızca kendi taslak veya iade edilen bildiriminizi düzenleyebilirsiniz.' }
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
    .insert({ ...satir, eylem_id: g.eylemId, akis: 'taslak', olusturan_id: b.yetki.userId, olusturan_ad: b.yetki.adSoyad })
    .select('id')
    .single()
  if (error) return { hata: error.message.includes('row-level security') ? 'Bu eyleme bildirim girme yetkiniz yok.' : ickHataMetni(error.message) }
  tazele()
  return { id: Number(data.id) }
}

export async function ickGerceklesmeGonder(id: number): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const { data, error } = await b.db
    .from('ick_gerceklesme')
    .update({ akis: 'incelemede', gonderen_ad: b.yetki.adSoyad, iade_gerekcesi: '' })
    .eq('id', id)
    .select('id')
  if (error) return { hata: ickHataMetni(error.message) }
  if (!data?.length) return { hata: 'Bildirim gönderilemedi. Yalnızca kendi taslak veya iade edilen bildiriminizi gönderebilirsiniz.' }
  tazele()
  return {}
}

export async function ickGerceklesmeSil(id: number): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  const { data, error } = await b.db.from('ick_gerceklesme').delete().eq('id', id).select('id')
  if (error) return { hata: error.message.includes('foreign key') ? 'Belgesi olan taslak silinemez; belgeyi pasife alın veya bildirimi gönderin.' : ickHataMetni(error.message) }
  if (!data?.length) return { hata: 'Yalnızca kendi taslağınız silinir.' }
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
  if (!b.yetki.koordinator) return { hata: 'Karar yetkisi iç kontrol koordinatöründedir.' }
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

export async function ickDonemOlustur(g: { planId: number; yil: number; yari: 1 | 2; bas: string; bit: string }): Promise<Sonuc> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!b.yetki.koordinator) return { hata: 'İzleme dönemini iç kontrol koordinatörü açar.' }
  if (!tarihGecerli(g.bas) || !tarihGecerli(g.bit) || g.bit < g.bas) return { hata: 'Dönem tarihleri geçersiz.' }
  const { error } = await b.db.from('ick_izleme_donemi').insert({ plan_id: g.planId, yil: g.yil, yari: g.yari, bas: g.bas, bit: g.bit })
  if (error) return { hata: error.message.includes('duplicate') ? 'Bu plan için aynı dönem açılmış.' : ickHataMetni(error.message) }
  tazele()
  return {}
}

export async function ickDonemKilitle(id: number): Promise<Sonuc<{ adet: number }>> {
  const b = await baglam()
  if ('hata' in b) return { hata: b.hata }
  if (!b.yetki.koordinator) return { hata: 'Dönemi iç kontrol koordinatörü kilitler.' }
  const { data, error } = await b.db.rpc('ick_donem_kilitle', { p_donem_id: id })
  if (error) return { hata: ickHataMetni(error.message) }
  tazele()
  return { adet: Number(data ?? 0) }
}
