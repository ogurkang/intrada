import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import OgrenimYeniClient from '@/components/bildirim/OgrenimYeniClient'

export default async function OgrenimYeniPage() {
  const supabase = await createClient()

  const [{ data: personeller }, { data: ogrenimTurleri }] = await Promise.all([
    supabase.from('calisan').select('sicil_no, ad_soyad').order('ad_soyad'),
    supabase.from('tanim_ogrenim').select('id, isim').order('isim'),
  ])

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
        personeller={(personeller ?? []) as { sicil_no: string; ad_soyad: string }[]}
        ogrenimTurleri={(ogrenimTurleri ?? []) as { id: number; isim: string }[]}
      />
    </div>
  )
}
