import { createClient } from '@/lib/supabase/server'
import YerelBilgiTanimListeClient from '@/components/yerel-bilgi/YerelBilgiTanimListeClient'
import {
  aracTuruGuncelle,
  aracTuruToggle,
  aracTuruTopluEkle,
  aracTuruTopluGuncelle,
} from './actions'

export default async function AracTuruTanimPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('yerel_bilgi_arac_turu')
    .select('id, sira_no, tanim_adi, aktif')
    .order('sira_no', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })

  const rows = (data ?? []).map(r => ({
    id: r.id,
    sira_no: r.sira_no,
    tanim_adi: r.tanim_adi,
    aktif: r.aktif,
  }))

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <YerelBilgiTanimListeClient
        title="Araç Türü — Alt Tür Tanımı"
        description="Önce araç türünü ekleyin; satıra tıklayarak alt türleri yönetin."
        geriHref="/yerel-bilgi/tanimlar"
        rows={rows}
        satirDetayBase="/yerel-bilgi/tanimlar/arac-turu"
        topluEkle={aracTuruTopluEkle}
        tekGuncelle={aracTuruGuncelle}
        topluGuncelle={aracTuruTopluGuncelle}
        toggleAktif={aracTuruToggle}
      />
    </>
  )
}
