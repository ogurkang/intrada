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
    return { hata: 'Başlayacağı sınıf 1. Sınıf veya 5. Sınıf olmalıdır.' }
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
