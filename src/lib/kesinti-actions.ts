import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { IzinSatir } from '@/components/kesintiler/DonemListClient'
import {
  KESINTI_DONEM_AUDIT_SELECT,
  kesintiDonemAuditSnapshot,
  writeKesintiDonemAuditLogSafe,
} from '@/lib/kesinti-donem-audit'

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
    .select('id, donem_adi, donem_turu, baslangic_tarihi, bitis_tarihi')
    .eq('id', donemId)
    .maybeSingle()
  if (donemErr) return donemErr.message
  if (!donem) return 'Dönem bulunamadı.'

  const donemTuru = String((donem as { donem_turu?: string }).donem_turu ?? 'normal').trim() || 'normal'
  const { data: acikDonem } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id, donem_adi, donem_turu')
    .eq('durum', 'Açık')
    .eq('donem_turu', donemTuru)
    .neq('id', donemId)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (acikDonem) {
    return `Önce ${acikDonem.donem_adi ?? `#${acikDonem.id}`} (${acikDonem.donem_turu ?? 'normal'}) açık dönemini kapatın.`
  }

  const { data: oncekiDonem } = await supabase
    .from('aylik_yemek_yeni_donem')
    .select('id, donem_adi, donem_turu, bitis_tarihi, kapatildi_at')
    .eq('donem_turu', donemTuru)
    .lt('bitis_tarihi', donem.baslangic_tarihi)
    .order('bitis_tarihi', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (oncekiDonem && !oncekiDonem.kapatildi_at) {
    return `Önceki dönem (${oncekiDonem.donem_adi ?? `#${oncekiDonem.id}`}) için kapatılma zamanı (kapatildi_at) boş. AYY kuralı için önce bunu doldurun.`
  }

  return null
}

const KESINTI_MODUL: Record<DonemTablo, string> = {
  aylik_yemek_yeni_donem: 'AYY',
  raporlu_memurlar_yeni_donem: 'RMY',
  izinli_vekiller_yeni_donem: 'IVY',
  izinli_zabitalar_yeni_donem: 'IZY',
}

export function makeDonemActions(
  donemTablo: DonemTablo,
  secimTablo: SecimTablo,
  path: string,
  options?: { zabitaFilter?: boolean; vekilFilter?: boolean; memurFilter?: boolean; memurSozlesmeliFilter?: boolean }
) {
  const modul = KESINTI_MODUL[donemTablo]

  async function donemSnapshot(id: number) {
    const supabase = await createClient()
    const { data } = await supabase
      .from(donemTablo)
      .select(KESINTI_DONEM_AUDIT_SELECT)
      .eq('id', id)
      .maybeSingle()
    return data ? kesintiDonemAuditSnapshot(data as Record<string, unknown>) : null
  }

  async function donemEkle(fd: FormData): Promise<{ hata?: string }> {
    const yil              = parseInt(String(fd.get('yil') ?? '0'), 10)
    const baslangic_tarihi = str(fd, 'baslangic_tarihi')
    const bitis_tarihi     = str(fd, 'bitis_tarihi')
    if (!yil || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Yıl ve tarihler zorunludur.' }
    if (bitis_tarihi < baslangic_tarihi) return { hata: 'Bitiş tarihi başlangıçtan önce olamaz.' }

    const payload = {
      yil,
      sira_no:          str(fd, 'sira_no'),
      donem_adi:        str(fd, 'donem_adi'),
      ...(donemTablo === 'aylik_yemek_yeni_donem' ? { donem_turu: str(fd, 'donem_turu') ?? 'normal' } : {}),
      baslangic_tarihi,
      bitis_tarihi,
      durum:            'Açık' as const,
    }

    const supabase = await createClient()
    const { data: inserted, error } = await supabase
      .from(donemTablo)
      .insert(payload as never)
      .select('id')
      .single()

    if (error) return { hata: error.message }
    if (inserted?.id) {
      await writeKesintiDonemAuditLogSafe(supabase, {
        refTable: donemTablo,
        modul,
        donemId: inserted.id,
        islem: 'Ekle',
        ozet: `${payload.donem_adi ?? payload.sira_no ?? 'Dönem'} eklendi.`,
        sonraki: kesintiDonemAuditSnapshot(payload as Record<string, unknown>),
      })
    }
    revalidatePath(path)
    return {}
  }

  async function donemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
    const supabase = await createClient()
    const onceki = await donemSnapshot(id)
    const payload = {
      yil:              parseInt(String(fd.get('yil') ?? '0'), 10),
      sira_no:          str(fd, 'sira_no'),
      donem_adi:        str(fd, 'donem_adi'),
      ...(donemTablo === 'aylik_yemek_yeni_donem' ? { donem_turu: str(fd, 'donem_turu') ?? 'normal' } : {}),
      baslangic_tarihi: str(fd, 'baslangic_tarihi'),
      bitis_tarihi:     str(fd, 'bitis_tarihi'),
    }
    const { error } = await supabase.from(donemTablo).update(payload as never).eq('id', id)

    if (error) return { hata: error.message }
    await writeKesintiDonemAuditLogSafe(supabase, {
      refTable: donemTablo,
      modul,
      donemId: id,
      islem: 'Güncelle',
      ozet: `${payload.donem_adi ?? payload.sira_no ?? 'Dönem'} güncellendi.`,
      onceki,
      sonraki: kesintiDonemAuditSnapshot({ ...payload, durum: onceki?.durum ?? 'Açık' }),
    })
    revalidatePath(path)
    return {}
  }

  async function donemKapat(id: number): Promise<{ hata?: string }> {
    const supabase = await createClient()
    const onceki = await donemSnapshot(id)
    const patch: Record<string, unknown> = { durum: 'Kapalı' }
    if (donemTablo === 'aylik_yemek_yeni_donem') {
      patch.kapatildi_at = new Date().toISOString()
    }
    const { error } = await supabase.from(donemTablo).update(patch as never).eq('id', id)
    if (error) return { hata: error.message }
    await writeKesintiDonemAuditLogSafe(supabase, {
      refTable: donemTablo,
      modul,
      donemId: id,
      islem: 'Kapat',
      ozet: `${String(onceki?.donem_adi ?? onceki?.sira_no ?? id)} dönemi kapatıldı.`,
      onceki,
      sonraki: { ...onceki, durum: 'Kapalı' },
    })
    revalidatePath(path)
    return {}
  }

  async function donemAc(id: number): Promise<{ hata?: string }> {
    const supabase = await createClient()
    if (donemTablo === 'aylik_yemek_yeni_donem') {
      const kontrolHata = await ayyDonemAcilisKontrolu(supabase, id)
      if (kontrolHata) return { hata: kontrolHata }
    }
    const onceki = await donemSnapshot(id)
    const patch: Record<string, unknown> = { durum: 'Açık' }
    if (donemTablo === 'aylik_yemek_yeni_donem') {
      patch.kapatildi_at = null
    }
    const { error } = await supabase.from(donemTablo).update(patch as never).eq('id', id)
    if (error) return { hata: error.message }
    await writeKesintiDonemAuditLogSafe(supabase, {
      refTable: donemTablo,
      modul,
      donemId: id,
      islem: 'Aç',
      ozet: `${String(onceki?.donem_adi ?? onceki?.sira_no ?? id)} dönemi tekrar açıldı.`,
      onceki,
      sonraki: { ...onceki, durum: 'Açık' },
    })
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
        .select('asil, vekil, kadro_mudurlugu, ayrilis_tarihi')
        .is('ayrilis_tarihi', null)
      ozelSiciller = new Set<string>()
      for (const k of kadroRaw ?? []) {
        const mud = (k.kadro_mudurlugu ?? '').trim()
        if (mud !== ZABITA_MUDURLUGU) continue
        const sicil = (k.asil ?? k.vekil ?? '').trim()
        if (sicil) ozelSiciller.add(sicil)
      }
    } else if (options?.vekilFilter) {
      const { data: kadroRaw } = await supabase
        .from('kadro_hareketleri')
        .select('asil, vekil, kadro_unvani, gorev_unvani, ayrilis_tarihi')
        .is('ayrilis_tarihi', null)
      ozelSiciller = new Set<string>()
      const asilMuduruSiciller = new Set<string>()
      for (const k of kadroRaw ?? []) {
        const sicil = (k.vekil ?? '').trim()
        if (sicil) ozelSiciller.add(sicil)
        const asil = (k.asil ?? '').trim()
        if (!asil) continue
        const unvan = `${String(k.kadro_unvani ?? '').toLocaleLowerCase('tr-TR')} ${String(k.gorev_unvani ?? '').toLocaleLowerCase('tr-TR')}`
        if (unvan.includes('müdürü')) asilMuduruSiciller.add(asil)
      }
      for (const sicil of asilMuduruSiciller) {
        ozelSiciller.delete(sicil)
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
        .in('tur', ['Rapor', 'Refakatçi Raporu', 'Refakatçi İzni'])
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
    const adMap: Record<string, string> = {}
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
