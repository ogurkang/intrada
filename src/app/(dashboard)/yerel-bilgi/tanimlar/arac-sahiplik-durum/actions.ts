'use server'

import {
  yerelBilgiTanimGuncelle,
  yerelBilgiTanimToggle,
  yerelBilgiTanimTopluEkle,
  yerelBilgiTanimTopluGuncelle,
} from '../crud-actions'

const TABLO = 'yerel_bilgi_arac_sahiplik_durum' as const
const SAYFA = '/yerel-bilgi/tanimlar/arac-sahiplik-durum'

export async function aracSahiplikDurumTopluEkle(
  satirlar: { sira_no: number | null; tanim_adi: string }[],
) {
  return yerelBilgiTanimTopluEkle(TABLO, SAYFA, satirlar)
}

export async function aracSahiplikDurumGuncelle(id: number, fd: FormData) {
  return yerelBilgiTanimGuncelle(TABLO, SAYFA, id, fd)
}

export async function aracSahiplikDurumTopluGuncelle(
  g: { id: number; sira_no: number | null; tanim_adi: string; aktif: boolean }[],
) {
  return yerelBilgiTanimTopluGuncelle(TABLO, SAYFA, g)
}

export async function aracSahiplikDurumToggle(id: number, mevcut: boolean) {
  return yerelBilgiTanimToggle(TABLO, SAYFA, id, mevcut)
}
