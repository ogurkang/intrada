import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { aylikIzinTarihGoster } from '@/lib/aylik-izin-belge'

interface Props {
  params: Promise<{ id: string }>
}

function tarihFormat(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AylikIzinDetayPage({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('aylik_izin_bildirimleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, unvan, mudurluk, baslangic_tarihi, bitis_tarihi, created_at, created_by_email',
    )
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

  const satirlar: { etiket: string; deger: string }[] = [
    { etiket: 'Personel', deger: `${kayit.ad_soyad} (${kayit.sicil_no})` },
    { etiket: 'T.C. Kimlik No', deger: kayit.tckn ?? '—' },
    { etiket: 'Unvan', deger: kayit.unvan ?? '—' },
    { etiket: 'Müdürlük', deger: kayit.mudurluk ?? '—' },
    {
      etiket: 'İzin Tarihleri',
      deger: `${aylikIzinTarihGoster(kayit.baslangic_tarihi)} – ${aylikIzinTarihGoster(kayit.bitis_tarihi)}`,
    },
    { etiket: 'Oluşturulma', deger: tarihFormat(kayit.created_at) },
    { etiket: 'Oluşturan', deger: kayit.created_by_email ?? '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/bildirim/aylik-izin"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Aylıksız İşlemleri
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Aylıksız İzin Talebi Detayı</h1>
        </div>
        <a
          href={`/api/bildirim/aylik-izin/word?id=${kayit.id}`}
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl">
        <table className="w-full text-sm">
          <tbody>
            {satirlar.map(s => (
              <tr key={s.etiket} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-600 w-44 align-top">{s.etiket}</td>
                <td className="px-4 py-3 text-slate-800">{s.deger}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
