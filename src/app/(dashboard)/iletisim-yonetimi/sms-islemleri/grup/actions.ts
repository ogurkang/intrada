'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

const SAYFA = '/iletisim-yonetimi/sms-islemleri/grup'

export interface GrupActionSonuc {
  ok?: boolean
  hata?: string
  id?: number
}

async function yetkiKontrol() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' as const }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { hata: 'Bu işlem için yetkiniz yok.' as const }
  return { supabase, user }
}

export async function grupOlustur(ad: string, aciklama?: string): Promise<GrupActionSonuc> {
  const ctx = await yetkiKontrol()
  if ('hata' in ctx) return { hata: ctx.hata }
  const { supabase } = ctx

  const temizAd = String(ad ?? '').trim()
  if (!temizAd) return { hata: 'Grup adı boş olamaz.' }

  const { data, error } = await supabase
    .from('iletisim_sms_grup')
    .insert({ ad: temizAd, aciklama: String(aciklama ?? '').trim() || null })
    .select('id')
    .single()
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: null,
    modul: 'iletisim_sms',
    islem: 'SMS Grup Oluştur',
    ozet: `«${temizAd}» grubu oluşturuldu.`,
    ref_table: 'iletisim_sms_grup',
    ref_id: String(data.id),
    onceki: null,
    sonraki: { ad: temizAd },
  })

  revalidatePath(SAYFA)
  return { ok: true, id: data.id }
}

export async function grupYenidenAdlandir(id: number, ad: string, aciklama?: string): Promise<GrupActionSonuc> {
  const ctx = await yetkiKontrol()
  if ('hata' in ctx) return { hata: ctx.hata }
  const { supabase } = ctx

  const temizAd = String(ad ?? '').trim()
  if (!temizAd) return { hata: 'Grup adı boş olamaz.' }

  const { error } = await supabase
    .from('iletisim_sms_grup')
    .update({ ad: temizAd, aciklama: String(aciklama ?? '').trim() || null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }

  revalidatePath(SAYFA)
  return { ok: true, id }
}

export async function grupSil(id: number): Promise<GrupActionSonuc> {
  const ctx = await yetkiKontrol()
  if ('hata' in ctx) return { hata: ctx.hata }
  const { supabase } = ctx

  const { data: mevcut } = await supabase.from('iletisim_sms_grup').select('ad').eq('id', id).maybeSingle()
  const { error } = await supabase.from('iletisim_sms_grup').delete().eq('id', id)
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: null,
    modul: 'iletisim_sms',
    islem: 'SMS Grup Sil',
    ozet: `«${mevcut?.ad ?? id}» grubu silindi.`,
    ref_table: 'iletisim_sms_grup',
    ref_id: String(id),
    onceki: { ad: mevcut?.ad ?? null },
    sonraki: null,
  })

  revalidatePath(SAYFA)
  return { ok: true }
}

export async function grupUyeleriKaydet(id: number, sicilNolar: string[]): Promise<GrupActionSonuc> {
  const ctx = await yetkiKontrol()
  if ('hata' in ctx) return { hata: ctx.hata }
  const { supabase } = ctx

  const temiz = [...new Set((sicilNolar ?? []).map(s => String(s).trim()).filter(Boolean))]

  const { error: silErr } = await supabase.from('iletisim_sms_grup_uye').delete().eq('grup_id', id)
  if (silErr) return { hata: silErr.message }

  if (temiz.length) {
    const { error: ekleErr } = await supabase
      .from('iletisim_sms_grup_uye')
      .insert(temiz.map(s => ({ grup_id: id, sicil_no: s })))
    if (ekleErr) return { hata: ekleErr.message }
  }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: null,
    modul: 'iletisim_sms',
    islem: 'SMS Grup Üyeleri',
    ozet: `Grup üyeleri güncellendi (${temiz.length} kişi).`,
    ref_table: 'iletisim_sms_grup',
    ref_id: String(id),
    onceki: null,
    sonraki: { uye_sayisi: temiz.length },
  })

  revalidatePath(SAYFA)
  return { ok: true }
}
