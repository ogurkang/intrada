import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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

  const varsayilanYil = new Date().getFullYear()
  const yil = parsePozitifInt(p.yil) ?? varsayilanYil
  const siraBas = parsePozitifInt(p.siraBas)
  const siraBit = parsePozitifInt(p.siraBit)
  const aralikGecerli = siraBas != null && siraBit != null
  const aralikBas = aralikGecerli ? Math.min(siraBas, siraBit) : null
  const aralikBit = aralikGecerli ? Math.max(siraBas, siraBit) : null

  const [{ data: izinRaw }, { data: calisanRaw }, { data: gecmisRaw }] = await Promise.all([
    supabase
      .from('izin_hareketleri')
      .select('id, yil, sira_no, sicil_no, tur, ayrilis, baslama, gun, durum, islem_yapan, kayit_tarihi')
      .eq('yil', yil)
      .order('id', { ascending: false }),
    supabase.from('calisan').select('sicil_no, ad_soyad'),
    user
      ? supabase
          .from('rapor_izin_excel_gecmis')
          .select('id, yil, sira_bas, sira_bit, kayit_sayisi, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as never[] }),
  ])

  const adMap = new Map((calisanRaw ?? []).map(c => [c.sicil_no, c.ad_soyad ?? c.sicil_no]))
  const filtreli = (izinRaw ?? []).filter(r => {
    if (!aralikGecerli || aralikBas == null || aralikBit == null) return false
    const sira = parsePozitifInt(r.sira_no ?? undefined)
    if (sira == null) return false
    return sira >= aralikBas && sira <= aralikBit
  })

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

      <form className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3">
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
        <button type="submit" className="rounded-lg bg-slate-800 text-white text-sm font-medium px-4 py-2 hover:bg-slate-700">
          Listele
        </button>
        {excelHref && (
          <Link href={excelHref} className="rounded-lg bg-emerald-700 text-white text-sm font-medium px-4 py-2 hover:bg-emerald-600">
            Excel İndir ({filtreli.length})
          </Link>
        )}
      </form>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 text-sm text-slate-600">
          {aralikGecerli ? `${yil} yılı ${aralikBas} - ${aralikBit} aralığı` : 'Liste için başlangıç ve bitiş sıra numarası girin.'}
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
              {filtreli.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">Bu aralıkta izin hareketi bulunamadı.</td>
                </tr>
              ) : (
                filtreli.map(r => (
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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Son 5 Excel İndirme</h2>
        {(gecmisRaw ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">Henüz indirme kaydı yok.</p>
        ) : (
          <ul className="space-y-1.5 text-sm text-slate-600">
            {(gecmisRaw ?? []).map(g => (
              <li key={g.id}>
                {new Date(g.created_at).toLocaleString('tr-TR')} · {g.yil}/{g.sira_bas}-{g.sira_bit} · {g.kayit_sayisi} kayıt
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
