'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import {
  PASAPORT_DERECE_UYARI,
  pasaportAyrilisNedeniNorm,
  pasaportDereceUygunMu,
  pasaportPersonelDurumNorm,
  pasaportTcknGecerliMi,
  pasaportTelefonGecerliMi,
  pasaportTelefonNorm,
  type PasaportAyrilisNedeni,
  type PasaportPersonelDurum,
} from '@/lib/pasaport-belge'
import { memurStatuMu } from '@/lib/pasaport-personel'

export interface PasaportActionSonuc {
  ok?: boolean
  hata?: string
}

interface KadroSnapshot {
  kadro_id: number
  derece: string
  unvan: string
  mudurluk: string
  statu: string
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? '').trim()
}

/** Seçilen kadronun (kadro_hareketleri.id) personele aitliğini + memur + derece uygunluğunu doğrular. */
async function kadrodanSnapshot(
  supabase: SupabaseClient,
  sicil: string,
  kadroId: number,
): Promise<{ snapshot: KadroSnapshot } | { hata: string }> {
  const { data: kh } = await supabase
    .from('kadro_hareketleri')
    .select(
      'id, asil, vekil, statu, kadro_derecesi, gorev_unvani, kadro_unvani, gorev_mudurlugu, kadro_mudurlugu',
    )
    .eq('id', kadroId)
    .maybeSingle()

  if (!kh) return { hata: 'Seçilen kadro bulunamadı.' }

  const aitMi =
    String(kh.asil ?? '').trim() === sicil || String(kh.vekil ?? '').trim() === sicil
  if (!aitMi) return { hata: 'Seçilen kadro bu personele ait değil.' }

  if (!memurStatuMu(kh.statu)) return { hata: 'Yalnızca memur statüsündeki kadro seçilebilir.' }

  const derece = String(kh.kadro_derecesi ?? '').trim()
  if (!pasaportDereceUygunMu(derece)) return { hata: PASAPORT_DERECE_UYARI }

  return {
    snapshot: {
      kadro_id: kh.id,
      derece,
      unvan: String(kh.gorev_unvani ?? kh.kadro_unvani ?? '').trim(),
      mudurluk: String(kh.gorev_mudurlugu ?? kh.kadro_mudurlugu ?? '').trim(),
      statu: String(kh.statu ?? '').trim(),
    },
  }
}

function ayrilanAlanlariDogrula(fd: FormData):
  | {
      ad_soyad: string
      unvan: string
      derece: string
      tckn: string
      telefon: string
      ayrilis_nedeni: PasaportAyrilisNedeni
    }
  | { hata: string } {
  const ad_soyad = str(fd, 'ad_soyad')
  const unvan = str(fd, 'unvan')
  const derece = str(fd, 'derece')
  const tckn = str(fd, 'tckn')
  const telefon = pasaportTelefonNorm(str(fd, 'telefon'))
  const ayrilis_nedeni = pasaportAyrilisNedeniNorm(str(fd, 'ayrilis_nedeni'))

  if (!ad_soyad) return { hata: 'Ad soyad zorunludur.' }
  if (!unvan) return { hata: 'Kadro (unvan) zorunludur.' }
  if (!derece) return { hata: 'Derece zorunludur.' }
  if (!pasaportDereceUygunMu(derece)) return { hata: PASAPORT_DERECE_UYARI }
  if (!pasaportTcknGecerliMi(tckn)) return { hata: 'T.C. kimlik numarası 11 rakam olmalıdır.' }
  if (!pasaportTelefonGecerliMi(telefon)) {
    return { hata: 'Telefon numarası 10–11 rakam olmalıdır.' }
  }
  if (!ayrilis_nedeni) return { hata: 'Ayrılış nedeni (emekli / istifa) seçilmelidir.' }

  return { ad_soyad, unvan, derece, tckn, telefon, ayrilis_nedeni }
}

export async function pasaportEkle(formData: FormData): Promise<PasaportActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)
  const personelDurum: PasaportPersonelDurum = pasaportPersonelDurumNorm(
    str(formData, 'personel_durum'),
  )

  if (personelDurum === 'ayrilan') {
    if (!isAdminLike(access)) return { hata: 'Ayrılan personel formu için yetkiniz yok.' }

    const alan = ayrilanAlanlariDogrula(formData)
    if ('hata' in alan) return { hata: alan.hata }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (supabase as any)
      .from('pasaport_islemleri')
      .insert({
        sicil_no: null,
        ad_soyad: alan.ad_soyad,
        tckn: alan.tckn,
        telefon: alan.telefon,
        kadro_id: null,
        mudurluk: null,
        derece: alan.derece,
        unvan: alan.unvan,
        statu: null,
        personel_durum: 'ayrilan',
        ayrilis_nedeni: alan.ayrilis_nedeni,
        created_by: user.id,
        created_by_email: user.email ?? null,
      })
      .select('id')
      .single()

    if (error) return { hata: error.message }

    await writePersonelAuditLogSafe(supabase, {
      sicil_no: null,
      modul: 'pasaport',
      islem: 'Ekle',
      ozet: `${alan.ad_soyad} (ayrılan / ${alan.ayrilis_nedeni}) için yeşil pasaport başvuru formu oluşturuldu.`,
      ref_table: 'pasaport_islemleri',
      ref_id: String(inserted?.id ?? ''),
      sonraki: {
        personel_durum: 'ayrilan',
        ayrilis_nedeni: alan.ayrilis_nedeni,
        derece: alan.derece,
        unvan: alan.unvan,
        ad_soyad: alan.ad_soyad,
        tckn: alan.tckn,
        telefon: alan.telefon,
      },
    })

    revalidatePath('/bildirim/pasaport')
    return { ok: true }
  }

  let sicil = str(formData, 'sicil_no')
  const kadroId = parseInt(String(formData.get('kadro_id') ?? ''), 10)

  if (!isAdminLike(access)) {
    if (access.mode === 'kullanici') sicil = String(access.sicilNo ?? '').trim()
    else return { hata: 'Bu işlem için yetkiniz yok.' }
  }
  if (!sicil) return { hata: 'Personel seçilmedi.' }
  if (!Number.isFinite(kadroId)) return { hata: 'Kadro seçilmedi.' }

  const snapRes = await kadrodanSnapshot(supabase, sicil, kadroId)
  if ('hata' in snapRes) return { hata: snapRes.hata }
  const snap = snapRes.snapshot

  const { data: calisan } = await supabase
    .from('calisan')
    .select('ad_soyad, tckn, telefon')
    .eq('sicil_no', sicil)
    .maybeSingle()
  if (!calisan) return { hata: 'Personel bulunamadı.' }

  const telefon = pasaportTelefonNorm(calisan.telefon)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (supabase as any)
    .from('pasaport_islemleri')
    .insert({
      sicil_no: sicil,
      ad_soyad: calisan.ad_soyad ?? sicil,
      tckn: calisan.tckn ?? null,
      telefon: telefon || null,
      kadro_id: snap.kadro_id,
      mudurluk: snap.mudurluk,
      derece: snap.derece,
      unvan: snap.unvan,
      statu: snap.statu,
      personel_durum: 'calisan',
      ayrilis_nedeni: null,
      created_by: user.id,
      created_by_email: user.email ?? null,
    })
    .select('id')
    .single()

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: sicil,
    modul: 'pasaport',
    islem: 'Ekle',
    ozet: `${calisan.ad_soyad ?? sicil} için yeşil pasaport başvuru formu oluşturuldu.`,
    ref_table: 'pasaport_islemleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: { ...snap, personel_durum: 'calisan', telefon: telefon || null },
  })

  revalidatePath('/bildirim/pasaport')
  return { ok: true }
}

export async function pasaportGuncelle(
  id: number,
  formData: FormData,
): Promise<PasaportActionSonuc> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum gerekli.' }

  const access = await getAppAccess(supabase, user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('pasaport_islemleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, telefon, kadro_id, derece, unvan, mudurluk, statu, personel_durum, ayrilis_nedeni',
    )
    .eq('id', id)
    .maybeSingle()
  if (!kayit) return { hata: 'Kayıt bulunamadı.' }

  const kayitDurum = pasaportPersonelDurumNorm(kayit.personel_durum)

  if (!isAdminLike(access)) {
    if (
      kayitDurum === 'ayrilan' ||
      access.mode !== 'kullanici' ||
      String(access.sicilNo ?? '').trim() !== String(kayit.sicil_no ?? '').trim()
    ) {
      return { hata: 'Bu kaydı düzenleme yetkiniz yok.' }
    }
  }

  if (kayitDurum === 'ayrilan') {
    const alan = ayrilanAlanlariDogrula(formData)
    if ('hata' in alan) return { hata: alan.hata }

    const onceki = {
      personel_durum: 'ayrilan',
      ayrilis_nedeni: kayit.ayrilis_nedeni,
      derece: kayit.derece,
      unvan: kayit.unvan,
      ad_soyad: kayit.ad_soyad,
      tckn: kayit.tckn,
      telefon: kayit.telefon,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('pasaport_islemleri')
      .update({
        ad_soyad: alan.ad_soyad,
        tckn: alan.tckn,
        telefon: alan.telefon,
        derece: alan.derece,
        unvan: alan.unvan,
        ayrilis_nedeni: alan.ayrilis_nedeni,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) return { hata: error.message }

    await writePersonelAuditLogSafe(supabase, {
      sicil_no: null,
      modul: 'pasaport',
      islem: 'Güncelle',
      ozet: `${alan.ad_soyad} (ayrılan) pasaport formu güncellendi.`,
      ref_table: 'pasaport_islemleri',
      ref_id: String(id),
      onceki,
      sonraki: {
        personel_durum: 'ayrilan',
        ayrilis_nedeni: alan.ayrilis_nedeni,
        derece: alan.derece,
        unvan: alan.unvan,
        ad_soyad: alan.ad_soyad,
        tckn: alan.tckn,
        telefon: alan.telefon,
      },
    })

    revalidatePath('/bildirim/pasaport')
    revalidatePath(`/bildirim/pasaport/${id}`)
    return { ok: true }
  }

  const kadroId = parseInt(String(formData.get('kadro_id') ?? ''), 10)
  if (!Number.isFinite(kadroId)) return { hata: 'Kadro seçilmedi.' }

  const snapRes = await kadrodanSnapshot(supabase, String(kayit.sicil_no).trim(), kadroId)
  if ('hata' in snapRes) return { hata: snapRes.hata }
  const snap = snapRes.snapshot

  const { data: calisan } = await supabase
    .from('calisan')
    .select('telefon')
    .eq('sicil_no', String(kayit.sicil_no).trim())
    .maybeSingle()
  const telefon = pasaportTelefonNorm(calisan?.telefon)

  const onceki = {
    kadro_id: kayit.kadro_id,
    derece: kayit.derece,
    unvan: kayit.unvan,
    mudurluk: kayit.mudurluk,
    statu: kayit.statu,
    telefon: kayit.telefon,
    personel_durum: 'calisan',
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('pasaport_islemleri')
    .update({
      kadro_id: snap.kadro_id,
      mudurluk: snap.mudurluk,
      derece: snap.derece,
      unvan: snap.unvan,
      statu: snap.statu,
      telefon: telefon || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no: String(kayit.sicil_no),
    modul: 'pasaport',
    islem: 'Güncelle',
    ozet: `${kayit.ad_soyad} için pasaport formu kadro bilgisi güncellendi.`,
    ref_table: 'pasaport_islemleri',
    ref_id: String(id),
    onceki,
    sonraki: { ...snap, personel_durum: 'calisan', telefon: telefon || null },
  })

  revalidatePath('/bildirim/pasaport')
  revalidatePath(`/bildirim/pasaport/${id}`)
  return { ok: true }
}
