import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { IzinSatir } from '@/components/kesintiler/DonemListClient'

type DonemTablo = 'aylik_yemek_yeni_donem' | 'raporlu_memurlar_yeni_donem' | 'izinli_vekiller_yeni_donem' | 'izinli_zabitalar_yeni_donem'
type SecimTablo = 'aylik_yemek_yeni_secim' | 'raporlu_memurlar_yeni_secim' | 'izinli_vekiller_yeni_secim' | 'izinli_zabitalar_yeni_secim'

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

const ZABITA_MUDURLUGU = 'Zabıta Müdürlüğü'

async function ayyDonemAcilisKontrolu(
  supabase: Awaited<ReturnType<typeof createClient>>,
  donemId: number,
): Promise<string | null> {
  const { data: donem, error: donemErr } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id, donem_adi, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  if (donemErr) return donemErr.message
  if (!donem) return 'Dönem bulunamadı.'

  const { data: acikDonem } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id, donem_adi')
    .eq('durum', 'Açık')
    .neq('id', donemId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (acikDonem) {
    return `Önce ${acikDonem.donem_adi ?? `#${acikDonem.id}`} açık dönemini kapatın.`
  }

  const { data: oncekiDonem } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id, donem_adi, bitis_tarihi, kapatildi_at')
    .lt('bitis_tarihi', donem.baslangic_tarihi)
    .order('bitis_tarihi', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (oncekiDonem && !oncekiDonem.kapatildi_at) {
    return `Önceki dönem (${oncekiDonem.donem_adi ?? `#${oncekiDonem.id}`}) için kapatılma zamanı (kapatildi_at) boş. AYY kuralı için önce bunu doldurun.`
  }

  return null
}

export function makeDonemActions(
  donemTablo: DonemTablo,
  secimTablo: SecimTablo,
  path: string,
  options?: { zabitaFilter?: boolean; vekilFilter?: boolean; memurFilter?: boolean; memurSozlesmeliFilter?: boolean }
) {
  async function donemEkle(fd: FormData): Promise<{ hata?: string }> {
    const yil              = parseInt(String(fd.get('yil') ?? '0'), 10)
    const baslangic_tarihi = str(fd, 'baslangic_tarihi')
    const bitis_tarihi     = str(fd, 'bitis_tarihi')
    if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }
    if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

    const supabase = await createClient()
    const { error } = await supabase.from(donemTablo).insert({
      yil,
      sira_no:          str(fd, 'sira_no'),
      donem_adi:        str(fd, 'donem_adi'),
      baslangic_tarihi,
      bitis_tarihi,
      durum:            'Açık',
    } as never)

    if (error) return { hata: error.message }
    revalidatePath(path)
    return {}
  }

  async function donemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
    const supabase = await createClient()
    const { error } = await supabase.from(donemTablo).update({
      yil:              parseInt(String(fd.get('yil') ?? '0'), 10),
      sira_no:          str(fd, 'sira_no'),
      donem_adi:        str(fd, 'donem_adi'),
      baslangic_tarihi: str(fd, 'baslangic_tarihi'),
      bitis_tarihi:     str(fd, 'bitis_tarihi'),
    } as never).eq('id', id)

    if (error) return { hata: error.message }
    revalidatePath(path)
    return {}
  }

  async function donemKapat(id: number): Promise<{ hata?: string }> {
    const supabase = await createClient()
    const patch: Record<string, unknown> = { durum: 'Kapalı' }
    if (donemTablo === 'aylik_yemek_yeni_donem') {
      patch.kapatildi_at = new Date().toISOString()
    }
    const { error } = await supabase.from(donemTablo).update(patch as never).eq('id', id)
    if (error) return { hata: error.message }
    revalidatePath(path)
    return {}
  }

  async function donemAc(id: number): Promise<{ hata?: string }> {
    const supabase = await createClient()
    if (donemTablo === 'aylik_yemek_yeni_donem') {
      const kontrolHata = await ayyDonemAcilisKontrolu(supabase, id)
      if (kontrolHata) return { hata: kontrolHata }
    }
    const patch: Record<string, unknown> = { durum: 'Açık' }
    if (donemTablo === 'aylik_yemek_yeni_donem') {
      patch.kapatildi_at = null
    }
    const { error } = await supabase.from(donemTablo).update(patch as never).eq('id', id)
    if (error) return { hata: error.message }
    revalidatePath(path)
    return {}
  }

  async function secimGetir(donem_id: number): Promise<{
    izinler: IzinSatir[]
    secimler: { izin_sira_no: string; dahil: boolean }[]
  }> {
    const supabase = await createClient()

    // Dönem tarih aralığını al
    const { data: donemRow } = await supabase
      .from(donemTablo)
      .select('baslangic_tarihi, bitis_tarihi')
      .eq('id', donem_id)
      .single()

    if (!donemRow) return { izinler: [], secimler: [] }

    // Zabıta Müdürlüğü filtresi (IZY) veya Vekil filtresi (IVY)
    let ozelSiciller: Set<string> | null = null
    if (options?.zabitaFilter) {
      const { data: kadroRaw } = await supabase
        .from('kadro_hareketleri')
        .select('asil, vekil, gorev_mudurlugu, kadro_mudurlugu, ayrilis_tarihi')
        .is('ayrilis_tarihi', null)
      ozelSiciller = new Set<string>()
      for (const k of kadroRaw ?? []) {
        const mud = (k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '').trim()
        if (mud !== ZABITA_MUDURLUGU) continue
        const sicil = (k.asil ?? k.vekil ?? '').trim()
        if (sicil) ozelSiciller.add(sicil)
      }
    } else if (options?.vekilFilter) {
      const { data: kadroRaw } = await supabase
        .from('kadro_hareketleri')
        .select('vekil, ayrilis_tarihi')
        .is('ayrilis_tarihi', null)
      ozelSiciller = new Set<string>()
      for (const k of kadroRaw ?? []) {
        const sicil = (k.vekil ?? '').trim()
        if (sicil) ozelSiciller.add(sicil)
      }
    } else if (options?.memurFilter) {
      const { data: kadroRaw } = await supabase
        .from('kadro_hareketleri')
        .select('asil, vekil, statu, ayrilis_tarihi')
        .is('ayrilis_tarihi', null)
        .eq('statu', 'Memur')
      ozelSiciller = new Set<string>()
      for (const k of kadroRaw ?? []) {
        const sicil = (k.asil ?? k.vekil ?? '').trim()
        if (sicil) ozelSiciller.add(sicil)
      }
    } else if (options?.memurSozlesmeliFilter) {
      const { data: kadroRaw } = await supabase
        .from('kadro_hareketleri')
        .select('asil, vekil, statu, ayrilis_tarihi')
        .is('ayrilis_tarihi', null)
        .in('statu', ['Memur', 'Sözleşmeli'])
      ozelSiciller = new Set<string>()
      for (const k of kadroRaw ?? []) {
        const sicil = (k.asil ?? k.vekil ?? '').trim()
        if (sicil) ozelSiciller.add(sicil)
      }
    }

    // Bu dönemdeki mevcut seçimler
    const { data: secimRaw } = await supabase
      .from(secimTablo)
      .select('izin_sira_no, dahil')
      .eq('donem_id', donem_id)

    // IZY (zabitaFilter): Zabıta'ya ait TÜM izinler — İptal hariç; tür: Yıllık, Ölüm, Evlilik, Babalık, Mehil, Mazeret, İdari, DÖÇ, DSÇ
    // IVY (vekilFilter): Vekil personelin TÜM izinleri — İptal hariç, tüm türler
    // Diğer modüller: dönem aralığındaki izinler, İptal hariç
    const IZY_IZIN_TURLERI = 'tur.ilike.%Yıllık%,tur.ilike.%Ölüm%,tur.ilike.%Evlilik%,tur.ilike.%Babalık%,tur.ilike.%Mehil%,tur.ilike.%Mazeret%,tur.ilike.%İdari%,tur.ilike.%Doğum Öncesi%,tur.ilike.%Doğum Sonrası%'
    let izinQuery = supabase
      .from('izin_hareketleri')
      .select('sira_no, sicil_no, tur, baslama, ayrilis, gun')
      .order('baslama')
    if (options?.zabitaFilter) {
      izinQuery = izinQuery
        .neq('durum', 'İptal Edildi')
        .or(IZY_IZIN_TURLERI)
        .limit(500)
      if (ozelSiciller && ozelSiciller.size > 0) {
        izinQuery = izinQuery.in('sicil_no', [...ozelSiciller])
      }
    } else if (options?.vekilFilter) {
      izinQuery = izinQuery
        .neq('durum', 'İptal Edildi')
        .limit(500)
      if (ozelSiciller && ozelSiciller.size > 0) {
        izinQuery = izinQuery.in('sicil_no', [...ozelSiciller])
      }
    } else if (options?.memurFilter) {
      izinQuery = izinQuery
        .neq('durum', 'İptal Edildi')
        .in('tur', ['Rapor', 'Refakatçi Raporu'])
        .limit(500)
      if (ozelSiciller && ozelSiciller.size > 0) {
        izinQuery = izinQuery.in('sicil_no', [...ozelSiciller])
      }
    } else if (options?.memurSozlesmeliFilter) {
      izinQuery = izinQuery
        .neq('durum', 'İptal Edildi')
        .limit(500)
      if (ozelSiciller && ozelSiciller.size > 0) {
        izinQuery = izinQuery.in('sicil_no', [...ozelSiciller])
      }
    } else {
      izinQuery = izinQuery
        .lte('baslama', donemRow.bitis_tarihi)
        .gte('ayrilis', donemRow.baslangic_tarihi)
        .neq('durum', 'İptal Edildi')
        .limit(200)
    }
    const { data: izinRaw } = await izinQuery

    // Çalışan adlarını eşle
    const sicilNolar = [...new Set((izinRaw ?? []).map(i => i.sicil_no).filter(Boolean))]
    let adMap: Record<string, string> = {}
    if (sicilNolar.length > 0) {
      const { data: calisanlar } = await supabase
        .from('calisan')
        .select('sicil_no, ad_soyad')
        .in('sicil_no', sicilNolar as string[])
      ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
    }

    let izinList = (izinRaw ?? []).map(i => ({
      sira_no:  i.sira_no,
      sicil_no: i.sicil_no,
      ad_soyad: i.sicil_no ? (adMap[i.sicil_no] ?? i.sicil_no) : null,
      tur:      i.tur,
      baslama:  i.baslama,
      ayrilis:  i.ayrilis,
      gun:      i.gun,
    }))
    if (ozelSiciller && ozelSiciller.size > 0) {
      izinList = izinList.filter(i => i.sicil_no && ozelSiciller!.has(i.sicil_no))
    }
    const izinler: IzinSatir[] = izinList

    return {
      izinler,
      secimler: (secimRaw ?? []).map(s => ({ izin_sira_no: s.izin_sira_no, dahil: s.dahil })),
    }
  }

  async function secimKaydet(
    donem_id: number,
    secimler: { izin_sira_no: string; dahil: boolean }[]
  ): Promise<{ hata?: string }> {
    const supabase = await createClient()

    // Mevcut seçimleri sil, yenilerini ekle (sil-yaz)
    await supabase.from(secimTablo).delete().eq('donem_id', donem_id)

    if (secimler.length > 0) {
      const { error } = await supabase.from(secimTablo).insert(
        secimler.map(s => ({ donem_id, izin_sira_no: s.izin_sira_no, dahil: s.dahil })) as never[]
      )
      if (error) return { hata: error.message }
    }

    revalidatePath(path)
    return {}
  }

  return { donemEkle, donemGuncelle, donemKapat, donemAc, secimGetir, secimKaydet }
}
