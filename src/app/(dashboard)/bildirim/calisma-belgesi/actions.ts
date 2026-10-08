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

  const { data: aktifUyelik, error: aktifUyelikHata } = await supabase
    .from('personel_sendika')
    .select('id')
    .eq('sicil_no', sicil)
    .eq('aktif', true)
    .limit(1)
  if (aktifUyelikHata) return { hata: aktifUyelikHata.message }
  if (!aktifUyelik?.length) {
    return { hata: 'Aktif sendika üyeliği olmayan personel için istifa dilekçesi oluşturulamaz.' }
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

async function istifaKaydiGetir(id: number) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('sendika_istifa_bildirimleri')
    .select('id, sicil_no, ad_soyad, tckn, sendika_adi, created_at')
    .eq('id', id)
    .maybeSingle()
  return { supabase, kayit: data as {
    id: number
    sicil_no: string
    ad_soyad: string
    tckn: string | null
    sendika_adi: string
    created_at: string
  } | null }
}

function bugunIstanbulIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function isoTakvimGecerli(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return false
  const y = Number(m[1])
  const a = Number(m[2])
  const g = Number(m[3])
  const d = new Date(Date.UTC(y, a - 1, g))
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === a && d.getUTCDate() === g
}

function utcGun(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function ggFromIso(iso: string): string {
  const [y, a, g] = iso.split('-')
  if (!y || !a || !g) return iso
  return `${g}.${a}.${y}`
}

export async function sendikaIstifaGuncelle(
  id: number,
  tarihIso: string,
): Promise<{ hata?: string }> {
  const { supabase, kayit } = await istifaKaydiGetir(id)
  if (!kayit) return { hata: 'Kayıt bulunamadı.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }
  const access = await getAppAccess(supabase, user.id)
  const kendi =
    access.mode === 'kullanici' && access.sicilNo.trim() === String(kayit.sicil_no).trim()
  if (!isAdminLike(access) && !kendi) return { hata: 'Bu işlem için yetkiniz yok.' }

  const yeniGun = tarihIso.trim()
  if (!isoTakvimGecerli(yeniGun)) return { hata: 'İstifa tarihi seçilmelidir.' }
  if (yeniGun > bugunIstanbulIso()) return { hata: 'İstifa tarihi bugünden sonra olamaz.' }

  const eskiGun = utcGun(kayit.created_at)
  const sicil = String(kayit.sicil_no).trim()
  let tasinanIdler: number[] = []

  if (eskiGun !== yeniGun) {
    const { data: kapanan, error: kapananHata } = await supabase
      .from('personel_sendika')
      .select('id, sicil_no, sendika_id, baslangic_tarihi, bitis_tarihi, aktif')
      .eq('sicil_no', sicil)
      .eq('aktif', false)
      .eq('bitis_tarihi', eskiGun)
    if (kapananHata) return { hata: kapananHata.message }

    const erken = (kapanan ?? []).find(r => String(r.baslangic_tarihi).slice(0, 10) > yeniGun)
    if (erken) return { hata: 'İstifa tarihi üyelik başlangıcından önce olamaz.' }

    if (kapanan && kapanan.length > 0) {
      const { error } = await supabase
        .from('personel_sendika')
        .update({ bitis_tarihi: yeniGun })
        .in(
          'id',
          kapanan.map(r => r.id),
        )
      if (error) return { hata: error.message }
      tasinanIdler = kapanan.map(r => r.id)
      for (const row of kapanan) {
        await writePersonelAuditLogSafe(supabase, {
          sicil_no: sicil,
          modul: 'sendika',
          islem: 'Güncelle',
          ozet: `Sendika istifa tarihi ${ggFromIso(eskiGun)} iken ${ggFromIso(yeniGun)} yapıldı; üyelik bitişi buna çekildi.`,
          ref_table: 'personel_sendika',
          ref_id: String(row.id),
          onceki: row,
          sonraki: { ...row, bitis_tarihi: yeniGun },
        })
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('sendika_istifa_bildirimleri')
    .update({ created_at: `${yeniGun}T12:00:00.000Z` })
    .eq('id', id)
  if (error) {
    if (tasinanIdler.length > 0) {
      await supabase.from('personel_sendika').update({ bitis_tarihi: eskiGun }).in('id', tasinanIdler)
    }
    return { hata: error.message }
  }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'sendika-istifa',
    islem: 'Güncelle',
    ozet: `${kayit.ad_soyad} sendika istifa bildirimi güncellendi.`,
    ref_table: 'sendika_istifa_bildirimleri',
    ref_id: String(id),
    onceki: {
      ad_soyad: kayit.ad_soyad,
      tckn: kayit.tckn,
      sendika_adi: kayit.sendika_adi,
      istifa_tarihi: ggFromIso(eskiGun),
    },
    sonraki: {
      ad_soyad: kayit.ad_soyad,
      tckn: kayit.tckn,
      sendika_adi: kayit.sendika_adi,
      istifa_tarihi: ggFromIso(yeniGun),
    },
  })

  revalidatePath('/bildirim/sendika-istifa')
  revalidatePath(`/bildirim/sendika-istifa/${id}`)
  if (tasinanIdler.length > 0) {
    revalidatePath('/bildirim/sendika')
    revalidatePath('/personel/sendika-atama')
    await revalidatePersonelDetayPaths(sicil)
  }
  return {}
}

export async function sendikaIstifaSil(
  id: number,
): Promise<{ hata?: string; uyelikGeriAlindi?: boolean }> {
  const { supabase, kayit } = await istifaKaydiGetir(id)
  if (!kayit) return { hata: 'Kayıt bulunamadı.' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { hata: 'Silme yetkisi yalnızca yönetici hesaplarındadır.' }

  const sicil = String(kayit.sicil_no).trim()
  const gun = utcGun(kayit.created_at)

  const { data: aktifler, error: aktifHata } = await supabase
    .from('personel_sendika')
    .select('id')
    .eq('sicil_no', sicil)
    .eq('aktif', true)
    .limit(1)
  if (aktifHata) return { hata: aktifHata.message }
  const { data: kapanan, error: kapananHata } = await supabase
    .from('personel_sendika')
    .select('id, sicil_no, sendika_id, baslangic_tarihi, bitis_tarihi, aktif')
    .eq('sicil_no', sicil)
    .eq('aktif', false)
    .eq('bitis_tarihi', gun)
  if (kapananHata) return { hata: kapananHata.message }
  if ((aktifler?.length ?? 0) > 0 && (kapanan?.length ?? 0) > 0) {
    return {
      hata: 'Bu işlem ile eski sendika üyeliği aktif olacağından ve aktif bir sendika üyeliği olduğundan silme işlemi yapılamaz.',
    }
  }

  const uyelikGeriAlindi = (kapanan?.length ?? 0) > 0
  if (uyelikGeriAlindi && kapanan) {
    const { error } = await supabase
      .from('personel_sendika')
      .update({ aktif: true, bitis_tarihi: null })
      .in(
        'id',
        kapanan.map(r => r.id),
      )
    if (error) return { hata: error.message }
    for (const row of kapanan) {
      await writePersonelAuditLogSafe(supabase, {
        sicil_no: sicil,
        modul: 'sendika',
        islem: 'Güncelle',
        ozet: 'Sendika istifa kaydı silindiği için üyelik yeniden açıldı.',
        ref_table: 'personel_sendika',
        ref_id: String(row.id),
        onceki: row,
        sonraki: { ...row, aktif: true, bitis_tarihi: null },
      })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: silHata } = await (supabase as any).from('sendika_istifa_bildirimleri').delete().eq('id', id)
  if (silHata) {
    if (uyelikGeriAlindi && kapanan) {
      await supabase
        .from('personel_sendika')
        .update({ aktif: false, bitis_tarihi: gun })
        .in(
          'id',
          kapanan.map(r => r.id),
        )
    }
    return { hata: silHata.message }
  }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'sendika-istifa',
    islem: 'Sil',
    ozet: `${kayit.ad_soyad} sendika istifa bildirimi silindi.`,
    ref_table: 'sendika_istifa_bildirimleri',
    ref_id: String(id),
    onceki: { ad_soyad: kayit.ad_soyad, tckn: kayit.tckn, sendika_adi: kayit.sendika_adi },
  })

  revalidatePath('/bildirim/sendika-istifa')
  revalidatePath('/bildirim/sendika')
  revalidatePath('/personel/sendika-atama')
  await revalidatePersonelDetayPaths(sicil)
  return { uyelikGeriAlindi }
}
