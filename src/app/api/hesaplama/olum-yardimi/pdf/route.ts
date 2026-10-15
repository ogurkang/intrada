import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { katsayiTr, paraTr } from '@/lib/ayliktan-kesme-hesap'
import { hesaplamaBelgePdf } from '@/lib/hesaplama-evrak-pdf'
import { OLUM_YARDIMI_DAYANAK, olumBelgeCoz } from '@/lib/olum-yardimi-hesap'
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
  const { data } = await (supabase as any).from('olum_yardimi_kayitlari').select('belge').eq('id', id).maybeSingle()
  const belge = olumBelgeCoz(data?.belge)
  if (!belge) return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })

  const imza = await ikImzaAdlari(
    supabase,
    url.searchParams.get('duzenleyen') ?? '',
    url.searchParams.get('gorevli') ?? '',
  )
  const pdf = await hesaplamaBelgePdf({
    baslik: 'ÖLÜM YARDIMI',
    kimlik: [
      { etiket: 'T.C. Kimlik No', deger: belge.tckn || '—' },
      { etiket: 'Adı ve Soyadı', deger: belge.ad_soyad },
      { etiket: 'Ünvanı', deger: belge.unvan || '—' },
      { etiket: 'Sicil No', deger: belge.sicil_no },
      { etiket: 'Gösterge', deger: String(belge.gosterge) },
      { etiket: 'Memur Aylık Katsayısı', deger: katsayiTr(belge.maasKatsayi) },
      { etiket: 'En Yüksek Devlet Memuru Aylığı', deger: `${paraTr(belge.aylik)} TL` },
      { etiket: 'Kat', deger: String(belge.kat) },
      { etiket: 'Ölüm Yardımı', deger: `${paraTr(belge.toplam)} TL` },
    ],
    tablo: {
      basliklar: ['TCKN', 'Ad soyad', 'IBAN', 'Pay'],
      satirlar: belge.varisler.map(v => [v.tckn, v.adSoyad, v.iban, `${paraTr(v.tutar)} TL`]),
      toplamEtiket: 'Varis payları toplamı',
      toplamDeger: `${paraTr(belge.varisler.reduce((a, v) => a + v.tutar, 0))} TL`,
    },
    not: OLUM_YARDIMI_DAYANAK,
    imza,
  })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="olum-yardimi-${belge.sicil_no}.pdf"`,
    },
  })
}
