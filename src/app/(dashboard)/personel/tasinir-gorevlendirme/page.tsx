import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TasinirGorevlendirmeClient from '@/components/personel/TasinirGorevlendirmeClient'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { tasinirGorevlendirmeMenuAcikMi } from '@/lib/uygulama-ayar'
import { tasinirGoreviSatirKaydet, tasinirGoreviTopluKaydet } from './actions'

export default async function TasinirGorevlendirmePage() {
  const supabase = await createClient()
  const menuAcik = await tasinirGorevlendirmeMenuAcikMi(supabase)
  if (!menuAcik) redirect('/personel')

  const D = new Date().toISOString().slice(0, 10)

  const [
    { data: calisanRaw, error },
    { data: phRaw },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('calisan')
      .select('sicil_no, public_id, ad_soyad, tckn, tasinir_gorevi')
      .order('ad_soyad'),
    supabase
      .from('personel_hareketleri')
      .select('sicil_no, ayrilis_tarihi')
      .order('yururluk_tarihi', { ascending: false }),
  ])

  type CalisanSatir = {
    sicil_no: string
    public_id: string
    ad_soyad: string
    tckn: string | null
    tasinir_gorevi?: string | null
  }

  const sonAyrilisPerSicil = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilisPerSicil.has(r.sicil_no)) {
      sonAyrilisPerSicil.set(r.sicil_no, r.ayrilis_tarihi)
    }
  }

  const calisanFiltreli = filterOutGodmodeCalisan((calisanRaw ?? []) as CalisanSatir[])
  const data = calisanFiltreli
    .filter(c => {
      const sonAyrilis = sonAyrilisPerSicil.get(c.sicil_no)
      return !sonAyrilis || sonAyrilis > D
    })
    .map(c => ({
      sicil_no: c.sicil_no,
      public_id: c.public_id,
      ad_soyad: c.ad_soyad,
      tckn: c.tckn ?? null,
      deger: c.tasinir_gorevi ?? null,
    }))

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/personel" className="hover:text-slate-800 transition-colors">
          Çalışanlar
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Taşınır Görevlendirme</span>
      </nav>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <TasinirGorevlendirmeClient
        data={data}
        onSatirKaydet={tasinirGoreviSatirKaydet}
        onTopluKaydet={tasinirGoreviTopluKaydet}
      />
    </div>
  )
}
