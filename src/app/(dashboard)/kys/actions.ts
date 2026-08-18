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

const TUM_BELEDIYE = 'Tüm Belediye'

function sorumluBirimleriAyr(raw: string | null | undefined): string[] {
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split('|')
        .map(v => v.trim())
        .filter(Boolean),
    ),
  )
}

async function sorumluBirimDogrulaVeNormalize(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raw: string | null | undefined,
): Promise<{ normalized: string | null; hata?: string }> {
  const birimler = sorumluBirimleriAyr(raw)
  if (birimler.length === 0) return { normalized: null }
  if (birimler.includes(TUM_BELEDIYE)) return { normalized: TUM_BELEDIYE }

  const { data: aktif } = await supabase
    .from('tanim_mudurluk')
    .select('mudurluk_adi')
    .eq('aktif', true)
    .in('mudurluk_adi', birimler)

  const aktifSet = new Set((aktif ?? []).map(a => a.mudurluk_adi))
  const gecersiz = birimler.find(b => !aktifSet.has(b))
  if (gecersiz) return { normalized: null, hata: 'Aktif sorumlu birimleri seçin.' }

  return { normalized: birimler.join(' | ') }
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

export type KysBulkMenuSatir = { baslik: string; aciklama?: string }
export type KysBulkMenuSonuc = { ok?: boolean; hata?: string; hatalar?: string[] }

export async function kysAnaAltMenuTopluEkle(satirlar: KysBulkMenuSatir[]): Promise<KysBulkMenuSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const gecerli = satirlar.filter(s => s.baslik.trim().length >= 2)
  if (gecerli.length === 0) return { hata: 'En az bir geçerli menü adı gerekli.' }

  const { data: maxRow } = await supabase
    .from('kys_menu')
    .select('sira_no')
    .is('parent_id', null)
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  let baseSira = (maxRow?.sira_no ?? 0) + 1
  const hatalar: string[] = []

  for (const satir of gecerli) {
    const baslik = satir.baslik.trim()
    const aciklama = satir.aciklama?.trim() || null
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
        sira_no: baseSira++,
        created_by: user.id,
        created_by_email: user.email ?? null,
      })
      .select('id')
      .single()
    if (error) {
      hatalar.push(error.code === '23505' ? `"${baslik}" zaten var.` : error.message)
      continue
    }
    await writeKysMenuAudit(supabase, {
      menuId: inserted.id,
      islem: 'Ekle',
      ozet: `${baslik} ana alt menüsü eklendi.`,
      sonraki: { baslik, aciklama, sayfa_turu: 'hub' },
    })
    revalidateKys(inserted.id)
  }

  revalidateKys()
  if (hatalar.length > 0 && hatalar.length === gecerli.length) return { hata: hatalar.join('; ') }
  return { ok: true, hatalar: hatalar.length > 0 ? hatalar : undefined }
}

export async function kysAltMenuTopluEkle(
  parentId: number,
  satirlar: KysBulkMenuSatir[],
): Promise<KysBulkMenuSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const { data: parent } = await supabase
    .from('kys_menu')
    .select('id, parent_id, baslik')
    .eq('id', parentId)
    .maybeSingle()
  if (!parent) return { hata: 'Ana alt menü bulunamadı.' }
  if (parent.parent_id != null) return { hata: 'Alt menü yalnızca ana alt menü altına eklenebilir.' }

  const gecerli = satirlar.filter(s => s.baslik.trim().length >= 2)
  if (gecerli.length === 0) return { hata: 'En az bir geçerli menü adı gerekli.' }

  const { data: maxRow } = await supabase
    .from('kys_menu')
    .select('sira_no')
    .eq('parent_id', parentId)
    .order('sira_no', { ascending: false })
    .limit(1)
    .maybeSingle()

  let baseSira = (maxRow?.sira_no ?? 0) + 1
  const hatalar: string[] = []

  for (const satir of gecerli) {
    const baslik = satir.baslik.trim()
    const aciklama = satir.aciklama?.trim() || null
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
        sira_no: baseSira++,
        created_by: user.id,
        created_by_email: user.email ?? null,
      })
      .select('id')
      .single()
    if (error) {
      hatalar.push(error.code === '23505' ? `"${baslik}" zaten var.` : error.message)
      continue
    }
    await writeKysMenuAudit(supabase, {
      menuId: inserted.id,
      islem: 'Ekle',
      ozet: `${parent.baslik} altına ${baslik} alt menüsü eklendi.`,
      sonraki: { baslik, aciklama, sayfa_turu: 'belge' },
    })
    revalidateKys(parentId)
    revalidateKys(inserted.id)
  }

  revalidateKys()
  if (hatalar.length > 0 && hatalar.length === gecerli.length) return { hata: hatalar.join('; ') }
  return { ok: true, hatalar: hatalar.length > 0 ? hatalar : undefined }
}

export async function kysBaslikEkle(formData: FormData): Promise<KysActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const menuId = Number.parseInt(str(formData, 'menu_id'), 10)
  const baslik = str(formData, 'baslik')
  const aciklama = str(formData, 'aciklama') || null
  const kod = str(formData, 'kod') || null
  const sorumlu_birim_raw = str(formData, 'sorumlu_birim') || null
  if (!Number.isFinite(menuId) || menuId <= 0) return { hata: 'Alt menü gerekli.' }
  if (baslik.length < 2) return { hata: 'Başlık en az 2 karakter olmalıdır.' }
  if (baslik.length > 120) return { hata: 'Başlık en fazla 120 karakter olabilir.' }

  const { data: menu } = await supabase
    .from('kys_menu')
    .select('id, parent_id, baslik, sayfa_turu')
    .eq('id', menuId)
    .maybeSingle()
  if (!menu) return { hata: 'Menü bulunamadı.' }
  // Başlık: hem alt menülere (belge/parent_id dolu) hem de ana alt menülere (hub) eklenebilir
  if (menu.sayfa_turu !== 'belge' && menu.sayfa_turu !== 'hub') {
    return { hata: 'Geçersiz menü türü.' }
  }

  const birimKontrol = await sorumluBirimDogrulaVeNormalize(supabase, sorumlu_birim_raw)
  if (birimKontrol.hata) return { hata: birimKontrol.hata }
  const sorumlu_birim = birimKontrol.normalized

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
    kod,
    sorumlu_birim,
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
    sonraki: { baslik, aciklama, kod, sorumlu_birim, sira_no: payload.sira_no },
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
  const kod = str(formData, 'kod') || null
  const sorumlu_birim_raw = str(formData, 'sorumlu_birim') || null
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Başlık bulunamadı.' }
  if (baslik.length < 2) return { hata: 'Başlık en az 2 karakter olmalıdır.' }
  if (baslik.length > 120) return { hata: 'Başlık en fazla 120 karakter olabilir.' }

  const { data: onceki } = await supabase
    .from('kys_baslik')
    .select('id, menu_id, baslik, aciklama, kod, sorumlu_birim')
    .eq('id', id)
    .maybeSingle()
  if (!onceki) return { hata: 'Başlık bulunamadı.' }

  const birimKontrol = await sorumluBirimDogrulaVeNormalize(supabase, sorumlu_birim_raw)
  if (birimKontrol.hata) return { hata: birimKontrol.hata }
  const sorumlu_birim = birimKontrol.normalized

  const updated_at = new Date().toISOString()
  const { error } = await supabase
    .from('kys_baslik')
    .update({ baslik, aciklama, kod, sorumlu_birim, updated_at })
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
      kod: onceki.kod,
      sorumlu_birim: onceki.sorumlu_birim,
    },
    sonraki: { baslik, aciklama, kod, sorumlu_birim },
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
  const sorumlu_birim_raw = str(formData, 'sorumlu_birim') || null
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

  const birimKontrol = await sorumluBirimDogrulaVeNormalize(supabase, sorumlu_birim_raw)
  if (birimKontrol.hata) return { hata: birimKontrol.hata }
  const sorumlu_birim = birimKontrol.normalized

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
