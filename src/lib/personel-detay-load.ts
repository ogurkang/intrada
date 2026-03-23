import { notFound, redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'
import { isUuidSegment } from '@/lib/personel-link'

export type PersonelDetayMalRow = {
  id: number
  public_id: string | null
  sicil_no: string
  ad_soyad: string | null
  beyan_turu: string | null
  onay_tarihi: string | null
  son_net_maas: number | null
  kayit_zamani: string
}

export type PersonelDetayLoadResult = {
  calisan: Tables<'calisan'>
  kaynak: string
  kadrolar: Tables<'kadro_hareketleri'>[]
  hareketler: Tables<'personel_hareketleri'>[]
  izinHaklari: Tables<'izin_haklari'>[]
  izinHareketleri: Tables<'izin_hareketleri'>[]
  terfiKayitlari: Tables<'terfi_hareketleri'>[]
  ogrenimler: Tables<'calisan_ogrenim'>[]
  aileBildirimi: Tables<'aile_bildirimi'> | null
  malKayitlari: PersonelDetayMalRow[]
  egitimKatilimlari: { egitim_adi: string; program: 'Evet' | 'Hayır'; donem_adi?: string }[]
  yevmiyeFazlaMesaiAylik: { ay: string; saat: number }[]
}

/**
 * `/personel/[param]` segmenti: UUID ise canonical `/link/{uuid}` adresine yönlendirir.
 * Aksi halde sicil_no olarak kullanılır.
 */
export async function resolvePersonelRouteSegment(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<{ sicil_no: string } | { redirect: string }> {
  const decoded = decodeURIComponent(rawSegment.trim())
  if (isUuidSegment(decoded)) {
    const { data } = await supabase
      .from('calisan')
      .select('sicil_no, public_id')
      .eq('public_id', decoded)
      .maybeSingle()
    if (data?.public_id) {
      return { redirect: `/link/${data.public_id}` }
    }
    notFound()
  }
  return { sicil_no: decoded }
}

/** Düzenle vb. sayfalar: UUID segmentini sicil_no’ya çevirir (yönlendirme yok). */
export async function resolvePersonelSegmentToSicil(
  supabase: SupabaseClient,
  rawSegment: string,
): Promise<string> {
  const decoded = decodeURIComponent(rawSegment.trim())
  if (isUuidSegment(decoded)) {
    const { data } = await supabase.from('calisan').select('sicil_no').eq('public_id', decoded).maybeSingle()
    if (data?.sicil_no) return data.sicil_no
    notFound()
  }
  return decoded
}

export async function fetchPersonelDetayPageData(
  supabase: SupabaseClient,
  sicil_no: string,
  kaynak: string,
): Promise<PersonelDetayLoadResult | null> {
  const [
    { data: calisan, error },
    { data: kadroHareketleriRaw },
    { data: hareketlerRaw },
    { data: izinHaklariRaw },
    { data: izinHareketleriRaw },
    { data: terfiRaw },
    { data: ogrenimRaw },
    { data: aileRaw },
    { data: malKayitlariRaw },
    { data: katilimRaw },
    { data: yevmiyeFmRaw },
  ] = await Promise.all([
    supabase.from('calisan').select('*').eq('sicil_no', sicil_no).single(),
    supabase
      .from('kadro_hareketleri')
      .select('*')
      .or(`asil.eq.${sicil_no},vekil.eq.${sicil_no}`)
      .is('ayrilis_tarihi', null),
    supabase
      .from('personel_hareketleri')
      .select('*')
      .eq('sicil_no', sicil_no)
      .order('yururluk_tarihi', { ascending: false }),
    supabase
      .from('izin_haklari')
      .select('*')
      .eq('sicil_no', sicil_no)
      .order('yil', { ascending: false }),
    supabase
      .from('izin_hareketleri')
      .select('*')
      .eq('sicil_no', sicil_no)
      .order('yil', { ascending: false })
      .order('sira_no', { ascending: false }),
    supabase
      .from('terfi_hareketleri')
      .select('*')
      .eq('sicil_no', sicil_no)
      .order('kayit_zamani', { ascending: false }),
    supabase
      .from('calisan_ogrenim')
      .select('*')
      .eq('sicil_no', sicil_no)
      .order('mezuniyet_yili', { ascending: false }),
    supabase.from('aile_bildirimi').select('*').eq('sicil_no', sicil_no).maybeSingle(),
    supabase
      .from('mal_bildirimi')
      .select('id, public_id, sicil_no, beyan_turu, onay_tarihi, son_net_maas, kayit_zamani, calisan(ad_soyad)')
      .eq('sicil_no', sicil_no)
      .order('kayit_zamani', { ascending: false }),
    supabase.from('egitim_istatistik_katilim').select('egitim_id, donem_id').eq('sicil_no', sicil_no),
    supabase
      .from('yevmiye_puantaj_kayit')
      .select('tarih, fazla_mesai_saat')
      .eq('sicil_no', sicil_no)
      .gt('fazla_mesai_saat', 0),
  ])

  if (error || !calisan) return null

  const kadrolar = (kadroHareketleriRaw ?? []) as Tables<'kadro_hareketleri'>[]
  const hareketler = (hareketlerRaw ?? []) as Tables<'personel_hareketleri'>[]
  const izinHaklari = (izinHaklariRaw ?? []) as Tables<'izin_haklari'>[]
  const izinHareketleri = (izinHareketleriRaw ?? []) as Tables<'izin_hareketleri'>[]
  const terfiKayitlari = (terfiRaw ?? []) as Tables<'terfi_hareketleri'>[]
  const ogrenimler = (ogrenimRaw ?? []) as Tables<'calisan_ogrenim'>[]
  const aileBildirimi = (aileRaw ?? null) as Tables<'aile_bildirimi'> | null
  const malKayitlari = (malKayitlariRaw ?? []).map(r => ({
    id: r.id,
    public_id: r.public_id,
    sicil_no: r.sicil_no,
    ad_soyad: (r.calisan as unknown as { ad_soyad: string | null } | null)?.ad_soyad ?? null,
    beyan_turu: r.beyan_turu,
    onay_tarihi: r.onay_tarihi,
    son_net_maas: r.son_net_maas,
    kayit_zamani: r.kayit_zamani ?? '',
  }))

  let egitimKatilimlari: PersonelDetayLoadResult['egitimKatilimlari'] = []
  if ((katilimRaw ?? []).length > 0) {
    const egitimIds = [...new Set((katilimRaw ?? []).map((k: { egitim_id: number }) => k.egitim_id))]
    const donemIds = [...new Set((katilimRaw ?? []).map((k: { donem_id: number }) => k.donem_id))]
    const [{ data: egitimRaw }, { data: donemRaw }] = await Promise.all([
      supabase.from('egitim_takvimi_egitim').select('id, egitim_adi, program').in('id', egitimIds),
      supabase.from('egitim_takvimi_donem').select('id, donem_adi').in('id', donemIds),
    ])
    const egitimMap: Record<number, { egitim_adi: string; program: 'Evet' | 'Hayır' }> = {}
    ;(egitimRaw ?? []).forEach((e: { id: number; egitim_adi: string; program: 'Evet' | 'Hayır' }) => {
      egitimMap[e.id] = { egitim_adi: e.egitim_adi, program: e.program }
    })
    const donemMap: Record<number, string> = {}
    ;(donemRaw ?? []).forEach((d: { id: number; donem_adi: string }) => {
      donemMap[d.id] = d.donem_adi
    })
    egitimKatilimlari = (katilimRaw ?? []).map((k: { egitim_id: number; donem_id: number }) => ({
      egitim_adi: egitimMap[k.egitim_id]?.egitim_adi ?? '—',
      program: (egitimMap[k.egitim_id]?.program ?? 'Hayır') as 'Evet' | 'Hayır',
      donem_adi: donemMap[k.donem_id],
    }))
  }

  const yevmiyeFazlaMesaiAylik: { ay: string; saat: number }[] = []
  const fmByAy: Record<string, number> = {}
  ;(yevmiyeFmRaw ?? []).forEach((k: { tarih: string; fazla_mesai_saat: number | null }) => {
    const ay = k.tarih ? k.tarih.slice(0, 7) : ''
    if (!ay) return
    const saat = k.fazla_mesai_saat ?? 0
    fmByAy[ay] = (fmByAy[ay] ?? 0) + saat
  })
  const aylar = Object.keys(fmByAy).sort()
  const ayAdlari = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ]
  aylar.forEach(ayKey => {
    const [y, m] = ayKey.split('-')
    yevmiyeFazlaMesaiAylik.push({
      ay: `${ayAdlari[parseInt(m, 10) - 1]} ${y}`,
      saat: fmByAy[ayKey],
    })
  })

  return {
    calisan: calisan as Tables<'calisan'>,
    kaynak,
    kadrolar,
    hareketler,
    izinHaklari,
    izinHareketleri,
    terfiKayitlari,
    ogrenimler,
    aileBildirimi,
    malKayitlari,
    egitimKatilimlari,
    yevmiyeFazlaMesaiAylik,
  }
}

/** Server component: segment çöz → gerekirse redirect → veri yükle. */
export async function loadPersonelDetayPageOrRedirect(
  supabase: SupabaseClient,
  rawSegment: string,
  kaynak: string,
): Promise<PersonelDetayLoadResult> {
  const resolved = await resolvePersonelRouteSegment(supabase, rawSegment)
  if ('redirect' in resolved) redirect(resolved.redirect)
  const data = await fetchPersonelDetayPageData(supabase, resolved.sicil_no, kaynak)
  if (!data) notFound()
  return data
}
