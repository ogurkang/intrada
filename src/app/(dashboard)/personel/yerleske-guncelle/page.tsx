import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import YerleskeGuncelleClient from '@/components/personel/YerleskeGuncelleClient'
import { filterOutGodmodeCalisan, filterOutHiddenSystemByEmail } from '@/lib/godmode-calisan'
import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { etiketAnahtari } from '@/lib/rapor-statuye-gore-cinsiyet'
import { TANIMSIZ_STATU_ETIKET, hazirlaStatuSirali } from '@/lib/statu-liste-siralama'
import {
  etkinYerleskeId,
  fetchMudurlukYerleskeTanimSatirlari,
  mudurlukYerleskeHaritasi,
  type YerleskeSecenek,
} from '@/lib/yerleske-adresi'
import { yerleskeGuncelleSatirKaydet, yerleskeGuncelleTopluKaydet } from './actions'
import type { YerleskeGuncelleListeSatir } from '@/components/personel/YerleskeGuncelleClient'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default async function YerleskeGuncellePage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  const [
    { data: calisanRaw, error },
    { data: phRaw },
    { data: tanimStatuRaw },
    { data: firmaRaw },
    tanimSatirlar,
  ] = await Promise.all([
    supabase
      .from('calisan')
      .select('sicil_no, public_id, ad_soyad, gorev_yeri, yerleske_adresi_id')
      .order('ad_soyad'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
    supabase
      .from('firma_calisanlar')
      .select('id, public_id, sicil_no, ad_soyad, gorev_mudurlugu, ayrilis_tarihi, kuruma_giris_tarihi, e_posta, yerleske_adresi_id')
      .order('ad_soyad'),
    fetchMudurlukYerleskeTanimSatirlari(supabase),
  ])

  const yerleskeHarita = mudurlukYerleskeHaritasi(tanimSatirlar)
  const yerleskeHaritaObj: Record<string, YerleskeSecenek[]> = {}
  for (const [k, v] of yerleskeHarita) yerleskeHaritaObj[k] = v

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) {
      sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
    }
  }
  const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw ?? [])
  const aktifSiciller = new Set<string>()
  calisanFiltreli.forEach(c => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis || sonAyrilis > D) aktifSiciller.add(c.sicil_no)
  })

  const { etiketler } = hazirlaStatuSirali(tanimStatuRaw ?? [])
  const kadroAday = calisanFiltreli.filter(c => aktifSiciller.has(c.sicil_no))

  const sicilList = kadroAday.map(c => c.sicil_no)
  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const part of chunk(sicilList, 120)) {
    if (part.length === 0) continue
    const { data: kRows } = await supabase
      .from('kadro_hareketleri')
      .select(
        'asil, statu, kadro_mudurlugu, gorev_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu',
      )
      .in('asil', part)
    for (const r of kRows ?? []) {
      if (!r.asil) continue
      const list = kadroByAsil.get(r.asil) ?? []
      list.push(r as KadroRaporRow)
      kadroByAsil.set(r.asil, list)
    }
  }

  const kadroSatirlar = kadroAday.flatMap(c => {
    const rows = kadroByAsil.get(c.sicil_no) ?? []
    const sec = secilenKadroSatirAsil(rows, D)
    if (!sec) return []
    const gorevMudurlugu = String(sec.gorev_mudurlugu ?? sec.kadro_mudurlugu ?? '').trim()
    const rawStatu = sec.statu
    const statuEtiket = etiketAnahtari(etiketler, rawStatu) || TANIMSIZ_STATU_ETIKET
    const kayitliId = (c as { yerleske_adresi_id?: number | null }).yerleske_adresi_id ?? null
    const seciliYerleskeId = etkinYerleskeId(yerleskeHarita, gorevMudurlugu, kayitliId)
    const satir: YerleskeGuncelleListeSatir = {
      kayit_key: `kadro:${c.sicil_no}`,
      kaynak: 'kadro',
      sicil_no: c.sicil_no,
      public_id: c.public_id,
      ad_soyad: c.ad_soyad,
      statuEtiket,
      gorev_mudurlugu: gorevMudurlugu || '—',
      gorev_yeri: c.gorev_yeri ?? '',
      kayitli_yerleske_id: kayitliId,
      secili_yerleske_id: seciliYerleskeId,
    }
    return [satir]
  })

  const firmaSatirlar: YerleskeGuncelleListeSatir[] = filterOutHiddenSystemByEmail(firmaRaw ?? [])
    .filter(f => {
      const ayr = String(f.ayrilis_tarihi ?? '').slice(0, 10)
      if (ayr && ayr <= D) return false
      const kg = String(f.kuruma_giris_tarihi ?? '').slice(0, 10)
      if (kg && kg > D) return false
      return true
    })
    .map(f => {
      const gorevMudurlugu = String(f.gorev_mudurlugu ?? '').trim()
      const kayitliId = (f as { yerleske_adresi_id?: number | null }).yerleske_adresi_id ?? null
      const seciliYerleskeId = etkinYerleskeId(yerleskeHarita, gorevMudurlugu, kayitliId)
      return {
        kayit_key: `firma:${f.id}`,
        kaynak: 'firma' as const,
        firma_id: f.id,
        sicil_no: String(f.sicil_no ?? '').trim() || '—',
        public_id: f.public_id,
        ad_soyad: f.ad_soyad,
        statuEtiket: FIRMA_STATU_ETIKET,
        gorev_mudurlugu: gorevMudurlugu || '—',
        gorev_yeri: gorevMudurlugu,
        kayitli_yerleske_id: kayitliId,
        secili_yerleske_id: seciliYerleskeId,
      }
    })

  const data = [...kadroSatirlar, ...firmaSatirlar].sort((a, b) => {
    const mud = a.gorev_mudurlugu.localeCompare(b.gorev_mudurlugu, 'tr')
    if (mud !== 0) return mud
    return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
  })

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/personel" className="hover:text-slate-800 transition-colors">
          Çalışanlar
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Yerleşke Güncelle</span>
      </nav>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <YerleskeGuncelleClient
        data={data}
        yerleskeHarita={yerleskeHaritaObj}
        onSatirKaydet={yerleskeGuncelleSatirKaydet}
        onTopluKaydet={yerleskeGuncelleTopluKaydet}
      />
    </div>
  )
}
