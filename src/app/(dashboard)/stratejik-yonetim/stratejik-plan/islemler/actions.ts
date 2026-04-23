'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function txt(v: FormDataEntryValue | null): string {
  return String(v ?? '').trim()
}

export async function donemEkle(fd: FormData): Promise<{ hata?: string }> {
  const donem_adi = txt(fd.get('donem_adi'))
  const baslangic_tarihi = txt(fd.get('baslangic_tarihi'))
  const bitis_tarihi = txt(fd.get('bitis_tarihi'))
  if (!donem_adi || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Dönem adı, başlangıç ve bitiş zorunludur.' }
  if (baslangic_tarihi > bitis_tarihi) return { hata: 'Başlangıç tarihi, bitiş tarihinden büyük olamaz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('stratejik_plan_donem' as never).insert({
    donem_adi,
    baslangic_tarihi,
    bitis_tarihi,
    aktif: true,
  } as never)
  if (error) return { hata: error.message }

  revalidatePath('/stratejik-yonetim/stratejik-plan/islemler')
  return {}
}

export async function donemGuncelle(id: number, fd: FormData): Promise<{ hata?: string }> {
  const donem_adi = txt(fd.get('donem_adi'))
  const baslangic_tarihi = txt(fd.get('baslangic_tarihi'))
  const bitis_tarihi = txt(fd.get('bitis_tarihi'))
  if (!donem_adi || !baslangic_tarihi || !bitis_tarihi) return { hata: 'Dönem adı, başlangıç ve bitiş zorunludur.' }
  if (baslangic_tarihi > bitis_tarihi) return { hata: 'Başlangıç tarihi, bitiş tarihinden büyük olamaz.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('stratejik_plan_donem' as never)
    .update({ donem_adi, baslangic_tarihi, bitis_tarihi } as never)
    .eq('id', id)
  if (error) return { hata: error.message }

  revalidatePath('/stratejik-yonetim/stratejik-plan/islemler')
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${id}`)
  return {}
}

export async function donemAktifPasifYap(id: number, aktif: boolean): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('stratejik_plan_donem' as never).update({ aktif } as never).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath('/stratejik-yonetim/stratejik-plan/islemler')
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${id}`)
  return {}
}

export async function amacEkle(donemId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const amac_adi = txt(fd.get('amac_adi'))
  if (!kodu || !amac_adi) return { hata: 'Kod ve amaç adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase.from('stratejik_plan_amac' as never).insert({
    donem_id: donemId,
    sira_no,
    kodu,
    amac_adi,
    aktif: true,
  } as never)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}`)
  return {}
}

export async function amacGuncelle(id: number, donemId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const amac_adi = txt(fd.get('amac_adi'))
  if (!kodu || !amac_adi) return { hata: 'Kod ve amaç adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('stratejik_plan_amac' as never)
    .update({ sira_no, kodu, amac_adi } as never)
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}`)
  return {}
}

export async function hedefEkle(amacId: number, donemId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const hedef_adi = txt(fd.get('hedef_adi'))
  if (!kodu || !hedef_adi) return { hata: 'Kod ve hedef adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase.from('stratejik_plan_hedef' as never).insert({
    amac_id: amacId,
    sira_no,
    kodu,
    hedef_adi,
    aktif: true,
  } as never)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}`)
  return {}
}

export async function hedefGuncelle(id: number, donemId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const hedef_adi = txt(fd.get('hedef_adi'))
  if (!kodu || !hedef_adi) return { hata: 'Kod ve hedef adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('stratejik_plan_hedef' as never)
    .update({ sira_no, kodu, hedef_adi } as never)
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}`)
  return {}
}

export async function altHedefEkle(hedefId: number, donemId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const alt_hedef_adi = txt(fd.get('alt_hedef_adi'))
  const mudurluk = txt(fd.get('mudurluk'))
  if (!kodu || !alt_hedef_adi || !mudurluk) return { hata: 'Kod, alt hedef adı ve müdürlük zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase.from('stratejik_plan_alt_hedef' as never).insert({
    hedef_id: hedefId,
    sira_no,
    kodu,
    alt_hedef_adi,
    mudurluk,
    aktif: true,
  } as never)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}`)
  return {}
}

export async function altHedefGuncelle(id: number, donemId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const alt_hedef_adi = txt(fd.get('alt_hedef_adi'))
  const mudurluk = txt(fd.get('mudurluk'))
  if (!kodu || !alt_hedef_adi || !mudurluk) return { hata: 'Kod, alt hedef adı ve müdürlük zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('stratejik_plan_alt_hedef' as never)
    .update({ sira_no, kodu, alt_hedef_adi, mudurluk } as never)
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}`)
  return {}
}

function num(v: FormDataEntryValue | null): number | null {
  const s = txt(v)
  if (!s) return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export async function gostergeEkle(altHedefId: number, donemId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const gosterge_adi = txt(fd.get('gosterge_adi'))
  const birim = txt(fd.get('birim'))
  if (!gosterge_adi || !birim) return { hata: 'Gösterge adı ve birim zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase.from('stratejik_plan_gosterge' as never).insert({
    alt_hedef_id: altHedefId,
    sira_no,
    gosterge_adi,
    birim,
    yil_1: num(fd.get('yil_1')),
    yil_2: num(fd.get('yil_2')),
    yil_3: num(fd.get('yil_3')),
    yil_4: num(fd.get('yil_4')),
    yil_5: num(fd.get('yil_5')),
    aktif: true,
  } as never)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}`)
  return {}
}

export async function gostergeTopluEkle(
  altHedefId: number,
  donemId: number,
  satirlar: {
    sira_no: number | null
    gosterge_adi: string
    birim: string
    yil_1: number | null
    yil_2: number | null
    yil_3: number | null
    yil_4: number | null
    yil_5: number | null
  }[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (!satirlar.length) return { kaydedilen: 0 }
  const temiz = satirlar
    .map(s => ({
      alt_hedef_id: altHedefId,
      sira_no: s.sira_no,
      gosterge_adi: String(s.gosterge_adi ?? '').trim(),
      birim: String(s.birim ?? '').trim(),
      yil_1: s.yil_1,
      yil_2: s.yil_2,
      yil_3: s.yil_3,
      yil_4: s.yil_4,
      yil_5: s.yil_5,
      aktif: true,
    }))
    .filter(s => s.gosterge_adi && s.birim)
  if (!temiz.length) return { hata: 'Toplu ekleme için en az bir geçerli satır giriniz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('stratejik_plan_gosterge' as never).insert(temiz as never)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}`)
  return { kaydedilen: temiz.length }
}

export async function gostergeGuncelle(id: number, donemId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const gosterge_adi = txt(fd.get('gosterge_adi'))
  const birim = txt(fd.get('birim'))
  if (!gosterge_adi || !birim) return { hata: 'Gösterge adı ve birim zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('stratejik_plan_gosterge' as never)
    .update({
      sira_no,
      gosterge_adi,
      birim,
      yil_1: num(fd.get('yil_1')),
      yil_2: num(fd.get('yil_2')),
      yil_3: num(fd.get('yil_3')),
      yil_4: num(fd.get('yil_4')),
      yil_5: num(fd.get('yil_5')),
    } as never)
    .eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}`)
  return {}
}

