import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OgrenimYeniClient from '@/components/bildirim/OgrenimYeniClient'

export default async function OgrenimYeniPage() {
  const supabase = await createClient()

  const [{ data: aktifPersonel }, { data: ayrilanPh }, { data: ogrenimTurleri }] = await Promise.all([
    supabase.from('aktif_personel').select('sicil_no, ad_soyad, ayrilis_tarihi').is('ayrilis_tarihi', null),
    supabase.from('personel_hareketleri').select('sicil_no, ayrilis_tarihi').not('ayrilis_tarihi', 'is', null),
    supabase.from('tanim_ogrenim').select('id, isim').order('isim'),
  ])
  /** Ayrılanlar ekranıyla aynı kaynak: personel_hareketleri.ayrilis_tarihi dolu olanlar listelenmez */
  const ayrilanSet = new Set((ayrilanPh ?? []).map(r => r.sicil_no))

  const personeller = (aktifPersonel ?? [])
    .filter(r => !ayrilanSet.has(r.sicil_no))
    .map((r) => ({ sicil_no: r.sicil_no, ad_soyad: r.ad_soyad ?? r.sicil_no }))
    .sort((a, b) => a.ad_soyad.localeCompare(b.ad_soyad, 'tr'))

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
        ogrenimTurleri={(ogrenimTurleri ?? []) as { id: number; isim: string }[]}
      />
    </div>
  )
}
