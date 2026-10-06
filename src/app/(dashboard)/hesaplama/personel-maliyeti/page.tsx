import PersonelMaliyetClient from '@/components/hesaplama/PersonelMaliyetClient'
import { personelMaliyetOku } from './actions'

export default async function PersonelMaliyetPage() {
  const { belge, uyari } = await personelMaliyetOku()
  return <PersonelMaliyetClient sunucuBelge={belge} tabloYok={uyari === 'tablo-yok'} />
}
