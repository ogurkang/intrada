import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppAccess } from '@/lib/app-access'
import { butceIslemMudurlukCoz } from '@/lib/yerel-bilgi-butce-mudurluk'
import YerelBilgiButceMatrisClient, {
  type ButceKalemSatir,
} from '@/components/yerel-bilgi/YerelBilgiButceMatrisClient'

function tutarToInput(n: number | null): string {
  if (n == null || !Number.isFinite(Number(n))) return ''
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n))
}

interface Props {
  searchParams: Promise<{ mudurluk_id?: string }>
}

export default async function ButceGerceklesmeleriGirisPage({ searchParams }: Props) {
  const { mudurluk_id } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await getAppAccess(supabase, user.id)
  const { isAdmin, mudId, mudurlukler } = await butceIslemMudurlukCoz(supabase, user.id, access, mudurluk_id)
  const kayitYapilabilir = mudId != null
  const mudurlukAdi = mudurlukler.find(m => m.id === mudId)?.mudurluk_adi ?? null

  const yilEtiketi = new Date().getFullYear()

  const [
    { data: giderDefs, error: errG },
    { data: gelirDefs, error: errL },
    { data: islemRaw, error: errI },
  ] = await Promise.all([
    supabase
      .from('yerel_bilgi_butce_gider')
      .select('id, sira_no, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    supabase
      .from('yerel_bilgi_butce_gelir')
      .select('id, sira_no, tanim_adi')
      .eq('aktif', true)
      .order('sira_no', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true }),
    mudId != null
      ? supabase.from('yerel_bilgi_butce_gider_islem').select('*').eq('mudurluk_id', mudId)
      : Promise.resolve({ data: [], error: null }),
  ])

  const giderKalemleri: ButceKalemSatir[] = (giderDefs ?? []).map(r => ({
    id: r.id,
    sira_no: r.sira_no,
    tanim_adi: r.tanim_adi,
  }))
  const gelirKalemleri: ButceKalemSatir[] = (gelirDefs ?? []).map(r => ({
    id: r.id,
    sira_no: r.sira_no,
    tanim_adi: r.tanim_adi,
  }))

  const baslangicGider: Record<number, string> = {}
  const baslangicGelir: Record<number, string> = {}
  for (const r of islemRaw ?? []) {
    const row = r as {
      butce_gider_kalem_id?: number | null
      butce_gelir_kalem_id?: number | null
      tutar: number | null
    }
    if (row.butce_gider_kalem_id != null) {
      baslangicGider[row.butce_gider_kalem_id] = tutarToInput(row.tutar)
    }
    if (row.butce_gelir_kalem_id != null) {
      baslangicGelir[row.butce_gelir_kalem_id] = tutarToInput(row.tutar)
    }
  }

  const tabloEksik =
    errI?.message?.includes('Could not find the table') ||
    errI?.message?.includes('schema cache') ||
    errI?.message?.includes('butce_gelir_kalem_id')

  return (
    <>
      {(errG || errL || errI) && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm space-y-2">
          {errG && <p>Tanımlar (gider): {errG.message}</p>}
          {errL && <p>Tanımlar (gelir): {errL.message}</p>}
          {errI && <p>İşlem verisi: {errI.message}</p>}
          {tabloEksik && (
            <p className="text-red-800/90 text-xs leading-relaxed">
              Veritabanı migration&apos;larını uygulayın: özellikle{' '}
              <code className="bg-red-100 px-1 rounded">20260413140000_yerel_bilgi_butce_islem_gelir_kalem.sql</code>.
            </p>
          )}
        </div>
      )}
      <YerelBilgiButceMatrisClient
        tur="gider"
        tabloBasligi={`${yilEtiketi} Yılı Bütçe Gerçekleşmeleri Tablosu`}
        aciklama="Gider türleri solda, gelir türleri sağdadır. Sağ üstten Değiştir ile düzenleyin; tutar sütunu cari yıl kuralına göre bu yılı gösterir."
        tutarSutunEtiketi="Gerçekleşme"
        yilEtiketi={yilEtiketi}
        geriHref="/yerel-bilgi/islemler/butce-gerceklesmeleri"
        geriLabel="← Bütçe Gerçekleşmeleri (dönem listesi)"
        kayitYapilabilir={kayitYapilabilir}
        giderKalemleri={giderKalemleri}
        gelirKalemleri={gelirKalemleri}
        baslangicGider={baslangicGider}
        baslangicGelir={baslangicGelir}
        kaydetSonrasiHref={
          mudId != null
            ? `/yerel-bilgi/raporlar/butce-gerceklesmeleri?mudurluk_id=${mudId}`
            : '/yerel-bilgi/raporlar/butce-gerceklesmeleri'
        }
        isAdmin={isAdmin}
        mudurlukler={mudurlukler}
        seciliMudurlukId={mudId}
        mudurlukAdi={mudurlukAdi}
        girisBasePath="/yerel-bilgi/islemler/butce-gerceklesmeleri/giris"
      />
    </>
  )
}
