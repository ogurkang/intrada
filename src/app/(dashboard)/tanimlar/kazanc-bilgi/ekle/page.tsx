import { redirect } from 'next/navigation'

/** Eski yeni sekme adresi: kazanç ekleme ünvan detayından yapılır. */
export default function KazancBilgiEkleRedirectPage() {
  redirect('/tanimlar/kazanc-bilgi')
}
