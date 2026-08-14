import { redirect } from 'next/navigation'

/** Eski dönem-dışı yollar → Denetim Dönemleri */
export default function LegacyDenetimRedirect() {
  redirect('/denetim/donemler')
}
