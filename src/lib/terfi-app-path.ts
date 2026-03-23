/** Terfi sayfası yenileme — tek rota `/terfi`. */
import { revalidatePath } from 'next/cache'

export function revalidateTerfiRoutes() {
  revalidatePath('/terfi')
}
