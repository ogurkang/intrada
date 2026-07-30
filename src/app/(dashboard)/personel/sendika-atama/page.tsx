import { createClient } from '@/lib/supabase/server'
import PersonelSendikaAtamaClient from '@/components/personel/PersonelSendikaAtamaClient'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { fetchAktifPersonelSendika } from '@/lib/personel-sendika-load'
import { personelAktifMi, sonAyrilisHaritasiOlustur } from '@/lib/personel-ayrilis'
import { sortTanimSendika } from '@/lib/sendika-sira'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import type { Tables } from '@/types/database'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default async function PersonelSendikaAtamaPage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw }, { data: phRaw }, { data: sendikaRaw }, sendikaBySicil] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi, ayrilis_nedeni').order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_sendika').select('id, statu, kisa_ad, aktif').eq('aktif', true),
    fetchAktifPersonelSendika(supabase),
  ])

  const sonAyrilisHaritasi = sonAyrilisHaritasiOlustur(phRaw ?? [])
  const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw ?? [])
  const aktifAday = new Set<string>()
  calisanFiltreli.forEach(c => {
    if (personelAktifMi(sonAyrilisHaritasi.get(c.sicil_no), D)) aktifAday.add(c.sicil_no)
  })

  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const part of chunk([...aktifAday], 120)) {
    if (!part.length) continue
    const { data: kRows } = await supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .in('asil', part)
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as KadroRaporRow)
      kadroByAsil.set(r.asil, list)
    }
  }

  const personeller = calisanFiltreli
    .filter(c => aktifAday.has(c.sicil_no))
    .filter(c => Boolean(secilenKadroSatirAsil(kadroByAsil.get(c.sicil_no) ?? [], D)))
    .filter(c => !sendikaBySicil.has(c.sicil_no))
    .map(c => {
      const kadro = secilenKadroSatirAsil(kadroByAsil.get(c.sicil_no) ?? [], D)
      const uyelik = sendikaBySicil.get(c.sicil_no)
      return {
        sicil_no: c.sicil_no,
        ad_soyad: c.ad_soyad ?? c.sicil_no,
        statu: kadro?.statu ?? null,
        mevcut_sendika_id: uyelik?.sendika_id ?? null,
        mevcut_kisa_ad: uyelik?.tanim_sendika?.kisa_ad ?? null,
      }
    })

  const sendikalar = sortTanimSendika((sendikaRaw ?? []) as Tables<'tanim_sendika'>[]).map(s => ({
    id: s.id,
    statu: s.statu,
    kisa_ad: s.kisa_ad,
  }))

  return <PersonelSendikaAtamaClient personeller={personeller} sendikalar={sendikalar} />
}
