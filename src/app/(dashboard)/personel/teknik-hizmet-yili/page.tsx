import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PersonelTekAlanTopluClient from '@/components/personel/PersonelTekAlanTopluClient'
import { yukleThHizmetYiliBekleyenler } from '@/lib/th-hizmet-yili-data'
import { thHizmetYiliSatirKaydet, thHizmetYiliTopluKaydet } from './actions'

export default async function TeknikHizmetYiliPage() {
  const supabase = await createClient()
  const data = await yukleThHizmetYiliBekleyenler(supabase)
  if (!data.length) redirect('/personel')

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/personel" className="hover:text-slate-800 transition-colors">
          Çalışanlar
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">Teknik Hizmet Yılı</span>
      </nav>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 max-w-3xl mb-4">
        Geçici ekran. Asil kadrosu TH olan ve teknik hizmet yılı henüz girilmemiş personel listelenir.
        Tarihi gg.aa.yyyy olarak kaydedince satır listeden düşer. Liste bitince menü kaybolur; yeni TH
        atamalarda tarih personel kartı → Görevlendirme Bilgileri’nden girilir.
      </div>

      <PersonelTekAlanTopluClient
        baslik="Teknik Hizmet Yılı"
        alanEtiketi="Teknik Hizmet Yılı"
        data={data}
        inputType="tarih"
        unvanSutunlari
        sortBy="ad_soyad"
        onSatirKaydet={thHizmetYiliSatirKaydet}
        onTopluKaydet={thHizmetYiliTopluKaydet}
      />
    </div>
  )
}
