import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import HesaplamaKayitListe, { type HesaplamaListeSatir } from '@/components/hesaplama/HesaplamaKayitListe'
import { ikGorevPersonelleri } from '@/lib/ik-imza-personel'
import { emeklilikSil } from './actions'

export const dynamic = 'force-dynamic'

export default async function EmeklilikTazminatiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const canDelete = isAdminLike(access)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('emeklilik_tazminati_kayitlari')
    .select('id, sicil_no, ad_soyad, tckn, statu, net')
    .order('created_at', { ascending: false })
    .limit(300)

  const tabloYok = error && (String(error.message).includes('emeklilik_tazminati_kayitlari') || String(error.message).includes('schema cache'))
  const kayitlar: HesaplamaListeSatir[] = ((data ?? []) as Array<{
    id: number
    sicil_no: string
    ad_soyad: string
    tckn: string | null
    statu: string
    net: number
  }>).map(k => ({
    id: k.id,
    sicil_no: k.sicil_no,
    ad_soyad: k.ad_soyad,
    tckn: k.tckn,
    orta: k.statu,
    tutar: Number(k.net),
  }))

  const imzaPersonel = await ikGorevPersonelleri(supabase)
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'emeklilik_tazminati_kayitlari',
    kayitlar.map(k => String(k.id)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Emeklilik Tazminatı Hesaplama</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Oluşturulan hesaplar burada durur. Önizleme, düzenleme, PDF ve silme satırın işlemler sütunundadır.
          </p>
        </div>
        <Link
          href="/hesaplama/emeklilik-tazminati/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 whitespace-nowrap"
        >
          Hesap Oluştur
        </Link>
      </div>
      {tabloYok ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Kayıt tablosu henüz yok. supabase/migrations/20261014150000_emeklilik_olum_kayitlari.sql dosyasını çalıştırın.
        </p>
      ) : null}
      <HesaplamaKayitListe
        kayitlar={kayitlar}
        ortaBaslik="Statü"
        tutarBaslik="Ödenecek"
        bosMetin="Henüz emeklilik tazminatı oluşturulmadı."
        detayKok="/hesaplama/emeklilik-tazminati"
        pdfKok="/api/hesaplama/emeklilik-tazminati/pdf"
        gecmisBaslik="Emeklilik Tazminatı Geçmişi"
        auditLoglarByRefId={auditLoglarByRefId}
        tur="emeklilik"
        canDelete={canDelete}
        onSil={canDelete ? emeklilikSil : undefined}
        imzaPersonel={imzaPersonel}
      />
    </div>
  )
}
