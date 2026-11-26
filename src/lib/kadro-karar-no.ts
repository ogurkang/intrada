/**
 * Excel "1/8" gibi meclis karar no'yu tarih sanıp Date'e çevirince
 * `String(date)` ile DB'ye yazılan değerleri (örn. "Sat Aug 01 2026 00:00:00 GMT+0300…")
 * tekrar "1/8" (gün/ay) formatına çevirir.
 */
export function normalizeMeclisKararNo(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const v = String(raw).trim()
  if (!v) return null

  const excelDateString =
    /GMT|Türkiye Standart|Standart Saati|00:00:00/.test(v) ||
    /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+/i.test(v)

  if (!excelDateString) return v

  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return `${d.getDate()}/${d.getMonth() + 1}`
}
