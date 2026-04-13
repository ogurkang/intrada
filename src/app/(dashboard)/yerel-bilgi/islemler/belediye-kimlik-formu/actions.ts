'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireYerelBilgiIslem } from '@/lib/yerel-bilgi-islem-guard'

const SAYFA = '/yerel-bilgi/islemler/belediye-kimlik-formu'
const BELEDIYE_BASKANI_KADRO_ID = 693
const RAPOR_SAYFA = '/yerel-bilgi/raporlar/kimlik-form-raporu'

export type BelediyeKimlikFormInput = {
  belediye_kurulus_yili: string
  baskan_cinsiyeti: string
  baskan_secime_girdigi_parti: string
  baskan_mevcut_parti: string
  baskan_donem: string
  belediye_web_adresi: string
  belediye_e_posta: string
  belediye_telefon_numarasi: string
  belediye_faks_numarasi: string
  belediye_cagri_merkezi: string
  belediye_onayli_sosyal_medya_hesabi: string
  belediye_acik_adresi: string
  mahalle_sayisi: string
}

export async function belediyeBaskanSaltOku() {
  const supabase = await createClient()
  const sb = supabase as any
  const { data: kadro } = await sb
    .from('kadro_hareketleri')
    .select('id, asil, vekil')
    .eq('id', BELEDIYE_BASKANI_KADRO_ID)
    .maybeSingle()

  const sicil = String(kadro?.asil ?? kadro?.vekil ?? '').trim()
  if (!sicil) return { ad: '', soyad: '', telefon: '' }

  const { data: calisan } = await sb.from('calisan').select('ad_soyad, telefon').eq('sicil_no', sicil).maybeSingle()
  const adSoyad = String(calisan?.ad_soyad ?? '').trim()
  const parts = adSoyad.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { ad: '', soyad: '', telefon: String(calisan?.telefon ?? '') }
  if (parts.length === 1) return { ad: parts[0], soyad: '', telefon: String(calisan?.telefon ?? '') }
  return {
    ad: parts.slice(0, -1).join(' '),
    soyad: parts[parts.length - 1],
    telefon: String(calisan?.telefon ?? ''),
  }
}

function parseDonem(v: string) {
  const ok = ['I. Dönem', 'II. Dönem', 'III. Dönem', 'IV. Dönem', 'V. Dönem']
  return ok.includes(v) ? v : null
}

function parseCinsiyet(v: string) {
  const ok = ['Kadın', 'Erkek']
  return ok.includes(v) ? v : null
}

const SUPER_ADMIN_ISLEM_ETIKETI = 'IKEM'

async function getIslemYapanEtiketi(userId: string): Promise<string> {
  const supabase = await createClient()
  const { data: prof } = await supabase
    .from('app_profiles')
    .select('kullanici_adi, sicil_no, rol')
    .eq('id', userId)
    .maybeSingle()

  if (prof?.kullanici_adi?.trim()) return prof.kullanici_adi.trim()
  if (prof?.rol === 'admin') return SUPER_ADMIN_ISLEM_ETIKETI
  if (prof?.sicil_no) {
    const { data: c } = await supabase.from('calisan').select('ad_soyad').eq('sicil_no', prof.sicil_no).maybeSingle()
    if (c?.ad_soyad?.trim()) return c.ad_soyad.trim()
  }
  return userId
}

function parseKurulusYiliToDate(v: string): string | null {
  const y = v.trim()
  if (y === '') return null
  if (!/^\d{4}$/.test(y)) return null
  return `${y}-01-01`
}

export async function belediyeKimlikFormEkle(input: BelediyeKimlikFormInput): Promise<{ hata?: string; id?: number }> {
  const auth = await requireYerelBilgiIslem()
  if (!auth.ok) return { hata: auth.hata }

  const supabase = await createClient()
  const sb = supabase as any
  const { data: aktifKayit } = await sb
    .from('yerel_bilgi_belediye_kimlik_formu')
    .select('id')
    .eq('aktif', true)
    .limit(1)
    .maybeSingle()
  if (aktifKayit) return { hata: 'Yeni kayıt için mevcut aktif kayıt pasif olmalıdır.' }

  const ro = await belediyeBaskanSaltOku()
  const islemEtiketi = await getIslemYapanEtiketi(auth.userId)
  const ms = input.mahalle_sayisi.trim()
  const mahalle = ms === '' ? null : Number(ms)
  if (mahalle != null && !Number.isFinite(mahalle)) return { hata: 'Mahalle sayısı sayı olmalıdır.' }

  const row = {
    form_adi: 'Belediye Kimlik Formu',
    kayit_tarihi: new Date().toISOString().slice(0, 10),
    islem_yapan: islemEtiketi,
    belediye_kurulus_tarihi: parseKurulusYiliToDate(input.belediye_kurulus_yili),
    baskan_adi: ro.ad || null,
    baskan_soyadi: ro.soyad || null,
    baskan_cinsiyeti: parseCinsiyet(input.baskan_cinsiyeti),
    baskan_secime_girdigi_parti: input.baskan_secime_girdigi_parti.trim() || null,
    baskan_mevcut_parti: input.baskan_mevcut_parti.trim() || null,
    baskan_donem: parseDonem(input.baskan_donem),
    baskan_cep_telefonu: ro.telefon || null,
    belediye_web_adresi: input.belediye_web_adresi.trim() || null,
    belediye_e_posta: input.belediye_e_posta.trim() || null,
    belediye_telefon_numarasi: input.belediye_telefon_numarasi.trim() || null,
    belediye_faks_numarasi: input.belediye_faks_numarasi.trim() || null,
    belediye_cagri_merkezi: input.belediye_cagri_merkezi.trim() || null,
    belediye_onayli_sosyal_medya_hesabi: input.belediye_onayli_sosyal_medya_hesabi.trim() || null,
    belediye_acik_adresi: input.belediye_acik_adresi.trim() || null,
    mahalle_sayisi: mahalle,
    aktif: true,
    created_by: auth.userId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await sb.from('yerel_bilgi_belediye_kimlik_formu').insert(row).select('id').single()
  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  return { id: Number(data.id) }
}

export async function belediyeKimlikFormGuncelle(
  id: number,
  input: BelediyeKimlikFormInput,
): Promise<{ hata?: string }> {
  const auth = await requireYerelBilgiIslem()
  if (!auth.ok) return { hata: auth.hata }
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }

  const supabase = await createClient()
  const sb = supabase as any
  const ro = await belediyeBaskanSaltOku()
  const islemEtiketi = await getIslemYapanEtiketi(auth.userId)
  const ms = input.mahalle_sayisi.trim()
  const mahalle = ms === '' ? null : Number(ms)
  if (mahalle != null && !Number.isFinite(mahalle)) return { hata: 'Mahalle sayısı sayı olmalıdır.' }

  const { error } = await sb
    .from('yerel_bilgi_belediye_kimlik_formu')
    .update({
      baskan_adi: ro.ad || null,
      baskan_soyadi: ro.soyad || null,
      baskan_cep_telefonu: ro.telefon || null,
      belediye_kurulus_tarihi: parseKurulusYiliToDate(input.belediye_kurulus_yili),
      baskan_cinsiyeti: parseCinsiyet(input.baskan_cinsiyeti),
      baskan_secime_girdigi_parti: input.baskan_secime_girdigi_parti.trim() || null,
      baskan_mevcut_parti: input.baskan_mevcut_parti.trim() || null,
      baskan_donem: parseDonem(input.baskan_donem),
      belediye_web_adresi: input.belediye_web_adresi.trim() || null,
      belediye_e_posta: input.belediye_e_posta.trim() || null,
      belediye_telefon_numarasi: input.belediye_telefon_numarasi.trim() || null,
      belediye_faks_numarasi: input.belediye_faks_numarasi.trim() || null,
      belediye_cagri_merkezi: input.belediye_cagri_merkezi.trim() || null,
      belediye_onayli_sosyal_medya_hesabi: input.belediye_onayli_sosyal_medya_hesabi.trim() || null,
      belediye_acik_adresi: input.belediye_acik_adresi.trim() || null,
      mahalle_sayisi: mahalle,
      islem_yapan: islemEtiketi,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { hata: error.message }
  revalidatePath(SAYFA)
  revalidatePath(`${SAYFA}/${id}`)
  revalidatePath(RAPOR_SAYFA)
  return {}
}

export async function belediyeKimlikFormDurumDegistir(
  id: number,
  yeniAktif: boolean,
): Promise<{ hata?: string }> {
  const auth = await requireYerelBilgiIslem()
  if (!auth.ok) return { hata: auth.hata }
  if (!Number.isFinite(id) || id <= 0) return { hata: 'Geçersiz kayıt.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('yerel_bilgi_belediye_kimlik_formu')
    .update({ aktif: yeniAktif, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { hata: error.message }

  revalidatePath(SAYFA)
  revalidatePath(`${SAYFA}/${id}`)
  revalidatePath(RAPOR_SAYFA)
  return {}
}

