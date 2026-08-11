'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { bildirimTarihDb, bildirimTarihParse } from '@/lib/bildirim-belge-ortak'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import { getBildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import {
  yzcCalismaProgramiNormalize,
  yzcProgramGunSayisi,
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

  let calisma_programi = {}
  try {
    calisma_programi = yzcCalismaProgramiNormalize(JSON.parse(str(formData, 'calisma_programi') || '{}'))
  } catch {
    return { hata: 'Çalışma programı geçersiz.' }
  }
  if (yzcProgramGunSayisi(calisma_programi) < 3) {
    return { hata: 'Haftalık çalışma programında en az 3 gün seçilmelidir.' }
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

  let calisma_programi = {}
  try {
    calisma_programi = yzcCalismaProgramiNormalize(JSON.parse(str(formData, 'calisma_programi') || '{}'))
  } catch {
    return { hata: 'Çalışma programı geçersiz.' }
  }
  if (yzcProgramGunSayisi(calisma_programi) < 3) {
    return { hata: 'Haftalık çalışma programında en az 3 gün seçilmelidir.' }
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
  const { error } = await (supabase as any)
    .from('yari_zamanli_calisma_bildirimleri')
    .update(sonraki)
    .eq('id', id)

  if (error) return { hata: error.message }

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
