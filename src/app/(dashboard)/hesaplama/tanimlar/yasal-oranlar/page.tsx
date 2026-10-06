import { YasalOranTanimClient } from '@/components/hesaplama/MaliyetTanimFormlari'
import { tanimSayfasi } from '../yukle'

export default async function YasalOranTanimPage() {
  const { belge, tabloYok } = await tanimSayfasi()
  return <YasalOranTanimClient sunucuBelge={belge} tabloYok={tabloYok} />
}
