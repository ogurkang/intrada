'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import { getBildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { pasiflestirAktifPersonelSendika } from '@/lib/personel-sendika-load'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'

export interface BildirimActionSonuc {
  ok?: boolean
  hata?: string
  id?: number
  /** Sendika istifa: aktif üyelik pasifleştirildi mi */
  sendikaPasiflestirildi?: boolean
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

async function bildirimSicilCoz(formData: FormData): Promise<{ hata?: string; sicil?: string }> {
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
  return { sicil }
}

export async function calismaBelgesiEkle(formData: FormData): Promise<BildirimActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const sicilSonuc = await bildirimSicilCoz(formData)
  if (sicilSonuc.hata || !sicilSonuc.sicil) return { hata: sicilSonuc.hata ?? 'Personel seçilmedi.' }
  const sicil = sicilSonuc.sicil

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
    .from('calisma_belgesi_bildirimleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: personel.ad_soyad,
      tckn,
      unvan,
      mudurluk,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'calisma-belgesi',
    islem: 'Ekle',
    ozet: `${personel.ad_soyad} için çalışma belgesi talebi oluşturuldu.`,
    ref_table: 'calisma_belgesi_bildirimleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: { ad_soyad: personel.ad_soyad, tckn, unvan, mudurluk },
  })

  revalidatePath('/bildirim/calisma-belgesi')
  return { ok: true, id: inserted?.id as number }
}

export async function besIptalEkle(formData: FormData): Promise<BildirimActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const sicilSonuc = await bildirimSicilCoz(formData)
  if (sicilSonuc.hata || !sicilSonuc.sicil) return { hata: sicilSonuc.hata ?? 'Personel seçilmedi.' }
  const sicil = sicilSonuc.sicil

  const personel = await getBildirimFormPersonel(supabase, sicil)
  if (!personel) return { hata: 'Personel bulunamadı.' }

  const tckn = String(personel.tckn ?? '').trim()
  if (!bildirimTcknGecerliMi(tckn)) {
    return { hata: 'Personel kaydında geçerli T.C. kimlik numarası bulunamadı.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from('bes_iptal_bildirimleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: personel.ad_soyad,
      tckn,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'bes-iptal',
    islem: 'Ekle',
    ozet: `${personel.ad_soyad} için BES iptal talebi oluşturuldu.`,
    ref_table: 'bes_iptal_bildirimleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: { ad_soyad: personel.ad_soyad, tckn },
  })

  revalidatePath('/bildirim/bes-iptal')
  return { ok: true, id: inserted?.id as number }
}

export async function sendikaIstifaEkle(formData: FormData): Promise<BildirimActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const sicilSonuc = await bildirimSicilCoz(formData)
  if (sicilSonuc.hata || !sicilSonuc.sicil) return { hata: sicilSonuc.hata ?? 'Personel seçilmedi.' }
  const sicil = sicilSonuc.sicil

  const sendika_adi = str(formData, 'sendika_adi')
  if (!sendika_adi) return { hata: 'Sendika adı zorunludur.' }

  const personel = await getBildirimFormPersonel(supabase, sicil)
  if (!personel) return { hata: 'Personel bulunamadı.' }

  const tckn = String(personel.tckn ?? '').trim()
  if (!bildirimTcknGecerliMi(tckn)) {
    return { hata: 'Personel kaydında geçerli T.C. kimlik numarası bulunamadı.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from('sendika_istifa_bildirimleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: personel.ad_soyad,
      tckn,
      sendika_adi,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  const bitisTarihi = new Date().toISOString().slice(0, 10)
  let sendikaPasiflestirildi = false
  try {
    const pasifSayisi = await pasiflestirAktifPersonelSendika(supabase, sicil, bitisTarihi)
    sendikaPasiflestirildi = pasifSayisi > 0
  } catch (e) {
    return { hata: e instanceof Error ? e.message : 'Sendika üyeliği pasifleştirilemedi.' }
  }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'sendika-istifa',
    islem: 'Ekle',
    ozet: `${personel.ad_soyad} için sendika istifa bildirimi oluşturuldu.`,
    ref_table: 'sendika_istifa_bildirimleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: { ad_soyad: personel.ad_soyad, tckn, sendika_adi },
  })

  revalidatePath('/bildirim/sendika-istifa')
  revalidatePath('/bildirim/sendika')
  revalidatePath('/personel/sendika-atama')
  await revalidatePersonelDetayPaths(sicil)
  return { ok: true, id: inserted?.id as number, sendikaPasiflestirildi }
}
