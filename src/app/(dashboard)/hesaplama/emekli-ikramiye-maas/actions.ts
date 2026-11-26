'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { hesaplamaAdaylari, type HesaplamaAday } from '@/lib/hesaplama-personel'
import { ayliktanKesmeKaynakGetir } from '@/lib/ayliktan-kesme-yukle'
import { fetchAllCalisan } from '@/lib/supabase-sayfala'
import {
  emekliIkramiyeAuditGovde,
  emekliIkramiyeBelgeCoz,
  emekliIkramiyeMaasHesapla,
  type EmekliIkramiyeBelge,
  type EmekliKanun,
} from '@/lib/emekli-ikramiye-maas-hesap'

async function oturum() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
  return mesaj.includes('emekli_ikramiye_maas_kayitlari') || mesaj.includes('schema cache')
}

export async function emekliIkramiyeAdaylari(): Promise<{ adaylar: HesaplamaAday[]; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { adaylar: [], hata: ot.hata }
  return hesaplamaAdaylari(ot.supabase, ['Memur'])
}

export type EmekliIkramiyeKisiOneri = {
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  derece: number
  kademe: number
  ekGosterge: number
  kidemYili: number
  hizmetYil: number
  hizmetAy: number
  hizmetGun: number
  uyari: string | null
}

export async function emekliIkramiyeKisiGetir(
  sicilNo: string,
): Promise<{ kisi?: EmekliIkramiyeKisiOneri; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  const sicil = sicilNo.trim()
  if (!sicil) return { hata: 'Personel seçin.' }

  const calisanRes = await fetchAllCalisan<{
    sicil_no: string
    ad_soyad: string | null
    tckn: string | null
    hizmet_suresi_yil: number | null
    hizmet_suresi_ay: number | null
    hizmet_suresi_gun: number | null
  }>(ot.supabase, 'sicil_no, ad_soyad, tckn, hizmet_suresi_yil, hizmet_suresi_ay, hizmet_suresi_gun')
  if (calisanRes.error) return { hata: calisanRes.error }
  const cal = calisanRes.data.find(c => String(c.sicil_no).trim() === sicil)
  if (!cal) return { hata: 'Personel kaydı bulunamadı.' }

  const hizmetYil = Number(cal.hizmet_suresi_yil ?? 0) || 0
  const hizmetAy = Number(cal.hizmet_suresi_ay ?? 0) || 0
  const hizmetGun = Number(cal.hizmet_suresi_gun ?? 0) || 0
  const kisi: EmekliIkramiyeKisiOneri = {
    sicil_no: sicil,
    ad_soyad: String(cal.ad_soyad ?? '').trim() || sicil,
    tckn: String(cal.tckn ?? '').trim(),
    unvan: '',
    derece: 1,
    kademe: 1,
    ekGosterge: 0,
    kidemYili: Math.min(25, hizmetYil),
    hizmetYil,
    hizmetAy,
    hizmetGun,
    uyari: null,
  }

  const kaynak = await ayliktanKesmeKaynakGetir(ot.supabase, sicil)
  if (!kaynak.kaynak) {
    kisi.uyari = kaynak.hata ?? 'Derece/kademe/ek gösterge terfiden okunamadı; elle girin.'
    return { kisi }
  }
  kisi.unvan = kaynak.kaynak.unvan
  kisi.derece = kaynak.kaynak.derece
  kisi.kademe = kaynak.kaynak.kademe
  kisi.ekGosterge = kaynak.kaynak.ek_gosterge
  kisi.kidemYili = Math.min(25, kaynak.kaynak.kidem_yili || hizmetYil)
  return { kisi }
}

export type EmekliIkramiyeKaydetGirdi = {
  id?: number
  sicil_no: string
  ad_soyad: string
  tckn: string
  unvan: string
  kanun: EmekliKanun
  derece: number
  kademe: number
  ekGosterge: number
  kadTazEkGosterge: number
  kidemYili: number
  hizmetYil: number
  hizmetAy: number
  hizmetGun: number
  ikramiyeYili: number
  makamTemsilGorevGosterge: number
  donemId: string
  pay: number
  payda: number
}

export async function emekliIkramiyeKaydet(
  girdi: EmekliIkramiyeKaydetGirdi,
): Promise<{ ok?: boolean; id?: number; hata?: string }> {
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  if (girdi.kanun !== '5434' && girdi.kanun !== '5510') return { hata: 'Kanun 5434 veya 5510 olmalıdır.' }

  const hesap = emekliIkramiyeMaasHesapla({
    kanun: girdi.kanun,
    derece: Number(girdi.derece),
    kademe: Number(girdi.kademe),
    ekGosterge: Number(girdi.ekGosterge),
    kadTazEkGosterge: Number(girdi.kadTazEkGosterge),
    kidemYili: Number(girdi.kidemYili),
    hizmetYil: Number(girdi.hizmetYil),
    hizmetAy: Number(girdi.hizmetAy),
    hizmetGun: Number(girdi.hizmetGun),
    ikramiyeYili: Number(girdi.ikramiyeYili),
    makamTemsilGorevGosterge: Number(girdi.makamTemsilGorevGosterge),
    donemId: girdi.donemId,
    pay: Number(girdi.pay) || 1,
    payda: Number(girdi.payda) || 1,
  })
  if ('hata' in hesap) return { hata: hesap.hata }

  const belge: EmekliIkramiyeBelge = {
    sicil_no: girdi.sicil_no.trim(),
    ad_soyad: girdi.ad_soyad.trim(),
    tckn: girdi.tckn.trim(),
    unvan: girdi.unvan.trim(),
    kanun: girdi.kanun,
    derece: Number(girdi.derece),
    kademe: Number(girdi.kademe),
    ekGosterge: Number(girdi.ekGosterge),
    kadTazEkGosterge: Number(girdi.kadTazEkGosterge),
    kidemYili: Number(girdi.kidemYili),
    hizmetYil: Number(girdi.hizmetYil),
    hizmetAy: Number(girdi.hizmetAy),
    hizmetGun: Number(girdi.hizmetGun),
    ikramiyeYili: hesap.ikramiyeYili,
    makamTemsilGorevGosterge: Number(girdi.makamTemsilGorevGosterge),
    donemId: girdi.donemId,
    pay: Number(girdi.pay) || 1,
    payda: Number(girdi.payda) || 1,
    gosterge: hesap.gosterge,
    tazminatOrani: hesap.tazminatOrani,
    baglamaOrani: hesap.baglamaOrani,
    matrah: hesap.matrah,
    ikramiye: hesap.ikramiye,
    maas5434: hesap.maas5434,
    maasUyari: hesap.maasUyari,
    matrahKalemler: hesap.matrahKalemler,
    uyari: hesap.uyari,
    donemEtiket: hesap.donem.etiket,
  }
  if (!belge.sicil_no || !belge.ad_soyad) return { hata: 'Personel seçin.' }

  const satir = {
    sicil_no: belge.sicil_no,
    ad_soyad: belge.ad_soyad,
    tckn: belge.tckn || null,
    unvan: belge.unvan,
    kanun: belge.kanun,
    ikramiye: belge.ikramiye,
    maas_5434: belge.maas5434,
    belge,
    updated_at: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ot.supabase as any
  const id = Number(girdi.id)
  if (Number.isFinite(id) && id > 0) {
    const { data: mevcut, error: okuHata } = await db
      .from('emekli_ikramiye_maas_kayitlari')
      .select('id, belge')
      .eq('id', id)
      .maybeSingle()
    if (okuHata) {
      return { hata: tabloYok(okuHata.message) ? 'Kayıt tablosu henüz yok. SQL dosyasını çalıştırın.' : okuHata.message }
    }
    if (!mevcut) return { hata: 'Kayıt bulunamadı.' }
    const { error } = await db.from('emekli_ikramiye_maas_kayitlari').update(satir).eq('id', id)
    if (error) return { hata: error.message }
    const onceki = emekliIkramiyeBelgeCoz(mevcut.belge)
    await writePersonelAuditLogSafe(ot.supabase, {
      sicil_no: belge.sicil_no,
      modul: 'emekli-ikramiye-maas',
      islem: 'Güncelle',
      ozet: `${belge.ad_soyad} için 4/C ikramiye-maaş güncellendi.`,
      ref_table: 'emekli_ikramiye_maas_kayitlari',
      ref_id: String(id),
      onceki: onceki ? emekliIkramiyeAuditGovde(onceki) : null,
      sonraki: emekliIkramiyeAuditGovde(belge),
    })
    revalidatePath('/hesaplama/emekli-ikramiye-maas')
    revalidatePath(`/hesaplama/emekli-ikramiye-maas/${id}`)
    return { ok: true, id }
  }

  const { data: inserted, error } = await db
    .from('emekli_ikramiye_maas_kayitlari')
    .insert({ ...satir, created_by: ot.user.id, created_by_email: ot.user.email ?? null })
    .select('id')
    .single()
  if (error) {
    return { hata: tabloYok(error.message) ? 'Kayıt tablosu henüz yok. SQL dosyasını çalıştırın.' : error.message }
  }
  const yeniId = Number(inserted?.id)
  await writePersonelAuditLogSafe(ot.supabase, {
    sicil_no: belge.sicil_no,
    modul: 'emekli-ikramiye-maas',
    islem: 'Ekle',
    ozet: `${belge.ad_soyad} için 4/C ikramiye-maaş oluşturuldu.`,
    ref_table: 'emekli_ikramiye_maas_kayitlari',
    ref_id: String(yeniId),
    sonraki: emekliIkramiyeAuditGovde(belge),
  })
  revalidatePath('/hesaplama/emekli-ikramiye-maas')
  return { ok: true, id: yeniId }
}

export async function emekliIkramiyeSil(id: number): Promise<{ hata?: string }> {
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }
  const ot = await oturum()
  if ('hata' in ot) return { hata: ot.hata }
  if (!isAdminLike(ot.access)) return { hata: 'Silme yetkisi yalnızca yöneticidedir.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = ot.supabase as any
  const { data: mevcut } = await db
    .from('emekli_ikramiye_maas_kayitlari')
    .select('id, sicil_no, ad_soyad, belge')
    .eq('id', id)
    .maybeSingle()
  if (!mevcut) return { hata: 'Kayıt bulunamadı.' }
  const { error } = await db.from('emekli_ikramiye_maas_kayitlari').delete().eq('id', id)
  if (error) return { hata: error.message }
  const belge = emekliIkramiyeBelgeCoz(mevcut.belge)
  await writePersonelAuditLogSafe(ot.supabase, {
    sicil_no: String(mevcut.sicil_no ?? ''),
    modul: 'emekli-ikramiye-maas',
    islem: 'Sil',
    ozet: `${mevcut.ad_soyad} için 4/C ikramiye-maaş silindi.`,
    ref_table: 'emekli_ikramiye_maas_kayitlari',
    ref_id: String(id),
    onceki: belge ? emekliIkramiyeAuditGovde(belge) : { ad_soyad: mevcut.ad_soyad },
  })
  revalidatePath('/hesaplama/emekli-ikramiye-maas')
  return {}
}
