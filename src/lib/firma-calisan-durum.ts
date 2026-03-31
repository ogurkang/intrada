export function isFirmaCalisanAktif(ayrilis_tarihi: string | null | undefined, todayISO?: string): boolean {
  const raw = String(ayrilis_tarihi ?? '').trim()
  if (!raw) return true
  const tarih = raw.slice(0, 10)
  const bugun = todayISO ?? new Date().toISOString().slice(0, 10)
  // Ayrilis tarihi bugunden sonra ise halen aktif kabul edilir.
  return tarih > bugun
}

