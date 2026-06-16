import type { SupabaseClient } from '@supabase/supabase-js'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'
import { MENU_YETKILENDIRME_TABLO_MODULLERI } from '@/lib/menu-yetki'

export const YETKI_ALAN_ETIKETLERI: Record<string, string> = {
  rol: 'Rol',
  hesap_aktif: 'Erişim',
  menu_ozet: 'Menü İzinleri',
}

const MENU_ETIKET: Record<string, string> = Object.fromEntries(
  MENU_YETKILENDIRME_TABLO_MODULLERI.map(m => [m.key, m.label]),
)

export function menuIzinleriOzet(rol: string, menu: unknown): string {
  if (rol === 'admin') return 'Tüm modüller (Yönetici)'
  const raw = (menu && typeof menu === 'object' ? menu : {}) as Record<string, boolean>
  const acik = Object.entries(raw)
    .filter(([, v]) => v === true)
    .map(([k]) => MENU_ETIKET[k] ?? k)
  return acik.length ? acik.join(', ') : 'Kapalı'
}

export function yetkiAuditSnapshot(row: {
  rol?: string | null
  hesap_aktif?: boolean | null
  menu_izinleri?: unknown
}): Record<string, unknown> {
  const rol = row.rol ?? 'kullanici'
  return {
    rol,
    hesap_aktif: row.hesap_aktif !== false,
    menu_ozet: menuIzinleriOzet(rol, row.menu_izinleri),
  }
}

export function yetkiAuditDegerGoster(alan: string, deger: unknown): string {
  if (deger == null || deger === '') return '—'
  if (alan === 'hesap_aktif') return deger ? 'Açık' : 'Kapalı'
  if (alan === 'rol') return deger === 'admin' ? 'Yönetici' : 'Kullanıcı'
  return String(deger)
}

export function yetkiAuditDiffSatirlari(onceki: unknown, sonraki: unknown) {
  const o = yetkiAuditSnapshot((onceki && typeof onceki === 'object' ? onceki : {}) as Record<string, unknown>)
  const s = yetkiAuditSnapshot((sonraki && typeof sonraki === 'object' ? sonraki : {}) as Record<string, unknown>)
  const alanlar = new Set([...Object.keys(o), ...Object.keys(s)])
  const out: { alan: string; etiket: string; onceki: unknown; sonraki: unknown }[] = []
  for (const alan of alanlar) {
    const etiket = YETKI_ALAN_ETIKETLERI[alan] ?? alan
    const eski = o[alan] ?? null
    const yeni = s[alan] ?? null
    const norm = (v: unknown) => {
      if (typeof v === 'boolean') return v ? '1' : '0'
      return v == null ? '' : String(v).trim()
    }
    if (norm(eski) === norm(yeni)) continue
    out.push({ alan, etiket, onceki: eski, sonraki: yeni })
  }
  return out.sort((a, b) => a.etiket.localeCompare(b.etiket, 'tr'))
}

export async function writeYetkilendirmeAuditLogSafe(
  supabase: SupabaseClient,
  input: {
    sicil_no: string
    islem: string
    ozet: string
    onceki?: unknown | null
    sonraki?: unknown | null
  },
): Promise<void> {
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: input.sicil_no,
    modul: 'yetkilendirme',
    islem: input.islem,
    ozet: input.ozet,
    ref_table: 'app_profiles',
    ref_id: input.sicil_no,
    onceki: input.onceki ?? null,
    sonraki: input.sonraki ?? null,
  })
}
