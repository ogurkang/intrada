'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface RmyDetayIzin {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  tur:      string
  ayrilis:  string
  baslama:  string
  gun:      number
}

export interface RmyDetayData {
  donem:    { id: number; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string }
  aday:     RmyDetayIzin[]
  islenecek: RmyDetayIzin[]
}

export async function rmyDetayYukle(donem_id: number): Promise<RmyDetayData | { hata: string }> {
  const supabase = await createClient()

  const { data: donem } = await supabase
    .from('raporlu_memurlar_yeni_donem')
    .select('id, donem_adi, sira_no, baslangic_tarihi, bitis_tarihi')
    .eq('id', donem_id)
    .single()
  if (!donem) return { hata: 'Dönem bulunamadı.' }

  // Statüsü Memur olan personel (kadro_hareketleri: ayrılış boş, statu = Memur)
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, statu, ayrilis_tarihi')
    .is('ayrilis_tarihi', null)
    .eq('statu', 'Memur')
  const memurSiciller = new Set<string>()
  for (const k of kadroRaw ?? []) {
    const sicil = (k.asil ?? k.vekil ?? '').trim()
    if (sicil) memurSiciller.add(sicil)
  }
  if (memurSiciller.size === 0) {
    return {
      donem: { id: donem.id, donem_adi: donem.donem_adi ?? donem.sira_no, baslangic_tarihi: donem.baslangic_tarihi, bitis_tarihi: donem.bitis_tarihi },
      aday: [],
      islenecek: [],
    }
  }

  // Memur personelin Rapor, Heyet Raporu ve Refakatçi İzni izinleri — İptal hariç
  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sira_no, sicil_no, tur, ayrilis, baslama, gun')
    .neq('durum', 'İptal Edildi')
    .in('tur', ['Rapor', 'Heyet Raporu', 'Refakatçi Raporu', 'Refakatçi İzni'])
    .in('sicil_no', Array.from(memurSiciller))
    .order('baslama')
    .limit(500)

  const siciller = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', siciller)
    ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }

  const tumIzinler: RmyDetayIzin[] = (izinRaw ?? [])
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

  // Bu dönemin seçimleri (dahil=true)
  const { data: secimRaw } = await supabase
    .from('raporlu_memurlar_yeni_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donem_id)
  const buDonemSecili = new Set<string>()
  ;(secimRaw ?? []).forEach(s => { if (s.dahil && s.izin_sira_no) buDonemSecili.add(s.izin_sira_no) })

  // Tüm dönemlerde dahil olan sira_no (başka dönemde seçilmiş)
  const { data: tumSecimRaw } = await supabase
    .from('raporlu_memurlar_yeni_secim')
    .select('donem_id, izin_sira_no, dahil')
  const tumSeciliSet = new Set<string>()
  ;(tumSecimRaw ?? []).forEach(s => {
    if (s.dahil && s.izin_sira_no && s.donem_id !== donem_id) tumSeciliSet.add(s.izin_sira_no)
  })

  // Bu döneme seçilmiş → islenecek. Hiçbir döneme eklenmemiş → her zaman aday. Başka döneme eklenmiş → adayda gösterme.
  const islenecek: RmyDetayIzin[] = []
  const aday: RmyDetayIzin[] = []
  for (const iz of tumIzinler) {
    if (buDonemSecili.has(iz.sira_no)) {
      islenecek.push(iz)
    } else if (!tumSeciliSet.has(iz.sira_no)) {
      aday.push(iz)
    }
  }

  return {
    donem: { id: donem.id, donem_adi: donem.donem_adi ?? donem.sira_no, baslangic_tarihi: donem.baslangic_tarihi, bitis_tarihi: donem.bitis_tarihi },
    aday,
    islenecek,
  }
}

export async function rmySecimleriKaydet(donem_id: number, siraNoList: string[]): Promise<{ hata?: string }> {
  const supabase = await createClient()
  await supabase.from('raporlu_memurlar_yeni_secim').delete().eq('donem_id', donem_id)
  if (siraNoList.length > 0) {
    const { error } = await supabase.from('raporlu_memurlar_yeni_secim').insert(
      siraNoList.map(izin_sira_no => ({ donem_id, izin_sira_no, dahil: true })) as never[]
    )
    if (error) return { hata: error.message }
  }
  revalidatePath(`/kesintiler/rmy/${donem_id}`)
  revalidatePath('/kesintiler/rmy')
  return {}
}
