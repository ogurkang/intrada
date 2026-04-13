'use server'

import {
  yerelBilgiTanimGuncelle,
  yerelBilgiTanimToggle,
  yerelBilgiTanimTopluEkle,
  yerelBilgiTanimTopluGuncelle,
} from '../crud-actions'

const TABLO = 'yerel_bilgi_butce_gelir' as const
const SAYFA = '/yerel-bilgi/tanimlar/butce-gelir'

export async function butceGelirTopluEkle(satirlar: { sira_no: number | null; tanim_adi: string }[]) {
  return yerelBilgiTanimTopluEkle(TABLO, SAYFA, satirlar)
}

export async function butceGelirGuncelle(id: number, fd: FormData) {
  return yerelBilgiTanimGuncelle(TABLO, SAYFA, id, fd)
}

export async function butceGelirTopluGuncelle(
  g: { id: number; sira_no: number | null; tanim_adi: string; aktif: boolean }[],
) {
  return yerelBilgiTanimTopluGuncelle(TABLO, SAYFA, g)
}

export async function butceGelirToggle(id: number, mevcut: boolean) {
  return yerelBilgiTanimToggle(TABLO, SAYFA, id, mevcut)
}
