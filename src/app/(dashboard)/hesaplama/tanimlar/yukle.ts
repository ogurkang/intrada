import { personelMaliyetBelgeCoz, type PersonelMaliyetBelge } from '@/lib/personel-maliyet-hesap'
import { personelMaliyetOku } from '../personel-maliyeti/actions'

export async function tanimSayfasi(): Promise<{ belge: PersonelMaliyetBelge | null; tabloYok: boolean }> {
  const { belge, uyari } = await personelMaliyetOku()
  return { belge: belge ? personelMaliyetBelgeCoz(belge) : null, tabloYok: uyari === 'tablo-yok' }
}
