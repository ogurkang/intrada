import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { sendikaIstifaSil } from '../calisma-belgesi/actions'
import SendikaIstifaListeClient, {
  type IstifaSilmeDurumu,
  type SendikaIstifaListeKayit,
} from '@/components/bildirim/SendikaIstifaListeClient'

export default async function SendikaIstifaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const kullaniciSicil =
    !isAdminLike(access) && access.mode === 'kullanici' ? access.sicilNo.trim() : null

  let q = supabase
    .from('sendika_istifa_bildirimleri')
    .select('id, sicil_no, ad_soyad, tckn, sendika_adi, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  if (kullaniciSicil) q = q.eq('sicil_no', kullaniciSicil)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayitlarRaw } = await (q as any)

  type HamKayit = SendikaIstifaListeKayit & { created_at?: string }
  const ham = (kayitlarRaw ?? []) as HamKayit[]
  const siciller = [...new Set(ham.map(k => String(k.sicil_no)))]
  const uyelikler: { sicil_no: string; aktif: boolean; bitis_tarihi: string | null }[] = []
  for (let i = 0; i < siciller.length; i += 120) {
    const part = siciller.slice(i, i + 120)
    if (!part.length) continue
    const { data } = await supabase
      .from('personel_sendika')
      .select('sicil_no, aktif, bitis_tarihi')
      .in('sicil_no', part)
    uyelikler.push(...((data ?? []) as typeof uyelikler))
  }

  function utcGun(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
    return d.toISOString().slice(0, 10)
  }

  function silmeDurumu(sicil: string, gun: string): IstifaSilmeDurumu {
    const satirlar = uyelikler.filter(u => u.sicil_no === sicil)
    const aktifVar = satirlar.some(u => u.aktif)
    const kapananVar = satirlar.some(u => !u.aktif && String(u.bitis_tarihi ?? '').slice(0, 10) === gun)
    if (aktifVar && kapananVar) return 'iki-uyelik'
    if (!aktifVar && kapananVar) return 'uyelik-acilir'
    return 'uyelik-degismez'
  }

  const kayitlar: SendikaIstifaListeKayit[] = ham.map(k => ({
    id: k.id,
    sicil_no: k.sicil_no,
    ad_soyad: k.ad_soyad,
    tckn: k.tckn ?? null,
    sendika_adi: k.sendika_adi,
    silmeDurumu: silmeDurumu(String(k.sicil_no), utcGun(String(k.created_at ?? ''))),
  }))

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'sendika_istifa_bildirimleri',
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
          <h1 className="text-2xl font-bold text-slate-800">Sendika İstifa İşlemleri</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Dilekçe kayıtları. Word çıktısı alınır. Silme yalnızca yönetici hesabındadır; silinen
            kaydın kapattığı üyelik yeniden açılır.
          </p>
        </div>
        <Link
          href="/bildirim/sendika-istifa/yeni"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 transition-colors whitespace-nowrap"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Form Oluştur
        </Link>
      </div>

      <SendikaIstifaListeClient
        kayitlar={kayitlar}
        auditLoglarByRefId={auditLoglarByRefId}
        adminMi={isAdminLike(access)}
        onSil={sendikaIstifaSil}
      />
    </div>
  )
}
