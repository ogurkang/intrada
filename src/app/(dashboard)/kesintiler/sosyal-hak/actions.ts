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

export type YillikIzinSinirSatir = { sicil_no: string; ad_soyad: string; gun: number }

/** Dönem yılında yıllık izin toplamı 50 gün ve üzeri olan personel. */
export async function sosyalHakYillikIzinSiniri(donemId: number): Promise<YillikIzinSinirSatir[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: donem } = await db
    .from('sosyal_hak_donem')
    .select('yil, baslangic_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  const yil = Number(donem?.yil) || Number(String(donem?.baslangic_tarihi ?? '').slice(0, 4))
  if (!yil) return []

  const satirlar: { sicil_no: string; gun: number }[] = []
  let from = 0
  while (true) {
    const { data, error } = await db
      .from('izin_hareketleri')
      .select('sicil_no, gun')
      .eq('yil', yil)
      .eq('tur', 'Yıllık İzin')
      .neq('durum', 'İptal Edildi')
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error || !data?.length) break
    for (const r of data as { sicil_no: string; gun: number | null }[]) {
      satirlar.push({ sicil_no: String(r.sicil_no ?? '').trim(), gun: Number(r.gun) || 0 })
    }
    if (data.length < 1000) break
    from += 1000
  }

  const toplam = new Map<string, number>()
  for (const r of satirlar) {
    if (!r.sicil_no) continue
    toplam.set(r.sicil_no, (toplam.get(r.sicil_no) ?? 0) + r.gun)
  }
  const siciller = [...toplam.entries()].filter(([, gun]) => gun >= 50).map(([sicil]) => sicil)
  if (siciller.length === 0) return []

  const { data: kisiler } = await db.from('calisan').select('sicil_no, ad_soyad').in('sicil_no', siciller)
  const ad = new Map<string, string>(
    ((kisiler ?? []) as { sicil_no: string; ad_soyad: string | null }[]).map(k => [k.sicil_no, k.ad_soyad ?? k.sicil_no]),
  )
  return siciller
    .map(sicil => ({ sicil_no: sicil, ad_soyad: ad.get(sicil) ?? sicil, gun: toplam.get(sicil) ?? 0 }))
    .sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))
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
