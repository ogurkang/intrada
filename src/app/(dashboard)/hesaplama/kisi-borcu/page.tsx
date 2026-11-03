import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { ikGorevPersonelleri } from '@/lib/ik-imza-personel'
import { faizTuruEtiket, type FaizTuru } from '@/lib/kanuni-faiz'
import KisiBorcuListe, { type KisiBorcuListeSatir } from '@/components/hesaplama/KisiBorcuListe'
import { kisiBorcuSil } from './actions'

export const dynamic = 'force-dynamic'

export default async function KisiBorcuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const canDelete = isAdminLike(access)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('kisi_borcu_kayitlari')
    .select('id, sicil_no, ad_soyad, tckn, faiz_turu, toplam_odeme')
    .order('created_at', { ascending: false })
    .limit(300)

  const tabloYok = error && (String(error.message).includes('kisi_borcu_kayitlari') || String(error.message).includes('schema cache'))
  const kayitlar: KisiBorcuListeSatir[] = ((data ?? []) as Array<{
    id: number
    sicil_no: string
    ad_soyad: string
    tckn: string | null
    faiz_turu: FaizTuru
    toplam_odeme: number
  }>).map(k => ({
    id: k.id,
    sicil_no: k.sicil_no,
    ad_soyad: k.ad_soyad,
    tckn: k.tckn,
    faiz: k.faiz_turu === 'temerrut' || k.faiz_turu === 'kanuni' ? faizTuruEtiket(k.faiz_turu) : String(k.faiz_turu),
    tutar: Number(k.toplam_odeme),
  }))

  const imzaPersonel = await ikGorevPersonelleri(supabase)
  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'kisi_borcu_kayitlari',
    kayitlar.map(k => String(k.id)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/hesaplama" className="text-sm text-slate-500 hover:text-slate-800">← Hesaplama Yönetimi</Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">Kişi Borcu Hesaplama</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Personelin borcu taksit sayısına bölünür. İlk taksit faizsizdir. Sonraki taksitlere kanuni veya temerrüt faizi eklenir.
          </p>
        </div>
        <Link
          href="/hesaplama/kisi-borcu/yeni"
          className="inline-flex items-center whitespace-nowrap rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Form Oluştur
        </Link>
      </div>
      {tabloYok ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Kayıt tablosu henüz yok. supabase/migrations/20261103160000_kisi_borcu.sql dosyasını çalıştırın.
        </p>
      ) : null}
      <KisiBorcuListe
        kayitlar={kayitlar}
        auditLoglarByRefId={auditLoglarByRefId}
        canDelete={canDelete}
        onSil={canDelete ? kisiBorcuSil : undefined}
        imzaPersonel={imzaPersonel}
      />
    </div>
  )
}
