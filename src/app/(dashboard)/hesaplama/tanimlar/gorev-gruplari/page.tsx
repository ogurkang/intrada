import { GorevGrupTanimClient } from '@/components/hesaplama/MaliyetTanimFormlari'
import { tanimSayfasi } from '../yukle'

export default async function GorevGrupTanimPage() {
  const { belge, tabloYok } = await tanimSayfasi()
  return <GorevGrupTanimClient sunucuBelge={belge} tabloYok={tabloYok} />
}
