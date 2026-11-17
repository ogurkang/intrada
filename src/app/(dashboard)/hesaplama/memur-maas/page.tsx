import MemurMaasClient from '@/components/hesaplama/MemurMaasClient'
import { yukleMemurMaasKaynaklari } from '@/lib/memur-maas-yukle'
import { memurMaasOku } from './actions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export default async function MemurMaasPage() {
  const [{ odenekler, mudurlukler, unvanByMudurluk }, { belge, uyari }] = await Promise.all([
    yukleMemurMaasKaynaklari(),
    memurMaasOku(),
  ])
  return (
    <MemurMaasClient
      odenekler={odenekler}
      mudurlukler={mudurlukler}
      unvanByMudurluk={unvanByMudurluk}
      sunucuBelge={belge}
      tabloYok={uyari === 'tablo-yok'}
    />
  )
}
