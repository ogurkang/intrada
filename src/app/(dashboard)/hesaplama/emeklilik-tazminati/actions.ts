'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { hesaplamaAdaylari, hesaplamaKisiGetir, type HesaplamaAday, type HesaplamaKisi } from '@/lib/hesaplama-personel'
import {
  emeklilikAuditGovde,
  emeklilikBelgeCoz,
  emeklilikTazminatiHesapla,
  type EmeklilikBelge,
  type EmeklilikStatu,
} from '@/lib/emeklilik-tazminati-hesap'

async function oturum() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı. Tekrar giriş yapın.' as const }
  const access = await getAppAccess(supabase, user.id)
  if (isAdminLike(access)) return { supabase, user, access }
  if (
    access.mode === 'kullanici' &&
    kullaniciPathAllowed('/hesaplama', access.sicilNo, access.menuIzinleri)
  ) {
    return { supabase, user, access }
  }
  return { hata: 'Bu ekrana erişim yok.' as const }
}

function tabloYok(mesaj: string): boolean {
  return mesaj.includes('emeklilik_tazminati_kayitlari') || mesaj.includes('schema cache')
}

export async function emeklilikAdaylari(): Promise<{ adaylar: HesaplamaAday[]; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { adaylar: [], hata: ot.hata }
  return hesaplamaAdaylari(ot.supabase, ['Memur', 'İşçi'])
}

export async function emeklilikKisiGetir(
  sicilNo: string,
  statu: EmeklilikStatu,
): Promise<{ kisi?: HesaplamaKisi; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  if (statu !== 'Memur' && statu !== 'İşçi') return { hata: 'Statü Memur veya İşçi olmalıdır.' }
  return hesaplamaKisiGetir(ot.supabase, sicilNo, statu)
}

export type EmeklilikKaydetGirdi = {
  id?: number
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  statu: EmeklilikStatu
  gosterge: number
  maasKatsayi: number
  damgaOrani: number
}

export async function emeklilikKaydet(girdi: EmeklilikKaydetGirdi): Promise<{ ok?: boolean; id?: number; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  if (girdi.statu !== 'Memur' && girdi.statu !== 'İşçi') return { hata: 'Statü Memur veya İşçi olmalıdır.' }
  const hesap = emeklilikTazminatiHesapla({
    statu: girdi.statu,
    gosterge: Number(girdi.gosterge),
    maasKatsayi: Number(girdi.maasKatsayi),
    damgaOrani: Number(girdi.damgaOrani),
  })
  if ('hata' in hesap) return { hata: hesap.hata }
  const belge: EmeklilikBelge = {
    sicil_no: girdi.sicil_no.trim(),
    ad_soyad: girdi.ad_soyad.trim(),
    tckn: girdi.tckn.trim(),
    unvan: girdi.unvan.trim(),
    statu: girdi.statu,
    gosterge: hesap.gosterge,
    maasKatsayi: Number(girdi.maasKatsayi),
    damgaOrani: Number(girdi.damgaOrani),
    brut: hesap.brut,
    damga: hesap.damga,
    net: hesap.net,
    dayanak: hesap.dayanak,
  }
  if (!belge.sicil_no || !belge.ad_soyad) return { hata: 'Personel seçin.' }

  const satir = {
    sicil_no: belge.sicil_no,
    ad_soyad: belge.ad_soyad,
    tckn: belge.tckn || null,
    unvan: belge.unvan,
    statu: belge.statu,
    net: belge.net,
    belge,
    updated_at: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ot.supabase as any
  const id = Number(girdi.id)
  if (Number.isFinite(id) && id > 0) {
    const { data: mevcut, error: okuHata } = await db
      .from('emeklilik_tazminati_kayitlari')
      .select('id, belge')
      .eq('id', id)
      .maybeSingle()
    if (okuHata) return { hata: tabloYok(okuHata.message) ? 'Kayıt tablosu henüz yok. SQL dosyasını çalıştırın.' : okuHata.message }
    if (!mevcut) return { hata: 'Kayıt bulunamadı.' }
    const { error } = await db.from('emeklilik_tazminati_kayitlari').update(satir).eq('id', id)
    if (error) return { hata: error.message }
    const onceki = emeklilikBelgeCoz(mevcut.belge)
    await writePersonelAuditLogSafe(ot.supabase, {
      sicil_no: belge.sicil_no,
      modul: 'emeklilik-tazminati',
      islem: 'Güncelle',
      ozet: `${belge.ad_soyad} için emeklilik tazminatı güncellendi.`,
      ref_table: 'emeklilik_tazminati_kayitlari',
      ref_id: String(id),
      onceki: onceki ? emeklilikAuditGovde(onceki) : null,
      sonraki: emeklilikAuditGovde(belge),
    })
    revalidatePath('/hesaplama/emeklilik-tazminati')
    revalidatePath(`/hesaplama/emeklilik-tazminati/${id}`)
    return { ok: true, id }
  }

  const { data: inserted, error } = await db
    .from('emeklilik_tazminati_kayitlari')
    .insert({ ...satir, created_by: ot.user.id, created_by_email: ot.user.email ?? null })
    .select('id')
    .single()
  if (error) return { hata: tabloYok(error.message) ? 'Kayıt tablosu henüz yok. SQL dosyasını çalıştırın.' : error.message }
  const yeniId = Number(inserted?.id)
  await writePersonelAuditLogSafe(ot.supabase, {
    sicil_no: belge.sicil_no,
    modul: 'emeklilik-tazminati',
    islem: 'Ekle',
    ozet: `${belge.ad_soyad} için emeklilik tazminatı oluşturuldu.`,
    ref_table: 'emeklilik_tazminati_kayitlari',
    ref_id: String(yeniId),
    sonraki: emeklilikAuditGovde(belge),
  })
  revalidatePath('/hesaplama/emeklilik-tazminati')
  return { ok: true, id: yeniId }
}

export async function emeklilikSil(id: number): Promise<{ hata?: string }> {
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  if (!isAdminLike(ot.access)) return { hata: 'Silme yetkisi yalnızca yöneticidedir.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ot.supabase as any
  const { data: mevcut } = await db.from('emeklilik_tazminati_kayitlari').select('id, sicil_no, ad_soyad, belge').eq('id', id).maybeSingle()
  if (!mevcut) return { hata: 'Kayıt bulunamadı.' }
  const { error } = await db.from('emeklilik_tazminati_kayitlari').delete().eq('id', id)
  if (error) return { hata: error.message }
  const belge = emeklilikBelgeCoz(mevcut.belge)
  await writePersonelAuditLogSafe(ot.supabase, {
    sicil_no: String(mevcut.sicil_no ?? ''),
    modul: 'emeklilik-tazminati',
    islem: 'Sil',
    ozet: `${mevcut.ad_soyad} için emeklilik tazminatı silindi.`,
    ref_table: 'emeklilik_tazminati_kayitlari',
    ref_id: String(id),
    onceki: belge ? emeklilikAuditGovde(belge) : { ad_soyad: mevcut.ad_soyad },
  })
  revalidatePath('/hesaplama/emeklilik-tazminati')
  return {}
}
