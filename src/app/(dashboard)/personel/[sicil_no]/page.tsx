import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import PersonelDetayClient from '@/components/personel/PersonelDetayClient'
import { calisanGuncelle } from './actions'
import { loadPersonelDetayPageOrRedirect } from '@/lib/personel-detay-load'
import type { Tables } from '@/types/database'

interface Props {
  params: Promise<{ sicil_no: string }>
  searchParams?: Promise<{ kaynak?: string }>
}

export default async function PersonelDetayPage({ params, searchParams }: Props) {
  const { sicil_no: rawSegment } = await params
  const supabase = await createClient()

  const sp = await searchParams?.catch(() => ({} as { kaynak?: string }))
  const kaynak = sp?.kaynak ?? ''

  const data = await loadPersonelDetayPageOrRedirect(supabase, rawSegment, kaynak)
  const { calisan, ...rest } = data

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : null
  const saltOkunur = access?.mode === 'kullanici'
  if (access?.mode === 'kullanici') {
    const own = access.sicilNo.trim()
    const card = (calisan.sicil_no ?? '').trim()
    if (!own || own !== card) notFound()
  }

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link
          href={kaynak === 'ayrilanlar' ? '/personel/ayrilanlar' : '/personel'}
          className="hover:text-slate-800 transition-colors"
        >
          {kaynak === 'ayrilanlar' ? 'Ayrılanlar' : 'Çalışanlar'}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-800 font-medium">{calisan.ad_soyad}</span>
      </nav>

      <PersonelDetayClient
        kaynak={rest.kaynak}
        calisan={calisan as Tables<'calisan'>}
        kadrolar={rest.kadrolar}
        hareketler={rest.hareketler}
        auditLoglar={rest.auditLoglar}
        izinHaklari={rest.izinHaklari}
        izinHareketleri={rest.izinHareketleri}
        terfiKayitlari={rest.terfiKayitlari}
        ogrenimler={rest.ogrenimler}
        aileBildirimi={rest.aileBildirimi}
        malKayitlari={rest.malKayitlari}
        egitimKatilimlari={rest.egitimKatilimlari}
        yevmiyeFazlaMesaiAylik={rest.yevmiyeFazlaMesaiAylik}
        tanimGostergeKha={rest.tanimGostergeKha}
        terfiOncesiTarihce={rest.terfiOncesiTarihce}
        onKisiselGuncelle={saltOkunur ? undefined : calisanGuncelle}
        saltOkunur={saltOkunur}
      />
    </div>
  )
}
