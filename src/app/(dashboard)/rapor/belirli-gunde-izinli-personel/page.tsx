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
        .select('sicil_no, tur, ayrilis, baslama, gun, durum')
        .neq('durum', 'İptal Edildi')
        .lte('ayrilis', tarih)
        .gt('baslama', tarih)
        .order('sicil_no'),
      supabase.from('calisan').select('sicil_no, ad_soyad'),
      supabase
        .from('kadro_hareketleri')
        .select('asil, kadro_mudurlugu, gorev_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
        .not('asil', 'is', null),
      supabase.from('tanim_mudurluk').select('mudurluk_adi, konum, sira_no').eq('aktif', true),
    ])

  const adMap = new Map((calisanRaw ?? []).map(c => [c.sicil_no, c.ad_soyad ?? c.sicil_no]))

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
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, tarih))
    if (aktif.length === 0) {
      const sorted = [...rows].sort((a, b) => kadroBaslangic(b).localeCompare(kadroBaslangic(a)))
      const latest = sorted[0]
      if (latest) {
        mudurlukBySicil.set(sicil, String(latest.kadro_mudurlugu ?? latest.gorev_mudurlugu ?? '').trim())
      }
      continue
    }
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    mudurlukBySicil.set(sicil, String(secilen.kadro_mudurlugu ?? secilen.gorev_mudurlugu ?? '').trim())
  }

  const satirlar: BelirliGundeIzinliSatir[] = []
  for (const iz of izinRaw ?? []) {
    const sicil = String(iz.sicil_no ?? '').trim()
    if (!sicil) continue
    const gun = Number(iz.gun ?? 0)
    if (!Number.isFinite(gun) || gun <= 0) continue
    const mudurluk = mudurlukBySicil.get(sicil) ?? ''
    const konum = mudurlukKonum.get(normMudStr(mudurluk)) ?? ''
    satirlar.push({
      sicil_no: sicil,
      ad_soyad: adMap.get(sicil) ?? sicil,
      mudurluk,
      konum,
      tur: String(iz.tur ?? '').trim(),
      ayrilis: formatTarih(iz.ayrilis),
      baslama: formatTarih(iz.baslama),
      gun,
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
