'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface AyyDetayIzin {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  tur:      string
  ayrilis:  string
  baslama:  string
  gun:      number
}

export interface AyyDetayData {
  donem:    { id: number; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string; durum?: 'Açık' | 'Kapalı' }
  aday:     AyyDetayIzin[]
  islenecek: AyyDetayIzin[]
}

export async function ayyDetayYukle(donem_id: number): Promise<AyyDetayData | { hata: string }> {
  const supabase = await createClient()

  const { data: donem } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id, donem_adi, sira_no, baslangic_tarihi, bitis_tarihi, durum')
    .eq('id', donem_id)
    .single()
  if (!donem) return { hata: 'Dönem bulunamadı.' }

  // Memur ve Sözleşmeli siciller
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, statu, ayrilis_tarihi')
    .is('ayrilis_tarihi', null)
    .in('statu', ['Memur', 'Sözleşmeli'])
  const memurSozlesmeliSiciller = new Set<string>()
  for (const k of kadroRaw ?? []) {
    const sicil = (k.asil ?? k.vekil ?? '').trim()
    if (sicil) memurSozlesmeliSiciller.add(sicil)
  }
  if (memurSozlesmeliSiciller.size === 0) {
    return {
      donem: { id: donem.id, donem_adi: donem.donem_adi ?? donem.sira_no, baslangic_tarihi: donem.baslangic_tarihi, bitis_tarihi: donem.bitis_tarihi, durum: donem.durum },
      aday: [],
      islenecek: [],
    }
  }

  // AYY detay listesi yalnızca dönemle ilişkili izinleri göstermeli.
  // İzin aralığı [ayrilis, baslama-1] olduğundan, dönemle kesişim koşulu:
  //   ayrilis <= donem.bitis  VE  baslama > donem.baslangic
  // Böylece eski dönemde tamamen bitmiş (SD=0) kayıtlar yeni döneme taşınmaz.
  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
    .neq('durum', 'İptal Edildi')
    .lte('ayrilis', donem.bitis_tarihi)
    .gt('baslama', donem.baslangic_tarihi)
    .in('sicil_no', Array.from(memurSozlesmeliSiciller))
    .order('baslama')
    .limit(2000)

  const siciller = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', siciller)
    ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }

  const tumIzinler: AyyDetayIzin[] = (izinRaw ?? [])
    .filter(i => i.sira_no && i.ayrilis && i.baslama)
    .map(i => ({
      sira_no:  i.sira_no!,
      sicil_no: i.sicil_no ?? '',
      ad_soyad: adMap[i.sicil_no] ?? i.sicil_no ?? '',
      tur:      i.tur ?? '',
      ayrilis:  i.ayrilis ?? '',
      baslama:  i.baslama ?? '',
      gun:      i.gun ?? 0,
    }))

  // AYY: Varsayılan olarak TÜM izinler dahil. Sadece dahil=false (hariç) kayıtlı olanlar çıkarılır.
  const { data: secimRaw } = await supabase
    .from('aylik_yemek_yeni_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donem_id)
  const haricSet = new Set<string>()
  ;(secimRaw ?? []).forEach(s => { if (s.dahil === false && s.izin_sira_no) haricSet.add(s.izin_sira_no) })

  const islenecek: AyyDetayIzin[] = tumIzinler.filter(iz => !haricSet.has(iz.sira_no))
  const aday: AyyDetayIzin[] = tumIzinler.filter(iz => haricSet.has(iz.sira_no))

  return {
    donem: { id: donem.id, donem_adi: donem.donem_adi ?? donem.sira_no, baslangic_tarihi: donem.baslangic_tarihi, bitis_tarihi: donem.bitis_tarihi, durum: donem.durum },
    aday,
    islenecek,
  }
}

/** islenecek = kesintiye dahil, aday = hariç tutulan. Sadece hariç tutulanları (aday) kaydeder. */
export async function ayySecimleriKaydet(donem_id: number, haricSiraNoList: string[]): Promise<{ hata?: string }> {
  const supabase = await createClient()
  await supabase.from('aylik_yemek_yeni_secim').delete().eq('donem_id', donem_id)
  if (haricSiraNoList.length > 0) {
    const { error } = await supabase.from('aylik_yemek_yeni_secim').insert(
      haricSiraNoList.map(izin_sira_no => ({ donem_id, izin_sira_no, dahil: false })) as never[]
    )
    if (error) return { hata: error.message }
  }
  revalidatePath(`/kesintiler/ayy/${donem_id}`)
  revalidatePath('/kesintiler/ayy')
  return {}
}
