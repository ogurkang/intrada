import { redirect } from 'next/navigation'

/** Eski yol: Tanımlar altındaki adres artık kullanılmıyor. */
export default function TanimlarYetkilendirmeRedirect() {
  redirect('/yetkilendirme')
}
