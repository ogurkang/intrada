'use server'

import {
  yerelBilgiTanimGuncelle,
  yerelBilgiTanimToggle,
  yerelBilgiTanimTopluEkle,
  yerelBilgiTanimTopluGuncelle,
} from '../crud-actions'

const TABLO = 'yerel_bilgi_butce_gider' as const
const SAYFA = '/yerel-bilgi/tanimlar/butce-gider'

export async function butceGiderTopluEkle(satirlar: { sira_no: number | null; tanim_adi: string }[]) {
  return yerelBilgiTanimTopluEkle(TABLO, SAYFA, satirlar)
}

export async function butceGiderGuncelle(id: number, fd: FormData) {
  return yerelBilgiTanimGuncelle(TABLO, SAYFA, id, fd)
}

export async function butceGiderTopluGuncelle(
  g: { id: number; sira_no: number | null; tanim_adi: string; aktif: boolean }[],
) {
  return yerelBilgiTanimTopluGuncelle(TABLO, SAYFA, g)
}

export async function butceGiderToggle(id: number, mevcut: boolean) {
  return yerelBilgiTanimToggle(TABLO, SAYFA, id, mevcut)
}
