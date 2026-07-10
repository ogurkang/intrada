'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  fetchKesintiDonemAuditRow,
  kesintiDonemAuditSnapshot,
  writeKesintiDonemAuditLogSafe,
} from '@/lib/kesinti-donem-audit'
import { validateSosyalHakDonemTarihleri, type SosyalHakDonemTarih } from '@/lib/sosyal-hak-donem'

const PATH = '/kesintiler/sosyal-hak'
const REF_TABLE = 'sosyal_hak_donem'
const MODUL = 'Sosyal Hak'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

async function tumSosyalHakDonemTarihleri(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SosyalHakDonemTarih[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('sosyal_hak_donem')
    .select('id, donem_adi, baslangic_tarihi, bitis_tarihi')
  return (data ?? []) as SosyalHakDonemTarih[]
}

export async function donemEkle(fd: FormData): Promise<{ hata?: string }> {
  const yil              = parseInt(String(fd.get('yil') ?? '0'), 10)
  const baslangic_tarihi = str(fd, 'baslangic_tarihi')
  const bitis_tarihi     = str(fd, 'bitis_tarihi')
  if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }

  const supabase = await createClient()
  const mevcut = await tumSosyalHakDonemTarihleri(supabase)
  const tarihHata = validateSosyalHakDonemTarihleri(baslangic_tarihi, bitis_tarihi, mevcut)
  if (tarihHata) return { hata: tarihHata }

  const payload = {
    yil,
    sira_no:          str(fd, 'sira_no'),
    donem_adi:        str(fd, 'donem_adi'),
    baslangic_tarihi,
    bitis_tarihi,
    durum:            'Açık' as const,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: inserted, error } = await db.from('sosyal_hak_donem').insert(payload).select('id').single()

  if (error) return { hata: (error as { message: string }).message }
  if (inserted?.id) {
    await writeKesintiDonemAuditLogSafe(supabase, {
      refTable: REF_TABLE, modul: MODUL, donemId: inserted.id as number,
      islem: 'Ekle', ozet: `${payload.donem_adi ?? 'Dönem'} eklendi.`,
      sonraki: kesintiDonemAuditSnapshot(payload as Record<string, unknown>),
    })
  }
  revalidatePath(PATH)
  return {}
}

export async function donemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const onceki = await fetchKesintiDonemAuditRow(supabase, REF_TABLE, id)
  const baslangic_tarihi = str(fd, 'baslangic_tarihi')
  const bitis_tarihi = str(fd, 'bitis_tarihi')
  if (!baslangic_tarihi || !bitis_tarihi) return { hata: 'Başlangıç ve bitiş tarihleri zorunludur.' }

  const mevcut = await tumSosyalHakDonemTarihleri(supabase)
  const tarihHata = validateSosyalHakDonemTarihleri(baslangic_tarihi, bitis_tarihi, mevcut, id)
  if (tarihHata) return { hata: tarihHata }

  const payload = {
    yil:              parseInt(String(fd.get('yil') ?? '0'), 10),
    sira_no:          str(fd, 'sira_no'),
    donem_adi:        str(fd, 'donem_adi'),
    baslangic_tarihi,
    bitis_tarihi,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('sosyal_hak_donem').update(payload).eq('id', id)

  if (error) return { hata: (error as { message: string }).message }
  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE, modul: MODUL, donemId: id,
    islem: 'Güncelle', ozet: `${payload.donem_adi ?? onceki?.donem_adi ?? 'Dönem'} güncellendi.`,
    onceki, sonraki: kesintiDonemAuditSnapshot({ ...onceki, ...payload }),
  })
  revalidatePath(PATH)
  return {}
}

export async function donemKapat(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const onceki = await fetchKesintiDonemAuditRow(supabase, REF_TABLE, id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('sosyal_hak_donem').update({ durum: 'Kapalı' }).eq('id', id)
  if (error) return { hata: (error as { message: string }).message }
  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE, modul: MODUL, donemId: id,
    islem: 'Kapat', ozet: `${String(onceki?.donem_adi ?? id)} dönemi kapatıldı.`,
    onceki, sonraki: { ...onceki, durum: 'Kapalı' },
  })
  revalidatePath(PATH)
  return {}
}

export async function donemAc(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const onceki = await fetchKesintiDonemAuditRow(supabase, REF_TABLE, id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('sosyal_hak_donem').update({ durum: 'Açık' }).eq('id', id)
  if (error) return { hata: (error as { message: string }).message }
  await writeKesintiDonemAuditLogSafe(supabase, {
    refTable: REF_TABLE, modul: MODUL, donemId: id,
    islem: 'Aç', ozet: `${String(onceki?.donem_adi ?? id)} dönemi tekrar açıldı.`,
    onceki, sonraki: { ...onceki, durum: 'Açık' },
  })
  revalidatePath(PATH)
  return {}
}

// secimGetir: DonemListClient'in beklediği interface'i karşılar
export async function secimGetir(donem_id: number): Promise<{
  izinler: { sira_no: string | null; sicil_no: string | null; ad_soyad: string | null; tur: string | null; baslama: string | null; ayrilis: string | null; gun: number | null }[]
  secimler: { izin_sira_no: string; dahil: boolean }[]
}> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: secimRaw } = await (supabase as any)
    .from('sosyal_hak_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donem_id)
  return {
    izinler: [],
    secimler: ((secimRaw ?? []) as { izin_sira_no: string; dahil: boolean }[])
      .map(s => ({ izin_sira_no: s.izin_sira_no, dahil: s.dahil })),
  }
}

export async function secimKaydet(
  donem_id: number,
  secimler: { izin_sira_no: string; dahil: boolean }[]
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  await db.from('sosyal_hak_secim').delete().eq('donem_id', donem_id)
  if (secimler.length > 0) {
    const { error } = await db.from('sosyal_hak_secim').insert(
      secimler.map(s => ({ donem_id, izin_sira_no: s.izin_sira_no, dahil: s.dahil }))
    )
    if (error) return { hata: (error as { message: string }).message }
  }
  revalidatePath(PATH)
  return {}
}
