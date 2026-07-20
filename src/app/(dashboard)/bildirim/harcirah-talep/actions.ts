'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { bildirimTarihDb, bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import { getMemurBildirimPersonel } from '@/lib/bildirim-memur-personel'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export interface HarcirahTalepActionSonuc {
  ok?: boolean
  hata?: string
  id?: number
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

export async function harcirahTalepEkle(formData: FormData): Promise<HarcirahTalepActionSonuc> {
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

  const geldigi_kurum = str(formData, 'geldigi_kurum')
  if (!geldigi_kurum) return { hata: 'Geldiği kurum zorunludur.' }

  const nakil_tarihi = bildirimTarihDb(str(formData, 'nakil_tarihi'))
  if (!nakil_tarihi) return { hata: 'Geçerli bir nakil tarihi girin.' }

  const memur = await getMemurBildirimPersonel(supabase, sicil)
  if (!memur) return { hata: 'Yalnızca memur statüsündeki personel için form oluşturulabilir.' }

  const tckn = String(memur.tckn ?? '').trim()
  if (!bildirimTcknGecerliMi(tckn)) {
    return { hata: 'Personel kaydında geçerli T.C. kimlik numarası bulunamadı.' }
  }

  const adres = memur.adres ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from('harcirah_talep_bildirimleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: memur.ad_soyad,
      tckn,
      adres,
      geldigi_kurum,
      nakil_tarihi,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'harcirah-talep',
    islem: 'Ekle',
    ozet: `${memur.ad_soyad} için harcırah talep bildirimi oluşturuldu.`,
    ref_table: 'harcirah_talep_bildirimleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: {
      ad_soyad: memur.ad_soyad,
      tckn,
      adres,
      geldigi_kurum,
      nakil_tarihi,
    },
  })

  revalidatePath('/bildirim/harcirah-talep')
  return { ok: true, id: inserted?.id as number }
}
