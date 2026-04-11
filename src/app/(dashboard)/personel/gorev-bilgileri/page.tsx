import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import GorevBilgileriListeClient, { type GorevListeSatir } from '@/components/personel/GorevBilgileriListeClient'
import type { Tables } from '@/types/database'
import { filterOutGodmodeCalisan, filterOutHiddenSystemByEmail } from '@/lib/godmode-calisan'
import { gorevBilgileriSatirKaydet, gorevBilgileriTopluKaydet } from './actions'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { etiketAnahtari } from '@/lib/rapor-statuye-gore-cinsiyet'
import { isFirmaCalisanAktif } from '@/lib/firma-calisan-durum'
import {
  FIRMA_STATU_ETIKET,
  TANIMSIZ_STATU_ETIKET,
  hazirlaStatuSirali,
  karsilastirStatuSonraSicilAd,
} from '@/lib/statu-liste-siralama'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default async function GorevBilgileriPage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  type CalisanGorevRow = {
    sicil_no: string; public_id: string | null; ad_soyad: string
    gorev_yeri: string | null; gorev_turu: string | null; gorev_turu_tarihi: string | null
    gorev_turu_bitis_tarihi: string | null; gorev_turu_aciklama: string | null
    gorev_turu_yemek_hakki: boolean | null; gorev_durumu: string | null
    engelli_oran: number | null; engelli_baslangic: string | null; engelli_bitis: string | null
    gorev_durumu_note?: never  // unused, just for typing
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calisanQuery = (supabase as any)
    .from('calisan')
    .select('sicil_no, public_id, ad_soyad, gorev_yeri, gorev_turu, gorev_turu_tarihi, gorev_turu_bitis_tarihi, gorev_turu_aciklama, gorev_turu_yemek_hakki, gorev_durumu, engelli_oran, engelli_baslangic, engelli_bitis')
    .order('ad_soyad')

  const [
    calisanResult,
    { data: phRaw },
    { data: tanimStatuRaw },
  ] = await Promise.all([
    calisanQuery as Promise<{ data: CalisanGorevRow[] | null; error: { message: string } | null }>,
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
  ])

  const { data: calisanRaw, error } = calisanResult

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) {
      sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw as any ?? []) as CalisanGorevRow[]
  const aktifSiciller = new Set<string>()
  calisanFiltreli.forEach(c => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    if (!sonAyrilis) aktifSiciller.add(c.sicil_no)
  })
  const kadroCalisan = calisanFiltreli.filter(c => aktifSiciller.has(c.sicil_no))

  const { statuSirali, etiketler } = hazirlaStatuSirali(tanimStatuRaw ?? [])

  const sicilList = [...aktifSiciller]
  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const part of chunk(sicilList, 120)) {
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

  const kadroSatirlar = kadroCalisan.map(c => {
    const rows = kadroByAsil.get(c.sicil_no) ?? []
    const sec = secilenKadroSatirAsil(rows, D)
    const raw = sec?.statu
    const statuEtiket = etiketAnahtari(etiketler, raw) || TANIMSIZ_STATU_ETIKET
    return {
      kind: 'kadro' as const,
      statuEtiket,
      ...c,
    }
  })

  const { data: firmaRaw } = await supabase
    .from('firma_calisanlar')
    .select('id, public_id, sicil_no, ad_soyad, gorev_mudurlugu, ayrilis_tarihi, e_posta')
    .order('ad_soyad')

  const firmaAktif = filterOutHiddenSystemByEmail(firmaRaw ?? []).filter(f =>
    isFirmaCalisanAktif(f.ayrilis_tarihi, D),
  )
  const kadroBySicil = new Map(kadroSatirlar.map(k => [k.sicil_no.trim(), k] as const))
  const cikacakKadroSicil = new Set<string>()
  const firmaSatirlar = firmaAktif
    .filter(f => {
      const sicil = String(f.sicil_no ?? '').trim()
      if (!sicil) return true
      const kadro = kadroBySicil.get(sicil)
      if (!kadro) return true
      // Kadro statüsü tanımsızsa firma kaydı tercih edilir; tanımlı statü varsa kadro satırı korunur.
      if (kadro.statuEtiket === TANIMSIZ_STATU_ETIKET) {
        cikacakKadroSicil.add(sicil)
        return true
      }
      return false
    })
    .map(f => ({
    kind: 'firma' as const,
    statuEtiket: FIRMA_STATU_ETIKET,
    id: f.id,
    public_id: f.public_id,
    sicil_no: f.sicil_no,
    ad_soyad: f.ad_soyad,
    gorev_yeri: f.gorev_mudurlugu,
    }))

  const kadroSatirlarFiltered = kadroSatirlar.filter(k => !cikacakKadroSicil.has(k.sicil_no.trim()))

  const data = ([...kadroSatirlarFiltered, ...firmaSatirlar] as GorevListeSatir[]).sort((a, b) =>
    karsilastirStatuSonraSicilAd(
      {
        statuEtiket: a.statuEtiket,
        sicil_no: a.kind === 'kadro' ? a.sicil_no : a.sicil_no,
        ad_soyad: a.ad_soyad,
      },
      {
        statuEtiket: b.statuEtiket,
        sicil_no: b.kind === 'kadro' ? b.sicil_no : b.sicil_no,
        ad_soyad: b.ad_soyad,
      },
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
        <span className="text-slate-800 font-medium">Görev Bilgileri</span>
      </nav>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <GorevBilgileriListeClient
        data={data}
        statuSirali={statuSirali}
        onSatirKaydet={gorevBilgileriSatirKaydet}
        onTopluKaydet={gorevBilgileriTopluKaydet}
      />
    </div>
  )
}
