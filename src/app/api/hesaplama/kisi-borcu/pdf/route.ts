import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { paraTr } from '@/lib/ayliktan-kesme-hesap'
import { kisiBorcuFormPdf } from '@/lib/hesaplama-evrak-pdf'
import { faizTuruEtiket, tarihTr } from '@/lib/kanuni-faiz'
import { kisiBorcuBelgeCoz } from '@/lib/kisi-borcu'
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
  const { data } = await (supabase as any).from('kisi_borcu_kayitlari').select('belge').eq('id', id).maybeSingle()
  const belge = kisiBorcuBelgeCoz(data?.belge)
  if (!belge) return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })

  const imza = await ikImzaAdlari(
    supabase,
    url.searchParams.get('duzenleyen') ?? '',
    url.searchParams.get('gorevli') ?? '',
  )
  const pdf = await kisiBorcuFormPdf({
    kimlik: [
      { etiket: 'T.C. Kimlik No', deger: belge.tckn || '—' },
      { etiket: 'Adı ve Soyadı', deger: belge.ad_soyad },
      { etiket: 'Ünvanı', deger: belge.unvan || '—' },
      { etiket: 'Sicil No', deger: belge.sicil_no },
      { etiket: 'Statü', deger: belge.statu || '—' },
      { etiket: 'Faiz türü', deger: faizTuruEtiket(belge.faiz_turu) },
      { etiket: 'Ana tutar', deger: `${paraTr(belge.ana_tutar)} TL` },
      { etiket: 'Taksit sayısı', deger: String(belge.taksit_sayisi) },
      { etiket: 'Ödeme günü', deger: String(belge.odeme_gunu) },
      { etiket: 'Faiz başlangıcı', deger: tarihTr(belge.faiz_baslangic) },
      { etiket: 'Toplam faiz', deger: `${paraTr(belge.toplam_faiz)} TL` },
      { etiket: 'Toplam ödeme', deger: `${paraTr(belge.toplam_odeme)} TL` },
    ],
    satirlar: belge.satirlar.map(s => [
      String(s.sira),
      tarihTr(s.vade),
      String(s.gun),
      s.oran,
      paraTr(s.faiz),
      paraTr(s.anapara),
      paraTr(s.odeme),
      paraTr(s.kalan),
    ]),
    not: belge.dayanak,
    imza,
  })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="kisi-borcu-${belge.sicil_no}.pdf"`,
    },
  })
}
