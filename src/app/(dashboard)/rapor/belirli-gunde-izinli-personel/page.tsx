import { createClient } from '@/lib/supabase/server'
import BelirliGundeIzinliPersonelClient from '@/components/rapor/BelirliGundeIzinliPersonelClient'
import type { BelirliGundeIzinliSatir } from '@/components/rapor/BelirliGundeIzinliPersonelClient'
import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { mudurlukKonumHaritasi, type TanimMudurlukKonumRow } from '@/lib/rapor-konuma-gore-cinsiyet'

function formatTarih(s: string | null | undefined): string {
  if (!s) return '—'
  const d = String(s).slice(0, 10)
  const [y, m, g] = d.split('-')
  if (!y || !m || !g) return d
  return `${g}.${m}.${y}`
}

function normMudStr(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

interface Props {
  searchParams: Promise<{ tarih?: string }>
}

export default async function BelirliGundeIzinliPersonelPage({ searchParams }: Props) {
  const sp = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const tarih = sp.tarih && /^\d{4}-\d{2}-\d{2}$/.test(sp.tarih) ? sp.tarih : today

  const supabase = await createClient()

  const [{ data: izinRaw }, { data: calisanRaw }, { data: kadroRaw }, { data: mudRaw }] =
    await Promise.all([
      supabase
        .from('izin_hareketleri')
        .select('sicil_no, tur, ayrilis, baslama, durum')
        .neq('durum', 'İptal Edildi')
        .lte('ayrilis', tarih)
        .gt('baslama', tarih)
        .order('sicil_no'),
      supabase.from('calisan').select('sicil_no, ad_soyad, gorev_turu, gorevlendirilen_kurum') as any,
      supabase
        .from('kadro_hareketleri')
        .select('asil, statu, kadro_mudurlugu, gorev_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
        .not('asil', 'is', null),
      supabase.from('tanim_mudurluk').select('mudurluk_adi, konum, sira_no').eq('aktif', true),
    ])

  const calisanArr: { sicil_no: string; ad_soyad: string | null; gorev_turu: string | null; gorevlendirilen_kurum: string | null }[] =
    (calisanRaw ?? []) as any

  const adMap = new Map(calisanArr.map(c => [c.sicil_no, c.ad_soyad ?? c.sicil_no]))
  const kurumMap = new Map(
    calisanArr
      .filter(c => c.gorev_turu === 'Kurum Görevlendirme' && c.gorevlendirilen_kurum)
      .map(c => [c.sicil_no, c.gorevlendirilen_kurum ?? '']),
  )

  const mudurlukKonum = mudurlukKonumHaritasi((mudRaw ?? []) as TanimMudurlukKonumRow[])

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadroRaw ?? []) {
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r as KadroRaporRow)
    byAsil.set(asil, list)
  }

  const mudurlukBySicil = new Map<string, string>()
  const statuBySicil = new Map<string, string>()

  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, tarih))
    const hedef =
      aktif.length > 0
        ? aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
        : [...rows].sort((a, b) => kadroBaslangic(b).localeCompare(kadroBaslangic(a)))[0]
    if (hedef) {
      mudurlukBySicil.set(sicil, String(hedef.kadro_mudurlugu ?? hedef.gorev_mudurlugu ?? '').trim())
      statuBySicil.set(sicil, String((hedef as any).statu ?? '').trim())
    }
  }

  const satirlar: BelirliGundeIzinliSatir[] = []
  for (const iz of izinRaw ?? []) {
    const sicil = String(iz.sicil_no ?? '').trim()
    if (!sicil) continue
    const mudurluk = mudurlukBySicil.get(sicil) ?? ''
    const konum = mudurlukKonum.get(normMudStr(mudurluk)) ?? ''
    satirlar.push({
      sicil_no: sicil,
      ad_soyad: adMap.get(sicil) ?? sicil,
      statu: statuBySicil.get(sicil) ?? '',
      mudurluk,
      gorevlendirilen_kurum: kurumMap.get(sicil) ?? '',
      konum,
      tur: String(iz.tur ?? '').trim(),
      ayrilis: formatTarih(iz.ayrilis),
      baslama: formatTarih(iz.baslama),
    })
  }

  satirlar.sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))

  const tumMudurlukler = [...new Set(satirlar.map(r => r.mudurluk).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )
  const tumTurler = [...new Set(satirlar.map(r => r.tur).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )

  return (
    <BelirliGundeIzinliPersonelClient
      tarih={tarih}
      satirlar={satirlar}
      tumMudurlukler={tumMudurlukler}
      tumTurler={tumTurler}
      raporBasePath="/rapor/belirli-gunde-izinli-personel"
      excelBasePath="/api/rapor/belirli-gunde-izinli-personel/excel"
    />
  )
}
