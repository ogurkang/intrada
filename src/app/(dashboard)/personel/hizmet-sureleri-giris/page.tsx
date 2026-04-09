import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HizmetSureleriGirisClient from '@/components/personel/HizmetSureleriGirisClient'
import type { Tables } from '@/types/database'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { hizmetSureleriSatirKaydet, hizmetSureleriTopluKaydet } from './actions'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { etiketAnahtari } from '@/lib/rapor-statuye-gore-cinsiyet'
import { TANIMSIZ_STATU_ETIKET, hazirlaStatuSirali, karsilastirStatuSonraSicilAd } from '@/lib/statu-liste-siralama'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default async function HizmetSureleriGirisPage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  const [
    { data: calisanRaw, error },
    { data: phRaw },
    { data: tanimStatuRaw },
  ] = await Promise.all([
    supabase
      .from('calisan')
      .select(
        'sicil_no, public_id, ad_soyad, tckn, gorev_turu, hizmet_suresi_yil, hizmet_suresi_ay, hizmet_suresi_gun',
      )
      .order('ad_soyad'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
  ])

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
    if (!sonAyrilis) aktifSiciller.add(c.sicil_no)
  })

  const { statuSirali, etiketler } = hazirlaStatuSirali(tanimStatuRaw ?? [])

  const kadroAday = calisanFiltreli.filter(c => aktifSiciller.has(c.sicil_no))

  const sicilList = kadroAday.map(c => c.sicil_no)
  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const part of chunk(sicilList, 120)) {
    if (part.length === 0) continue
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

  const data = kadroAday
    .map(c => {
      const rows = kadroByAsil.get(c.sicil_no) ?? []
      const sec = secilenKadroSatirAsil(rows, D)
      const raw = sec?.statu
      const statuEtiket = etiketAnahtari(etiketler, raw) || TANIMSIZ_STATU_ETIKET
      return { statuEtiket, ...c }
    })
    .sort((a, b) =>
      karsilastirStatuSonraSicilAd(
        { statuEtiket: a.statuEtiket, sicil_no: a.sicil_no, ad_soyad: a.ad_soyad },
        { statuEtiket: b.statuEtiket, sicil_no: b.sicil_no, ad_soyad: b.ad_soyad },
        statuSirali,
      ),
    )

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/personel" className="hover:text-slate-800 transition-colors">
          Çalışanlar
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Hizmet Süreleri</span>
      </nav>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <HizmetSureleriGirisClient
        data={
          data as (Pick<
            Tables<'calisan'>,
            | 'sicil_no'
            | 'public_id'
            | 'ad_soyad'
            | 'tckn'
            | 'gorev_turu'
            | 'hizmet_suresi_yil'
            | 'hizmet_suresi_ay'
            | 'hizmet_suresi_gun'
          > & { statuEtiket: string })[]
        }
        statuSirali={statuSirali}
        onSatirKaydet={hizmetSureleriSatirKaydet}
        onTopluKaydet={hizmetSureleriTopluKaydet}
      />
    </div>
  )
}
