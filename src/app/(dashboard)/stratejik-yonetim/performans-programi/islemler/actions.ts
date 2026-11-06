'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { stratejikYoneticiMi } from '@/lib/pp-erisim'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import { ppSatirLogYaz } from '@/lib/pp-satir-log'

async function sonrakiSira(sb: { from: (t: string) => { select: (c: string) => { eq: (k: string, v: number) => Promise<{ data: { sira_no: number | null }[] | null }> } } }, tablo: string, kolon: string, deger: number) {
  const { data } = await sb.from(tablo).select('sira_no').eq(kolon, deger)
  const nolar = ((data ?? []) as { sira_no: number | null }[]).map(r => Number(r.sira_no)).filter(Number.isFinite)
  return (nolar.length ? Math.max(...nolar) : 0) + 1
}

async function siraSikistir(sb: { from: (t: string) => any }, tablo: string, kolon: string, deger: number) {
  const { data } = await sb.from(tablo).select('id').eq(kolon, deger).order('sira_no').order('id')
  const satirlar = (data ?? []) as { id: number }[]
  for (let i = 0; i < satirlar.length; i += 1) {
    await sb.from(tablo).update({ sira_no: i + 1 }).eq('id', satirlar[i].id)
  }
}

function txt(v: FormDataEntryValue | null): string {
  return String(v ?? '').trim()
}

function normMud(v: string | null | undefined): string {
  return String(v ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR')
}

export async function programEkle(yil: number, fd: FormData): Promise<{ hata?: string }> {
  const kodu = txt(fd.get('kodu'))
  const program_adi = txt(fd.get('program_adi'))
  if (!kodu || !program_adi) return { hata: 'Kod ve program adı zorunludur.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const sira_no = await sonrakiSira(sb, 'performans_programi_program', 'yil', yil)
  const { data, error } = await sb.from('performans_programi_program').insert({
    yil,
    sira_no,
    kodu,
    program_adi,
    aktif: true,
  }).select('id').single()
  if (error) return { hata: error.message }
  await ppSatirLogYaz(supabase, { tablo: 'program', kayitId: Number(data.id), islem: 'Ekleme', ozet: program_adi })

  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}`)
  return {}
}

export async function programGuncelle(id: number, yil: number, fd: FormData): Promise<{ hata?: string }> {
  const kodu = txt(fd.get('kodu'))
  const program_adi = txt(fd.get('program_adi'))
  if (!kodu || !program_adi) return { hata: 'Kod ve program adı zorunludur.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb
    .from('performans_programi_program')
    .update({ kodu, program_adi })
    .eq('id', id)
  if (error) return { hata: error.message }
  await ppSatirLogYaz(supabase, { tablo: 'program', kayitId: id, islem: 'Güncelleme', ozet: program_adi })

  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}`)
  return {}
}

export async function altProgramEkle(programId: number, yil: number, fd: FormData): Promise<{ hata?: string }> {
  const kodu = txt(fd.get('kodu'))
  const alt_program_adi = txt(fd.get('alt_program_adi'))
  const gerekce = txt(fd.get('gerekce')) || null
  if (!kodu || !alt_program_adi) return { hata: 'Kod ve alt program adı zorunludur.' }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const sira_no = await sonrakiSira(sb, 'performans_programi_alt_program', 'program_id', programId)
  const { data, error } = await sb.from('performans_programi_alt_program').insert({
    program_id: programId,
    sira_no,
    kodu,
    alt_program_adi,
    gerekce,
    aktif: true,
  }).select('id').single()
  if (error) return { hata: error.message }
  await ppSatirLogYaz(supabase, { tablo: 'alt_program', kayitId: Number(data.id), islem: 'Ekleme', ozet: alt_program_adi })
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}`)
  return {}
}

export async function altProgramGuncelle(id: number, programId: number, yil: number, fd: FormData): Promise<{ hata?: string }> {
  const kodu = txt(fd.get('kodu'))
  const alt_program_adi = txt(fd.get('alt_program_adi'))
  const gerekce = txt(fd.get('gerekce')) || null
  if (!kodu || !alt_program_adi) return { hata: 'Kod ve alt program adı zorunludur.' }
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { error } = await sb.from('performans_programi_alt_program').update({ kodu, alt_program_adi, gerekce }).eq('id', id)
  if (error) return { hata: error.message }
  await ppSatirLogYaz(supabase, { tablo: 'alt_program', kayitId: id, islem: 'Güncelleme', ozet: alt_program_adi })
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}/${programId}`)
  return {}
}

const BAGLI = 'Silmek istediğiniz başlığa bağlı veriler bulunmaktadır.'

export async function programSil(id: number, yil: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { count, error: sayHata } = await sb.from('performans_programi_alt_program').select('id', { count: 'exact', head: true }).eq('program_id', id)
  if (sayHata) return { hata: sayHata.message }
  if ((count ?? 0) > 0) return { hata: BAGLI }
  const { error } = await sb.from('performans_programi_program').delete().eq('id', id)
  if (error) return { hata: error.message }
  await siraSikistir(sb, 'performans_programi_program', 'yil', yil)
  await ppSatirLogYaz(supabase, { tablo: 'program', kayitId: id, islem: 'Silme', ozet: `Program #${id}` })
  revalidatePath(`/stratejik-yonetim/performans-programi/islemler/${yil}`)
  return {}
}

export async function altProgramSil(id: number, programId: number, yil: number): Promise<{ hata?: string }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { count, error: sayHata } = await sb.from('performans_programi_pf_faaliyet').select('id', { count: 'exact', head: true }).eq('alt_program_id', id)
  if (sayHata) return { hata: sayHata.message }
  if ((count ?? 0) > 0) return { hata: BAGLI }
  const { error } = await sb.from('performans_programi_alt_program').delete().eq('id', id).eq('program_id', programId)
  if (error) return { hata: error.message }
  await siraSikistir(sb, 'performans_programi_alt_program', 'program_id', programId)
  await ppSatirLogYaz(supabase, { tablo: 'alt_program', kayitId: id, islem: 'Silme', ozet: `Alt program #${id}` })
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
  const yonetici = await stratejikYoneticiMi(supabase, access)
  const km = !yonetici && access.mode === 'kullanici' ? await getKullaniciGorevMudurlukleri(supabase, access.sicilNo) : { mudurlukler: [] }
  const izinMudSet = new Set(km.mudurlukler.map(normMud))

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
  if (!yonetici && !izinMudSet.has(normMud(mudurluk))) return { hata: 'Bu müdürlük için kayıt yetkiniz yok.' }

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
  const yonetici = await stratejikYoneticiMi(supabase, access)
  const km = !yonetici && access.mode === 'kullanici' ? await getKullaniciGorevMudurlukleri(supabase, access.sicilNo) : { mudurlukler: [] }
  const izinMudSet = new Set(km.mudurlukler.map(normMud))

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
  if (!yonetici && !izinMudSet.has(normMud(mudurluk))) return { hata: 'Bu müdürlük için kayıt yetkiniz yok.' }

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
