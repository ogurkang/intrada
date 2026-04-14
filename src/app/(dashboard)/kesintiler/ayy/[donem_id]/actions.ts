'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  ayyBuildIzinHavuzu,
  ayyGetMemurSozlesmeliSiciller,
  ayyGetOncekiDonem,
  ayyIzinDbToAyyIzinRow,
  ayyLoadDonem,
  ayyLoadStatuBazliPersonel,
  ayyLoadTatiller,
  ayySdSonrakiDonemIcin,
  createAyyHavuzMemo,
} from '@/lib/ayy-donem-havuz'
import { ayyHesapla } from '@/lib/ayy-hesap'

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

  const donem = await ayyLoadDonem(supabase, donem_id)
  if (!donem) return { hata: 'Dönem bulunamadı.' }

  const memo = createAyyHavuzMemo()
  const poolRaw = await ayyBuildIzinHavuzu(supabase, donem_id, donem, memo)

  const siciller = [...new Set(poolRaw.map(i => i.sicil_no).filter(Boolean))] as string[]
  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', siciller)
    ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }

  const tumIzinler: AyyDetayIzin[] = poolRaw.map(i => ({
    sira_no:  i.sira_no!,
    sicil_no: i.sicil_no ?? '',
    ad_soyad: adMap[i.sicil_no ?? ''] ?? i.sicil_no ?? '',
    tur:      i.tur ?? '',
    ayrilis:  i.ayrilis ?? '',
    baslama:  i.baslama ?? '',
    gun:      i.gun ?? 0,
  }))

  const { data: secimRaw } = await supabase
    .from('aylik_yemek_yeni_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donem_id)
  const haricSet = new Set<string>()
  ;(secimRaw ?? []).forEach(s => { if (s.dahil === false && s.izin_sira_no) haricSet.add(s.izin_sira_no) })

  const islenecek: AyyDetayIzin[] = tumIzinler.filter(iz => !haricSet.has(iz.sira_no))
  const aday: AyyDetayIzin[] = tumIzinler.filter(iz => haricSet.has(iz.sira_no))

  return {
    donem: {
      id: donem.id,
      donem_adi: donem.donem_adi,
      baslangic_tarihi: donem.baslangic_tarihi,
      bitis_tarihi: donem.bitis_tarihi,
      durum: donem.durum as 'Açık' | 'Kapalı' | undefined,
    },
    aday,
    islenecek,
  }
}

/** Özet önizleme: havuz + OD ile tek hesap (istemci ile aynı kaynak). */
export async function ayyOzetHesapla(donem_id: number): Promise<
  | { hata: string }
  | { donem: AyyDetayData['donem']; sonuc: ReturnType<typeof ayyHesapla>; tatilSayisi: number }
> {
  const supabase = await createClient()
  const donem = await ayyLoadDonem(supabase, donem_id)
  if (!donem) return { hata: 'Dönem bulunamadı.' }

  const memo = createAyyHavuzMemo()
  const poolRaw = await ayyBuildIzinHavuzu(supabase, donem_id, donem, memo)
  const { data: secimRaw } = await supabase
    .from('aylik_yemek_yeni_secim')
    .select('izin_sira_no, dahil')
    .eq('donem_id', donem_id)
  const haricSet = new Set<string>()
  ;(secimRaw ?? []).forEach(s => { if (s.dahil === false && s.izin_sira_no) haricSet.add(s.izin_sira_no) })
  const dahilRaw = poolRaw.filter(r => !haricSet.has(String(r.sira_no)))

  const tatiller = await ayyLoadTatiller(supabase)
  const izinler = await ayyIzinDbToAyyIzinRow(supabase, dahilRaw)
  const odBySiraNo = await ayySdSonrakiDonemIcin(supabase, donem_id, donem, tatiller, memo)
  const prevIzBySiraNo = memo.prevIzDoneme.get(donem_id) ?? {}
  const prevPersonelIzOverflowBySicilNo = memo.prevPersonelIzOverflow.get(donem_id) ?? {}
  const onceki = await ayyGetOncekiDonem(supabase, donem.baslangic_tarihi)
  const memurSet = await ayyGetMemurSozlesmeliSiciller(supabase)
  const statuBazliPersonel = await ayyLoadStatuBazliPersonel(supabase, memurSet)

  const sonuc = ayyHesapla({
    donemBas: donem.baslangic_tarihi,
    donemBit: donem.bitis_tarihi,
    izinler,
    tatiller,
    odBySiraNo,
    prevIzBySiraNo,
    prevPersonelIzOverflowBySicilNo,
    oncekiDonem: onceki
      ? {
          baslangic_tarihi: onceki.baslangic_tarihi,
          bitis_tarihi:     onceki.bitis_tarihi,
          kapatildi_at:     onceki.kapatildi_at ?? null,
        }
      : undefined,
    statuBazliPersonel,
  })

  return {
    donem: {
      id: donem.id,
      donem_adi: donem.donem_adi,
      baslangic_tarihi: donem.baslangic_tarihi,
      bitis_tarihi: donem.bitis_tarihi,
      durum: donem.durum as 'Açık' | 'Kapalı' | undefined,
    },
    sonuc,
    tatilSayisi: tatiller.length,
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
