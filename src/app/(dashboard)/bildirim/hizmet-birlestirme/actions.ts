'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import {
  hizmetBirlestirmePersonelDurumNorm,
  hizmetBirlestirmeTcknGecerliMi,
  type HizmetBirlestirmePersonelDurum,
} from '@/lib/hizmet-birlestirme-belge'

export interface HizmetBirlestirmeActionSonuc {
  ok?: boolean
  hata?: string
  id?: number
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

function manuelAlanlariAl(fd: FormData) {
  return {
    emeklilik_sicil_no: str(fd, 'emeklilik_sicil_no') || null,
    ssk: str(fd, 'ssk') || null,
    bagkur_sicil_no: str(fd, 'bagkur_sicil_no') || null,
    hizmet_illeri: str(fd, 'hizmet_illeri') || null,
  }
}

function ayrilanAlanlariDogrula(fd: FormData):
  | {
      ad_soyad: string
      tckn: string
      emeklilik_sicil_no: string | null
      ssk: string | null
      bagkur_sicil_no: string | null
      hizmet_illeri: string | null
    }
  | { hata: string } {
  const ad_soyad = str(fd, 'ad_soyad')
  const tckn = str(fd, 'tckn')
  if (!ad_soyad) return { hata: 'Ad soyad zorunludur.' }
  if (!hizmetBirlestirmeTcknGecerliMi(tckn)) {
    return { hata: 'T.C. kimlik numarası 11 rakam olmalıdır.' }
  }
  return { ad_soyad, tckn, ...manuelAlanlariAl(fd) }
}

export async function hizmetBirlestirmeEkle(
  formData: FormData,
): Promise<HizmetBirlestirmeActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  const personelDurum: HizmetBirlestirmePersonelDurum = hizmetBirlestirmePersonelDurumNorm(
    str(formData, 'personel_durum'),
  )
  const manuel = manuelAlanlariAl(formData)

  if (personelDurum === 'ayrilan') {
    if (!isAdminLike(access)) return { hata: 'Ayrılan personel formu için yetkiniz yok.' }

    const alan = ayrilanAlanlariDogrula(formData)
    if ('hata' in alan) return { hata: alan.hata }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (supabase as any)
      .from('hizmet_birlestirme_islemleri')
      .insert({
        sicil_no: null,
        ad_soyad: alan.ad_soyad,
        tckn: alan.tckn,
        personel_durum: 'ayrilan',
        emeklilik_sicil_no: alan.emeklilik_sicil_no,
        ssk: alan.ssk,
        bagkur_sicil_no: alan.bagkur_sicil_no,
        hizmet_illeri: alan.hizmet_illeri,
        created_by: user.id,
        created_by_email: user.email ?? null,
      })
      .select('id')
      .single()

    if (error) return { hata: error.message }

    await writePersonelAuditLogSafe(supabase, {
      sicil_no: null,
      modul: 'hizmet-birlestirme',
      islem: 'Ekle',
      ozet: `${alan.ad_soyad} (ayrılan) için hizmet birleştirme formu oluşturuldu.`,
      ref_table: 'hizmet_birlestirme_islemleri',
      ref_id: String(inserted?.id ?? ''),
      sonraki: {
        personel_durum: 'ayrilan',
        ad_soyad: alan.ad_soyad,
        tckn: alan.tckn,
        ...manuel,
      },
    })

    revalidatePath('/bildirim/hizmet-birlestirme')
    return { ok: true, id: inserted?.id as number }
  }

  let sicil = str(formData, 'sicil_no')
  if (!isAdminLike(access)) {
    if (access.mode === 'kullanici') sicil = String(access.sicilNo ?? '').trim()
    else return { hata: 'Bu işlem için yetkiniz yok.' }
  }
  if (!sicil) return { hata: 'Personel seçilmedi.' }

  const { data: calisan } = await supabase
    .from('calisan')
    .select('ad_soyad, tckn')
    .eq('sicil_no', sicil)
    .maybeSingle()
  if (!calisan) return { hata: 'Personel bulunamadı.' }

  const tckn = String(calisan.tckn ?? '').trim()
  if (!hizmetBirlestirmeTcknGecerliMi(tckn)) {
    return { hata: 'Personel kaydında geçerli T.C. kimlik numarası bulunamadı.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from('hizmet_birlestirme_islemleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: calisan.ad_soyad ?? sicil,
      tckn,
      personel_durum: 'calisan',
      emeklilik_sicil_no: manuel.emeklilik_sicil_no,
      ssk: manuel.ssk,
      bagkur_sicil_no: manuel.bagkur_sicil_no,
      hizmet_illeri: manuel.hizmet_illeri,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'hizmet-birlestirme',
    islem: 'Ekle',
    ozet: `${calisan.ad_soyad ?? sicil} için hizmet birleştirme formu oluşturuldu.`,
    ref_table: 'hizmet_birlestirme_islemleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: {
      personel_durum: 'calisan',
      ad_soyad: calisan.ad_soyad ?? sicil,
      tckn,
      ...manuel,
    },
  })

  revalidatePath('/bildirim/hizmet-birlestirme')
  return { ok: true, id: inserted?.id as number }
}

export async function hizmetBirlestirmeGuncelle(
  id: number,
  formData: FormData,
): Promise<HizmetBirlestirmeActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('hizmet_birlestirme_islemleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, personel_durum, emeklilik_sicil_no, ssk, bagkur_sicil_no, hizmet_illeri',
    )
    .eq('id', id)
    .maybeSingle()
  if (!kayit) return { hata: 'Kayıt bulunamadı.' }

  const kayitDurum = hizmetBirlestirmePersonelDurumNorm(kayit.personel_durum)

  if (!isAdminLike(access)) {
    if (
      kayitDurum === 'ayrilan' ||
      access.mode !== 'kullanici' ||
      String(access.sicilNo ?? '').trim() !== String(kayit.sicil_no ?? '').trim()
    ) {
      return { hata: 'Bu kaydı düzenleme yetkiniz yok.' }
    }
  }

  const onceki = {
    personel_durum: kayitDurum,
    ad_soyad: kayit.ad_soyad,
    tckn: kayit.tckn,
    emeklilik_sicil_no: kayit.emeklilik_sicil_no,
    ssk: kayit.ssk,
    bagkur_sicil_no: kayit.bagkur_sicil_no,
    hizmet_illeri: kayit.hizmet_illeri,
  }

  if (kayitDurum === 'ayrilan') {
    const alan = ayrilanAlanlariDogrula(formData)
    if ('hata' in alan) return { hata: alan.hata }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('hizmet_birlestirme_islemleri')
      .update({
        ad_soyad: alan.ad_soyad,
        tckn: alan.tckn,
        emeklilik_sicil_no: alan.emeklilik_sicil_no,
        ssk: alan.ssk,
        bagkur_sicil_no: alan.bagkur_sicil_no,
        hizmet_illeri: alan.hizmet_illeri,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { hata: error.message }

    await writePersonelAuditLogSafe(supabase, {
      sicil_no: null,
      modul: 'hizmet-birlestirme',
      islem: 'Güncelle',
      ozet: `${alan.ad_soyad} (ayrılan) hizmet birleştirme formu güncellendi.`,
      ref_table: 'hizmet_birlestirme_islemleri',
      ref_id: String(id),
      onceki,
      sonraki: {
        personel_durum: 'ayrilan',
        ad_soyad: alan.ad_soyad,
        tckn: alan.tckn,
        emeklilik_sicil_no: alan.emeklilik_sicil_no,
        ssk: alan.ssk,
        bagkur_sicil_no: alan.bagkur_sicil_no,
        hizmet_illeri: alan.hizmet_illeri,
      },
    })

    revalidatePath('/bildirim/hizmet-birlestirme')
    revalidatePath(`/bildirim/hizmet-birlestirme/${id}`)
    return { ok: true, id }
  }

  const manuel = manuelAlanlariAl(formData)
  const { data: calisan } = await supabase
    .from('calisan')
    .select('ad_soyad, tckn')
    .eq('sicil_no', String(kayit.sicil_no).trim())
    .maybeSingle()

  const tckn = String(calisan?.tckn ?? kayit.tckn ?? '').trim()
  const ad_soyad = String(calisan?.ad_soyad ?? kayit.ad_soyad ?? '').trim()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('hizmet_birlestirme_islemleri')
    .update({
      ad_soyad,
      tckn: tckn || null,
      emeklilik_sicil_no: manuel.emeklilik_sicil_no,
      ssk: manuel.ssk,
      bagkur_sicil_no: manuel.bagkur_sicil_no,
      hizmet_illeri: manuel.hizmet_illeri,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: String(kayit.sicil_no),
    modul: 'hizmet-birlestirme',
    islem: 'Güncelle',
    ozet: `${ad_soyad} için hizmet birleştirme formu güncellendi.`,
    ref_table: 'hizmet_birlestirme_islemleri',
    ref_id: String(id),
    onceki,
    sonraki: {
      personel_durum: 'calisan',
      ad_soyad,
      tckn,
      ...manuel,
    },
  })

  revalidatePath('/bildirim/hizmet-birlestirme')
  revalidatePath(`/bildirim/hizmet-birlestirme/${id}`)
  return { ok: true, id }
}
