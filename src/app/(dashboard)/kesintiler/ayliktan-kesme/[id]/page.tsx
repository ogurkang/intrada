import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { paraTr, YARIM_ZAMANLI_CUMLE, type AyliktanKesmeBordro } from '@/lib/ayliktan-kesme-hesap'

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

export default async function AyliktanKesmeDetayPage({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('ayliktan_kesme_bordrolari')
    .select('id, sicil_no, ad_soyad, created_at, created_by_email, bordro')
    .eq('id', id)
    .maybeSingle()

  if (!kayit?.bordro) notFound()
  const bordro = kayit.bordro as AyliktanKesmeBordro

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const izinli =
    isAdminLike(access) ||
    (access.mode === 'kullanici' &&
      kullaniciPathAllowed('/kesintiler/ayliktan-kesme', access.sicilNo, access.menuIzinleri))
  if (!izinli) notFound()

  const k = bordro.kaynak
  const satirlar: { etiket: string; deger: string }[] = [
    { etiket: 'Personel', deger: `${k.ad_soyad} (${k.sicil_no})` },
    { etiket: 'T.C. Kimlik No', deger: k.tckn || '—' },
    { etiket: 'Unvan', deger: k.unvan || '—' },
    { etiket: 'Müdürlük', deger: k.mudurluk || '—' },
    { etiket: 'KHA derece / kademe', deger: `${k.derece} / ${k.kademe}` },
    { etiket: 'Ceza oranı', deger: `1/${bordro.katsayi.payda}` },
    { etiket: 'Kesinti toplamı', deger: paraTr(bordro.toplam) },
    { etiket: 'Yarım zamanlı', deger: bordro.yarim_zamanli ? 'Evet' : 'Hayır' },
    { etiket: 'Oluşturulma', deger: tarihFormat(kayit.created_at) },
    { etiket: 'Oluşturan', deger: kayit.created_by_email ?? '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/kesintiler/ayliktan-kesme"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Aylıktan Kesme İşlemleri
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Aylıktan Kesme Bordrosu</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/kesintiler/ayliktan-kesme/${kayit.id}/duzenle`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white text-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Düzenle
          </Link>
          <a
            href={`/api/kesintiler/ayliktan-kesme/pdf?id=${kayit.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700"
          >
            PDF İndir
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl">
        <table className="w-full text-sm">
          <tbody>
            {satirlar.map(s => (
              <tr key={s.etiket} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-600 w-48 align-top">{s.etiket}</td>
                <td className="px-4 py-3 text-slate-800">{s.deger}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 font-medium">Maaş unsuru</th>
              <th className="py-2 font-medium text-right">Tutar</th>
              <th className="py-2 font-medium text-right">Kesinti</th>
            </tr>
          </thead>
          <tbody>
            {bordro.satirlar.map(s => (
              <tr key={s.ad} className="border-b border-slate-100">
                <td className="py-2 text-slate-700">{s.ad}</td>
                <td className="py-2 text-right tabular-nums">{paraTr(s.tutar)}</td>
                <td className="py-2 text-right tabular-nums">{paraTr(s.kesinti)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bordro.yarim_zamanli ? (
          <p className="mt-4 text-sm text-slate-700">{YARIM_ZAMANLI_CUMLE}</p>
        ) : null}
      </div>
    </div>
  )
}
