import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { katsayiTr, paraTr } from '@/lib/ayliktan-kesme-hesap'
import { hesaplamaBelgePdf } from '@/lib/hesaplama-evrak-pdf'
import { emeklilikBelgeCoz } from '@/lib/emeklilik-tazminati-hesap'
import { ikImzaAdlari } from '@/lib/ik-imza-personel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
  const access = await getAppAccess(supabase, user.id)
  const izin = isAdminLike(access) || (
    access.mode === 'kullanici' && kullaniciPathAllowed('/hesaplama', access.sicilNo, access.menuIzinleri)
  )
  if (!izin) return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })

  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 400 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('emeklilik_tazminati_kayitlari').select('belge').eq('id', id).maybeSingle()
  const belge = emeklilikBelgeCoz(data?.belge)
  if (!belge) return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })

  const imza = await ikImzaAdlari(
    supabase,
    url.searchParams.get('duzenleyen') ?? '',
    url.searchParams.get('gorevli') ?? '',
  )
  const pdf = await hesaplamaBelgePdf({
    baslik: 'EMEKLİLİK TAZMİNATI',
    kimlik: [
      { etiket: 'T.C. Kimlik No', deger: belge.tckn || '—' },
      { etiket: 'Adı ve Soyadı', deger: belge.ad_soyad },
      { etiket: 'Ünvanı', deger: belge.unvan || '—' },
      { etiket: 'Sicil No', deger: belge.sicil_no },
      { etiket: 'Statü', deger: belge.statu },
      { etiket: 'Gösterge', deger: String(belge.gosterge) },
      { etiket: 'Memur Aylık Katsayısı', deger: katsayiTr(belge.maasKatsayi) },
      { etiket: 'Damga Vergisi Oranı', deger: katsayiTr(belge.damgaOrani) },
    ],
    tablo: {
      basliklar: ['Kalem', 'Tutar'],
      satirlar: [
        ['Brüt tazminat', `${paraTr(belge.brut)} TL`],
        ['Damga vergisi', `${paraTr(belge.damga)} TL`],
      ],
      toplamEtiket: 'Ödenecek tutar',
      toplamDeger: `${paraTr(belge.net)} TL`,
    },
    not: belge.dayanak,
    imza,
  })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="emeklilik-tazminati-${belge.sicil_no}.pdf"`,
    },
  })
}
