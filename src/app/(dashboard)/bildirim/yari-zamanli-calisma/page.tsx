import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import YariZamanliCalismaListeClient, {
  type YzcListeKayit,
} from '@/components/bildirim/YariZamanliCalismaListeClient'

export default async function YariZamanliCalismaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const kullaniciSicil =
    !isAdminLike(access) && access.mode === 'kullanici' ? access.sicilNo.trim() : null

  let q = supabase
    .from('yari_zamanli_calisma_bildirimleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, unvan, mudurluk, cocuk_dogum_tarihi, yari_zamanli_baslangic_tarihi, normal_zamanli_donus_tarihi',
    )
    .order('created_at', { ascending: false })
    .limit(300)

  if (kullaniciSicil) q = q.eq('sicil_no', kullaniciSicil)

  const { data: kayitlarRaw } = await q

  const kayitlar: YzcListeKayit[] = ((kayitlarRaw ?? []) as YzcListeKayit[]).map(k => ({
    id: k.id,
    sicil_no: k.sicil_no,
    ad_soyad: k.ad_soyad,
    tckn: k.tckn ?? null,
    unvan: k.unvan,
    mudurluk: k.mudurluk,
    cocuk_dogum_tarihi: k.cocuk_dogum_tarihi,
    yari_zamanli_baslangic_tarihi: k.yari_zamanli_baslangic_tarihi,
    normal_zamanli_donus_tarihi: k.normal_zamanli_donus_tarihi,
  }))

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'yari_zamanli_calisma_bildirimleri',
    kayitlar.map(k => String(k.id)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/bildirim"
            className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
          >
            ← Bildirim Modülü
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Yarı Zamanlı Çalışma İşlemleri</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            657 SK Eki m.43 yarı zamanlı çalışma talep formları aşağıda listelenir. Word belgesi dilekçe
            ve ek formu birlikte indirir.
          </p>
        </div>
        <Link
          href="/bildirim/yari-zamanli-calisma/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Form Oluştur
        </Link>
      </div>

      <YariZamanliCalismaListeClient kayitlar={kayitlar} auditLoglarByRefId={auditLoglarByRefId} />
    </div>
  )
}
