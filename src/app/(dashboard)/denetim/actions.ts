'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  DENETIM_AYLAR_TR,
  DENETIM_BELGE_BUCKET,
  DENETIM_BELGE_MAX_BOYUT,
  denetimBelgeMimeCoz,
  denetimBelgeUzanti,
  type DenetimKararTuru,
} from '@/lib/denetim'
import {
  denetimDonemAuditSnapshot,
  denetimKararAuditSnapshot,
  writeDenetimDonemAudit,
  writeDenetimKararAudit,
} from '@/lib/denetim-audit'

export type DenetimActionSonuc = { ok?: boolean; hata?: string; id?: number }

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

function revalidateDonem(donemId?: number) {
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

export async function denetimKararBelgeYukle(formData: FormData): Promise<DenetimActionSonuc> {
  const gate = await oturum()
  if (gate.hata || !gate.user) return { hata: gate.hata ?? 'Oturum gerekli.' }
  const { supabase, user } = gate

  const donemId = Number.parseInt(str(formData, 'donem_id'), 10)
  const ay = Number.parseInt(str(formData, 'ay'), 10)
  const karar_turu = str(formData, 'karar_turu') as DenetimKararTuru
  const sorumlu_birim = str(formData, 'sorumlu_birim') || null
  const file = formData.get('file')

  if (!Number.isFinite(donemId) || donemId <= 0) return { hata: 'Dönem gerekli.' }
  if (!Number.isFinite(ay) || ay < 1 || ay > 12) return { hata: 'Geçerli bir ay seçin.' }
  if (karar_turu !== 'encumen' && karar_turu !== 'meclis') return { hata: 'Karar türü geçersiz.' }
  if (!(file instanceof File) || file.size === 0) return { hata: 'Dosya seçin.' }
  if (file.size > DENETIM_BELGE_MAX_BOYUT) return { hata: 'Dosya en fazla 15 MB olabilir.' }

  const mime = denetimBelgeMimeCoz(file.name, file.type)
  if (!mime) return { hata: 'Yalnızca PDF, Word veya Excel yüklenebilir.' }

  const { data: donem } = await supabase.from('denetim_donem').select('id, durum, donem_adi').eq('id', donemId).maybeSingle()
  if (!donem) return { hata: 'Dönem bulunamadı.' }
  if (donem.durum === 'Kapalı') return { hata: 'Kapalı döneme belge yüklenemez.' }

  const { data: mevcut } = await supabase
    .from('denetim_karar_belge')
    .select('*')
    .eq('donem_id', donemId)
    .eq('karar_turu', karar_turu)
    .eq('ay', ay)
    .maybeSingle()

  const ext = denetimBelgeUzanti(file.name) || 'bin'
  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || `karar.${ext}`
  const storagePath = `karar/${donemId}/${karar_turu}/${ay}/${Date.now()}_${safeBase}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await supabase.storage
    .from(DENETIM_BELGE_BUCKET)
    .upload(storagePath, buffer, { contentType: mime, upsert: false })
  if (uploadErr) return { hata: uploadErr.message }

  if (mevcut) {
    const { error } = await supabase
      .from('denetim_karar_belge')
      .update({
        sorumlu_birim,
        dosya_adi: file.name,
        storage_path: storagePath,
        mime_type: mime,
        boyut_byte: file.size,
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
        dosya_adi: file.name,
        mime_type: mime,
        boyut_byte: file.size,
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
      dosya_adi: file.name,
      storage_path: storagePath,
      mime_type: mime,
      boyut_byte: file.size,
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
      dosya_adi: file.name,
      mime_type: mime,
      boyut_byte: file.size,
    }),
  })

  revalidateDonem(donemId)
  return { ok: true, id: inserted.id }
}
