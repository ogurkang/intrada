import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess, isAdminLike } from '@/lib/app-access'
import { kullaniciPathAllowed } from '@/lib/menu-yetki'
import { paraTr } from '@/lib/ayliktan-kesme-hesap'
import { hesaplamaBelgePdf } from '@/lib/hesaplama-evrak-pdf'
import { emekliIkramiyeBelgeCoz } from '@/lib/emekli-ikramiye-maas-hesap'
import { ikImzaAdlari } from '@/lib/ik-imza-personel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
  const access = await getAppAccess(supabase, user.id)
  const izin =
    isAdminLike(access) ||
    (access.mode === 'kullanici' && kullaniciPathAllowed('/hesaplama', access.sicilNo, access.menuIzinleri))
  if (!izin) return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })

  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 400 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('emekli_ikramiye_maas_kayitlari').select('belge').eq('id', id).maybeSingle()
  const belge = emekliIkramiyeBelgeCoz(data?.belge)
  if (!belge) return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })

  const imza = await ikImzaAdlari(
    supabase,
    url.searchParams.get('duzenleyen') ?? '',
    url.searchParams.get('gorevli') ?? '',
  )
  const satirlar: [string, string][] = belge.matrahKalemler.map(k => [k.ad, `${paraTr(k.tutar)} TL`])
  satirlar.push(['Matrah', `${paraTr(belge.matrah)} TL`])
  satirlar.push([`İkramiye (${belge.ikramiyeYili} yıl)`, `${paraTr(belge.ikramiye)} TL`])
  if (belge.maas5434 != null) {
    satirlar.push([`5434 usulü aylık (%${belge.baglamaOrani})`, `${paraTr(belge.maas5434)} TL`])
  }
  if (belge.ekOdeme != null) {
    satirlar.push([
      `Ek ödeme 5454 (%${belge.ekOdemeOrani ?? 4})`,
      `${paraTr(belge.ekOdeme)} TL`,
    ])
  }
  if (belge.ilaveOdeme != null) {
    satirlar.push([
      `İlave ödeme 7456 / ek md. 86 (%${belge.ilaveOdemeOrani ?? 6.34})`,
      `${paraTr(belge.ilaveOdeme)} TL`,
    ])
  }
  if (belge.maasToplam != null) {
    satirlar.push(['Toplam ödenecek aylık', `${paraTr(belge.maasToplam)} TL`])
  }

  const notSatirlari = [belge.uyari]
  if (belge.maasUyari) notSatirlari.push(belge.maasUyari)

  const pdf = await hesaplamaBelgePdf({
    baslik: '4/C EMEKLİ İKRAMİYE VE MAAŞ (TAHMİNİ)',
    kimlik: [
      { etiket: 'T.C. Kimlik No', deger: belge.tckn || '—' },
      { etiket: 'Adı ve Soyadı', deger: belge.ad_soyad },
      { etiket: 'Ünvanı', deger: belge.unvan || '—' },
      { etiket: 'Sicil No', deger: belge.sicil_no },
      { etiket: 'Kanun', deger: belge.kanun },
      { etiket: 'Derece / Kademe', deger: `${belge.derece}/${belge.kademe}` },
      { etiket: 'Ek Gösterge', deger: String(belge.ekGosterge) },
      { etiket: 'Aylık Tarihi', deger: belge.donemEtiket },
    ],
    tablo: {
      basliklar: ['Kalem', 'Tutar'],
      satirlar,
      toplamEtiket: 'İkramiye',
      toplamDeger: `${paraTr(belge.ikramiye)} TL`,
    },
    not: notSatirlari.join('\n\n'),
    imza,
  })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="4c-ikramiye-maas-${belge.sicil_no}.pdf"`,
    },
  })
}
