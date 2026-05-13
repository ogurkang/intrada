'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const PATH = '/kesintiler/sosyal-hak'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

export async function donemEkle(fd: FormData): Promise<{ hata?: string }> {
  const yil              = parseInt(String(fd.get('yil') ?? '0'), 10)
  const baslangic_tarihi = str(fd, 'baslangic_tarihi')
  const bitis_tarihi     = str(fd, 'bitis_tarihi')
  if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }
  if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('sosyal_hak_donem').insert({
    yil,
    sira_no:          str(fd, 'sira_no'),
    donem_adi:        str(fd, 'donem_adi'),
    baslangic_tarihi,
    bitis_tarihi,
    durum:            'Açık',
  })

  if (error) return { hata: (error as { message: string }).message }
  revalidatePath(PATH)
  return {}
}

export async function donemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('sosyal_hak_donem').update({
    yil:              parseInt(String(fd.get('yil') ?? '0'), 10),
    sira_no:          str(fd, 'sira_no'),
    donem_adi:        str(fd, 'donem_adi'),
    baslangic_tarihi: str(fd, 'baslangic_tarihi'),
    bitis_tarihi:     str(fd, 'bitis_tarihi'),
  }).eq('id', id)

  if (error) return { hata: (error as { message: string }).message }
  revalidatePath(PATH)
  return {}
}

export async function donemKapat(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('sosyal_hak_donem').update({ durum: 'Kapalı' }).eq('id', id)
  if (error) return { hata: (error as { message: string }).message }
  revalidatePath(PATH)
  return {}
}

export async function donemAc(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('sosyal_hak_donem').update({ durum: 'Açık' }).eq('id', id)
  if (error) return { hata: (error as { message: string }).message }
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
