'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { hesaplamaAdaylari, hesaplamaKisiGetir, type HesaplamaAday, type HesaplamaKisi } from '@/lib/hesaplama-personel'
import {
  ibanUygun,
  olumAuditGovde,
  olumBelgeCoz,
  OLUM_YARDIMI_DAYANAK,
  olumYardimiHesapla,
  tcknUygun,
  type OlumBelge,
  type OlumVaris,
} from '@/lib/olum-yardimi-hesap'

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
  return mesaj.includes('olum_yardimi_kayitlari') || mesaj.includes('schema cache')
}

export async function olumAdaylari(): Promise<{ adaylar: HesaplamaAday[]; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { adaylar: [], hata: ot.hata }
  return hesaplamaAdaylari(ot.supabase, ['Memur'])
}

export async function olumKisiGetir(sicilNo: string): Promise<{ kisi?: HesaplamaKisi; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  return hesaplamaKisiGetir(ot.supabase, sicilNo, 'Memur')
}

export type OlumKaydetGirdi = {
  id?: number
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  gosterge: number
  maasKatsayi: number
  varisler: { tckn: string; adSoyad: string; iban: string }[]
}

export async function olumKaydet(girdi: OlumKaydetGirdi): Promise<{ ok?: boolean; id?: number; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  const varisler: Omit<OlumVaris, 'tutar'>[] = []
  for (const v of girdi.varisler ?? []) {
    const tckn = String(v.tckn ?? '').trim()
    const adSoyad = String(v.adSoyad ?? '').trim()
    const iban = String(v.iban ?? '').replace(/\s/g, '').toUpperCase()
    if (!tckn && !adSoyad && !iban) continue
    if (!tcknUygun(tckn)) return { hata: 'Varis TCKN 11 haneli olmalıdır.' }
    if (adSoyad.length < 3) return { hata: 'Varis adı soyadı eksik.' }
    if (!ibanUygun(iban)) return { hata: 'Varis IBAN, TR ile başlayan 26 karakter olmalıdır.' }
    varisler.push({ tckn, adSoyad, iban })
  }
  const hesap = olumYardimiHesapla({
    gosterge: Number(girdi.gosterge),
    maasKatsayi: Number(girdi.maasKatsayi),
    varisSayisi: varisler.length,
  })
  if ('hata' in hesap) return { hata: hesap.hata }
  const belge: OlumBelge = {
    sicil_no: girdi.sicil_no.trim(),
    ad_soyad: girdi.ad_soyad.trim(),
    tckn: girdi.tckn.trim(),
    unvan: girdi.unvan.trim(),
    gosterge: hesap.gosterge,
    maasKatsayi: Number(girdi.maasKatsayi),
    aylik: hesap.aylik,
    kat: hesap.kat,
    toplam: hesap.toplam,
    varisler: varisler.map((v, i) => ({ ...v, tutar: hesap.paylar[i] ?? 0 })),
    dayanak: OLUM_YARDIMI_DAYANAK,
  }
  if (!belge.sicil_no || !belge.ad_soyad) return { hata: 'Personel seçin.' }

  const satir = {
    sicil_no: belge.sicil_no,
    ad_soyad: belge.ad_soyad,
    tckn: belge.tckn || null,
    unvan: belge.unvan,
    toplam: belge.toplam,
    varis_sayisi: belge.varisler.length,
    belge,
    updated_at: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ot.supabase as any
  const id = Number(girdi.id)
  if (Number.isFinite(id) && id > 0) {
    const { data: mevcut, error: okuHata } = await db.from('olum_yardimi_kayitlari').select('id, belge').eq('id', id).maybeSingle()
    if (okuHata) return { hata: tabloYok(okuHata.message) ? 'Kayıt tablosu henüz yok. SQL dosyasını çalıştırın.' : okuHata.message }
    if (!mevcut) return { hata: 'Kayıt bulunamadı.' }
    const { error } = await db.from('olum_yardimi_kayitlari').update(satir).eq('id', id)
    if (error) return { hata: error.message }
    const onceki = olumBelgeCoz(mevcut.belge)
    await writePersonelAuditLogSafe(ot.supabase, {
      sicil_no: belge.sicil_no,
      modul: 'olum-yardimi',
      islem: 'Güncelle',
      ozet: `${belge.ad_soyad} için ölüm yardımı güncellendi.`,
      ref_table: 'olum_yardimi_kayitlari',
      ref_id: String(id),
      onceki: onceki ? olumAuditGovde(onceki) : null,
      sonraki: olumAuditGovde(belge),
    })
    revalidatePath('/hesaplama/olum-yardimi')
    revalidatePath(`/hesaplama/olum-yardimi/${id}`)
    return { ok: true, id }
  }

  const { data: inserted, error } = await db
    .from('olum_yardimi_kayitlari')
    .insert({ ...satir, created_by: ot.user.id, created_by_email: ot.user.email ?? null })
    .select('id')
    .single()
  if (error) return { hata: tabloYok(error.message) ? 'Kayıt tablosu henüz yok. SQL dosyasını çalıştırın.' : error.message }
  const yeniId = Number(inserted?.id)
  await writePersonelAuditLogSafe(ot.supabase, {
    sicil_no: belge.sicil_no,
    modul: 'olum-yardimi',
    islem: 'Ekle',
    ozet: `${belge.ad_soyad} için ölüm yardımı oluşturuldu.`,
    ref_table: 'olum_yardimi_kayitlari',
    ref_id: String(yeniId),
    sonraki: olumAuditGovde(belge),
  })
  revalidatePath('/hesaplama/olum-yardimi')
  return { ok: true, id: yeniId }
}

export async function olumSil(id: number): Promise<{ hata?: string }> {
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  if (!isAdminLike(ot.access)) return { hata: 'Silme yetkisi yalnızca yöneticidedir.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ot.supabase as any
  const { data: mevcut } = await db.from('olum_yardimi_kayitlari').select('id, sicil_no, ad_soyad, belge').eq('id', id).maybeSingle()
  if (!mevcut) return { hata: 'Kayıt bulunamadı.' }
  const { error } = await db.from('olum_yardimi_kayitlari').delete().eq('id', id)
  if (error) return { hata: error.message }
  const belge = olumBelgeCoz(mevcut.belge)
  await writePersonelAuditLogSafe(ot.supabase, {
    sicil_no: String(mevcut.sicil_no ?? ''),
    modul: 'olum-yardimi',
    islem: 'Sil',
    ozet: `${mevcut.ad_soyad} için ölüm yardımı silindi.`,
    ref_table: 'olum_yardimi_kayitlari',
    ref_id: String(id),
    onceki: belge ? olumAuditGovde(belge) : { ad_soyad: mevcut.ad_soyad },
  })
  revalidatePath('/hesaplama/olum-yardimi')
  return {}
}
