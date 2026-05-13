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
  const { error } = await supabase.from('sosyal_hak_donem').insert({
    yil,
    sira_no:          str(fd, 'sira_no'),
    donem_adi:        str(fd, 'donem_adi'),
    baslangic_tarihi,
    bitis_tarihi,
    durum:            'Açık',
  } as never)

  if (error) return { hata: error.message }
  revalidatePath(PATH)
  return {}
}

export async function donemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('sosyal_hak_donem').update({
    yil:              parseInt(String(fd.get('yil') ?? '0'), 10),
    sira_no:          str(fd, 'sira_no'),
    donem_adi:        str(fd, 'donem_adi'),
    baslangic_tarihi: str(fd, 'baslangic_tarihi'),
    bitis_tarihi:     str(fd, 'bitis_tarihi'),
  } as never).eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(PATH)
  return {}
}

export async function donemKapat(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('sosyal_hak_donem').update({ durum: 'Kapalı' } as never).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(PATH)
  return {}
}

export async function donemAc(id: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('sosyal_hak_donem').update({ durum: 'Açık' } as never).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(PATH)
  return {}
}

// secimGetir: DonemListClient'in beklediği interface'i karşılar (sosyal-hak'ta kullanılmıyor ama tip uyumu için)
export async function secimGetir(donem_id: number): Promise<{
  izinler: { sira_no: string | null; sicil_no: string | null; ad_soyad: string | null; tur: string | null; baslama: string | null; ayrilis: string | null; gun: number | null }[]
  secimler: { izin_sira_no: string; dahil: boolean }[]
}> {
  const supabase = await createClient()
  const { data: secimRaw } = await supabase
    .from('sosyal_hak_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donem_id)
  return {
    izinler: [],
    secimler: (secimRaw ?? []).map(s => ({ izin_sira_no: s.izin_sira_no, dahil: s.dahil })),
  }
}

export async function secimKaydet(
  donem_id: number,
  secimler: { izin_sira_no: string; dahil: boolean }[]
): Promise<{ hata?: string }> {
  const supabase = await createClient()
  await supabase.from('sosyal_hak_secim').delete().eq('donem_id', donem_id)
  if (secimler.length > 0) {
    const { error } = await supabase.from('sosyal_hak_secim').insert(
      secimler.map(s => ({ donem_id, izin_sira_no: s.izin_sira_no, dahil: s.dahil })) as never[]
    )
    if (error) return { hata: error.message }
  }
  revalidatePath(PATH)
  return {}
}
