import { redirect } from 'next/navigation'

/** Eski URL — Yerel Bilgi Yönetimi modülüne taşındı. */
export default function YerelBilgiYasDagilimiEskiYol() {
  redirect('/yerel-bilgi/raporlar/yerel-bilgi-yas-dagilimi')
}
