import { createClient } from '@/lib/supabase/server'
import GorevYerineGoreListeClient from '@/components/rapor/GorevYerineGoreListeClient'
import type { GorevYerineGoreListeSatir } from '@/lib/rapor-gorev-yerine-gore-liste'
import { gorevYeriListeSenkronizeEt } from '@/lib/rapor-gorev-yerine-gore-liste-sync'
import { gorevYerineGoreListeSatirlariYukle } from '@/lib/rapor-gorev-yerine-gore-liste-yukle'

const LISTE_ACIKLAMA =
  'Konum: Tanımlar > Şirket (görev yeri / görev müdürlüğü), personelin yerleşke ataması veya müdürlük–yerleşke eşlemesi. Cinsiyet: personel kartı. Unvan: kadro hareketlerindeki görev unvanı (ADABEL: görevi alanı). Fiili görev: Görev Bilgileri’ndeki görev yeri doluysa o metin, değilse kadro görev müdürlüğü (ADABEL: görev müdürlüğü).'

export default async function GorevYerineGoreListePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const anlikTarihEtiket = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  await gorevYeriListeSenkronizeEt(supabase)

  const { satirlar, hata } = await gorevYerineGoreListeSatirlariYukle(supabase)

  const { data: ayarRaw } = await sb
    .from('rapor_gorev_yeri_liste_ayar')
    .select('kayit_key, sira_no')
    .order('sira_no', { ascending: true })

  const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s] as const))
  const seciliKeys = (ayarRaw ?? [])
    .map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim())
    .filter(Boolean) as string[]
  const ayarliSatirlar = seciliKeys
    .map((k: string) => satirByKey.get(k))
    .filter((s): s is GorevYerineGoreListeSatir => !!s)
  const seciliSet = new Set(ayarliSatirlar.map(s => s.kayit_key))
  const secilmeyenSatirlar = satirlar.filter(s => !seciliSet.has(s.kayit_key))
  const kayitListesiSatirlari = ayarliSatirlar

  return (
    <div>
      {hata && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {hata}
        </div>
      )}

      <GorevYerineGoreListeClient
        satirlar={kayitListesiSatirlari}
        tumSatirlar={satirlar}
        seciliKeyler={ayarliSatirlar.map(s => s.kayit_key)}
        secilmeyenSatirlar={secilmeyenSatirlar}
        anlikTarihEtiket={anlikTarihEtiket}
        aciklama={LISTE_ACIKLAMA}
        excelHref="/api/rapor/gorev-yerine-gore-liste/excel"
      />
    </div>
  )
}
