import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BelediyeKimlikFormuListeClient from '@/components/yerel-bilgi/BelediyeKimlikFormuListeClient'

export const dynamic = 'force-dynamic'

export default async function BelediyeKimlikFormuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sb = supabase as any
  const { data, error } = await sb
    .from('yerel_bilgi_belediye_kimlik_formu')
    .select('id, sira_no, form_adi, kayit_tarihi, islem_yapan, aktif')
    .order('sira_no', { ascending: true })
  const aktifVar = (data ?? []).some((r: any) => Boolean(r.aktif))

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const islemYapanIds = Array.from(
    new Set((data ?? []).map((r: any) => String(r.islem_yapan ?? '').trim()).filter((v: string) => uuidRegex.test(v))),
  )
  const profilMap = new Map<string, string>()
  if (islemYapanIds.length > 0) {
    const { data: profiller } = await sb
      .from('app_profiles')
      .select('id, kullanici_adi')
      .in('id', islemYapanIds)
    for (const p of profiller ?? []) {
      const id = String((p as any).id ?? '').trim()
      const ad = String((p as any).kullanici_adi ?? '').trim()
      if (id && ad) profilMap.set(id, ad)
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">Belediye Kimlik Formu</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kayıt satırına tıklayarak detay ekranına geçin.</p>
        </div>
        <div className="flex gap-2 justify-end">
          {aktifVar ? (
            <button
              type="button"
              disabled
              title="Yeni kayıt için önce aktif kayıt pasif yapılmalıdır."
              className="inline-flex items-center rounded-lg bg-slate-300 text-slate-600 text-sm px-4 py-2 font-medium cursor-not-allowed"
            >
              Kayıt Ekle
            </button>
          ) : (
            <Link href="/yerel-bilgi/islemler/belediye-kimlik-formu/ekle" target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors">
              Kayıt Ekle
            </Link>
          )}
          <Link href="/yerel-bilgi/islemler" className="inline-flex items-center rounded-lg bg-slate-800 text-white text-sm px-4 py-2 font-medium hover:bg-slate-700 transition-colors">
            ← Yerel Bilgi — İşlemler
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}

      <BelediyeKimlikFormuListeClient
        rows={(data ?? []).map((r: any) => ({
          id: Number(r.id),
          sira_no: r.sira_no ?? null,
          form_adi: r.form_adi ?? null,
          kayit_tarihi: r.kayit_tarihi ?? null,
          islem_yapan_etiket: profilMap.get(String(r.islem_yapan ?? '').trim()) ?? (r.islem_yapan ?? '—'),
          aktif: Boolean(r.aktif),
        }))}
      />
    </div>
  )
}

