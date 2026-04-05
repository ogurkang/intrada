/** 360 günlük yıl: 1 yıl = 360 gün, 1 ay = 30 gün (kamu hizmet süresi yaygın esası). */

export function hizmetToplamGun360(yil: number, ay: number, gun: number): number {
  const y = Math.max(0, Math.floor(Number(yil) || 0))
  const a = Math.max(0, Math.floor(Number(ay) || 0))
  const g = Math.max(0, Math.floor(Number(gun) || 0))
  return y * 360 + a * 30 + g
}

export function hizmetSuresiEtiket360(yil: number, ay: number, gun: number): string {
  const y = Math.max(0, Math.floor(Number(yil) || 0))
  const a = Math.max(0, Math.floor(Number(ay) || 0))
  const g = Math.max(0, Math.floor(Number(gun) || 0))
  const toplam = hizmetToplamGun360(y, a, g)
  return `${y} yıl ${a} ay ${g} gün (360 gün esasına göre toplam ${toplam} gün)`
}

/** Form alanlarından 0 veya pozitif tamsayı; boş geçersiz sayılır. */
export function formdanHizmetSureBilesenleri(fd: FormData): { yil: number; ay: number; gun: number } {
  const p = (k: string) => {
    const v = String(fd.get(k) ?? '').trim()
    if (v === '') return 0
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }
  return { yil: p('hizmet_suresi_yil'), ay: p('hizmet_suresi_ay'), gun: p('hizmet_suresi_gun') }
}
