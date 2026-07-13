/** Hizmet birleştirme audit geçmişi — alan etiketleri ve değer gösterimi. */

const ALANLAR: { alan: string; etiket: string }[] = [
  { alan: 'personel_durum', etiket: 'Durum' },
  { alan: 'ad_soyad', etiket: 'Ad Soyad' },
  { alan: 'tckn', etiket: 'T.C. Kimlik No' },
  { alan: 'emeklilik_sicil_no', etiket: 'Emeklilik Sicil Numarası' },
  { alan: 'ssk', etiket: 'S.S.K.' },
  { alan: 'bagkur_sicil_no', etiket: 'Bağ-Kur Sicil Numarası' },
  { alan: 'hizmet_illeri', etiket: 'Sigortalı Hizmetin Geçtiği İl/İller' },
]

export function hizmetBirlestirmeAuditDiffSatirlari(
  onceki: unknown,
  sonraki: unknown,
): { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] {
  const o = (onceki ?? {}) as Record<string, unknown>
  const s = (sonraki ?? {}) as Record<string, unknown>
  const rows: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []

  for (const { alan, etiket } of ALANLAR) {
    const ov = o[alan]
    const sv = s[alan]
    if (onceki == null) {
      if (sv != null && String(sv) !== '') {
        rows.push({ alan, etiket, onceki: null, sonraki: sv })
      }
      continue
    }
    if (String(ov ?? '') !== String(sv ?? '')) {
      rows.push({ alan, etiket, onceki: ov ?? null, sonraki: sv ?? null })
    }
  }
  return rows
}

export function hizmetBirlestirmeAuditDegerGoster(alan: string, deger: unknown): string {
  const v = deger == null ? '' : String(deger).trim()
  if (!v) return '—'
  if (alan === 'personel_durum') return v === 'ayrilan' ? 'Ayrılan' : 'Çalışan'
  return v
}
