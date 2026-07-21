import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import {
  HIZMET_BIRLESTIRME_PERSONEL_DURUM_ETIKET,
  hizmetBirlestirmePersonelDurumNorm,
} from '@/lib/hizmet-birlestirme-belge'

interface Props {
  params: Promise<{ id: string }>
}

function tarihFormat(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function Page({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('hizmet_birlestirme_islemleri')
    .select(
      'id, sicil_no, ad_soyad, tckn, personel_durum, emeklilik_sicil_no, ssk, bagkur_sicil_no, hizmet_illeri, created_at, updated_at, created_by_email',
    )
    .eq('id', id)
    .maybeSingle()

  if (!kayit) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const personelDurum = hizmetBirlestirmePersonelDurumNorm(kayit.personel_durum)

  if (!isAdminLike(access)) {
    if (personelDurum === 'ayrilan') notFound()
    if (access.mode !== 'kullanici') notFound()
    if (String(access.sicilNo).trim() !== String(kayit.sicil_no ?? '').trim()) notFound()
  }

  const satirlar: { etiket: string; deger: string }[] = [
    {
      etiket: 'Durum',
      deger: HIZMET_BIRLESTIRME_PERSONEL_DURUM_ETIKET[personelDurum],
    },
    {
      etiket: 'Personel',
      deger: kayit.sicil_no ? `${kayit.ad_soyad} (${kayit.sicil_no})` : kayit.ad_soyad,
    },
    { etiket: 'T.C. Kimlik No', deger: kayit.tckn ?? '—' },
    { etiket: 'Emeklilik Sicil No', deger: kayit.emeklilik_sicil_no ?? '—' },
    { etiket: 'S.S.K.', deger: kayit.ssk ?? '—' },
    { etiket: 'Bağ-Kur Sicil No', deger: kayit.bagkur_sicil_no ?? '—' },
    { etiket: 'Hizmet İlleri', deger: kayit.hizmet_illeri ?? '—' },
    { etiket: 'Oluşturulma', deger: tarihFormat(kayit.created_at) },
    { etiket: 'Oluşturan', deger: kayit.created_by_email ?? '—' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/bildirim/hizmet-birlestirme"
            className="intrada-btn intrada-btn-ust-menu mb-2"
          >
            ← Hizmet Birleştirme İşlemleri
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Hizmet Birleştirme Formu Detayı</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/bildirim/hizmet-birlestirme/${kayit.id}/duzenle`}
            className="intrada-btn intrada-btn-duzenle"
          >
            Değiştir
          </Link>
          <a
            href={`/api/bildirim/hizmet-birlestirme/word?id=${kayit.id}`}
            className="intrada-btn intrada-btn-ekle"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Word İndir
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-2xl">
        <table className="w-full text-sm">
          <tbody>
            {satirlar.map(s => (
              <tr key={s.etiket} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-600 w-44 align-top">{s.etiket}</td>
                <td className="px-4 py-3 text-slate-800">{s.deger}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
