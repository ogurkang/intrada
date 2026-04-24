'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'

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

function normMud(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

function tamamlananCeyrek(yil: number): number {
  const now = new Date()
  const simdikiYil = now.getFullYear()
  if (yil < simdikiYil) return 4
  if (yil > simdikiYil) return 0
  return Math.floor(now.getMonth() / 3)
}

async function veriGirisAyar(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ yoneticiMudurlukler: string[]; kullaniciMudurlukler: string[]; tumunuGorebilir: boolean }> {
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user
  if (!user) return { yoneticiMudurlukler: [], kullaniciMudurlukler: [], tumunuGorebilir: false }

  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'blocked') return { yoneticiMudurlukler: [], kullaniciMudurlukler: [], tumunuGorebilir: false }

  const { data: yetkiRows } = await supabase
    .from('stratejik_plan_veri_giris_yetki_mudurluk' as never)
    .select('mudurluk_adi')
    .eq('aktif', true)

  const yoneticiMudurlukler = (yetkiRows ?? [])
    .map(r => String((r as { mudurluk_adi?: string }).mudurluk_adi ?? '').trim())
    .filter(Boolean)

  if (isAdminLike(access)) {
    return { yoneticiMudurlukler, kullaniciMudurlukler: [], tumunuGorebilir: true }
  }
  if (access.mode !== 'kullanici') {
    return { yoneticiMudurlukler, kullaniciMudurlukler: [], tumunuGorebilir: false }
  }

  const km = await getKullaniciGorevMudurlukleri(supabase, access.sicilNo)
  const tumunuGorebilir = km.mudurlukler.some(m => yoneticiMudurlukler.some(y => normMud(y) === normMud(m)))
  return {
    yoneticiMudurlukler,
    kullaniciMudurlukler: km.mudurlukler,
    tumunuGorebilir,
  }
}

export async function stratejikVeriDonemDurumAyarla(
  donemId: number,
  yil: number,
  ceyrek: number,
  durum: 'Açık' | 'Kapalı',
): Promise<{ hata?: string }> {
  if (![1, 2, 3, 4].includes(ceyrek)) return { hata: 'Çeyrek bilgisi geçersiz.' }
  if (!['Açık', 'Kapalı'].includes(durum)) return { hata: 'Durum geçersiz.' }
  if (ceyrek > tamamlananCeyrek(yil)) return { hata: 'Henüz tamamlanmayan çeyrek açılamaz.' }

  const supabase = await createClient()
  const ayar = await veriGirisAyar(supabase)
  const yonetebilir = ayar.tumunuGorebilir || ayar.kullaniciMudurlukler.some(m => ayar.yoneticiMudurlukler.some(y => normMud(y) === normMud(m)))
  if (!yonetebilir) return { hata: 'Veri giriş dönemini açma/kapatma yetkiniz yok.' }

  const { error } = await supabase.from('stratejik_plan_gosterge_veri_donem' as never).upsert(
    {
      stratejik_donem_id: donemId,
      yil,
      ceyrek,
      durum,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'stratejik_donem_id,yil,ceyrek' },
  )
  if (error) return { hata: error.message }

  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/veri-giris`)
  return {}
}

export async function stratejikVeriGirisKaydet(
  donemId: number,
  yil: number,
  ceyrek: number,
  satirlar: { gosterge_id: number; gerceklesen: number }[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  if (![1, 2, 3, 4].includes(ceyrek)) return { hata: 'Çeyrek bilgisi geçersiz.' }
  if (ceyrek > tamamlananCeyrek(yil)) return { hata: 'Henüz tamamlanmayan çeyrek için veri girişi yapılamaz.' }

  const supabase = await createClient()
  const ayar = await veriGirisAyar(supabase)

  const { data: donemDurum } = await supabase
    .from('stratejik_plan_gosterge_veri_donem' as never)
    .select('durum')
    .eq('stratejik_donem_id', donemId)
    .eq('yil', yil)
    .eq('ceyrek', ceyrek)
    .maybeSingle()

  const durum = String((donemDurum as { durum?: string } | null)?.durum ?? 'Kapalı')
  if (durum !== 'Açık') return { hata: 'Bu çeyrek için veri girişi kapalı.' }

  const temiz = satirlar
    .filter(s => Number.isFinite(s.gosterge_id))
    .map(s => ({ gosterge_id: s.gosterge_id, gerceklesen: Number(s.gerceklesen) }))
    .filter(s => Number.isFinite(s.gerceklesen))
  if (temiz.length === 0) return { hata: 'Kaydedilecek geçerli satır yok.' }

  const gIds = [...new Set(temiz.map(s => s.gosterge_id))]
  const { data: gRows } = await supabase
    .from('stratejik_plan_gosterge' as never)
    .select('id, alt_hedef_id')
    .in('id', gIds)

  const altIds = [...new Set((gRows ?? []).map(r => (r as { alt_hedef_id?: number }).alt_hedef_id).filter(Boolean))]
  const { data: altRows } = altIds.length
    ? await supabase.from('stratejik_plan_alt_hedef' as never).select('id, mudurluk').in('id', altIds as number[])
    : { data: [] as never[] }
  const altMudMap = new Map<number, string>((altRows ?? []).map(a => [Number((a as { id: number }).id), String((a as { mudurluk?: string }).mudurluk ?? '')]))
  const gAltMap = new Map<number, number>((gRows ?? []).map(g => [Number((g as { id: number }).id), Number((g as { alt_hedef_id: number }).alt_hedef_id)]))

  if (!ayar.tumunuGorebilir) {
    const izinMud = new Set(ayar.kullaniciMudurlukler.map(normMud))
    for (const gid of gIds) {
      const altId = gAltMap.get(gid)
      const mud = altId ? altMudMap.get(altId) ?? '' : ''
      if (!izinMud.has(normMud(mud))) return { hata: 'Yetkiniz olmayan müdürlük göstergesi için kayıt yapılamaz.' }
    }
  }

  const { data: auth } = await supabase.auth.getUser()
  const actorId = auth.user?.id ?? null
  const payload = temiz.map(s => {
    const altId = gAltMap.get(s.gosterge_id)
    const mud = altId ? altMudMap.get(altId) ?? null : null
    return {
      stratejik_donem_id: donemId,
      gosterge_id: s.gosterge_id,
      yil,
      ceyrek,
      gerceklesen: s.gerceklesen,
      mudurluk: mud,
      updated_by: actorId,
      created_by: actorId,
      updated_at: new Date().toISOString(),
    }
  })

  const { error } = await supabase
    .from('stratejik_plan_gosterge_gerceklesme' as never)
    .upsert(payload as never, { onConflict: 'gosterge_id,yil,ceyrek' })
  if (error) return { hata: error.message }

  revalidatePath(`/stratejik-yonetim/stratejik-plan/islemler/${donemId}/veri-giris`)
  return { kaydedilen: payload.length }
}

