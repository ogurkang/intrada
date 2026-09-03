'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import { getBildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { okulaUyumSinifGecerliMi } from '@/lib/okula-uyum-izni-belge'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export interface OkulaUyumIzniActionSonuc {
  ok?: boolean
  hata?: string
  id?: number
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

export async function okulaUyumIzniEkle(formData: FormData): Promise<OkulaUyumIzniActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  let sicil = str(formData, 'sicil_no')
  if (!isAdminLike(access)) {
    if (access.mode === 'kullanici') sicil = String(access.sicilNo ?? '').trim()
    else return { hata: 'Bu işlem için yetkiniz yok.' }
  }
  if (!sicil) return { hata: 'Personel seçilmedi.' }

  const ogrenciAdSoyad = str(formData, 'ogrenci_ad_soyad')
  if (!ogrenciAdSoyad) return { hata: 'Öğrenci adı soyadı zorunludur.' }

  const sinif = str(formData, 'baslayacagi_sinif')
  if (!okulaUyumSinifGecerliMi(sinif)) {
    return { hata: 'Başlayacağı sınıf Okul Öncesi, 1. Sınıf veya 5. Sınıf olmalıdır.' }
  }

  const personel = await getBildirimFormPersonel(supabase, sicil)
  if (!personel) return { hata: 'Personel bulunamadı.' }

  const tckn = String(personel.tckn ?? '').trim()
  if (!bildirimTcknGecerliMi(tckn)) {
    return { hata: 'Personel kaydında geçerli T.C. kimlik numarası bulunamadı.' }
  }

  const unvan = String(personel.unvan ?? '').trim()
  const mudurluk = String(personel.mudurluk ?? '').trim()
  if (!unvan || !mudurluk) {
    return { hata: 'Personelin kadro unvan ve müdürlük bilgisi bulunamadı.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from('okula_uyum_izni_bildirimleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: personel.ad_soyad,
      tckn,
      unvan,
      mudurluk,
      ogrenci_ad_soyad: ogrenciAdSoyad,
      baslayacagi_sinif: sinif,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'okula-uyum-izni',
    islem: 'Ekle',
    ozet: `${personel.ad_soyad} için okula uyum izni talebi oluşturuldu.`,
    ref_table: 'okula_uyum_izni_bildirimleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: {
      ad_soyad: personel.ad_soyad,
      tckn,
      unvan,
      mudurluk,
      ogrenci_ad_soyad: ogrenciAdSoyad,
      baslayacagi_sinif: sinif,
    },
  })

  revalidatePath('/bildirim/okula-uyum-izni')
  return { ok: true, id: inserted?.id as number }
}

export async function okulaUyumIzniGuncelle(
  id: number,
  formData: FormData,
): Promise<OkulaUyumIzniActionSonuc> {
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mevcut } = await (supabase as any)
    .from('okula_uyum_izni_bildirimleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, unvan, mudurluk, ogrenci_ad_soyad, baslayacagi_sinif',
    )
    .eq('id', id)
    .maybeSingle()

  if (!mevcut) return { hata: 'Kayıt bulunamadı.' }

  if (!isAdminLike(access)) {
    if (access.mode !== 'kullanici') return { hata: 'Bu işlem için yetkiniz yok.' }
    if (String(access.sicilNo ?? '').trim() !== String(mevcut.sicil_no ?? '').trim()) {
      return { hata: 'Bu kaydı düzenleme yetkiniz yok.' }
    }
  }

  const sicil = String(mevcut.sicil_no ?? '').trim()
  const ogrenciAdSoyad = str(formData, 'ogrenci_ad_soyad')
  if (!ogrenciAdSoyad) return { hata: 'Öğrenci adı soyadı zorunludur.' }

  const sinif = str(formData, 'baslayacagi_sinif')
  if (!okulaUyumSinifGecerliMi(sinif)) {
    return { hata: 'Başlayacağı sınıf Okul Öncesi, 1. Sınıf veya 5. Sınıf olmalıdır.' }
  }

  const personel = await getBildirimFormPersonel(supabase, sicil)
  const unvan = String(personel?.unvan ?? mevcut.unvan ?? '').trim()
  const mudurluk = String(personel?.mudurluk ?? mevcut.mudurluk ?? '').trim()
  const adSoyad = String(personel?.ad_soyad ?? mevcut.ad_soyad ?? '').trim()
  const tckn = String(personel?.tckn ?? mevcut.tckn ?? '').trim()
  if (!unvan || !mudurluk) {
    return { hata: 'Personelin kadro unvan ve müdürlük bilgisi bulunamadı.' }
  }

  const onceki = {
    ad_soyad: mevcut.ad_soyad,
    tckn: mevcut.tckn,
    unvan: mevcut.unvan,
    mudurluk: mevcut.mudurluk,
    ogrenci_ad_soyad: mevcut.ogrenci_ad_soyad,
    baslayacagi_sinif: mevcut.baslayacagi_sinif,
  }
  const sonraki = {
    ad_soyad: adSoyad,
    tckn: tckn || null,
    unvan,
    mudurluk,
    ogrenci_ad_soyad: ogrenciAdSoyad,
    baslayacagi_sinif: sinif,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('okula_uyum_izni_bildirimleri')
    .update({
      ...sonraki,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'okula-uyum-izni',
    islem: 'Güncelle',
    ozet: `${adSoyad} için okula uyum izni talebi güncellendi.`,
    ref_table: 'okula_uyum_izni_bildirimleri',
    ref_id: String(id),
    onceki,
    sonraki,
  })

  revalidatePath('/bildirim/okula-uyum-izni')
  revalidatePath(`/bildirim/okula-uyum-izni/${id}`)
  return { ok: true, id }
}

export async function okulaUyumIzniSil(id: number): Promise<OkulaUyumIzniActionSonuc> {
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { hata: 'Silme işlemi yalnızca yöneticiler içindir.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mevcut } = await (supabase as any)
    .from('okula_uyum_izni_bildirimleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, unvan, mudurluk, ogrenci_ad_soyad, baslayacagi_sinif',
    )
    .eq('id', id)
    .maybeSingle()

  if (!mevcut) return { hata: 'Kayıt bulunamadı.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('okula_uyum_izni_bildirimleri').delete().eq('id', id)
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: String(mevcut.sicil_no ?? ''),
    modul: 'okula-uyum-izni',
    islem: 'Sil',
    ozet: `${mevcut.ad_soyad ?? 'Personel'} için okula uyum izni talebi silindi.`,
    ref_table: 'okula_uyum_izni_bildirimleri',
    ref_id: String(id),
    onceki: {
      ad_soyad: mevcut.ad_soyad,
      tckn: mevcut.tckn,
      unvan: mevcut.unvan,
      mudurluk: mevcut.mudurluk,
      ogrenci_ad_soyad: mevcut.ogrenci_ad_soyad,
      baslayacagi_sinif: mevcut.baslayacagi_sinif,
    },
  })

  revalidatePath('/bildirim/okula-uyum-izni')
  return { ok: true, id }
}
