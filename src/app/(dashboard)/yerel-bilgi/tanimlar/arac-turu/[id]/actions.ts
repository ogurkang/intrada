'use server'

import {
  yerelBilgiAltTurGuncelle,
  yerelBilgiAltTurToggle,
  yerelBilgiAltTurTopluEkle,
  yerelBilgiAltTurTopluGuncelle,
} from '../../crud-actions'

function sayfaPath(turId: number) {
  return `/yerel-bilgi/tanimlar/arac-turu/${turId}`
}

export async function aracAltTurTopluEkle(
  turId: number,
  satirlar: { sira_no: number | null; tanim_adi: string }[],
) {
  return yerelBilgiAltTurTopluEkle(turId, sayfaPath(turId), satirlar)
}

export async function aracAltTurGuncelle(turId: number, id: number, fd: FormData) {
  return yerelBilgiAltTurGuncelle(sayfaPath(turId), id, fd)
}

export async function aracAltTurTopluGuncelle(
  turId: number,
  g: { id: number; sira_no: number | null; tanim_adi: string; aktif: boolean }[],
) {
  return yerelBilgiAltTurTopluGuncelle(sayfaPath(turId), g)
}

export async function aracAltTurToggle(turId: number, id: number, mevcut: boolean) {
  return yerelBilgiAltTurToggle(sayfaPath(turId), id, mevcut)
}
