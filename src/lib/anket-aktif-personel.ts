import type { SupabaseClient } from '@supabase/supabase-js'
import type { AktifPersonelProfil } from '@/lib/anket-kirilim'
import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { pickVarsayilanOgrenimKaydi, type CalisanOgrenimRaporSatir } from '@/lib/rapor-statuye-gore-ogrenim-meslek'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { fetchAllCalisan, fetchAllCalisanOgrenim, fetchAllFirmaCalisanlar, fetchAllKadroHareketleri } from '@/lib/supabase-sayfala'

function istanbulGun(): string {
  const parca = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const al = (tip: string) => parca.find(p => p.type === tip)?.value ?? ''
  return `${al('year')}-${al('month')}-${al('day')}`
}

function yasTamamlanan(dogum: string | null | undefined, bugun: string): number | null {
  const d = String(dogum ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{4}-\d{2}-\d{2}$/.test(bugun)) return null
  let yas = Number(bugun.slice(0, 4)) - Number(d.slice(0, 4))
  if (bugun.slice(5) < d.slice(5)) yas -= 1
  if (yas < 0 || yas > 120) return null
  return yas
}

function firmaAktif(giris: string | null, ayrilis: string | null, bugun: string): boolean {
  const bas = giris?.slice(0, 10) || '1900-01-01'
  const ay = ayrilis?.slice(0, 10) || ''
  if (bas > bugun) return false
  if (ay && ay <= bugun) return false
  return true
}

/** Bugün kadroda veya ADABEL kaydında duran personel. Sicil rapora çıkmaz. */
export async function aktifPersonelProfilleri(supabase: SupabaseClient): Promise<AktifPersonelProfil[] | null> {
  const bugun = istanbulGun()
  const [kadroSonuc, calisanSonuc, ogrenimSonuc, firmaSonuc] = await Promise.all([
    fetchAllKadroHareketleri<KadroRaporRow>(
      supabase,
      'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu',
      q => q.not('asil', 'is', null),
    ),
    fetchAllCalisan<{ sicil_no: string; cinsiyet: string | null; dogum_tarihi: string | null }>(
      supabase,
      'sicil_no, cinsiyet, dogum_tarihi',
    ),
    fetchAllCalisanOgrenim<{ sicil_no: string; ogrenim_turu: string | null; varsayilan: boolean; aktif: boolean }>(
      supabase,
      'sicil_no, ogrenim_turu, varsayilan, aktif',
    ),
    fetchAllFirmaCalisanlar<{
      sicil_no: string | null
      cinsiyet: string | null
      dogum_tarihi: string | null
      ogrenim: string | null
      kuruma_giris_tarihi: string | null
      ayrilis_tarihi: string | null
    }>(supabase, 'sicil_no, cinsiyet, dogum_tarihi, ogrenim, kuruma_giris_tarihi, ayrilis_tarihi'),
  ])
  if (kadroSonuc.error || calisanSonuc.error || ogrenimSonuc.error || firmaSonuc.error) return null

  const calisan = new Map(calisanSonuc.data.map(c => [c.sicil_no, c]))
  const ogrenimListe = new Map<string, CalisanOgrenimRaporSatir[]>()
  for (const satir of ogrenimSonuc.data) {
    const liste = ogrenimListe.get(satir.sicil_no) ?? []
    liste.push({ ...satir, meslegi: null })
    ogrenimListe.set(satir.sicil_no, liste)
  }
  const kadroGrup = new Map<string, KadroRaporRow[]>()
  for (const satir of kadroSonuc.data) {
    const sicil = String(satir.asil ?? '').trim()
    if (!sicil) continue
    const liste = kadroGrup.get(sicil) ?? []
    liste.push(satir)
    kadroGrup.set(sicil, liste)
  }

  const profiller: AktifPersonelProfil[] = []
  const kadroSicil = new Set<string>()
  for (const [sicil, satirlar] of kadroGrup) {
    const secilen = secilenKadroSatirAsil(satirlar, bugun)
    if (!secilen) continue
    kadroSicil.add(sicil)
    const kisi = calisan.get(sicil)
    const ogrenim = pickVarsayilanOgrenimKaydi(ogrenimListe.get(sicil) ?? [])
    profiller.push({
      cinsiyet: kisi?.cinsiyet ?? null,
      yas: yasTamamlanan(kisi?.dogum_tarihi, bugun),
      ogrenim: ogrenim?.ogrenim_turu?.trim() || null,
      statu: secilen.statu?.trim() || null,
    })
  }

  for (const firma of firmaSonuc.data) {
    if (!firmaAktif(firma.kuruma_giris_tarihi, firma.ayrilis_tarihi, bugun)) continue
    const sicil = firma.sicil_no?.trim() || ''
    if (sicil && kadroSicil.has(sicil)) continue
    profiller.push({
      cinsiyet: firma.cinsiyet,
      yas: yasTamamlanan(firma.dogum_tarihi, bugun),
      ogrenim: firma.ogrenim?.trim() || null,
      statu: FIRMA_STATU_ETIKET,
    })
  }
  return profiller
}
