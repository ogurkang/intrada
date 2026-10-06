import { KalemTanimClient } from '@/components/hesaplama/MaliyetTanimFormlari'
import { tanimSayfasi } from '../yukle'

export default async function KalemTanimPage() {
  const { belge, tabloYok } = await tanimSayfasi()
  return <KalemTanimClient sunucuBelge={belge} tabloYok={tabloYok} />
}
