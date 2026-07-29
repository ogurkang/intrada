'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ggAayyyyToIso } from '@/lib/tarih'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

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

async function oncekiAktifleriPasiflestir(
  supabase: SupabaseServer,
  sicil_no: string,
  bitis_tarihi: string,
  haricId: number | null,
) {
  let q = supabase
    .from('personel_sendika')
    .update({ aktif: false, bitis_tarihi })
    .eq('sicil_no', sicil_no)
    .eq('aktif', true)
  if (haricId != null) q = q.neq('id', haricId)
  await q
}

async function sendikaMeta(supabase: SupabaseServer, sendika_id: number) {
  const { data } = await supabase.from('tanim_sendika').select('kisa_ad, uzun_ad').eq('id', sendika_id).maybeSingle()
  return data
}

export async function personelSendikaEkle(
  sicil_no: string,
  sendika_id: number,
  baslangic_tarihi?: string | null,
): Promise<{ hata?: string; id?: number }> {
  if (!sicil_no?.trim()) return { hata: 'Sicil no zorunludur.' }
  if (!sendika_id) return { hata: 'Sendika seçimi zorunludur.' }

  const supabase = await createClient()
  const baslangic = baslangic_tarihi?.trim() || new Date().toISOString().slice(0, 10)

  const meta = await sendikaMeta(supabase, sendika_id)
  if (!meta) return { hata: 'Sendika tanımı bulunamadı.' }

  await oncekiAktifleriPasiflestir(supabase, sicil_no, baslangic, null)

  const payload = {
    sicil_no,
    sendika_id,
    baslangic_tarihi: baslangic,
    bitis_tarihi: null as string | null,
    aktif: true,
  }

  const { data: inserted, error } = await supabase.from('personel_sendika').insert(payload).select('id').single()
  if (error) return { hata: error.message }

  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'sendika',
    islem: 'Ekle',
    ozet: `${meta.kisa_ad} sendika kaydı eklendi.`,
    ref_table: 'personel_sendika',
    ref_id: String(inserted?.id ?? ''),
    sonraki: { ...payload, kisa_ad: meta.kisa_ad },
  })

  revalidatePath('/bildirim/sendika')
  revalidatePath('/personel/sendika-atama')
  revalidatePath(`/personel/${sicil_no}`)
  return { id: inserted?.id }
}

export async function personelSendikaTopluEkle(
  satirlar: { sicil_no: string; sendika_id: number; baslangic_tarihi?: string | null }[],
): Promise<{ hata?: string }> {
  if (!satirlar.length) return { hata: 'En az bir satır ekleyin.' }
  for (const s of satirlar) {
    const res = await personelSendikaEkle(s.sicil_no, s.sendika_id, s.baslangic_tarihi)
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
  revalidatePath(`/personel/${sicil_no}`)
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
  revalidatePath(`/personel/${sicil_no}`)
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
