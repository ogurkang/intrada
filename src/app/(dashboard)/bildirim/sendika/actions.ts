'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ggAayyyyToIso } from '@/lib/tarih'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { kadroStatuSendikaGrubu } from '@/lib/sendika-statu'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

function tarihFromForm(val: string | null | undefined): string | null {
  if (!val?.trim()) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) return val.trim()
  return ggAayyyyToIso(val.trim().replace(/\//g, '.'))
}

async function personelAyrilmisMi(supabase: SupabaseServer, sicil_no: string): Promise<boolean> {
  const { data } = await supabase
    .from('personel_hareketleri')
    .select('id')
    .eq('sicil_no', sicil_no)
    .not('ayrilis_tarihi', 'is', null)
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function sendikaMeta(supabase: SupabaseServer, sendika_id: number) {
  const { data } = await supabase.from('tanim_sendika').select('kisa_ad, uzun_ad, statu').eq('id', sendika_id).maybeSingle()
  return data
}

async function sendikaStatuUygunMu(
  supabase: SupabaseServer,
  sicil_no: string,
  sendikaStatu: string,
): Promise<string | null> {
  const bugun = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const { data } = await supabase
    .from('kadro_hareketleri')
    .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
    .eq('asil', sicil_no)
  const kadro = secilenKadroSatirAsil((data ?? []) as KadroRaporRow[], bugun)
  const grup = kadroStatuSendikaGrubu(kadro?.statu ?? null)
  if (!grup) return 'Personelin kadro statüsü memur veya işçi olarak belirlenemedi.'
  if (sendikaStatu !== grup) {
    return grup === 'Memur'
      ? 'Memur personele işçi sendikası yazılamaz.'
      : 'İşçi personele memur sendikası yazılamaz.'
  }
  return null
}

const ISTIFA_TARIHI_GEREKLI =
  'Mevcut sendika üyeliğinin istifa tarihini işlemeden yeni bir sendika üyeliği oluşturulamaz.'

export async function personelSendikaEkle(
  sicil_no: string,
  sendika_id: number,
  baslangic_tarihi?: string | null,
  istifa_tarihi?: string | null,
): Promise<{ hata?: string; id?: number }> {
  if (!sicil_no?.trim()) return { hata: 'Sicil no zorunludur.' }
  if (!sendika_id) return { hata: 'Sendika seçimi zorunludur.' }

  const supabase = await createClient()
  const hamBaslangic = baslangic_tarihi?.trim()
  const baslangic = hamBaslangic ? tarihFromForm(hamBaslangic) : bugunIstanbulIso()
  if (!baslangic || !isoTakvimGecerli(baslangic)) {
    return { hata: 'Başlangıç tarihi gg.aa.yyyy biçiminde olmalıdır.' }
  }

  const meta = await sendikaMeta(supabase, sendika_id)
  if (!meta) return { hata: 'Sendika tanımı bulunamadı.' }
  const statuHata = await sendikaStatuUygunMu(supabase, sicil_no.trim(), meta.statu)
  if (statuHata) return { hata: statuHata }

  const { data: aktifler, error: aktifHata } = await supabase
    .from('personel_sendika')
    .select('id, baslangic_tarihi')
    .eq('sicil_no', sicil_no.trim())
    .eq('aktif', true)
  if (aktifHata) return { hata: aktifHata.message }

  let kapatilanIdler: number[] = []
  let kapatilanGun = ''
  if ((aktifler?.length ?? 0) > 0) {
    const istifaIso = tarihFromForm(istifa_tarihi)
    if (!istifaIso || !isoTakvimGecerli(istifaIso)) return { hata: ISTIFA_TARIHI_GEREKLI }
    if (istifaIso > bugunIstanbulIso()) return { hata: 'İstifa tarihi bugünden sonra olamaz.' }
    const enErkenIhlal = (aktifler ?? []).some(r => istifaIso < String(r.baslangic_tarihi).slice(0, 10))
    if (enErkenIhlal) return { hata: 'İstifa tarihi üyelik başlangıcından önce olamaz.' }
    if (baslangic < istifaIso) return { hata: 'Yeni üyelik, mevcut üyelik bitmeden başlayamaz.' }

    kapatilanGun = `${istifaIso.slice(8, 10)}.${istifaIso.slice(5, 7)}.${istifaIso.slice(0, 4)}`
    kapatilanIdler = (aktifler ?? []).map(r => r.id)
    const { error: kapatHata } = await supabase
      .from('personel_sendika')
      .update({ aktif: false, bitis_tarihi: istifaIso })
      .in('id', kapatilanIdler)
      .eq('aktif', true)
    if (kapatHata) return { hata: kapatHata.message }
  }

  const payload = {
    sicil_no,
    sendika_id,
    baslangic_tarihi: baslangic,
    bitis_tarihi: null as string | null,
    aktif: true,
  }

  const { data: inserted, error } = await supabase.from('personel_sendika').insert(payload).select('id').single()
  if (error) {
    if (kapatilanIdler.length > 0) {
      await supabase
        .from('personel_sendika')
        .update({ aktif: true, bitis_tarihi: null })
        .in('id', kapatilanIdler)
    }
    return { hata: error.message }
  }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'sendika',
    islem: 'Ekle',
    ozet: kapatilanGun
      ? `${meta.kisa_ad} sendika kaydı eklendi. Önceki üyelik ${kapatilanGun} tarihinde kapatıldı. Dilekçe oluşturulmadı.`
      : `${meta.kisa_ad} sendika kaydı eklendi.`,
    ref_table: 'personel_sendika',
    ref_id: String(inserted?.id ?? ''),
    sonraki: { ...payload, kisa_ad: meta.kisa_ad },
  })

  revalidatePath('/bildirim/sendika')
  revalidatePath('/personel/sendika-atama')
  await revalidatePersonelDetayPaths(sicil_no)
  return { id: inserted?.id }
}

export async function personelSendikaTopluEkle(
  satirlar: { sicil_no: string; sendika_id: number; baslangic_tarihi?: string | null; istifa_tarihi?: string | null }[],
): Promise<{ hata?: string }> {
  if (!satirlar.length) return { hata: 'En az bir satır ekleyin.' }
  const ayniSicil = new Map<string, number>()
  for (const s of satirlar) {
    const sicil = s.sicil_no.trim()
    ayniSicil.set(sicil, (ayniSicil.get(sicil) ?? 0) + 1)
  }
  if ([...ayniSicil.values()].some(n => n > 1)) {
    return { hata: 'Bir personel için tek seferde bir sendika üyeliği açılır.' }
  }
  for (const s of satirlar) {
    const res = await personelSendikaEkle(s.sicil_no, s.sendika_id, s.baslangic_tarihi, s.istifa_tarihi)
    if (res.hata) return { hata: res.hata }
  }
  return {}
}

export async function sendikaBildirimEkle(fd: FormData): Promise<{ hata?: string }> {
  const sicil_no = str(fd, 'sicil_no')
  const sendika_id = parseInt(String(fd.get('sendika_id') ?? ''), 10)
  const baslangic = tarihFromForm(str(fd, 'baslangic_tarihi'))
  if (!sicil_no) return { hata: 'Personel seçimi zorunludur.' }
  if (!Number.isFinite(sendika_id)) return { hata: 'Sendika seçimi zorunludur.' }
  const res = await personelSendikaEkle(sicil_no, sendika_id, baslangic)
  return res.hata ? { hata: res.hata } : {}
}

export async function sendikaBildirimGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('personel_sendika')
    .select('sicil_no, sendika_id, baslangic_tarihi, bitis_tarihi, aktif')
    .eq('id', id)
    .single()
  const sicil_no = row?.sicil_no
  if (!sicil_no) return { hata: 'Kayıt bulunamadı.' }
  if (await personelAyrilmisMi(supabase, sicil_no)) {
    return { hata: 'Personel kurumdan ayrıldığı için sendika kaydı düzenlenemez.' }
  }

  const sendika_id = parseInt(String(fd.get('sendika_id') ?? ''), 10)
  const baslangic = tarihFromForm(str(fd, 'baslangic_tarihi')) ?? row.baslangic_tarihi
  if (!Number.isFinite(sendika_id)) return { hata: 'Sendika seçimi zorunludur.' }

  const meta = await sendikaMeta(supabase, sendika_id)
  if (!meta) return { hata: 'Sendika tanımı bulunamadı.' }
  const statuHata = await sendikaStatuUygunMu(supabase, sicil_no, meta.statu)
  if (statuHata) return { hata: statuHata }

  const payload = {
    sendika_id,
    baslangic_tarihi: baslangic,
  }

  const { error } = await supabase.from('personel_sendika').update(payload).eq('id', id)
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'sendika',
    islem: 'Güncelle',
    ozet: `${meta.kisa_ad} sendika kaydı güncellendi.`,
    ref_table: 'personel_sendika',
    ref_id: String(id),
    onceki: row,
    sonraki: { ...row, ...payload, kisa_ad: meta.kisa_ad },
  })

  revalidatePath('/bildirim/sendika')
  revalidatePath('/personel/sendika-atama')
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
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

/** Dilekçe kaydı açmadan mevcut üyeliği seçilen tarihte kapatır. */
export async function sendikaBildirimIstifa(
  id: number,
  tarihMetin: string,
): Promise<{ hata?: string }> {
  const iso = tarihFromForm(tarihMetin)
  if (!iso || !isoTakvimGecerli(iso)) return { hata: 'İstifa tarihi gg.aa.yyyy biçiminde olmalıdır.' }

  const bugun = bugunIstanbulIso()
  if (iso > bugun) return { hata: 'İstifa tarihi bugünden sonra olamaz.' }

  const supabase = await createClient()
  const { data: row } = await supabase
    .from('personel_sendika')
    .select('sicil_no, sendika_id, baslangic_tarihi, bitis_tarihi, aktif, tanim_sendika(kisa_ad)')
    .eq('id', id)
    .single()
  const sicil_no = row?.sicil_no
  if (!sicil_no || !row) return { hata: 'Kayıt bulunamadı.' }
  if (!row.aktif) return { hata: 'Bu üyelik zaten kapalı.' }
  if (await personelAyrilmisMi(supabase, sicil_no)) {
    return { hata: 'Personel kurumdan ayrıldığı için sendika kaydı kapatılamaz.' }
  }
  if (iso < String(row.baslangic_tarihi).slice(0, 10)) {
    return { hata: 'İstifa tarihi üyelik başlangıcından önce olamaz.' }
  }

  const payload = { aktif: false, bitis_tarihi: iso }
  const { error } = await supabase.from('personel_sendika').update(payload).eq('id', id).eq('aktif', true)
  if (error) return { hata: error.message }

  const kisa =
    (row as { tanim_sendika?: { kisa_ad: string } | null }).tanim_sendika?.kisa_ad ?? 'Sendika'
  const gg = `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'sendika',
    islem: 'Güncelle',
    ozet: `${kisa} üyeliği ${gg} tarihinde istifa ile kapatıldı.`,
    ref_table: 'personel_sendika',
    ref_id: String(id),
    onceki: row,
    sonraki: { ...row, ...payload, kisa_ad: kisa },
  })

  revalidatePath('/bildirim/sendika')
  revalidatePath('/personel/sendika-atama')
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

export async function sendikaBildirimSil(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { data: row } = await supabase
    .from('personel_sendika')
    .select('sicil_no, sendika_id, baslangic_tarihi, aktif, tanim_sendika(kisa_ad)')
    .eq('id', id)
    .single()
  const sicil_no = row?.sicil_no
  if (!sicil_no) return { hata: 'Kayıt bulunamadı.' }
  if (await personelAyrilmisMi(supabase, sicil_no)) {
    return { hata: 'Personel kurumdan ayrıldığı için sendika kaydı silinemez.' }
  }

  const { error } = await supabase.from('personel_sendika').delete().eq('id', id)
  if (error) return { hata: error.message }

  const kisa =
    (row as { tanim_sendika?: { kisa_ad: string } | null })?.tanim_sendika?.kisa_ad ?? 'Sendika'
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'sendika',
    islem: 'Sil',
    ozet: `${kisa} sendika kaydı silindi.`,
    ref_table: 'personel_sendika',
    ref_id: String(id),
    onceki: row,
  })

  revalidatePath('/bildirim/sendika')
  revalidatePath('/personel/sendika-atama')
  await revalidatePersonelDetayPaths(sicil_no)
  return {}
}

export async function personelSendikaAtamaKaydet(
  satirlar: { sicil_no: string; sendika_id: number | null }[],
): Promise<{ hata?: string }> {
  const dolu = satirlar.filter(s => s.sendika_id != null && s.sendika_id > 0)
  if (!dolu.length) return { hata: 'Kaydedilecek sendika seçimi yok.' }
  return personelSendikaTopluEkle(
    dolu.map(s => ({ sicil_no: s.sicil_no, sendika_id: s.sendika_id as number })),
  )
}
