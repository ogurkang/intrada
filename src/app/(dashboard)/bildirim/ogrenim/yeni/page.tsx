import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OgrenimYeniClient from '@/components/bildirim/OgrenimYeniClient'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { sortTanimOgrenimByIsim } from '@/lib/ogrenim-sira'

export default async function OgrenimYeniPage() {
  const supabase = await createClient()

  const [{ data: calisanRaw }, { data: phRaw }, { data: ogrenimTurleri }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').order('yururluk_tarihi', { ascending: false }),
    supabase.from('tanim_ogrenim').select('id, isim'),
  ])

  // Çalışanlar menüsü ile aynı aktiflik kuralı: personel_hareketleri'nde en son kaydın ayrılış tarihi boş olmalı
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
  const personeller = calisanFiltreli
    .filter(c => aktifSiciller.has(c.sicil_no))
    .map(c => ({ sicil_no: c.sicil_no, ad_soyad: c.ad_soyad ?? c.sicil_no }))
    .sort((a, b) => (a.ad_soyad ?? '').localeCompare(b.ad_soyad ?? '', 'tr'))

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Yeni Öğrenim Kaydı</h1>
        <Link
          href="/bildirim/ogrenim"
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50"
        >
          ← Listeye dön
        </Link>
      </div>

      <OgrenimYeniClient
        personeller={personeller as { sicil_no: string; ad_soyad: string }[]}
        ogrenimTurleri={sortTanimOgrenimByIsim(
          (ogrenimTurleri ?? []) as { id: number; isim: string }[],
        )}
      />
    </div>
  )
}
