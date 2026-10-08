import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { sendikaIstifaGuncelle } from '../../calisma-belgesi/actions'
import SendikaIstifaDetayClient from '@/components/bildirim/SendikaIstifaDetayClient'

interface Props {
  params: Promise<{ id: string }>
}

function utcGun(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function ggAayyyy(isoGun: string): string {
  const [y, a, g] = isoGun.split('-')
  if (!y || !a || !g) return isoGun
  return `${g}.${a}.${y}`
}

export default async function SendikaIstifaDetayPage({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('sendika_istifa_bildirimleri')
    .select('id, sicil_no, ad_soyad, tckn, sendika_adi, created_at, created_by_email')
    .eq('id', id)
    .maybeSingle()

  if (!kayit) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  if (!isAdminLike(access)) {
    if (access.mode !== 'kullanici') notFound()
    if (String(access.sicilNo).trim() !== String(kayit.sicil_no ?? '').trim()) notFound()
  }

  const istifaTarihi = utcGun(String(kayit.created_at ?? ''))
  const satirlar: { etiket: string; deger: string }[] = [
    { etiket: 'Personel', deger: `${kayit.ad_soyad} (${kayit.sicil_no})` },
    { etiket: 'T.C. Kimlik No', deger: kayit.tckn ?? '—' },
    { etiket: 'Sendika Adı', deger: kayit.sendika_adi ?? '—' },
    { etiket: 'İstifa Tarihi', deger: istifaTarihi.length >= 10 ? ggAayyyy(istifaTarihi) : '—' },
    { etiket: 'Oluşturan', deger: kayit.created_by_email ?? '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/bildirim/sendika-istifa"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Sendika İstifa İşlemleri
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Sendika İstifa Bildirimi Detayı</h1>
        </div>
        <a
          href={`/api/bildirim/sendika-istifa/word?id=${kayit.id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Word İndir
        </a>
      </div>

      <SendikaIstifaDetayClient
        id={kayit.id}
        satirlar={satirlar}
        istifaTarihi={istifaTarihi}
        onGuncelle={sendikaIstifaGuncelle}
      />
    </div>
  )
}
