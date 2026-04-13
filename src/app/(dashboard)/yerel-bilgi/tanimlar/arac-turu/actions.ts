'use server'

import {
  yerelBilgiTanimGuncelle,
  yerelBilgiTanimToggle,
  yerelBilgiTanimTopluEkle,
  yerelBilgiTanimTopluGuncelle,
} from '../crud-actions'

const TABLO = 'yerel_bilgi_arac_turu' as const
const SAYFA = '/yerel-bilgi/tanimlar/arac-turu'

export async function aracTuruTopluEkle(satirlar: { sira_no: number | null; tanim_adi: string }[]) {
  return yerelBilgiTanimTopluEkle(TABLO, SAYFA, satirlar)
}

export async function aracTuruGuncelle(id: number, fd: FormData) {
  return yerelBilgiTanimGuncelle(TABLO, SAYFA, id, fd)
}

export async function aracTuruTopluGuncelle(
  g: { id: number; sira_no: number | null; tanim_adi: string; aktif: boolean }[],
) {
  return yerelBilgiTanimTopluGuncelle(TABLO, SAYFA, g)
}

export async function aracTuruToggle(id: number, mevcut: boolean) {
  return yerelBilgiTanimToggle(TABLO, SAYFA, id, mevcut)
}
