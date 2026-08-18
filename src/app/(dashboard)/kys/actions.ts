'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import {
  KYS_BELGE_BUCKET,
  KYS_BELGE_MAX_BOYUT,
  kysBelgeMimeCoz,
  kysBelgeUzanti,
  kysMenuSlugUret,
} from '@/lib/kys'
import {
  kysBelgeAuditSnapshot,
  writeKysBaslikAudit,
  writeKysBelgeAudit,
  writeKysMenuAudit,
} from '@/lib/kys-audit'

export type KysActionSonuc = { ok?: boolean; hata?: string; id?: number }
export type KysYuklemeHazirlik = { ok?: boolean; hata?: string; path?: string; token?: string }

async function oturum() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' as const, supabase, user: null }
  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'dis_denetci') {
    return { hata: 'Dış denetçi profili yalnızca Denetim belgelerini görüntüleyebilir.' as const, supabase, user: null }
  }
  return { supabase, user, hata: undefined }
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

function guvenliDosyaAdi(dosyaAdi: string, ext: string): string {
  return dosyaAdi.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || `belge.${ext}`
}

function revalidateKys(menuId?: number) {
  revalidatePath('/', 'layout')
  revalidatePath('/kys')
  if (menuId) revalidatePath(`/kys/m/${menuId}`)
}

export async function kysAnaAltMenuEkle(formData: FormData): Promise<KysActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const baslik = str(formData, 'baslik')
  const aciklama = str(formData, 'aciklama') || null
  if (baslik.length < 2) return { hata: 'Menü adı en az 2 karakter olmalıdır.' }
  if (baslik.length > 120) return { hata: 'Menü adı en fazla 120 karakter olabilir.' }

  const { data: maxRow } = await supabase
    .from('kys_menu')
    .select('sira_no')
    .is('parent_id', null)
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const slug = `${kysMenuSlugUret(baslik)}-${Date.now().toString(36)}`
  const { data: inserted, error } = await supabase
    .from('kys_menu')
    .insert({
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
    if (error.code === '23505') return { hata: 'Aynı adlı ana alt menü zaten var.' }
    return { hata: error.message }
  }

  await writeKysMenuAudit(supabase, {
    menuId: inserted.id,
    islem: 'Ekle',
    ozet: `${baslik} ana alt menüsü eklendi.`,
    sonraki: { baslik, aciklama, sayfa_turu: 'hub' },
  })
  revalidateKys(inserted.id)
  return { ok: true, id: inserted.id }
}

export async function kysAltMenuEkle(formData: FormData): Promise<KysActionSonuc> {
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
    .from('kys_menu')
    .select('id, parent_id, baslik')
    .eq('id', parentId)
    .maybeSingle()
  if (!parent) return { hata: 'Ana alt menü bulunamadı.' }
  if (parent.parent_id != null) return { hata: 'Alt menü yalnızca ana alt menü altına eklenebilir.' }

  const { data: maxRow } = await supabase
    .from('kys_menu')
    .select('sira_no')
    .eq('parent_id', parentId)
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const slug = `${kysMenuSlugUret(baslik)}-${Date.now().toString(36)}`
  const { data: inserted, error } = await supabase
    .from('kys_menu')
    .insert({
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

  await writeKysMenuAudit(supabase, {
    menuId: inserted.id,
    islem: 'Ekle',
    ozet: `${parent.baslik} altına ${baslik} alt menüsü eklendi.`,
    sonraki: { baslik, aciklama, sayfa_turu: 'belge' },
  })
  revalidateKys(parentId)
  revalidateKys(inserted.id)
  return { ok: true, id: inserted.id }
}

export async function kysBaslikEkle(formData: FormData): Promise<KysActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const menuId = Number.parseInt(str(formData, 'menu_id'), 10)
  const baslik = str(formData, 'baslik')
  const aciklama = str(formData, 'aciklama') || null
  if (!Number.isFinite(menuId) || menuId <= 0) return { hata: 'Alt menü gerekli.' }
  if (baslik.length < 2) return { hata: 'Başlık en az 2 karakter olmalıdır.' }
  if (baslik.length > 120) return { hata: 'Başlık en fazla 120 karakter olabilir.' }

  const { data: menu } = await supabase
    .from('kys_menu')
    .select('id, parent_id, baslik, sayfa_turu')
    .eq('id', menuId)
    .maybeSingle()
  if (!menu) return { hata: 'Alt menü bulunamadı.' }
  if (menu.sayfa_turu !== 'belge' || menu.parent_id == null) {
    return { hata: 'Başlık yalnızca alt menülere eklenebilir.' }
  }

  const { data: maxRow } = await supabase
    .from('kys_baslik')
    .select('sira_no')
    .eq('menu_id', menuId)
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  const payload = {
    menu_id: menuId,
    baslik,
    aciklama,
    sira_no: (maxRow?.sira_no ?? 0) + 1,
    created_by: user.id,
    created_by_email: user.email ?? null,
  }
  const { data: inserted, error } = await supabase
    .from('kys_baslik')
    .insert(payload)
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { hata: 'Bu menüde aynı adlı başlık zaten var.' }
    return { hata: error.message }
  }

  await writeKysBaslikAudit(supabase, {
    baslikId: inserted.id,
    islem: 'Ekle',
    ozet: `${menu.baslik}: ${baslik} başlığı eklendi.`,
    sonraki: { baslik, aciklama, sira_no: payload.sira_no },
  })
  revalidateKys(menuId)
  return { ok: true, id: inserted.id }
}

export async function kysBaslikGuncelle(formData: FormData): Promise<KysActionSonuc> {
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
    .from('kys_baslik')
    .select('id, menu_id, baslik, aciklama, sorumlu_birim')
    .eq('id', id)
    .maybeSingle()
  if (!onceki) return { hata: 'Başlık bulunamadı.' }

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
    .from('kys_baslik')
    .update({ baslik, aciklama, sorumlu_birim, updated_at })
    .eq('id', id)
  if (error) {
    if (error.code === '23505') return { hata: 'Bu menüde aynı adlı başlık zaten var.' }
    return { hata: error.message }
  }

  const { error: belgeError } = await supabase
    .from('kys_belge')
    .update({ sorumlu_birim, updated_at })
    .eq('baslik_id', id)
  if (belgeError) return { hata: belgeError.message }

  await writeKysBaslikAudit(supabase, {
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
  revalidateKys(onceki.menu_id)
  return { ok: true, id }
}

export async function kysBelgeYuklemeHazirla(formData: FormData): Promise<KysYuklemeHazirlik> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase } = gate

  const baslikId = Number.parseInt(str(formData, 'baslik_id'), 10)
  const dosya_adi = str(formData, 'dosya_adi')
  const boyut = Number.parseInt(str(formData, 'boyut'), 10)
  if (!Number.isFinite(baslikId) || baslikId <= 0) return { hata: 'Başlık gerekli.' }
  if (!dosya_adi) return { hata: 'Dosya seçin.' }
  if (!Number.isFinite(boyut) || boyut <= 0) return { hata: 'Dosya seçin.' }
  if (boyut > KYS_BELGE_MAX_BOYUT) return { hata: 'Dosya en fazla 15 MB olabilir.' }
  if (!kysBelgeMimeCoz(dosya_adi, '')) return { hata: 'Yalnızca PDF, Word veya Excel yüklenebilir.' }

  const { data: baslik } = await supabase
    .from('kys_baslik')
    .select('id, menu_id')
    .eq('id', baslikId)
    .maybeSingle()
  if (!baslik) return { hata: 'Başlık bulunamadı.' }

  const ext = kysBelgeUzanti(dosya_adi) || 'bin'
  const storagePath = `kys/${baslik.menu_id}/${baslikId}/${Date.now()}_${guvenliDosyaAdi(dosya_adi, ext)}`
  const { data, error } = await supabase.storage.from(KYS_BELGE_BUCKET).createSignedUploadUrl(storagePath)
  if (error || !data) return { hata: error?.message ?? 'Yükleme adresi oluşturulamadı.' }

  return { ok: true, path: data.path, token: data.token }
}

export async function kysBelgeKaydet(formData: FormData): Promise<KysActionSonuc> {
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

  const mime = kysBelgeMimeCoz(dosya_adi, '')
  if (!mime) return { hata: 'Yalnızca PDF, Word veya Excel yüklenebilir.' }

  const { data: baslik } = await supabase
    .from('kys_baslik')
    .select('id, menu_id, baslik')
    .eq('id', baslikId)
    .maybeSingle()
  if (!baslik) return { hata: 'Başlık bulunamadı.' }
  if (!storagePath.startsWith(`kys/${baslik.menu_id}/${baslikId}/`)) {
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
    .from('kys_belge')
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
    const { error } = await supabase.from('kys_belge').update(belgePayload).eq('id', mevcut.id)
    if (error) {
      await supabase.storage.from(KYS_BELGE_BUCKET).remove([storagePath])
      return { hata: error.message }
    }
    if (mevcut.storage_path !== storagePath) {
      await supabase.storage.from(KYS_BELGE_BUCKET).remove([mevcut.storage_path])
    }
    await writeKysBelgeAudit(supabase, {
      belgeId: mevcut.id,
      islem: 'Değiştir',
      ozet: `${baslik.baslik} belgesi güncellendi.`,
      onceki: kysBelgeAuditSnapshot({ ...mevcut, baslik: baslik.baslik }),
      sonraki: kysBelgeAuditSnapshot({ ...belgePayload, baslik: baslik.baslik }),
    })
    await supabase
      .from('kys_baslik')
      .update({ sorumlu_birim, updated_at: new Date().toISOString() })
      .eq('id', baslikId)
    revalidateKys(baslik.menu_id)
    return { ok: true, id: mevcut.id }
  }

  const { data: inserted, error } = await supabase
    .from('kys_belge')
    .insert({ baslik_id: baslikId, ...belgePayload })
    .select('id')
    .single()
  if (error) {
    await supabase.storage.from(KYS_BELGE_BUCKET).remove([storagePath])
    return { hata: error.message }
  }
  await writeKysBelgeAudit(supabase, {
    belgeId: inserted.id,
    islem: 'Yükle',
    ozet: `${baslik.baslik} belgesi yüklendi.`,
    sonraki: kysBelgeAuditSnapshot({ ...belgePayload, baslik: baslik.baslik }),
  })
  await supabase
    .from('kys_baslik')
    .update({ sorumlu_birim, updated_at: new Date().toISOString() })
    .eq('id', baslikId)
  revalidateKys(baslik.menu_id)
  return { ok: true, id: inserted.id }
}
