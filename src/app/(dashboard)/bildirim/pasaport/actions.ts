'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { PASAPORT_DERECE_UYARI, pasaportDereceUygunMu } from '@/lib/pasaport-belge'
import { memurStatuMu } from '@/lib/pasaport-personel'

export interface PasaportActionSonuc {
  ok?: boolean
  hata?: string
}

interface KadroSnapshot {
  kadro_id: number
  derece: string
  unvan: string
  mudurluk: string
  statu: string
}

/** Seçilen kadronun (kadro_hareketleri.id) personele aitliğini + memur + derece uygunluğunu doğrular. */
async function kadrodanSnapshot(
  supabase: SupabaseClient,
  sicil: string,
  kadroId: number,
): Promise<{ snapshot: KadroSnapshot } | { hata: string }> {
  const { data: kh } = await supabase
    .from('kadro_hareketleri')
    .select(
      'id, asil, vekil, statu, kadro_derecesi, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu',
    )
    .eq('id', kadroId)
    .maybeSingle()

  if (!kh) return { hata: 'Seçilen kadro bulunamadı.' }

  const aitMi =
    String(kh.asil ?? '').trim() === sicil || String(kh.vekil ?? '').trim() === sicil
  if (!aitMi) return { hata: 'Seçilen kadro bu personele ait değil.' }

  if (!memurStatuMu(kh.statu)) return { hata: 'Yalnızca memur statüsündeki kadro seçilebilir.' }

  const derece = String(kh.kadro_derecesi ?? '').trim()
  if (!pasaportDereceUygunMu(derece)) return { hata: PASAPORT_DERECE_UYARI }

  return {
    snapshot: {
      kadro_id: kh.id,
      derece,
      unvan: String(kh.gorev_unvani ?? kh.kadro_unvani ?? '').trim(),
      mudurluk: String(kh.gorev_mudurlugu ?? kh.kadro_mudurlugu ?? '').trim(),
      statu: String(kh.statu ?? '').trim(),
    },
  }
}

export async function pasaportEkle(formData: FormData): Promise<PasaportActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  let sicil = String(formData.get('sicil_no') ?? '').trim()
  const kadroId = parseInt(String(formData.get('kadro_id') ?? ''), 10)

  if (!isAdminLike(access)) {
    if (access.mode === 'kullanici') sicil = String(access.sicilNo ?? '').trim()
    else return { hata: 'Bu işlem için yetkiniz yok.' }
  }
  if (!sicil) return { hata: 'Personel seçilmedi.' }
  if (!Number.isFinite(kadroId)) return { hata: 'Kadro seçilmedi.' }

  const snapRes = await kadrodanSnapshot(supabase, sicil, kadroId)
  if ('hata' in snapRes) return { hata: snapRes.hata }
  const snap = snapRes.snapshot

  const { data: calisan } = await supabase
    .from('calisan')
    .select('ad_soyad, tckn')
    .eq('sicil_no', sicil)
    .maybeSingle()
  if (!calisan) return { hata: 'Personel bulunamadı.' }

  const { data: inserted, error } = await supabase
    .from('pasaport_islemleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: calisan.ad_soyad ?? sicil,
      tckn: calisan.tckn ?? null,
      kadro_id: snap.kadro_id,
      mudurluk: snap.mudurluk,
      derece: snap.derece,
      unvan: snap.unvan,
      statu: snap.statu,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'pasaport',
    islem: 'Ekle',
    ozet: `${calisan.ad_soyad ?? sicil} için yeşil pasaport başvuru formu oluşturuldu.`,
    ref_table: 'pasaport_islemleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: snap,
  })

  revalidatePath('/bildirim/pasaport')
  return { ok: true }
}

export async function pasaportGuncelle(
  id: number,
  formData: FormData,
): Promise<PasaportActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)

  const { data: kayit } = await supabase
    .from('pasaport_islemleri')
    .select('id, sicil_no, ad_soyad, kadro_id, derece, unvan, mudurluk, statu')
    .eq('id', id)
    .maybeSingle()
  if (!kayit) return { hata: 'Kayıt bulunamadı.' }

  if (!isAdminLike(access)) {
    if (
      access.mode !== 'kullanici' ||
      String(access.sicilNo ?? '').trim() !== String(kayit.sicil_no).trim()
    ) {
      return { hata: 'Bu kaydı düzenleme yetkiniz yok.' }
    }
  }

  const kadroId = parseInt(String(formData.get('kadro_id') ?? ''), 10)
  if (!Number.isFinite(kadroId)) return { hata: 'Kadro seçilmedi.' }

  const snapRes = await kadrodanSnapshot(supabase, String(kayit.sicil_no).trim(), kadroId)
  if ('hata' in snapRes) return { hata: snapRes.hata }
  const snap = snapRes.snapshot

  const onceki = {
    kadro_id: kayit.kadro_id,
    derece: kayit.derece,
    unvan: kayit.unvan,
    mudurluk: kayit.mudurluk,
    statu: kayit.statu,
  }

  const { error } = await supabase
    .from('pasaport_islemleri')
    .update({
      kadro_id: snap.kadro_id,
      mudurluk: snap.mudurluk,
      derece: snap.derece,
      unvan: snap.unvan,
      statu: snap.statu,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: String(kayit.sicil_no),
    modul: 'pasaport',
    islem: 'Güncelle',
    ozet: `${kayit.ad_soyad} için pasaport formu kadro bilgisi güncellendi.`,
    ref_table: 'pasaport_islemleri',
    ref_id: String(id),
    onceki,
    sonraki: snap,
  })

  revalidatePath('/bildirim/pasaport')
  revalidatePath(`/bildirim/pasaport/${id}`)
  return { ok: true }
}
