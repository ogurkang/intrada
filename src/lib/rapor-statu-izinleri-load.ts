import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { KadroRaporRow, RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  statuIzinMudurlukListesi,
  statuIzinRaporTablariOlustur,
  type StatuIzinHakRow,
  type StatuIzinHareketRow,
  type StatuIzinRaporTabVerisi,
  type StatuIzinTip,
} from '@/lib/rapor-statu-izinleri'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

const KADRO_SELECT =
  'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, gorev_mudurlugu, kadro_mudurlugu'

export async function yukleStatuIzinRaporVerisi(
  supabase: SupabaseClient<Database>,
  input: {
    statuTip: StatuIzinTip
    yil: number
  },
): Promise<{ tabs: StatuIzinRaporTabVerisi[]; tumMudurlukler: string[] }> {
  const { statuTip, yil } = input

  const [
    { data: kadroRaw },
    { data: calisanRaw },
    { data: hakRaw },
    { data: hareketRaw },
    { data: izinTurRaw },
  ] = await Promise.all([
    supabase.from('kadro_hareketleri').select(KADRO_SELECT).not('asil', 'is', null),
    supabase.from('calisan').select('sicil_no, ad_soyad'),
    supabase.from('izin_haklari').select('sicil_no, devreden_gun, hak_edilen_gun').eq('yil', yil),
    supabase
      .from('izin_hareketleri')
      .select('sicil_no, tur, ayrilis, baslama, kayit_tarihi, gun, durum')
      .eq('yil', yil),
    supabase
      .from('tanim_izin_tur')
      .select('tur_adi')
      .in('izin_hakki_kullanimi', ['Evet', 'Yıllık İzin']),
  ])

  const kadro: KadroRaporRow[] = (kadroRaw ?? []) as KadroRaporRow[]
  const hareketler: StatuIzinHareketRow[] = (hareketRaw ?? []) as StatuIzinHareketRow[]
  const hakBySicil = new Map<string, StatuIzinHakRow>()
  for (const h of (hakRaw ?? []) as StatuIzinHakRow[]) {
    hakBySicil.set(h.sicil_no, h)
  }
  const calisanBySicil = new Map<string, { ad_soyad: string }>()
  for (const c of calisanRaw ?? []) {
    calisanBySicil.set(c.sicil_no, { ad_soyad: c.ad_soyad ?? c.sicil_no })
  }
  const hakKullananTurler = new Set((izinTurRaw ?? []).map(t => t.tur_adi))

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const etiketler = periyotlar.map(p => (p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]))

  const tabs = statuIzinRaporTablariOlustur({
    statuTip,
    yil,
    periyotlar,
    etiketler,
    kadro,
    calisanBySicil,
    hakBySicil,
    hareketler,
    hakKullananTurler,
  })

  const tumMudurlukler = statuIzinMudurlukListesi(tabs)

  return { tabs, tumMudurlukler }
}
