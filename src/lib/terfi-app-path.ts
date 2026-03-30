/** Terfi sayfaları yenileme (dönem listesi + terfi bilgileri). */
import { revalidatePath } from 'next/cache'

export function revalidateTerfiRoutes() {
  revalidatePath('/terfi')
  revalidatePath('/terfi/bilgiler')
}
