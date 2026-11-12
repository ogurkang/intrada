'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { bildirimTarihDb, bildirimTarihParse } from '@/lib/bildirim-belge-ortak'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import { getBildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import {
  yzcCalismaProgramiKaydet,
  yzcCalismaProgramiNormalize,
  yzcProgramDogrula,
} from '@/lib/yari-zamanli-calisma-belge'

export interface YzcActionSonuc {
  ok?: boolean
  hata?: string
  id?: number
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

export async function yariZamanliCalismaEkle(formData: FormData): Promise<YzcActionSonuc> {
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

  const cocukDb = bildirimTarihDb(str(formData, 'cocuk_dogum_tarihi'))
  if (!cocukDb) return { hata: 'Geçerli bir doğum tarihi girin.' }

  const baslangicDb = bildirimTarihDb(str(formData, 'yari_zamanli_baslangic_tarihi'))
  if (!baslangicDb) return { hata: 'Geçerli bir yarı zamanlı başlangıç tarihi girin.' }

  const donusDb = bildirimTarihDb(str(formData, 'normal_zamanli_donus_tarihi'))
  if (!donusDb) return { hata: 'Geçerli bir normal zamanlı dönüş tarihi girin.' }

  const basDate = bildirimTarihParse(baslangicDb)
  const donusDate = bildirimTarihParse(donusDb)
  if (basDate && donusDate && donusDate.getTime() < basDate.getTime()) {
    return { hata: 'Dönüş tarihi başlangıç tarihinden önce olamaz.' }
  }

  let calisma_programi: Record<string, unknown> = {}
  try {
    const ham = JSON.parse(str(formData, 'calisma_programi') || '{}')
    const norm = yzcCalismaProgramiNormalize(ham)
    const programDogrulama = yzcProgramDogrula(norm)
    if (!programDogrulama.gecerli) {
      return { hata: programDogrulama.hatalar.join('\n') }
    }
    calisma_programi = yzcCalismaProgramiKaydet(norm)
  } catch {
    return { hata: 'Çalışma programı geçersiz.' }
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
    .from('yari_zamanli_calisma_bildirimleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: personel.ad_soyad,
      tckn,
      unvan,
      mudurluk,
      cocuk_dogum_tarihi: cocukDb,
      yari_zamanli_baslangic_tarihi: baslangicDb,
      normal_zamanli_donus_tarihi: donusDb,
      calisma_programi,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'yari-zamanli-calisma',
    islem: 'Ekle',
    ozet: `${personel.ad_soyad} için yarı zamanlı çalışma talebi oluşturuldu.`,
    ref_table: 'yari_zamanli_calisma_bildirimleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: {
      ad_soyad: personel.ad_soyad,
      tckn,
      unvan,
      mudurluk,
      cocuk_dogum_tarihi: cocukDb,
      yari_zamanli_baslangic_tarihi: baslangicDb,
      normal_zamanli_donus_tarihi: donusDb,
    },
  })

  revalidatePath('/bildirim/yari-zamanli-calisma')
  return { ok: true, id: inserted?.id as number }
}

export async function yariZamanliCalismaGuncelle(id: number, formData: FormData): Promise<YzcActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('yari_zamanli_calisma_bildirimleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, unvan, mudurluk, cocuk_dogum_tarihi, yari_zamanli_baslangic_tarihi, normal_zamanli_donus_tarihi, calisma_programi',
    )
    .eq('id', id)
    .maybeSingle()
  if (!kayit) return { hata: 'Kayıt bulunamadı.' }

  if (!isAdminLike(access)) {
    if (
      access.mode !== 'kullanici' ||
      String(access.sicilNo ?? '').trim() !== String(kayit.sicil_no ?? '').trim()
    ) {
      return { hata: 'Bu kaydı düzenleme yetkiniz yok.' }
    }
  }

  const cocukDb = bildirimTarihDb(str(formData, 'cocuk_dogum_tarihi'))
  if (!cocukDb) return { hata: 'Geçerli bir doğum tarihi girin.' }

  const baslangicDb = bildirimTarihDb(str(formData, 'yari_zamanli_baslangic_tarihi'))
  if (!baslangicDb) return { hata: 'Geçerli bir yarı zamanlı başlangıç tarihi girin.' }

  const donusDb = bildirimTarihDb(str(formData, 'normal_zamanli_donus_tarihi'))
  if (!donusDb) return { hata: 'Geçerli bir normal zamanlı dönüş tarihi girin.' }

  const basDate = bildirimTarihParse(baslangicDb)
  const donusDate = bildirimTarihParse(donusDb)
  if (basDate && donusDate && donusDate.getTime() < basDate.getTime()) {
    return { hata: 'Dönüş tarihi başlangıç tarihinden önce olamaz.' }
  }

  let calisma_programi: Record<string, unknown> = {}
  try {
    const ham = JSON.parse(str(formData, 'calisma_programi') || '{}')
    const norm = yzcCalismaProgramiNormalize(ham)
    const programDogrulamaGuncelle = yzcProgramDogrula(norm)
    if (!programDogrulamaGuncelle.gecerli) {
      return { hata: programDogrulamaGuncelle.hatalar.join('\n') }
    }
    calisma_programi = yzcCalismaProgramiKaydet(norm)
  } catch {
    return { hata: 'Çalışma programı geçersiz.' }
  }

  const sicil = String(kayit.sicil_no ?? '').trim()
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

  const onceki = {
    ad_soyad: kayit.ad_soyad,
    tckn: kayit.tckn,
    unvan: kayit.unvan,
    mudurluk: kayit.mudurluk,
    cocuk_dogum_tarihi: kayit.cocuk_dogum_tarihi,
    yari_zamanli_baslangic_tarihi: kayit.yari_zamanli_baslangic_tarihi,
    normal_zamanli_donus_tarihi: kayit.normal_zamanli_donus_tarihi,
    calisma_programi: kayit.calisma_programi,
  }

  const sonraki = {
    ad_soyad: personel.ad_soyad,
    tckn,
    unvan,
    mudurluk,
    cocuk_dogum_tarihi: cocukDb,
    yari_zamanli_baslangic_tarihi: baslangicDb,
    normal_zamanli_donus_tarihi: donusDb,
    calisma_programi,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: guncellenen, error } = await (supabase as any)
    .from('yari_zamanli_calisma_bildirimleri')
    .update({ ...sonraki, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    if (String(error.message).toLowerCase().includes('policy') || String(error.code) === '42501') {
      return { hata: 'Güncelleme izni yok. 20261112100000_yzc_update_policy.sql dosyasını çalıştırın.' }
    }
    return { hata: error.message }
  }
  if (!guncellenen?.id) {
    return { hata: 'Kayıt güncellenemedi. Güncelleme izni için 20261112100000_yzc_update_policy.sql dosyasını çalıştırın.' }
  }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'yari-zamanli-calisma',
    islem: 'Güncelle',
    ozet: `${personel.ad_soyad} için yarı zamanlı çalışma talebi güncellendi.`,
    ref_table: 'yari_zamanli_calisma_bildirimleri',
    ref_id: String(id),
    onceki,
    sonraki,
  })

  revalidatePath('/bildirim/yari-zamanli-calisma')
  revalidatePath(`/bildirim/yari-zamanli-calisma/${id}`)
  revalidatePath(`/bildirim/yari-zamanli-calisma/${id}/duzenle`)
  return { ok: true, id }
}

export async function yariZamanliCalismaSil(id: number): Promise<YzcActionSonuc> {
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Kayıt bulunamadı.' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }
  const access = await getAppAccess(supabase, user.id)
  if (!isAdminLike(access)) return { hata: 'Silme yetkisi yalnızca yönetici hesaplarındadır.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('yari_zamanli_calisma_bildirimleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, unvan, mudurluk, cocuk_dogum_tarihi, yari_zamanli_baslangic_tarihi, normal_zamanli_donus_tarihi, calisma_programi',
    )
    .eq('id', id)
    .maybeSingle()
  if (!kayit) return { hata: 'Kayıt bulunamadı.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('yari_zamanli_calisma_bildirimleri').delete().eq('id', id)
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: String(kayit.sicil_no ?? '').trim(),
    modul: 'yari-zamanli-calisma',
    islem: 'Sil',
    ozet: `${kayit.ad_soyad} yarı zamanlı çalışma talebi silindi.`,
    ref_table: 'yari_zamanli_calisma_bildirimleri',
    ref_id: String(id),
    onceki: {
      ad_soyad: kayit.ad_soyad,
      tckn: kayit.tckn,
      unvan: kayit.unvan,
      mudurluk: kayit.mudurluk,
      cocuk_dogum_tarihi: kayit.cocuk_dogum_tarihi,
      yari_zamanli_baslangic_tarihi: kayit.yari_zamanli_baslangic_tarihi,
      normal_zamanli_donus_tarihi: kayit.normal_zamanli_donus_tarihi,
      calisma_programi: kayit.calisma_programi,
    },
  })

  revalidatePath('/bildirim/yari-zamanli-calisma')
  revalidatePath(`/bildirim/yari-zamanli-calisma/${id}`)
  revalidatePath(`/bildirim/yari-zamanli-calisma/${id}/duzenle`)
  return { ok: true, id }
}
