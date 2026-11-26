import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import HesaplamaKayitListe, { type HesaplamaListeSatir } from '@/components/hesaplama/HesaplamaKayitListe'
import { ikGorevPersonelleri } from '@/lib/ik-imza-personel'
import { emekliIkramiyeSil } from './actions'

export const dynamic = 'force-dynamic'

export default async function EmekliIkramiyeMaasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const canDelete = isAdminLike(access)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('emekli_ikramiye_maas_kayitlari')
    .select('id, sicil_no, ad_soyad, tckn, kanun, ikramiye')
    .order('created_at', { ascending: false })
    .limit(300)

  const tabloYok =
    error &&
    (String(error.message).includes('emekli_ikramiye_maas_kayitlari') ||
      String(error.message).includes('schema cache'))
  const kayitlar: HesaplamaListeSatir[] = (
    (data ?? []) as Array<{
      id: number
      sicil_no: string
      ad_soyad: string
      tckn: string | null
      kanun: string
      ikramiye: number
    }>
  ).map(k => ({
    id: k.id,
    sicil_no: k.sicil_no,
    ad_soyad: k.ad_soyad,
    tckn: k.tckn,
    orta: k.kanun,
    tutar: Number(k.ikramiye),
  }))

  const imzaPersonel = await ikGorevPersonelleri(supabase)
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'emekli_ikramiye_maas_kayitlari',
    kayitlar.map(k => String(k.id)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">4/C İkramiye ve Maaş Hesaplama</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            SGK 4/C tarzı tahmini emekli ikramiyesi ve 5434 usulü maaş. Bilgi amaçlıdır; resmiyet arzetmez. Mevcut
            «Emeklilik Tazminatı» (375 KHK) bu hesap değildir.
          </p>
        </div>
        <Link
          href="/hesaplama/emekli-ikramiye-maas/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 whitespace-nowrap"
        >
          Hesap Oluştur
        </Link>
      </div>
      {tabloYok ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Kayıt tablosu henüz yok. supabase/migrations/20261126120000_emekli_ikramiye_maas.sql dosyasını çalıştırın.
        </p>
      ) : null}
      <HesaplamaKayitListe
        kayitlar={kayitlar}
        ortaBaslik="Kanun"
        tutarBaslik="İkramiye"
        bosMetin="Henüz 4/C ikramiye-maaş hesabı oluşturulmadı."
        detayKok="/hesaplama/emekli-ikramiye-maas"
        pdfKok="/api/hesaplama/emekli-ikramiye-maas/pdf"
        gecmisBaslik="4/C İkramiye-Maaş Geçmişi"
        auditLoglarByRefId={auditLoglarByRefId}
        tur="ikramiye"
        canDelete={canDelete}
        onSil={canDelete ? emekliIkramiyeSil : undefined}
        imzaPersonel={imzaPersonel}
      />
    </div>
  )
}
