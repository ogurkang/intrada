'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { bildirimTarihDb, bildirimTarihParse } from '@/lib/bildirim-belge-ortak'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import { getBildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export interface AylikIzinActionSonuc {
  ok?: boolean
  hata?: string
  id?: number
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

export async function aylikIzinEkle(formData: FormData): Promise<AylikIzinActionSonuc> {
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

  const baslangicDb = bildirimTarihDb(str(formData, 'baslangic_tarihi'))
  if (!baslangicDb) return { hata: 'Geçerli bir başlangıç tarihi girin.' }

  const bitisDb = bildirimTarihDb(str(formData, 'bitis_tarihi'))
  if (!bitisDb) return { hata: 'Geçerli bir bitiş tarihi girin.' }

  const basDate = bildirimTarihParse(baslangicDb)
  const bitDate = bildirimTarihParse(bitisDb)
  if (basDate && bitDate && bitDate.getTime() < basDate.getTime()) {
    return { hata: 'Bitiş tarihi başlangıç tarihinden önce olamaz.' }
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
    .from('aylik_izin_bildirimleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: personel.ad_soyad,
      tckn,
      unvan,
      mudurluk,
      baslangic_tarihi: baslangicDb,
      bitis_tarihi: bitisDb,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'aylik-izin',
    islem: 'Ekle',
    ozet: `${personel.ad_soyad} için aylıksız izin talebi oluşturuldu.`,
    ref_table: 'aylik_izin_bildirimleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: {
      ad_soyad: personel.ad_soyad,
      tckn,
      unvan,
      mudurluk,
      baslangic_tarihi: baslangicDb,
      bitis_tarihi: bitisDb,
    },
  })

  revalidatePath('/bildirim/aylik-izin')
  return { ok: true, id: inserted?.id as number }
}
