import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import {
  fetchAktifMahalleTanimlari,
  personelAdresGosterimMetni,
  type MahalleTanimSatir,
} from '@/lib/personel-adres'
import AdresDuzenlemeClient, {
  type AdresDuzenlemeListeSatir,
} from '@/components/personel/AdresDuzenlemeClient'
import { adresDuzenlemeSatirKaydet, adresDuzenlemeTopluKaydet } from './actions'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default async function AdresDuzenlemePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : null
  if (access?.mode === 'kullanici') notFound()

  const D = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw, error }, { data: phRaw }] = await Promise.all([
    supabase
      .from('calisan')
      .select('sicil_no, public_id, ad_soyad, mahalle_id, adres_detay, adresi')
      .order('ad_soyad'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
  ])

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) {
      sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
    }
  }

  const calisanFiltreli = filterOutGodmodeCalisan(calisanRaw ?? [])
  const aktifCalisanlar = calisanFiltreli.filter(c => {
    const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
    return !sonAyrilis || sonAyrilis > D
  })

  const mahalleKayitlari = await fetchAktifMahalleTanimlari(supabase)
  const mahalleById = new Map<number, MahalleTanimSatir>(
    mahalleKayitlari.map(m => [m.id, m]),
  )

  const eksikMahalleIds = [
    ...new Set(
      aktifCalisanlar
        .map(c => c.mahalle_id)
        .filter((id): id is number => id != null && !mahalleById.has(id)),
    ),
  ]

  for (const part of chunk(eksikMahalleIds, 120)) {
    if (!part.length) continue
    const { data: ekMahalle } = await supabase
      .from('tanim_adres_mahalle')
      .select('id, il, ilce, mahalle_adi, aktif')
      .in('id', part)
    for (const m of ekMahalle ?? []) {
      const satir = m as MahalleTanimSatir
      mahalleById.set(satir.id, satir)
      mahalleKayitlari.push(satir)
    }
  }

  const data: AdresDuzenlemeListeSatir[] = aktifCalisanlar
    .map(c => {
      const mahalle = c.mahalle_id != null ? mahalleById.get(c.mahalle_id) ?? null : null
      return {
        kayit_key: c.sicil_no,
        sicil_no: c.sicil_no,
        public_id: c.public_id,
        ad_soyad: c.ad_soyad,
        mahalle_id: c.mahalle_id ?? null,
        adres_detay: c.adres_detay ?? null,
        eski_adres_gosterim: personelAdresGosterimMetni(mahalle, c.adres_detay, c.adresi),
      }
    })
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/personel" className="hover:text-slate-800 transition-colors">
          Çalışanlar
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Adres Düzenleme</span>
      </nav>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <AdresDuzenlemeClient
        data={data}
        mahalleKayitlari={mahalleKayitlari}
        onSatirKaydet={adresDuzenlemeSatirKaydet}
        onTopluKaydet={adresDuzenlemeTopluKaydet}
      />
    </div>
  )
}
