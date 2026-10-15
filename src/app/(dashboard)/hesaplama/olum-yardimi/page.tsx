import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import HesaplamaKayitListe, { type HesaplamaListeSatir } from '@/components/hesaplama/HesaplamaKayitListe'
import { ikGorevPersonelleri } from '@/lib/ik-imza-personel'
import { olumSil } from './actions'

export const dynamic = 'force-dynamic'

export default async function OlumYardimiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const canDelete = isAdminLike(access)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('olum_yardimi_kayitlari')
    .select('id, sicil_no, ad_soyad, tckn, toplam, varis_sayisi')
    .order('created_at', { ascending: false })
    .limit(300)

  const tabloYok = error && (String(error.message).includes('olum_yardimi_kayitlari') || String(error.message).includes('schema cache'))
  const kayitlar: HesaplamaListeSatir[] = ((data ?? []) as Array<{
    id: number
    sicil_no: string
    ad_soyad: string
    tckn: string | null
    toplam: number
    varis_sayisi: number
  }>).map(k => ({
    id: k.id,
    sicil_no: k.sicil_no,
    ad_soyad: k.ad_soyad,
    tckn: k.tckn,
    orta: String(k.varis_sayisi),
    tutar: Number(k.toplam),
  }))

  const imzaPersonel = await ikGorevPersonelleri(supabase)
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'olum_yardimi_kayitlari',
    kayitlar.map(k => String(k.id)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ölüm Yardımı Hesaplama</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            657 sayılı Kanun m. 208. Oluşturulan hesaplar burada durur. Önizleme, düzenleme, PDF ve silme satırın işlemler sütunundadır.
          </p>
        </div>
        <Link
          href="/hesaplama/olum-yardimi/yeni"
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
        ortaBaslik="Varis"
        tutarBaslik="Yardım"
        bosMetin="Henüz ölüm yardımı oluşturulmadı."
        detayKok="/hesaplama/olum-yardimi"
        pdfKok="/api/hesaplama/olum-yardimi/pdf"
        gecmisBaslik="Ölüm Yardımı Geçmişi"
        auditLoglarByRefId={auditLoglarByRefId}
        tur="olum"
        canDelete={canDelete}
        onSil={canDelete ? olumSil : undefined}
        imzaPersonel={imzaPersonel}
      />
    </div>
  )
}
