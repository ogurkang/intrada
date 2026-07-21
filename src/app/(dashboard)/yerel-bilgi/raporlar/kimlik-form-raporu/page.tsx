import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function val(v: unknown) {
  const s = String(v ?? '').trim()
  return s || '—'
}

export default async function KimlikFormRaporuPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await (supabase as any)
    .from('yerel_bilgi_belediye_kimlik_formu')
    .select('*')
    .eq('aktif', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const excelBtn =
    'intrada-btn intrada-btn-excel'
  const geriBtn =
    'intrada-btn intrada-btn-kaydet'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">Kimlik Form Raporu</h1>
          <p className="text-sm text-slate-500 mt-0.5">Aktif kaydın bilgileri bu ekranda gösterilir.</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Link href="/api/yerel-bilgi/raporlar/kimlik-formu/excel" className={excelBtn}>
            Excel İndir
          </Link>
          <Link href="/yerel-bilgi/raporlar" className={geriBtn}>
            ← Yerel Bilgi — Raporlar
          </Link>
        </div>
      </div>

      {!data ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          Aktif kayıt bulunamadı.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 p-4">
            {[
              ['Form Adı', data.form_adi],
              ['Kayıt Tarihi', data.kayit_tarihi],
              ['İşlem Yapan', data.islem_yapan],
              ['Durumu', data.aktif ? 'Aktif' : 'Pasif'],
              ['Belediye Kuruluş Yılı', data.belediye_kurulus_tarihi ? String(data.belediye_kurulus_tarihi).slice(0, 4) : '—'],
              ['Belediye Başkanı Adı', data.baskan_adi],
              ['Belediye Başkanı Soyadı', data.baskan_soyadi],
              ['Belediye Başkanı Cinsiyeti', data.baskan_cinsiyeti],
              ['Seçime Girdiği Parti', data.baskan_secime_girdigi_parti],
              ['Mevcut Parti', data.baskan_mevcut_parti],
              ['Bu Belediyede Kaçıncı Dönem', data.baskan_donem],
              ['Başkan Cep Telefonu', data.baskan_cep_telefonu],
              ['WEB Adresi', data.belediye_web_adresi],
              ['E-Posta', data.belediye_e_posta],
              ['Telefon Numarası', data.belediye_telefon_numarasi],
              ['Faks Numarası', data.belediye_faks_numarasi],
              ['Çağrı Merkezi', data.belediye_cagri_merkezi],
              ['Onaylı Sosyal Medya Hesabı', data.belediye_onayli_sosyal_medya_hesabi],
              ['Mahalle Sayısı', data.mahalle_sayisi],
            ].map(([k, v]) => (
              <div key={String(k)} className="py-2 border-b border-slate-100">
                <div className="text-xs text-slate-500">{k}</div>
                <div className="text-sm text-slate-800 font-medium mt-0.5">{val(v)}</div>
              </div>
            ))}
            <div className="py-2 border-b border-slate-100 md:col-span-2">
              <div className="text-xs text-slate-500">Açık Adres</div>
              <div className="text-sm text-slate-800 font-medium mt-0.5 whitespace-pre-wrap">{val(data.belediye_acik_adresi)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
