import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { katsayiTr, type AyliktanKesmeBordro, type AyliktanKesmePayda } from '@/lib/ayliktan-kesme-hesap'
import { ayliktanKesmePaydaMi } from '@/lib/ayliktan-kesme-hesap'
import AyliktanKesmeClient from '@/components/kesintiler/AyliktanKesmeClient'
import { ayliktanKesmeAdaylari, ayliktanKesmeKaynakGetir } from '@/lib/ayliktan-kesme-yukle'
import { ayliktanKesmeKaydet, ayliktanKesmePersonelGetir } from '../../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AyliktanKesmeDuzenlePage({ params }: Props) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (!Number.isFinite(id)) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('ayliktan_kesme_bordrolari')
    .select('id, sicil_no, bordro')
    .eq('id', id)
    .maybeSingle()
  if (!kayit?.bordro) notFound()
  const bordro = kayit.bordro as AyliktanKesmeBordro

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }
  const izinli =
    isAdminLike(access) ||
    (access.mode === 'kullanici' &&
      kullaniciPathAllowed('/kesintiler/ayliktan-kesme', access.sicilNo, access.menuIzinleri))
  if (!izinli) notFound()

  const [{ adaylar, hata }, kaynakSonuc] = await Promise.all([
    ayliktanKesmeAdaylari(supabase),
    ayliktanKesmeKaynakGetir(supabase, String(kayit.sicil_no)),
  ])
  const payda = Number(bordro.katsayi.payda)
  const paydaSecili: AyliktanKesmePayda | '' = ayliktanKesmePaydaMi(payda) ? payda : ''

  return (
    <div>
      <Link
        href={`/kesintiler/ayliktan-kesme/${id}`}
        className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
      >
        ← Bordro detayı
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Bordroyu Düzenle</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Katsayı veya ceza oranı değişince tutarlar güncel asıl terfi ve kazanç tanımından yeniden hesaplanır.
      </p>
      {hata || kaynakSonuc.hata ? (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata || kaynakSonuc.hata}</p>
      ) : (
        <AyliktanKesmeClient
          adaylar={adaylar}
          personelGetir={ayliktanKesmePersonelGetir}
          kaydet={ayliktanKesmeKaydet}
          kayitId={id}
          kilitliSicil={String(kayit.sicil_no)}
          baslangicKaynak={kaynakSonuc.kaynak ?? null}
          baslangic={{
            maas: katsayiTr(bordro.katsayi.maas),
            taban: katsayiTr(bordro.katsayi.tabanAylik),
            yan: katsayiTr(bordro.katsayi.yanOdeme),
            payda: paydaSecili,
          }}
        />
      )}
    </div>
  )
}
