import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PersonelDetayClient from '@/components/personel/PersonelDetayClient'
import { calisanGuncelle } from './actions'
import type { Tables } from '@/types/database'

interface Props {
  params: Promise<{ sicil_no: string }>
  searchParams?: Promise<{ kaynak?: string }>
}

export default async function PersonelDetayPage({ params, searchParams }: Props) {
  const { sicil_no } = await params
  const supabase = await createClient()

  const [
    { data: calisan, error },
    { data: kadroHareketleriRaw },
    { data: hareketlerRaw },
    { data: izinHaklariRaw },
    { data: izinHareketleriRaw },
    { data: terfiRaw },
    { data: ogrenimRaw },
    { data: aileRaw },
    { data: malRaw },
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
    supabase.from('mal_bildirimi').select('sicil_no').eq('sicil_no', sicil_no).maybeSingle(),
    supabase
      .from('egitim_istatistik_katilim')
      .select('egitim_id, donem_id')
      .eq('sicil_no', sicil_no),
    supabase
      .from('yevmiye_puantaj_kayit')
      .select('tarih, fazla_mesai_saat')
      .eq('sicil_no', sicil_no)
      .gt('fazla_mesai_saat', 0),
  ])

  if (error || !calisan) notFound()

  const sp = await searchParams?.catch(() => ({} as { kaynak?: string }))
  const kaynak = sp?.kaynak ?? ''

  const kadrolar       = (kadroHareketleriRaw ?? []) as Tables<'kadro_hareketleri'>[]
  const hareketler     = (hareketlerRaw     ?? []) as Tables<'personel_hareketleri'>[]
  const izinHaklari    = (izinHaklariRaw    ?? []) as Tables<'izin_haklari'>[]
  const izinHareketleri = (izinHareketleriRaw ?? []) as Tables<'izin_hareketleri'>[]
  const terfiKayitlari = (terfiRaw          ?? []) as Tables<'terfi_hareketleri'>[]
  const ogrenimler     = (ogrenimRaw        ?? []) as Tables<'calisan_ogrenim'>[]
  const aileBildirimi  = (aileRaw           ?? null) as Tables<'aile_bildirimi'> | null
  const malBildirimi   = (malRaw            ?? null) as { sicil_no: string } | null

  let egitimKatilimlari: { egitim_adi: string; program: 'Evet' | 'Hayır'; donem_adi?: string }[] = []
  if ((katilimRaw ?? []).length > 0) {
    const egitimIds = [...new Set((katilimRaw ?? []).map((k: { egitim_id: number }) => k.egitim_id))]
    const donemIds = [...new Set((katilimRaw ?? []).map((k: { donem_id: number }) => k.donem_id))]
    const [{ data: egitimRaw }, { data: donemRaw }] = await Promise.all([
      supabase.from('egitim_takvimi_egitim').select('id, egitim_adi, program').in('id', egitimIds),
      supabase.from('egitim_takvimi_donem').select('id, donem_adi').in('id', donemIds),
    ])
    const egitimMap: Record<number, { egitim_adi: string; program: 'Evet' | 'Hayır' }> = {}
    ;(egitimRaw ?? []).forEach((e: { id: number; egitim_adi: string; program: 'Evet' | 'Hayır' }) => { egitimMap[e.id] = { egitim_adi: e.egitim_adi, program: e.program } })
    const donemMap: Record<number, string> = {}
    ;(donemRaw ?? []).forEach((d: { id: number; donem_adi: string }) => { donemMap[d.id] = d.donem_adi })
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
  aylar.forEach(ay => {
    const [y, m] = ay.split('-')
    const ayAdlari = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
    yevmiyeFazlaMesaiAylik.push({ ay: `${ayAdlari[parseInt(m, 10) - 1]} ${y}`, saat: fmByAy[ay] })
  })

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href={kaynak === 'ayrilanlar' ? '/personel/ayrilanlar' : '/personel'} className="hover:text-slate-800 transition-colors">
          {kaynak === 'ayrilanlar' ? 'Ayrılanlar' : 'Çalışanlar'}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{calisan.ad_soyad}</span>
      </nav>

      <PersonelDetayClient
        kaynak={kaynak}
        calisan={calisan as Tables<'calisan'>}
        kadrolar={kadrolar}
        hareketler={hareketler}
        izinHaklari={izinHaklari}
        izinHareketleri={izinHareketleri}
        terfiKayitlari={terfiKayitlari}
        ogrenimler={ogrenimler}
        aileBildirimi={aileBildirimi}
        malBildirimi={malBildirimi}
        egitimKatilimlari={egitimKatilimlari}
        yevmiyeFazlaMesaiAylik={yevmiyeFazlaMesaiAylik}
        onKisiselGuncelle={calisanGuncelle}
      />
    </div>
  )
}
