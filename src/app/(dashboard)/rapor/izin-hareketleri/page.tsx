import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { fetchAllIzinHareketleriByYil } from '@/lib/izin-hareketleri-load'

type IzinHareketRaporSatir = {
  id: number
  yil: number
  sira_no: string | null
  sicil_no: string
  tur: string
  ayrilis: string | null
  baslama: string | null
  gun: number
  durum: string
  islem_yapan: string | null
  kayit_tarihi: string
}

interface Props {
  searchParams: Promise<{ yil?: string; siraBas?: string; siraBit?: string }>
}

function parsePozitifInt(v: string | undefined): number | null {
  if (!v) return null
  const n = Number.parseInt(v, 10)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function tarihFmt(v: string | null) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('tr-TR')
}

export default async function IzinHareketleriRaporuPage({ searchParams }: Props) {
  const p = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const adminMi = isAdminLike(access)

  const varsayilanYil = new Date().getFullYear()
  const yil = parsePozitifInt(p.yil) ?? varsayilanYil
  const siraBas = parsePozitifInt(p.siraBas)
  const siraBit = parsePozitifInt(p.siraBit)
  const aralikGecerli = siraBas != null && siraBit != null
  const aralikBas = aralikGecerli ? Math.min(siraBas, siraBit) : null
  const aralikBit = aralikGecerli ? Math.max(siraBas, siraBit) : null

  const gecmisSorgu = user
    ? adminMi
      ? supabase
          .from('rapor_izin_excel_gecmis')
          .select('id, yil, sira_bas, sira_bit, kayit_sayisi, actor_email, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
      : supabase
          .from('rapor_izin_excel_gecmis')
          .select('id, yil, sira_bas, sira_bit, kayit_sayisi, actor_email, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
    : Promise.resolve({ data: [] as never[] })

  const [{ data: izinRaw, error: izinErr }, { data: calisanRaw }, { data: gecmisRaw }] = await Promise.all([
    fetchAllIzinHareketleriByYil<IzinHareketRaporSatir>(supabase, yil, {
      select: 'id, yil, sira_no, sicil_no, tur, ayrilis, baslama, gun, durum, islem_yapan, kayit_tarihi',
    }),
    supabase.from('calisan').select('sicil_no, ad_soyad'),
    gecmisSorgu,
  ])

  const izinListe = [...izinRaw].sort((a, b) => b.id - a.id)

  const adMap = new Map((calisanRaw ?? []).map(c => [c.sicil_no, c.ad_soyad ?? c.sicil_no]))
  const seciliSayisi = izinListe.filter(r => {
    if (r.durum === 'İptal Edildi') return false
    if (!aralikGecerli || aralikBas == null || aralikBit == null) return false
    const sira = parsePozitifInt(r.sira_no ?? undefined)
    if (sira == null) return false
    return sira >= aralikBas && sira <= aralikBit
  }).length

  const excelHref =
    aralikGecerli && aralikBas != null && aralikBit != null
      ? `/api/rapor/izin-hareketleri/excel?yil=${yil}&siraBas=${aralikBas}&siraBit=${aralikBit}`
      : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">İzin Hareketleri Raporu</h1>
        <p className="text-sm text-slate-500 mt-1">İki sıra numarası aralığı ile izin hareketlerini salt okunur inceleyip Excel olarak indirebilirsiniz.</p>
      </div>

      <form
        action="/api/rapor/izin-hareketleri/excel"
        method="get"
        className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3"
      >
        <label className="text-sm text-slate-600">
          <span className="block mb-1">Yıl</span>
          <input name="yil" defaultValue={yil} className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-slate-600">
          <span className="block mb-1">Sıra No (Başlangıç)</span>
          <input name="siraBas" defaultValue={p.siraBas ?? ''} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-slate-600">
          <span className="block mb-1">Sıra No (Bitiş)</span>
          <input name="siraBit" defaultValue={p.siraBit ?? ''} className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-emerald-700 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-600"
          title="Yıl, başlangıç ve bitiş sıra numarası ile Excel indir"
        >
          Excel İndir{excelHref ? ` (${seciliSayisi})` : ''}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Son 5 Excel İndirme</h2>
        {(gecmisRaw ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">Henüz indirme kaydı yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Tarih/Saat</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Kullanıcı</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-600">Aralık</th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-600">Kayıt</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-600">İndir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(gecmisRaw ?? []).map(g => (
                  <tr key={g.id}>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{new Date(g.created_at).toLocaleString('tr-TR')}</td>
                    <td className="px-3 py-2 text-slate-600">{(g.actor_email ?? '').trim() || '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{g.yil}/{g.sira_bas}-{g.sira_bit}</td>
                    <td className="px-3 py-2 text-center text-slate-700">{g.kayit_sayisi}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/api/rapor/izin-hareketleri/excel?gecmisId=${g.id}`}
                        className="inline-flex rounded-lg bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 hover:bg-emerald-600"
                      >
                        İndir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {izinErr && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3">
          Veri yüklenirken hata: {izinErr}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-600">
          {yil} yılı izin hareketleri (salt okunur) · {izinListe.length} kayıt
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Sıra No</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Sicil No</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Ad Soyad</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Tür</th>
                <th className="text-center px-3 py-2 font-semibold text-slate-600">Ayrılış</th>
                <th className="text-center px-3 py-2 font-semibold text-slate-600">Başlama</th>
                <th className="text-center px-3 py-2 font-semibold text-slate-600">Gün</th>
                <th className="text-center px-3 py-2 font-semibold text-slate-600">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {izinListe.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">Bu yıla ait izin hareketi bulunamadı.</td>
                </tr>
              ) : (
                izinListe.map(r => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-slate-700">{r.yil}/{r.sira_no ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{r.sicil_no}</td>
                    <td className="px-3 py-2 text-slate-700">{adMap.get(r.sicil_no) ?? r.sicil_no}</td>
                    <td className="px-3 py-2 text-slate-700">{r.tur}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{tarihFmt(r.ayrilis)}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{tarihFmt(r.baslama)}</td>
                    <td className="px-3 py-2 text-center text-slate-700">{r.gun}</td>
                    <td className="px-3 py-2 text-center text-slate-700">{r.durum}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
