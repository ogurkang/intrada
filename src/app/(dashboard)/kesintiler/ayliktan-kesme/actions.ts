'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike, type AppAccess } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import {
  ayliktanKesmeGenelToplam,
  ayliktanKesmeHesapla,
  ayliktanKesmePaydaMi,
  type AyliktanKesmeBordro,
  type AyliktanKesmeKaynak,
  type AyliktanKesmePayda,
} from '@/lib/ayliktan-kesme-hesap'
import { ayliktanKesmeKaynakGetir } from '@/lib/ayliktan-kesme-yukle'

export type AyliktanKesmeKaydetGirdi = {
  id?: number
  sicil_no: string
  maas: number
  tabanAylik: number
  yanOdeme: number
  payda: number
}

function kesintiIzni(access: AppAccess): boolean {
  if (isAdminLike(access)) return true
  return (
    access.mode === 'kullanici' &&
    kullaniciPathAllowed('/kesintiler/ayliktan-kesme', access.sicilNo, access.menuIzinleri)
  )
}

function auditGovde(bordro: AyliktanKesmeBordro) {
  return {
    ad_soyad: bordro.kaynak.ad_soyad,
    tckn: bordro.kaynak.tckn,
    unvan: bordro.kaynak.unvan,
    mudurluk: bordro.kaynak.mudurluk,
    payda: bordro.katsayi.payda,
    maas: bordro.katsayi.maas,
    tabanAylik: bordro.katsayi.tabanAylik,
    yanOdeme: bordro.katsayi.yanOdeme,
    toplam: ayliktanKesmeGenelToplam(bordro),
    yarim_zamanli: bordro.yarim_zamanli,
  }
}

async function oturum() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' as const }
  const access = await getAppAccess(supabase, user.id)
  if (!kesintiIzni(access)) return { hata: 'Bu işlem için yetkiniz yok.' as const }
  return { supabase, user, access }
}

export async function ayliktanKesmePersonelGetir(
  sicilNo: string,
): Promise<{ kaynak?: AyliktanKesmeKaynak; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot && ot.hata) return { hata: ot.hata }
  if (!('supabase' in ot)) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' }
  return ayliktanKesmeKaynakGetir(ot.supabase, sicilNo)
}

export async function ayliktanKesmeKaydet(
  girdi: AyliktanKesmeKaydetGirdi,
): Promise<{ ok?: boolean; id?: number; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot && ot.hata) return { hata: ot.hata }
  if (!('supabase' in ot)) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' }
  const { supabase, user } = ot

  const payda = Number(girdi.payda)
  if (!ayliktanKesmePaydaMi(payda)) return { hata: 'Kesilecek ceza oranı listede yok.' }
  const maas = Number(girdi.maas)
  const tabanAylik = Number(girdi.tabanAylik)
  const yanOdeme = Number(girdi.yanOdeme)
  if (![maas, tabanAylik, yanOdeme].every(n => Number.isFinite(n) && n > 0)) {
    return { hata: 'Katsayılar sıfırdan büyük olmalıdır.' }
  }

  const kaynakSonuc = await ayliktanKesmeKaynakGetir(supabase, String(girdi.sicil_no ?? ''))
  if (kaynakSonuc.hata || !kaynakSonuc.kaynak) {
    return { hata: kaynakSonuc.hata ?? 'Personel bulunamadı.' }
  }
  const bordro = ayliktanKesmeHesapla(kaynakSonuc.kaynak, {
    maas,
    tabanAylik,
    yanOdeme,
    payda: payda as AyliktanKesmePayda,
  })
  if ('hata' in bordro) return { hata: bordro.hata }

  const satir = {
    sicil_no: bordro.kaynak.sicil_no,
    ad_soyad: bordro.kaynak.ad_soyad,
    tckn: bordro.kaynak.tckn || null,
    unvan: bordro.kaynak.unvan,
    mudurluk: bordro.kaynak.mudurluk,
    payda: bordro.katsayi.payda,
    toplam: ayliktanKesmeGenelToplam(bordro),
    yarim_zamanli: bordro.yarim_zamanli,
    bordro,
    updated_at: new Date().toISOString(),
  }

  const db = supabase as SupabaseClient
  const id = Number(girdi.id)
  if (Number.isFinite(id) && id > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mevcut } = await (db as any)
      .from('ayliktan_kesme_bordrolari')
      .select('id, sicil_no, bordro')
      .eq('id', id)
      .maybeSingle()
    if (!mevcut) return { hata: 'Kayıt bulunamadı.' }
    if (!isAdminLike(ot.access)) {
      if (ot.access.mode !== 'kullanici') return { hata: 'Bu kaydı düzenleme yetkiniz yok.' }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).from('ayliktan_kesme_bordrolari').update(satir).eq('id', id)
    if (error) return { hata: error.message }
    const oncekiBordro = mevcut.bordro as AyliktanKesmeBordro | null
    await writePersonelAuditLogSafe(supabase, {
      sicil_no: bordro.kaynak.sicil_no,
      modul: 'ayliktan-kesme',
      islem: 'Güncelle',
      ozet: `${bordro.kaynak.ad_soyad} için aylıktan kesme bordrosu güncellendi.`,
      ref_table: 'ayliktan_kesme_bordrolari',
      ref_id: String(id),
      onceki: oncekiBordro ? auditGovde(oncekiBordro) : null,
      sonraki: auditGovde(bordro),
    })
    revalidatePath('/kesintiler/ayliktan-kesme')
    revalidatePath(`/kesintiler/ayliktan-kesme/${id}`)
    return { ok: true, id }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (db as any)
    .from('ayliktan_kesme_bordrolari')
    .insert({
      ...satir,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()
  if (error) return { hata: error.message }
  const yeniId = Number(inserted?.id)
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: bordro.kaynak.sicil_no,
    modul: 'ayliktan-kesme',
    islem: 'Ekle',
    ozet: `${bordro.kaynak.ad_soyad} için aylıktan kesme bordrosu oluşturuldu.`,
    ref_table: 'ayliktan_kesme_bordrolari',
    ref_id: String(yeniId),
    sonraki: auditGovde(bordro),
  })
  revalidatePath('/kesintiler/ayliktan-kesme')
  return { ok: true, id: yeniId }
}

export async function ayliktanKesmeSil(id: number): Promise<{ hata?: string }> {
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }
  const ot = await oturum()
  if ('hata' in ot && ot.hata) return { hata: ot.hata }
  if (!('supabase' in ot)) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' }
  if (!isAdminLike(ot.access)) return { hata: 'Silme yetkisi yalnızca yöneticidedir.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mevcut } = await (ot.supabase as any)
    .from('ayliktan_kesme_bordrolari')
    .select('id, sicil_no, ad_soyad, bordro')
    .eq('id', id)
    .maybeSingle()
  if (!mevcut) return { hata: 'Kayıt bulunamadı.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ot.supabase as any).from('ayliktan_kesme_bordrolari').delete().eq('id', id)
  if (error) return { hata: error.message }

  const bordro = mevcut.bordro as AyliktanKesmeBordro | null
  await writePersonelAuditLogSafe(ot.supabase, {
    sicil_no: String(mevcut.sicil_no ?? ''),
    modul: 'ayliktan-kesme',
    islem: 'Sil',
    ozet: `${mevcut.ad_soyad} için aylıktan kesme bordrosu silindi.`,
    ref_table: 'ayliktan_kesme_bordrolari',
    ref_id: String(id),
    onceki: bordro ? auditGovde(bordro) : { ad_soyad: mevcut.ad_soyad },
  })
  revalidatePath('/kesintiler/ayliktan-kesme')
  return {}
}
