'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  DENETIM_AYLAR_TR,
  DENETIM_BELGE_BUCKET,
  DENETIM_BELGE_MAX_BOYUT,
  denetimBelgeMimeCoz,
  denetimBelgeUzanti,
  denetimAltBolumBul,
  denetimBolumMu,
  denetimBolumFromSistem,
  denetimMenuSlugUret,
  DENETIM_BOLUM_META,
  type DenetimBelgeBolumu,
  type DenetimKararTuru,
} from '@/lib/denetim'
import {
  denetimBolumBelgeAuditSnapshot,
  denetimDonemAuditSnapshot,
  denetimKararAuditSnapshot,
  writeDenetimBolumBaslikAudit,
  writeDenetimBolumBelgeAudit,
  writeDenetimDonemAudit,
  writeDenetimKararAudit,
} from '@/lib/denetim-audit'

export type DenetimActionSonuc = { ok?: boolean; hata?: string; id?: number }

/**
 * Dosya, sunucu aksiyonu gövdesi yerine tarayıcıdan doğrudan Storage'a yüklenir;
 * platformun istek gövdesi sınırı (Vercel'de 4.5 MB) böylece devre dışı kalır.
 */
export type DenetimYuklemeHazirlik = { ok?: boolean; hata?: string; path?: string; token?: string }

async function oturum() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' as const, supabase, user: null }
  return { supabase, user, hata: undefined }
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

function guvenliDosyaAdi(dosyaAdi: string, ext: string): string {
  return dosyaAdi.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || `belge.${ext}`
}

function revalidateDonem(donemId?: number) {
  revalidatePath('/', 'layout')
  revalidatePath('/denetim')
  revalidatePath('/denetim/donemler')
  if (donemId) {
    revalidatePath(`/denetim/donemler/${donemId}`)
    revalidatePath(`/denetim/donemler/${donemId}`, 'layout')
  }
}

export async function denetimDonemEkle(formData: FormData): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const donem_adi = str(formData, 'donem_adi')
  const baslangic_tarihi = str(formData, 'baslangic_tarihi')
  const bitis_tarihi = str(formData, 'bitis_tarihi')
  if (donem_adi.length < 2) return { hata: 'Dönem adı en az 2 karakter olmalıdır.' }
  if (!baslangic_tarihi || !bitis_tarihi) return { hata: 'Başlangıç ve bitiş tarihleri zorunludur.' }
  if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const { data: acik } = await supabase
    .from('denetim_donem')
    .select('id, donem_adi')
    .eq('durum', 'Açık')
    .maybeSingle()
  if (acik) {
    return { hata: `Önce açık dönemi kapatın: ${acik.donem_adi}` }
  }

  const { data: maxRow } = await supabase
    .from('denetim_donem')
    .select('sira_no')
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sira_no = (maxRow?.sira_no ?? 0) + 1

  const payload = {
    sira_no,
    donem_adi,
    baslangic_tarihi,
    bitis_tarihi,
    durum: 'Açık' as const,
    created_by: user.id,
    created_by_email: user.email ?? null,
  }

  const { data: inserted, error } = await supabase
    .from('denetim_donem')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { hata: 'Açık bir dönem varken yeni dönem açılamaz.' }
    return { hata: error.message }
  }

  await supabase.rpc('denetim_donem_menu_seed', { p_donem_id: inserted.id })

  await writeDenetimDonemAudit(supabase, {
    donemId: inserted.id,
    islem: 'Ekle',
    ozet: `${donem_adi} dönemi oluşturuldu.`,
    sonraki: denetimDonemAuditSnapshot(payload),
  })

  revalidateDonem(inserted.id)
  return { ok: true, id: inserted.id }
}

export async function denetimDonemGuncelle(formData: FormData): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase } = gate

  const id = Number.parseInt(str(formData, 'id'), 10)
  const donem_adi = str(formData, 'donem_adi')
  const baslangic_tarihi = str(formData, 'baslangic_tarihi')
  const bitis_tarihi = str(formData, 'bitis_tarihi')
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Dönem bulunamadı.' }
  if (donem_adi.length < 2) return { hata: 'Dönem adı en az 2 karakter olmalıdır.' }
  if (!baslangic_tarihi || !bitis_tarihi) return { hata: 'Başlangıç ve bitiş tarihleri zorunludur.' }
  if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const { data: onceki } = await supabase.from('denetim_donem').select('*').eq('id', id).maybeSingle()
  if (!onceki) return { hata: 'Dönem bulunamadı.' }

  const { error } = await supabase
    .from('denetim_donem')
    .update({
      donem_adi,
      baslangic_tarihi,
      bitis_tarihi,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { hata: error.message }

  await writeDenetimDonemAudit(supabase, {
    donemId: id,
    islem: 'Güncelle',
    ozet: `${donem_adi} dönemi güncellendi.`,
    onceki: denetimDonemAuditSnapshot(onceki as unknown as Record<string, unknown>),
    sonraki: denetimDonemAuditSnapshot({ ...onceki, donem_adi, baslangic_tarihi, bitis_tarihi }),
  })

  revalidateDonem(id)
  return { ok: true, id }
}

export async function denetimDonemKapat(id: number): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase } = gate

  const { data: onceki } = await supabase.from('denetim_donem').select('*').eq('id', id).maybeSingle()
  if (!onceki) return { hata: 'Dönem bulunamadı.' }
  if (onceki.durum === 'Kapalı') return { hata: 'Dönem zaten kapalı.' }

  const { error } = await supabase
    .from('denetim_donem')
    .update({ durum: 'Kapalı', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }

  await writeDenetimDonemAudit(supabase, {
    donemId: id,
    islem: 'Kapat',
    ozet: `${onceki.donem_adi} dönemi kapatıldı.`,
    onceki: denetimDonemAuditSnapshot(onceki as unknown as Record<string, unknown>),
    sonraki: denetimDonemAuditSnapshot({ ...onceki, durum: 'Kapalı' }),
  })

  revalidateDonem(id)
  return { ok: true, id }
}

export async function denetimDonemAc(id: number): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase } = gate

  const { data: onceki } = await supabase.from('denetim_donem').select('*').eq('id', id).maybeSingle()
  if (!onceki) return { hata: 'Dönem bulunamadı.' }
  if (onceki.durum === 'Açık') return { hata: 'Dönem zaten açık.' }

  const { data: acik } = await supabase
    .from('denetim_donem')
    .select('id, donem_adi')
    .eq('durum', 'Açık')
    .maybeSingle()
  if (acik) return { hata: `Önce açık dönemi kapatın: ${acik.donem_adi}` }

  const { error } = await supabase
    .from('denetim_donem')
    .update({ durum: 'Açık', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    if (error.code === '23505') return { hata: 'Açık bir dönem varken başka dönem açılamaz.' }
    return { hata: error.message }
  }

  await writeDenetimDonemAudit(supabase, {
    donemId: id,
    islem: 'Aç',
    ozet: `${onceki.donem_adi} dönemi tekrar açıldı.`,
    onceki: denetimDonemAuditSnapshot(onceki as unknown as Record<string, unknown>),
    sonraki: denetimDonemAuditSnapshot({ ...onceki, durum: 'Açık' }),
  })

  revalidateDonem(id)
  return { ok: true, id }
}

export async function denetimKararBelgeYuklemeHazirla(formData: FormData): Promise<DenetimYuklemeHazirlik> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase } = gate

  const donemId = Number.parseInt(str(formData, 'donem_id'), 10)
  const ay = Number.parseInt(str(formData, 'ay'), 10)
  const karar_turu = str(formData, 'karar_turu') as DenetimKararTuru
  const dosya_adi = str(formData, 'dosya_adi')
  const boyut = Number.parseInt(str(formData, 'boyut'), 10)

  if (!Number.isFinite(donemId) || donemId <= 0) return { hata: 'Dönem gerekli.' }
  if (!Number.isFinite(ay) || ay < 1 || ay > 12) return { hata: 'Geçerli bir ay seçin.' }
  if (karar_turu !== 'encumen' && karar_turu !== 'meclis') return { hata: 'Karar türü geçersiz.' }
  if (!dosya_adi) return { hata: 'Dosya seçin.' }
  if (!Number.isFinite(boyut) || boyut <= 0) return { hata: 'Dosya seçin.' }
  if (boyut > DENETIM_BELGE_MAX_BOYUT) return { hata: 'Dosya en fazla 15 MB olabilir.' }
  if (!denetimBelgeMimeCoz(dosya_adi, '')) return { hata: 'Yalnızca PDF, Word veya Excel yüklenebilir.' }

  const { data: donem } = await supabase.from('denetim_donem').select('id, durum').eq('id', donemId).maybeSingle()
  if (!donem) return { hata: 'Dönem bulunamadı.' }
  if (donem.durum === 'Kapalı') return { hata: 'Kapalı döneme belge yüklenemez.' }

  const ext = denetimBelgeUzanti(dosya_adi) || 'bin'
  const storagePath = `karar/${donemId}/${karar_turu}/${ay}/${Date.now()}_${guvenliDosyaAdi(dosya_adi, ext)}`
  const { data, error } = await supabase.storage.from(DENETIM_BELGE_BUCKET).createSignedUploadUrl(storagePath)
  if (error || !data) return { hata: error?.message ?? 'Yükleme adresi oluşturulamadı.' }

  return { ok: true, path: data.path, token: data.token }
}

export async function denetimKararBelgeKaydet(formData: FormData): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const donemId = Number.parseInt(str(formData, 'donem_id'), 10)
  const ay = Number.parseInt(str(formData, 'ay'), 10)
  const karar_turu = str(formData, 'karar_turu') as DenetimKararTuru
  const sorumlu_birim = str(formData, 'sorumlu_birim') || null
  const storagePath = str(formData, 'storage_path')
  const dosya_adi = str(formData, 'dosya_adi')
  const boyut = Number.parseInt(str(formData, 'boyut'), 10)

  if (!Number.isFinite(donemId) || donemId <= 0) return { hata: 'Dönem gerekli.' }
  if (!Number.isFinite(ay) || ay < 1 || ay > 12) return { hata: 'Geçerli bir ay seçin.' }
  if (karar_turu !== 'encumen' && karar_turu !== 'meclis') return { hata: 'Karar türü geçersiz.' }
  if (!dosya_adi) return { hata: 'Dosya seçin.' }
  if (!storagePath.startsWith(`karar/${donemId}/${karar_turu}/${ay}/`)) return { hata: 'Yükleme doğrulanamadı.' }

  const mime = denetimBelgeMimeCoz(dosya_adi, '')
  if (!mime) return { hata: 'Yalnızca PDF, Word veya Excel yüklenebilir.' }

  const { data: donem } = await supabase.from('denetim_donem').select('id, durum').eq('id', donemId).maybeSingle()
  if (!donem) return { hata: 'Dönem bulunamadı.' }
  if (donem.durum === 'Kapalı') return { hata: 'Kapalı döneme belge yüklenemez.' }

  const { data: mevcut } = await supabase
    .from('denetim_karar_belge')
    .select('*')
    .eq('donem_id', donemId)
    .eq('karar_turu', karar_turu)
    .eq('ay', ay)
    .maybeSingle()

  if (mevcut) {
    const { error } = await supabase
      .from('denetim_karar_belge')
      .update({
        sorumlu_birim,
        dosya_adi,
        storage_path: storagePath,
        mime_type: mime,
        boyut_byte: boyut,
        updated_at: new Date().toISOString(),
        created_by: user.id,
        created_by_email: user.email ?? null,
      })
      .eq('id', mevcut.id)

    if (error) {
      await supabase.storage.from(DENETIM_BELGE_BUCKET).remove([storagePath])
      return { hata: error.message }
    }

    if (mevcut.storage_path && mevcut.storage_path !== storagePath) {
      await supabase.storage.from(DENETIM_BELGE_BUCKET).remove([mevcut.storage_path])
    }

    await writeDenetimKararAudit(supabase, {
      belgeId: mevcut.id,
      islem: 'Değiştir',
      ozet: `${DENETIM_AYLAR_TR[ay - 1]} ${karar_turu === 'meclis' ? 'meclis' : 'encümen'} kararı güncellendi.`,
      onceki: denetimKararAuditSnapshot(mevcut as unknown as Record<string, unknown>),
      sonraki: denetimKararAuditSnapshot({
        karar_turu,
        ay,
        sorumlu_birim,
        dosya_adi,
        mime_type: mime,
        boyut_byte: boyut,
      }),
    })

    revalidateDonem(donemId)
    return { ok: true, id: mevcut.id }
  }

  const { data: inserted, error } = await supabase
    .from('denetim_karar_belge')
    .insert({
      donem_id: donemId,
      karar_turu,
      ay,
      sorumlu_birim,
      dosya_adi,
      storage_path: storagePath,
      mime_type: mime,
      boyut_byte: boyut,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) {
    await supabase.storage.from(DENETIM_BELGE_BUCKET).remove([storagePath])
    return { hata: error.message }
  }

  await writeDenetimKararAudit(supabase, {
    belgeId: inserted.id,
    islem: 'Yükle',
    ozet: `${DENETIM_AYLAR_TR[ay - 1]} ${karar_turu === 'meclis' ? 'meclis' : 'encümen'} kararı yüklendi.`,
    sonraki: denetimKararAuditSnapshot({
      karar_turu,
      ay,
      sorumlu_birim,
      dosya_adi,
      mime_type: mime,
      boyut_byte: boyut,
    }),
  })

  revalidateDonem(donemId)
  return { ok: true, id: inserted.id }
}

export async function denetimAnaAltMenuEkle(formData: FormData): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const donemId = Number.parseInt(str(formData, 'donem_id'), 10)
  const baslik = str(formData, 'baslik')
  const aciklama = str(formData, 'aciklama') || null
  if (!Number.isFinite(donemId) || donemId <= 0) return { hata: 'Dönem seçin.' }
  if (baslik.length < 2) return { hata: 'Menü adı en az 2 karakter olmalıdır.' }
  if (baslik.length > 120) return { hata: 'Menü adı en fazla 120 karakter olabilir.' }

  const { data: donem } = await supabase.from('denetim_donem').select('id, durum, donem_adi').eq('id', donemId).maybeSingle()
  if (!donem) return { hata: 'Dönem bulunamadı.' }
  if (donem.durum === 'Kapalı') return { hata: 'Kapalı döneme menü eklenemez.' }

  const { data: maxRow } = await supabase
    .from('denetim_donem_menu')
    .select('sira_no')
    .eq('donem_id', donemId)
    .is('parent_id', null)
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const slug = `${denetimMenuSlugUret(baslik)}-${Date.now().toString(36)}`
  const { data: inserted, error } = await supabase
    .from('denetim_donem_menu')
    .insert({
      donem_id: donemId,
      parent_id: null,
      baslik,
      aciklama,
      slug,
      sayfa_turu: 'hub' as const,
      ikon: null,
      sira_no: (maxRow?.sira_no ?? 0) + 1,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { hata: 'Bu dönemde aynı adlı ana alt menü zaten var.' }
    return { hata: error.message }
  }

  revalidateDonem(donemId)
  return { ok: true, id: inserted.id }
}

export async function denetimAltMenuEkle(formData: FormData): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const parentId = Number.parseInt(str(formData, 'parent_id'), 10)
  const baslik = str(formData, 'baslik')
  const aciklama = str(formData, 'aciklama') || null
  if (!Number.isFinite(parentId) || parentId <= 0) return { hata: 'Ana alt menü seçin.' }
  if (baslik.length < 2) return { hata: 'Menü adı en az 2 karakter olmalıdır.' }
  if (baslik.length > 120) return { hata: 'Menü adı en fazla 120 karakter olabilir.' }

  const { data: parent } = await supabase
    .from('denetim_donem_menu')
    .select('id, donem_id, parent_id, baslik, denetim_donem!inner(durum)')
    .eq('id', parentId)
    .maybeSingle()
  if (!parent) return { hata: 'Ana alt menü bulunamadı.' }
  if (parent.parent_id != null) return { hata: 'Alt menü yalnızca ana alt menü altına eklenebilir.' }
  const donemDurumu = Array.isArray(parent.denetim_donem)
    ? parent.denetim_donem[0]?.durum
    : parent.denetim_donem?.durum
  if (donemDurumu === 'Kapalı') return { hata: 'Kapalı döneme menü eklenemez.' }

  const { data: maxRow } = await supabase
    .from('denetim_donem_menu')
    .select('sira_no')
    .eq('parent_id', parentId)
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const slug = `${denetimMenuSlugUret(baslik)}-${Date.now().toString(36)}`
  const { data: inserted, error } = await supabase
    .from('denetim_donem_menu')
    .insert({
      donem_id: parent.donem_id,
      parent_id: parentId,
      baslik,
      aciklama,
      slug,
      sayfa_turu: 'belge' as const,
      ikon: null,
      sira_no: (maxRow?.sira_no ?? 0) + 1,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { hata: 'Bu menüde aynı adlı alt menü zaten var.' }
    return { hata: error.message }
  }

  revalidateDonem(parent.donem_id)
  return { ok: true, id: inserted.id }
}

export async function denetimBolumBaslikEkle(formData: FormData): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const donemId = Number.parseInt(str(formData, 'donem_id'), 10)
  const menuIdRaw = Number.parseInt(str(formData, 'menu_id'), 10)
  const bolumRaw = str(formData, 'bolum')
  const altBolum = str(formData, 'alt_bolum')
  const baslik = str(formData, 'baslik')
  const aciklama = str(formData, 'aciklama') || null
  if (!Number.isFinite(donemId) || donemId <= 0) return { hata: 'Dönem gerekli.' }
  if (baslik.length < 2) return { hata: 'Başlık en az 2 karakter olmalıdır.' }
  if (baslik.length > 120) return { hata: 'Başlık en fazla 120 karakter olabilir.' }

  let menuId = Number.isFinite(menuIdRaw) && menuIdRaw > 0 ? menuIdRaw : null
  let bolum: DenetimBelgeBolumu | null = denetimBolumMu(bolumRaw) ? bolumRaw : null
  let altEtiket = altBolum

  if (menuId) {
    const { data: menu } = await supabase
      .from('denetim_donem_menu')
      .select('id, donem_id, parent_id, baslik, sayfa_turu, sistem_anahtari')
      .eq('id', menuId)
      .eq('donem_id', donemId)
      .maybeSingle()
    if (!menu) return { hata: 'Alt menü bulunamadı.' }
    if (menu.sayfa_turu !== 'belge' || menu.parent_id == null) {
      return { hata: 'Başlık yalnızca alt menülere eklenebilir.' }
    }
    altEtiket = menu.baslik
    bolum = denetimBolumFromSistem(menu.sistem_anahtari)
  } else {
    if (!bolum) return { hata: 'Bölüm geçersiz.' }
    const alt = denetimAltBolumBul(bolum, altBolum)
    if (!alt) return { hata: 'Alt menü geçersiz.' }
    altEtiket = alt.label
    const { data: menu } = await supabase
      .from('denetim_donem_menu')
      .select('id')
      .eq('donem_id', donemId)
      .eq('sistem_anahtari', altBolum)
      .maybeSingle()
    menuId = menu?.id ?? null
  }

  const { data: donem } = await supabase
    .from('denetim_donem')
    .select('id, durum')
    .eq('id', donemId)
    .maybeSingle()
  if (!donem) return { hata: 'Dönem bulunamadı.' }
  if (donem.durum === 'Kapalı') return { hata: 'Kapalı döneme başlık eklenemez.' }

  let maxQuery = supabase
    .from('denetim_bolum_baslik')
    .select('sira_no')
    .eq('donem_id', donemId)
    .order('sira_no', { ascending: false })
    .limit(1)
  if (menuId) maxQuery = maxQuery.eq('menu_id', menuId)
  else if (bolum) maxQuery = maxQuery.eq('bolum', bolum).eq('alt_bolum', altBolum)
  const { data: maxRow } = await maxQuery.maybeSingle()

  const payload = {
    donem_id: donemId,
    menu_id: menuId,
    bolum,
    alt_bolum: altBolum || null,
    baslik,
    aciklama,
    sira_no: (maxRow?.sira_no ?? 0) + 1,
    created_by: user.id,
    created_by_email: user.email ?? null,
  }
  const { data: inserted, error } = await supabase
    .from('denetim_bolum_baslik')
    .insert(payload)
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { hata: 'Bu menüde aynı adlı başlık zaten var.' }
    return { hata: error.message }
  }

  const bolumEtiket = bolum ? DENETIM_BOLUM_META[bolum].label : 'Menü'
  await writeDenetimBolumBaslikAudit(supabase, {
    baslikId: inserted.id,
    islem: 'Ekle',
    ozet: `${bolumEtiket} / ${altEtiket}: ${baslik} başlığı eklendi.`,
    sonraki: { baslik, bolum, alt_bolum: altBolum, menu_id: menuId, aciklama, sira_no: payload.sira_no },
  })
  revalidateDonem(donemId)
  return { ok: true, id: inserted.id }
}

export async function denetimBolumBaslikGuncelle(formData: FormData): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase } = gate

  const id = Number.parseInt(str(formData, 'id'), 10)
  const baslik = str(formData, 'baslik')
  const aciklama = str(formData, 'aciklama') || null
  const sorumlu_birim = str(formData, 'sorumlu_birim') || null
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Başlık bulunamadı.' }
  if (baslik.length < 2) return { hata: 'Başlık en az 2 karakter olmalıdır.' }
  if (baslik.length > 120) return { hata: 'Başlık en fazla 120 karakter olabilir.' }

  const { data: onceki } = await supabase
    .from('denetim_bolum_baslik')
    .select('id, donem_id, baslik, aciklama, sorumlu_birim, denetim_donem!inner(durum)')
    .eq('id', id)
    .maybeSingle()
  if (!onceki) return { hata: 'Başlık bulunamadı.' }
  const donemDurumu = Array.isArray(onceki.denetim_donem)
    ? onceki.denetim_donem[0]?.durum
    : onceki.denetim_donem?.durum
  if (donemDurumu === 'Kapalı') return { hata: 'Kapalı dönemde başlık düzenlenemez.' }

  if (sorumlu_birim) {
    const { data: mudurluk } = await supabase
      .from('tanim_mudurluk')
      .select('id')
      .eq('mudurluk_adi', sorumlu_birim)
      .eq('aktif', true)
      .maybeSingle()
    if (!mudurluk) return { hata: 'Aktif bir sorumlu müdürlük seçin.' }
  }

  const updated_at = new Date().toISOString()
  const { error } = await supabase
    .from('denetim_bolum_baslik')
    .update({ baslik, aciklama, sorumlu_birim, updated_at })
    .eq('id', id)
  if (error) {
    if (error.code === '23505') return { hata: 'Bu menüde aynı adlı başlık zaten var.' }
    return { hata: error.message }
  }

  // Belge varsa satırdaki müdürlük ile belge kaydını da aynı tut.
  const { error: belgeError } = await supabase
    .from('denetim_bolum_belge')
    .update({ sorumlu_birim, updated_at })
    .eq('baslik_id', id)
  if (belgeError) return { hata: belgeError.message }

  await writeDenetimBolumBaslikAudit(supabase, {
    baslikId: id,
    islem: 'Güncelle',
    ozet: `${onceki.baslik} başlığı güncellendi.`,
    onceki: {
      baslik: onceki.baslik,
      aciklama: onceki.aciklama,
      sorumlu_birim: onceki.sorumlu_birim,
    },
    sonraki: { baslik, aciklama, sorumlu_birim },
  })
  revalidateDonem(onceki.donem_id)
  return { ok: true, id }
}

export async function denetimBolumBelgeYuklemeHazirla(formData: FormData): Promise<DenetimYuklemeHazirlik> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase } = gate

  const baslikId = Number.parseInt(str(formData, 'baslik_id'), 10)
  const dosya_adi = str(formData, 'dosya_adi')
  const boyut = Number.parseInt(str(formData, 'boyut'), 10)
  if (!Number.isFinite(baslikId) || baslikId <= 0) return { hata: 'Başlık gerekli.' }
  if (!dosya_adi) return { hata: 'Dosya seçin.' }
  if (!Number.isFinite(boyut) || boyut <= 0) return { hata: 'Dosya seçin.' }
  if (boyut > DENETIM_BELGE_MAX_BOYUT) return { hata: 'Dosya en fazla 15 MB olabilir.' }
  if (!denetimBelgeMimeCoz(dosya_adi, '')) return { hata: 'Yalnızca PDF, Word veya Excel yüklenebilir.' }

  const { data: baslik } = await supabase
    .from('denetim_bolum_baslik')
    .select('id, donem_id, bolum, denetim_donem!inner(durum)')
    .eq('id', baslikId)
    .maybeSingle()
  if (!baslik) return { hata: 'Başlık bulunamadı.' }
  const durum = Array.isArray(baslik.denetim_donem) ? baslik.denetim_donem[0]?.durum : baslik.denetim_donem?.durum
  if (durum === 'Kapalı') return { hata: 'Kapalı döneme belge yüklenemez.' }

  const ext = denetimBelgeUzanti(dosya_adi) || 'bin'
  const storagePath = `bolum/${baslik.donem_id}/${baslik.bolum ?? 'menu'}/${baslikId}/${Date.now()}_${guvenliDosyaAdi(dosya_adi, ext)}`
  const { data, error } = await supabase.storage.from(DENETIM_BELGE_BUCKET).createSignedUploadUrl(storagePath)
  if (error || !data) return { hata: error?.message ?? 'Yükleme adresi oluşturulamadı.' }

  return { ok: true, path: data.path, token: data.token }
}

export async function denetimBolumBelgeKaydet(formData: FormData): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const baslikId = Number.parseInt(str(formData, 'baslik_id'), 10)
  const sorumlu_birim = str(formData, 'sorumlu_birim') || null
  const storagePath = str(formData, 'storage_path')
  const dosya_adi = str(formData, 'dosya_adi')
  const boyut = Number.parseInt(str(formData, 'boyut'), 10)
  if (!Number.isFinite(baslikId) || baslikId <= 0) return { hata: 'Başlık gerekli.' }
  if (!dosya_adi) return { hata: 'Dosya seçin.' }

  const mime = denetimBelgeMimeCoz(dosya_adi, '')
  if (!mime) return { hata: 'Yalnızca PDF, Word veya Excel yüklenebilir.' }

  const { data: baslik } = await supabase
    .from('denetim_bolum_baslik')
    .select('id, donem_id, bolum, baslik, denetim_donem!inner(durum)')
    .eq('id', baslikId)
    .maybeSingle()
  if (!baslik) return { hata: 'Başlık bulunamadı.' }
  const donemDurumu = Array.isArray(baslik.denetim_donem)
    ? baslik.denetim_donem[0]?.durum
    : baslik.denetim_donem?.durum
  if (donemDurumu === 'Kapalı') return { hata: 'Kapalı döneme belge yüklenemez.' }
  if (!storagePath.startsWith(`bolum/${baslik.donem_id}/${baslik.bolum ?? 'menu'}/${baslikId}/`)) {
    return { hata: 'Yükleme doğrulanamadı.' }
  }

  if (sorumlu_birim) {
    const { data: mudurluk } = await supabase
      .from('tanim_mudurluk')
      .select('id')
      .eq('mudurluk_adi', sorumlu_birim)
      .eq('aktif', true)
      .maybeSingle()
    if (!mudurluk) return { hata: 'Aktif bir sorumlu müdürlük seçin.' }
  }

  const { data: mevcut } = await supabase
    .from('denetim_bolum_belge')
    .select('*')
    .eq('baslik_id', baslikId)
    .maybeSingle()

  const belgePayload = {
    sorumlu_birim,
    dosya_adi,
    storage_path: storagePath,
    mime_type: mime,
    boyut_byte: boyut,
    updated_at: new Date().toISOString(),
    created_by: user.id,
    created_by_email: user.email ?? null,
  }

  if (mevcut) {
    const { error } = await supabase.from('denetim_bolum_belge').update(belgePayload).eq('id', mevcut.id)
    if (error) {
      await supabase.storage.from(DENETIM_BELGE_BUCKET).remove([storagePath])
      return { hata: error.message }
    }
    if (mevcut.storage_path !== storagePath) {
      await supabase.storage.from(DENETIM_BELGE_BUCKET).remove([mevcut.storage_path])
    }
    await writeDenetimBolumBelgeAudit(supabase, {
      belgeId: mevcut.id,
      islem: 'Değiştir',
      ozet: `${baslik.baslik} belgesi güncellendi.`,
      onceki: denetimBolumBelgeAuditSnapshot({
        ...mevcut,
        baslik: baslik.baslik,
        bolum: baslik.bolum,
      }),
      sonraki: denetimBolumBelgeAuditSnapshot({
        ...belgePayload,
        baslik: baslik.baslik,
        bolum: baslik.bolum,
      }),
    })
    await supabase
      .from('denetim_bolum_baslik')
      .update({ sorumlu_birim, updated_at: new Date().toISOString() })
      .eq('id', baslikId)
    revalidateDonem(baslik.donem_id)
    return { ok: true, id: mevcut.id }
  }

  const { data: inserted, error } = await supabase
    .from('denetim_bolum_belge')
    .insert({ baslik_id: baslikId, ...belgePayload })
    .select('id')
    .single()
  if (error) {
    await supabase.storage.from(DENETIM_BELGE_BUCKET).remove([storagePath])
    return { hata: error.message }
  }
  await writeDenetimBolumBelgeAudit(supabase, {
    belgeId: inserted.id,
    islem: 'Yükle',
    ozet: `${baslik.baslik} belgesi yüklendi.`,
    sonraki: denetimBolumBelgeAuditSnapshot({
      ...belgePayload,
      baslik: baslik.baslik,
      bolum: baslik.bolum,
    }),
  })
  await supabase
    .from('denetim_bolum_baslik')
    .update({ sorumlu_birim, updated_at: new Date().toISOString() })
    .eq('id', baslikId)
  revalidateDonem(baslik.donem_id)
  return { ok: true, id: inserted.id }
}
