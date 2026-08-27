/** Kesinti menülerinde 2025/ sıra nolu (yıl = 2025) izinler yer almaz. */
export const KESINTI_HARIC_IZIN_YILI = 2025

export function kesintiIzinYilHaricMi(
  yil: number | string | null | undefined,
  siraNo?: string | null,
): boolean {
  if (Number(yil) === KESINTI_HARIC_IZIN_YILI) return true
  return String(siraNo ?? '').trim().startsWith(`${KESINTI_HARIC_IZIN_YILI}/`)
}
