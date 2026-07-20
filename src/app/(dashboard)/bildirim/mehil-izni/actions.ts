'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import {
  bildirimTarihDb,
  bildirimTarihDbFromDate,
  bildirimTarihParse,
  bildirimTcknGecerliMi,
} from '@/lib/bildirim-belge-ortak'
import { getMemurBildirimPersonel } from '@/lib/bildirim-memur-personel'
import { mehilIzniBitisTarihiHesapla } from '@/lib/mehil-izni-belge'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

export interface MehilIzniActionSonuc {
  ok?: boolean
  hata?: string
  id?: number
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

export async function mehilIzniEkle(formData: FormData): Promise<MehilIzniActionSonuc> {
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

  const nakilDb = bildirimTarihDb(str(formData, 'nakil_tarihi'))
  if (!nakilDb) return { hata: 'Geçerli bir nakil tarihi girin.' }

  const baslangicRaw = str(formData, 'mehil_baslangic_tarihi')
  const baslangicDate = bildirimTarihParse(baslangicRaw)
  if (!baslangicDate) return { hata: 'Geçerli bir mehil başlangıç tarihi girin.' }

  const mehil_baslangic_tarihi = bildirimTarihDb(baslangicRaw)!
  const mehil_bitis_tarihi = bildirimTarihDbFromDate(mehilIzniBitisTarihiHesapla(baslangicDate))

  const memur = await getMemurBildirimPersonel(supabase, sicil)
  if (!memur) return { hata: 'Yalnızca memur statüsündeki personel için form oluşturulabilir.' }

  const tckn = String(memur.tckn ?? '').trim()
  if (!bildirimTcknGecerliMi(tckn)) {
    return { hata: 'Personel kaydında geçerli T.C. kimlik numarası bulunamadı.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from('mehil_izni_bildirimleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: memur.ad_soyad,
      tckn,
      geldigi_kurum,
      nakil_tarihi: nakilDb,
      mehil_baslangic_tarihi,
      mehil_bitis_tarihi,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'mehil-izni',
    islem: 'Ekle',
    ozet: `${memur.ad_soyad} için mehil izni bildirimi oluşturuldu.`,
    ref_table: 'mehil_izni_bildirimleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: {
      ad_soyad: memur.ad_soyad,
      tckn,
      geldigi_kurum,
      nakil_tarihi: nakilDb,
      mehil_baslangic_tarihi,
      mehil_bitis_tarihi,
    },
  })

  revalidatePath('/bildirim/mehil-izni')
  return { ok: true, id: inserted?.id as number }
}
