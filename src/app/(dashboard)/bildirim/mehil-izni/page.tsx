import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import MehilIzniListeClient, { type MehilIzniListeKayit } from '@/components/bildirim/MehilIzniListeClient'

export default async function MehilIzniPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const kullaniciSicil =
    !isAdminLike(access) && access.mode === 'kullanici' ? access.sicilNo.trim() : null

  let q = supabase
    .from('mehil_izni_bildirimleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, geldigi_kurum, nakil_tarihi, mehil_baslangic_tarihi, mehil_bitis_tarihi',
    )
    .order('created_at', { ascending: false })
    .limit(300)

  if (kullaniciSicil) q = q.eq('sicil_no', kullaniciSicil)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayitlarRaw } = await (q as any)

  const kayitlar: MehilIzniListeKayit[] = ((kayitlarRaw ?? []) as MehilIzniListeKayit[]).map(k => ({
    id: k.id,
    sicil_no: k.sicil_no,
    ad_soyad: k.ad_soyad,
    tckn: k.tckn ?? null,
    geldigi_kurum: k.geldigi_kurum,
    nakil_tarihi: k.nakil_tarihi,
    mehil_baslangic_tarihi: k.mehil_baslangic_tarihi,
    mehil_bitis_tarihi: k.mehil_bitis_tarihi,
  }))

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'mehil_izni_bildirimleri',
    kayitlar.map(k => String(k.id)),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/bildirim"
            className="intrada-btn intrada-btn-ust-menu mb-2"
          >
            ← Bildirim Modülü
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Mehil İzni Bildirimi</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Mehil izni bildirim formları aşağıda listelenir. Word belgesi indirerek dilekçe
            çıktısı alabilirsiniz.
          </p>
        </div>
        <Link
          href="/bildirim/mehil-izni/yeni"
          className="intrada-btn intrada-btn-ekle whitespace-nowrap"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Form Oluştur
        </Link>
      </div>

      <MehilIzniListeClient kayitlar={kayitlar} auditLoglarByRefId={auditLoglarByRefId} />
    </div>
  )
}
