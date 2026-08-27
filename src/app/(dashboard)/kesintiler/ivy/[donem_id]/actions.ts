'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchAllPaged } from '@/lib/supabase-sayfala'
import { buildVekilSiciller } from '@/lib/kesintiler-kadro'
import { revalidatePath } from 'next/cache'

export interface IvyDetayIzin {
  sira_no:  string
  sicil_no: string
  ad_soyad: string
  tur:      string
  ayrilis:  string
  baslama:  string
  gun:      number
}

export interface IvyDetayData {
  donem:    { id: number; donem_adi: string | null; baslangic_tarihi: string; bitis_tarihi: string }
  aday:     IvyDetayIzin[]
  islenecek: IvyDetayIzin[]
}

export async function ivyDetayYukle(donem_id: number): Promise<IvyDetayData | { hata: string }> {
  const supabase = await createClient()

  const { data: donem } = await supabase
    .from('izinli_vekiller_yeni_donem')
    .select('id, donem_adi, sira_no, baslangic_tarihi, bitis_tarihi')
    .eq('id', donem_id)
    .single()
  if (!donem) return { hata: 'Dönem bulunamadı.' }

  const vekilSiciller = await buildVekilSiciller(supabase)
  if (vekilSiciller.size === 0) {
    return {
      donem: { id: donem.id, donem_adi: donem.donem_adi ?? donem.sira_no, baslangic_tarihi: donem.baslangic_tarihi, bitis_tarihi: donem.bitis_tarihi },
      aday: [],
      islenecek: [],
    }
  }

  // Vekil personelin TÜM izinleri — İptal hariç, tüm türler
  const { data: izinRaw } = await fetchAllPaged((from, to) =>
    supabase
      .from('izin_hareketleri')
      .select('sira_no, sicil_no, tur, ayrilis, baslama, gun, yil')
      .neq('yil', 2025)
      .neq('durum', 'İptal Edildi')
      .in('sicil_no', Array.from(vekilSiciller))
      .order('id')
      .range(from, to),
  )

  const siciller = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))] as string[]
  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', siciller)
    ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }

  const tumIzinler: IvyDetayIzin[] = (izinRaw ?? [])
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
    .from('izinli_vekiller_yeni_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donem_id)
  const buDonemSecili = new Set<string>()
  ;(secimRaw ?? []).forEach(s => { if (s.dahil && s.izin_sira_no) buDonemSecili.add(s.izin_sira_no) })

  // Tüm dönemlerde dahil olan sira_no (başka dönemde seçilmiş)
  const { data: tumSecimRaw } = await supabase
    .from('izinli_vekiller_yeni_secim')
    .select('donem_id, izin_sira_no, dahil')
  const tumSeciliSet = new Set<string>()
  ;(tumSecimRaw ?? []).forEach(s => {
    if (s.dahil && s.izin_sira_no && s.donem_id !== donem_id) tumSeciliSet.add(s.izin_sira_no)
  })

  // Bu döneme seçilmiş → islenecek. Hiçbir döneme eklenmemiş → her zaman aday. Başka döneme eklenmiş → adayda gösterme.
  const islenecek: IvyDetayIzin[] = []
  const aday: IvyDetayIzin[] = []
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

export async function ivySecimleriKaydet(donem_id: number, siraNoList: string[]): Promise<{ hata?: string }> {
  const supabase = await createClient()
  await supabase.from('izinli_vekiller_yeni_secim').delete().eq('donem_id', donem_id)
  if (siraNoList.length > 0) {
    const { error } = await supabase.from('izinli_vekiller_yeni_secim').insert(
      siraNoList.map(izin_sira_no => ({ donem_id, izin_sira_no, dahil: true })) as never[]
    )
    if (error) return { hata: error.message }
  }
  revalidatePath(`/kesintiler/ivy/${donem_id}`)
  revalidatePath('/kesintiler/ivy')
  return {}
}
