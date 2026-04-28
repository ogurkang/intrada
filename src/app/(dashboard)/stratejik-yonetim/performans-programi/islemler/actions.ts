'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'

function txt(v: FormDataEntryValue | null): string {
  return String(v ?? '').trim()
}

function normMud(v: string | null | undefined): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

export async function programEkle(yil: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const program_adi = txt(fd.get('program_adi'))
  if (!kodu || !program_adi) return { hata: 'Kod ve program adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_program').insert({
    yil,
    sira_no,
    kodu,
    program_adi,
    aktif: true,
  })
  if (error) return { hata: error.message }

  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}`)
  return {}
}

export async function programGuncelle(id: number, yil: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const program_adi = txt(fd.get('program_adi'))
  if (!kodu || !program_adi) return { hata: 'Kod ve program adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb
    .from('performans_programi_program')
    .update({ sira_no, kodu, program_adi })
    .eq('id', id)
  if (error) return { hata: error.message }

  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}`)
  return {}
}

export async function altProgramEkle(programId: number, yil: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const alt_program_adi = txt(fd.get('alt_program_adi'))
  if (!kodu || !alt_program_adi) return { hata: 'Kod ve alt program adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_alt_program').insert({
    program_id: programId,
    sira_no,
    kodu,
    alt_program_adi,
    aktif: true,
  })
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}`)
  return {}
}

export async function altProgramGuncelle(id: number, programId: number, yil: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const alt_program_adi = txt(fd.get('alt_program_adi'))
  if (!kodu || !alt_program_adi) return { hata: 'Kod ve alt program adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_alt_program').update({ sira_no, kodu, alt_program_adi }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}`)
  return {}
}

export async function faaliyetEkle(altProgramId: number, yil: number, programId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const faaliyet_adi = txt(fd.get('faaliyet_adi'))
  if (!kodu || !faaliyet_adi) return { hata: 'Kod ve faaliyet adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_faaliyet').insert({
    alt_program_id: altProgramId,
    sira_no,
    kodu,
    faaliyet_adi,
    aktif: true,
  })
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}`)
  return {}
}

export async function faaliyetGuncelle(id: number, altProgramId: number, yil: number, programId: number, fd: FormData): Promise<{ hata?: string }> {
  const siraNoRaw = txt(fd.get('sira_no'))
  const kodu = txt(fd.get('kodu'))
  const faaliyet_adi = txt(fd.get('faaliyet_adi'))
  if (!kodu || !faaliyet_adi) return { hata: 'Kod ve faaliyet adı zorunludur.' }
  const sira_no = siraNoRaw ? Number.parseInt(siraNoRaw, 10) : null
  if (siraNoRaw && !Number.isFinite(sira_no)) return { hata: 'Sıra no sayısal olmalıdır.' }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_faaliyet').update({ sira_no, kodu, faaliyet_adi }).eq('id', id)
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}`)
  return {}
}

export async function faaliyetAmacEkle(faaliyetId: number, yil: number, programId: number, altProgramId: number, fd: FormData): Promise<{ hata?: string }> {
  const amacId = Number.parseInt(txt(fd.get('amac_id')), 10)
  if (!Number.isFinite(amacId)) return { hata: 'Amaç seçimi zorunludur.' }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_faaliyet_amac').insert({
    faaliyet_id: faaliyetId,
    amac_id: amacId,
    aktif: true,
  })
  if (error) return { hata: error.message }
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}/${altProgramId}/${faaliyetId}`)
  return {}
}

export async function performansVeriGirisKaydet(
  faaliyetId: number,
  yil: number,
  satirlar: {
    gosterge_id: number
    birim: string
    onceki_yil_gerceklesme: number | null
    cari_yil_planlanan: number | null
    cari_yil_gerceklesme_tahmini: number | null
    sonraki_yil_tahmin_1: number | null
    sonraki_yil_tahmin_2: number | null
    sonraki_yil_tahmin_3: number | null
    gosterge_aciklama: string
    hesaplama_yontemi: string
  }[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı.' }

  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'blocked') return { hata: 'Yetkiniz yok.' }
  const adminLike = isAdminLike(access)
  const km = access.mode === 'kullanici' ? await getKullaniciGorevMudurlukleri(supabase, access.sicilNo) : { mudurlukler: [] }
  const izinMudSet = new Set((adminLike ? [] : km.mudurlukler).map(normMud))

  const { data: faaliyet } = await sb
    .from('stratejik_plan_faaliyet')
    .select('id, alt_hedef_id')
    .eq('id', faaliyetId)
    .maybeSingle()
  const altHedefId = Number((faaliyet as { alt_hedef_id?: number } | null)?.alt_hedef_id)
  if (!Number.isFinite(altHedefId)) return { hata: 'Faaliyet bulunamadı.' }

  const { data: alt } = await sb
    .from('stratejik_plan_alt_hedef')
    .select('id, mudurluk')
    .eq('id', altHedefId)
    .maybeSingle()
  const mudurluk = String((alt as { mudurluk?: string } | null)?.mudurluk ?? '').trim()
  if (!mudurluk) return { hata: 'Müdürlük bilgisi bulunamadı.' }
  if (!adminLike && !izinMudSet.has(normMud(mudurluk))) return { hata: 'Bu müdürlük için kayıt yetkiniz yok.' }

  const temiz = satirlar
    .filter(s => Number.isFinite(s.gosterge_id))
    .map(s => ({
      gosterge_id: s.gosterge_id,
      faaliyet_id: faaliyetId,
      yil,
      mudurluk,
      birim: String(s.birim ?? '').trim() || null,
      onceki_yil_gerceklesme: s.onceki_yil_gerceklesme,
      planlanan_cari_yil: s.cari_yil_planlanan,
      gerceklesme_tahmini_cari_yil: s.cari_yil_gerceklesme_tahmini,
      tahmin_sonraki_yil_1: s.sonraki_yil_tahmin_1,
      tahmin_sonraki_yil_2: s.sonraki_yil_tahmin_2,
      tahmin_sonraki_yil_3: s.sonraki_yil_tahmin_3,
      gosterge_aciklama: String(s.gosterge_aciklama ?? '').trim() || null,
      hesaplama_yontemi: String(s.hesaplama_yontemi ?? '').trim() || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }))
  if (!temiz.length) return { hata: 'Kaydedilecek satır yok.' }

  const { error } = await sb
    .from('performans_programi_veri_giris')
    .upsert(temiz, { onConflict: 'gosterge_id,yil,mudurluk' })
  if (error) return { hata: error.message }

  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris/${faaliyetId}`)
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris`)
  return { kaydedilen: temiz.length }
}

export async function performansFaaliyetButceKaydet(
  faaliyetId: number,
  yil: number,
  kalemler: {
    butce_kodu_id: number
    cari_yil_butce: number | null
    cari_yil_haziran_sonu: number | null
    cari_yil_yil_sonu_tahmin: number | null
    sonraki_yil_butce_1: number | null
    sonraki_yil_butce_2: number | null
    sonraki_yil_butce_3: number | null
  }[],
): Promise<{ hata?: string; kaydedilen?: number }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { hata: 'Oturum bulunamadı.' }

  const access = await getAppAccess(supabase, user.id)
  if (access.mode === 'blocked') return { hata: 'Yetkiniz yok.' }
  const adminLike = isAdminLike(access)
  const km = access.mode === 'kullanici' ? await getKullaniciGorevMudurlukleri(supabase, access.sicilNo) : { mudurlukler: [] }
  const izinMudSet = new Set((adminLike ? [] : km.mudurlukler).map(normMud))

  const { data: faaliyet } = await sb
    .from('stratejik_plan_faaliyet')
    .select('id, alt_hedef_id')
    .eq('id', faaliyetId)
    .maybeSingle()
  const altHedefId = Number((faaliyet as { alt_hedef_id?: number } | null)?.alt_hedef_id)
  if (!Number.isFinite(altHedefId)) return { hata: 'Faaliyet bulunamadı.' }

  const { data: alt } = await sb
    .from('stratejik_plan_alt_hedef')
    .select('id, mudurluk')
    .eq('id', altHedefId)
    .maybeSingle()
  const mudurluk = String((alt as { mudurluk?: string } | null)?.mudurluk ?? '').trim()
  if (!mudurluk) return { hata: 'Müdürlük bilgisi bulunamadı.' }
  if (!adminLike && !izinMudSet.has(normMud(mudurluk))) return { hata: 'Bu müdürlük için kayıt yetkiniz yok.' }

  const temiz = kalemler
    .filter(k => Number.isFinite(k.butce_kodu_id))
    .map(k => ({
      faaliyet_id: faaliyetId,
      butce_kodu_id: k.butce_kodu_id,
      yil,
      mudurluk,
      cari_yil_butce: k.cari_yil_butce ?? 0,
      cari_yil_haziran_sonu: k.cari_yil_haziran_sonu ?? 0,
      cari_yil_yil_sonu_tahmin: k.cari_yil_yil_sonu_tahmin ?? 0,
      sonraki_yil_butce_1: k.sonraki_yil_butce_1 ?? 0,
      sonraki_yil_butce_2: k.sonraki_yil_butce_2 ?? 0,
      sonraki_yil_butce_3: k.sonraki_yil_butce_3 ?? 0,
      // Faaliyet maliyeti, program yılı bütçesi (sonraki_yil_butce_1) toplamı üzerinden izlenir.
      tutar: k.sonraki_yil_butce_1 ?? 0,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }))
  if (!temiz.length) return { hata: 'Kaydedilecek bütçe kalemi yok.' }

  const { error } = await sb
    .from('performans_programi_faaliyet_butce')
    .upsert(temiz, { onConflict: 'faaliyet_id,butce_kodu_id,yil,mudurluk' })
  if (error) return { hata: error.message }

  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris/${faaliyetId}`)
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/veri-giris`)
  return { kaydedilen: temiz.length }
}
