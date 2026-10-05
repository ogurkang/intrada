import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import AyliktanKesmeListeClient, {
  type AyliktanKesmeListeKayit,
} from '@/components/kesintiler/AyliktanKesmeListeClient'
import { ayliktanKesmeGenelToplam, type AyliktanKesmeBordro } from '@/lib/ayliktan-kesme-hesap'
import { ayliktanKesmeBordroGoster } from '@/lib/ayliktan-kesme-yukle'
import { ayliktanKesmeSil } from './actions'

export const dynamic = 'force-dynamic'

export default async function AyliktanKesmePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const canDelete = isAdminLike(access)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayitlarRaw } = await (supabase as any)
    .from('ayliktan_kesme_bordrolari')
    .select('id, sicil_no, ad_soyad, tckn, unvan, payda, toplam, yarim_zamanli, bordro')
    .order('created_at', { ascending: false })
    .limit(300)

  const kayitlar: AyliktanKesmeListeKayit[] = await Promise.all(
    ((kayitlarRaw ?? []) as Array<AyliktanKesmeListeKayit & { bordro?: AyliktanKesmeBordro }>).map(async k => {
      const bordro = k.bordro ? await ayliktanKesmeBordroGoster(supabase, k.bordro) : null
      return {
        id: k.id,
        sicil_no: k.sicil_no,
        ad_soyad: k.ad_soyad,
        tckn: k.tckn ?? null,
        unvan: k.unvan ?? '',
        payda: Number(k.payda),
        toplam: bordro ? ayliktanKesmeGenelToplam(bordro) : Number(k.toplam),
        yarim_zamanli: k.yarim_zamanli === true,
      }
    }),
  )

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'ayliktan_kesme_bordrolari',
    kayitlar.map(k => String(k.id)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Aylıktan Kesme İşlemleri</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Oluşturulan bordrolar burada durur. PDF, düzenleme ve işlem geçmişi satırın işlemler sütunundadır.
          </p>
        </div>
        <Link
          href="/kesintiler/ayliktan-kesme/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition-colors whitespace-nowrap"
        >
          Bordro Oluştur
        </Link>
      </div>

      <AyliktanKesmeListeClient
        kayitlar={kayitlar}
        auditLoglarByRefId={auditLoglarByRefId}
        canDelete={canDelete}
        onSil={canDelete ? ayliktanKesmeSil : undefined}
      />
    </div>
  )
}
