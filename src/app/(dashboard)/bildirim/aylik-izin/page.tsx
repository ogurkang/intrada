import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import AylikIzinListeClient, { type AylikIzinListeKayit } from '@/components/bildirim/AylikIzinListeClient'

export default async function AylikIzinPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const kullaniciSicil =
    !isAdminLike(access) && access.mode === 'kullanici' ? access.sicilNo.trim() : null

  let q = supabase
    .from('aylik_izin_bildirimleri')
    .select('id, sicil_no, ad_soyad, tckn, unvan, mudurluk, baslangic_tarihi, bitis_tarihi')
    .order('created_at', { ascending: false })
    .limit(300)

  if (kullaniciSicil) q = q.eq('sicil_no', kullaniciSicil)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayitlarRaw } = await (q as any)
  const kayitlar: AylikIzinListeKayit[] = ((kayitlarRaw ?? []) as AylikIzinListeKayit[]).map(k => ({
    id: k.id,
    sicil_no: k.sicil_no,
    ad_soyad: k.ad_soyad,
    tckn: k.tckn ?? null,
    unvan: k.unvan,
    mudurluk: k.mudurluk,
    baslangic_tarihi: k.baslangic_tarihi,
    bitis_tarihi: k.bitis_tarihi,
  }))

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'aylik_izin_bildirimleri',
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
          <h1 className="text-2xl font-bold text-slate-800">Aylıksız İşlemleri</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            657 SK m.108 aylıksız izin talep formları aşağıda listelenir. Word belgesi indirerek
            dilekçe çıktısı alabilirsiniz.
          </p>
        </div>
        <Link
          href="/bildirim/aylik-izin/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Form Oluştur
        </Link>
      </div>

      <AylikIzinListeClient kayitlar={kayitlar} auditLoglarByRefId={auditLoglarByRefId} />
    </div>
  )
}
