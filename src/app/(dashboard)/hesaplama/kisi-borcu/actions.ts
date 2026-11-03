'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { hesaplamaAdaylari, hesaplamaKisiGetir, type HesaplamaAday } from '@/lib/hesaplama-personel'
import {
  kisiBorcuAuditGovde,
  kisiBorcuBelgeCoz,
  kisiBorcuHesapla,
  type KisiBorcuBelge,
} from '@/lib/kisi-borcu'
import type { FaizTuru } from '@/lib/kanuni-faiz'
import { tcmbReeskontGetir } from '@/lib/tcmb-reeskont'

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
  return mesaj.includes('kisi_borcu_kayitlari') || mesaj.includes('schema cache')
}

export async function kisiBorcuAdaylari(): Promise<{ adaylar: HesaplamaAday[]; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { adaylar: [], hata: ot.hata }
  return hesaplamaAdaylari(ot.supabase, ['Memur', 'İşçi'])
}

export async function kisiBorcuKisiGetir(sicilNo: string, statu: 'Memur' | 'İşçi') {
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  return hesaplamaKisiGetir(ot.supabase, sicilNo, statu)
}

export type KisiBorcuKaydetGirdi = {
  id?: number
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  statu: string
  ana_tutar: number
  taksit_sayisi: number
  odeme_gunu: number
  odeme_baslangic: string
  faiz_baslangic: string
  faiz_turu: FaizTuru
}

export async function kisiBorcuKaydet(
  girdi: KisiBorcuKaydetGirdi,
): Promise<{ ok?: boolean; id?: number; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  const tcmb = await tcmbReeskontGetir()
  const hesap = kisiBorcuHesapla({
    anaTutar: Number(girdi.ana_tutar),
    taksitSayisi: Number(girdi.taksit_sayisi),
    odemeGunu: Number(girdi.odeme_gunu),
    odemeBaslangic: girdi.odeme_baslangic,
    faizBaslangic: girdi.faiz_baslangic,
    faizTuru: girdi.faiz_turu,
    kaynak: tcmb.kaynak,
    tcmb: tcmb.satirlar,
    kisi: {
      sicil_no: girdi.sicil_no,
      ad_soyad: girdi.ad_soyad,
      tckn: girdi.tckn,
      unvan: girdi.unvan,
      statu: girdi.statu,
    },
  })
  if ('hata' in hesap) return { hata: hesap.hata }
  const belge: KisiBorcuBelge = hesap.belge
  const satir = {
    sicil_no: belge.sicil_no,
    ad_soyad: belge.ad_soyad,
    tckn: belge.tckn || null,
    unvan: belge.unvan,
    faiz_turu: belge.faiz_turu,
    ana_tutar: belge.ana_tutar,
    taksit_sayisi: belge.taksit_sayisi,
    toplam_odeme: belge.toplam_odeme,
    belge,
    updated_at: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ot.supabase as any
  const id = Number(girdi.id)
  if (Number.isFinite(id) && id > 0) {
    const { data: mevcut, error: okuHata } = await db
      .from('kisi_borcu_kayitlari')
      .select('id, belge')
      .eq('id', id)
      .maybeSingle()
    if (okuHata) return { hata: tabloYok(okuHata.message) ? 'Kayıt tablosu henüz yok. SQL dosyasını çalıştırın.' : okuHata.message }
    if (!mevcut) return { hata: 'Kayıt bulunamadı.' }
    const { error } = await db.from('kisi_borcu_kayitlari').update(satir).eq('id', id)
    if (error) return { hata: error.message }
    const onceki = kisiBorcuBelgeCoz(mevcut.belge)
    await writePersonelAuditLogSafe(ot.supabase, {
      sicil_no: belge.sicil_no,
      modul: 'kisi-borcu',
      islem: 'Güncelle',
      ozet: `${belge.ad_soyad} için kişi borcu güncellendi.`,
      ref_table: 'kisi_borcu_kayitlari',
      ref_id: String(id),
      onceki: onceki ? kisiBorcuAuditGovde(onceki) : null,
      sonraki: kisiBorcuAuditGovde(belge),
    })
    revalidatePath('/hesaplama/kisi-borcu')
    revalidatePath(`/hesaplama/kisi-borcu/${id}`)
    return { ok: true, id }
  }

  const { data: inserted, error } = await db
    .from('kisi_borcu_kayitlari')
    .insert({ ...satir, created_by: ot.user.id, created_by_email: ot.user.email ?? null })
    .select('id')
    .single()
  if (error) return { hata: tabloYok(error.message) ? 'Kayıt tablosu henüz yok. SQL dosyasını çalıştırın.' : error.message }
  const yeniId = Number(inserted?.id)
  await writePersonelAuditLogSafe(ot.supabase, {
    sicil_no: belge.sicil_no,
    modul: 'kisi-borcu',
    islem: 'Ekle',
    ozet: `${belge.ad_soyad} için kişi borcu oluşturuldu.`,
    ref_table: 'kisi_borcu_kayitlari',
    ref_id: String(yeniId),
    sonraki: kisiBorcuAuditGovde(belge),
  })
  revalidatePath('/hesaplama/kisi-borcu')
  return { ok: true, id: yeniId }
}

export async function kisiBorcuSil(id: number): Promise<{ hata?: string }> {
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  if (!isAdminLike(ot.access)) return { hata: 'Silme yetkisi yalnızca yöneticidedir.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ot.supabase as any
  const { data: mevcut } = await db
    .from('kisi_borcu_kayitlari')
    .select('id, sicil_no, ad_soyad, belge')
    .eq('id', id)
    .maybeSingle()
  if (!mevcut) return { hata: 'Kayıt bulunamadı.' }
  const { error } = await db.from('kisi_borcu_kayitlari').delete().eq('id', id)
  if (error) return { hata: error.message }
  const belge = kisiBorcuBelgeCoz(mevcut.belge)
  await writePersonelAuditLogSafe(ot.supabase, {
    sicil_no: String(mevcut.sicil_no ?? ''),
    modul: 'kisi-borcu',
    islem: 'Sil',
    ozet: `${mevcut.ad_soyad} için kişi borcu silindi.`,
    ref_table: 'kisi_borcu_kayitlari',
    ref_id: String(id),
    onceki: belge ? kisiBorcuAuditGovde(belge) : { ad_soyad: mevcut.ad_soyad },
  })
  revalidatePath('/hesaplama/kisi-borcu')
  return {}
}
