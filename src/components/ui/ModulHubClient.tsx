'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import type { HubSonIslemOzet, ModulHubAuditTip } from '@/lib/hub-audit-load'
import { ogrenimAuditDiffSatirlari, ogrenimAuditDegerGoster } from '@/lib/ogrenim-audit'
import { aileAuditDiffSatirlari, aileAuditDegerGoster } from '@/lib/aile-audit'
import { malAuditDiffSatirlari, malAuditDegerGoster } from '@/lib/mal-audit'
import { kesintiDonemAuditDiffSatirlari, kesintiDonemAuditDegerGoster } from '@/lib/kesinti-donem-audit'
import { pasaportAuditDiffSatirlari, pasaportAuditDegerGoster } from '@/lib/pasaport-audit'
import {
  hizmetBirlestirmeAuditDiffSatirlari,
  hizmetBirlestirmeAuditDegerGoster,
} from '@/lib/hizmet-birlestirme-audit'
import { mehilIzniAuditDiffSatirlari, mehilIzniAuditDegerGoster } from '@/lib/mehil-izni-audit'
import { aylikIzinAuditDiffSatirlari, aylikIzinAuditDegerGoster } from '@/lib/aylik-izin-audit'
import { yzcAuditDiffSatirlari, yzcAuditDegerGoster } from '@/lib/yari-zamanli-calisma-audit'
import {
  harcirahTalepAuditDiffSatirlari,
  harcirahTalepAuditDegerGoster,
} from '@/lib/harcirah-talep-audit'
import {
  calismaBelgesiAuditDiffSatirlari,
  calismaBelgesiAuditDegerGoster,
} from '@/lib/calisma-belgesi-audit'
import { besIptalAuditDiffSatirlari, besIptalAuditDegerGoster } from '@/lib/bes-iptal-audit'
import {
  sendikaIstifaAuditDiffSatirlari,
  sendikaIstifaAuditDegerGoster,
} from '@/lib/sendika-istifa-audit'
import { sendikaAuditDiffSatirlari, sendikaAuditDegerGoster } from '@/lib/sendika-audit'

type AuditLog = Tables<'personel_audit_log'>
type DiffFn = (onceki: unknown, sonraki: unknown) => {
  alan: string
  etiket: string
  onceki: unknown
  sonraki: unknown
}[]
type DegerFn = (alan: string, deger: unknown) => string

/** Sunucu → istemci sınırında yalnızca string geçirilebilir; diff fonksiyonları burada eşlenir. */
export type { ModulHubAuditTip }

const AUDIT_TIP_MAP: Record<ModulHubAuditTip, { diffSatirlari: DiffFn; degerGoster: DegerFn }> = {
  ogrenim:       { diffSatirlari: ogrenimAuditDiffSatirlari, degerGoster: ogrenimAuditDegerGoster },
  aile:          { diffSatirlari: aileAuditDiffSatirlari, degerGoster: aileAuditDegerGoster },
  mal:           { diffSatirlari: malAuditDiffSatirlari, degerGoster: malAuditDegerGoster },
  'kesinti-donem': { diffSatirlari: kesintiDonemAuditDiffSatirlari, degerGoster: kesintiDonemAuditDegerGoster },
  pasaport:      { diffSatirlari: pasaportAuditDiffSatirlari, degerGoster: pasaportAuditDegerGoster },
  'hizmet-birlestirme': {
    diffSatirlari: hizmetBirlestirmeAuditDiffSatirlari,
    degerGoster: hizmetBirlestirmeAuditDegerGoster,
  },
  'mehil-izni': {
    diffSatirlari: mehilIzniAuditDiffSatirlari,
    degerGoster: mehilIzniAuditDegerGoster,
  },
  'aylik-izin': {
    diffSatirlari: aylikIzinAuditDiffSatirlari,
    degerGoster: aylikIzinAuditDegerGoster,
  },
  'yari-zamanli-calisma': {
    diffSatirlari: yzcAuditDiffSatirlari,
    degerGoster: yzcAuditDegerGoster,
  },
  'harcirah-talep': {
    diffSatirlari: harcirahTalepAuditDiffSatirlari,
    degerGoster: harcirahTalepAuditDegerGoster,
  },
  'calisma-belgesi': {
    diffSatirlari: calismaBelgesiAuditDiffSatirlari,
    degerGoster: calismaBelgesiAuditDegerGoster,
  },
  'bes-iptal': {
    diffSatirlari: besIptalAuditDiffSatirlari,
    degerGoster: besIptalAuditDegerGoster,
  },
  sendika: {
    diffSatirlari: sendikaAuditDiffSatirlari,
    degerGoster: sendikaAuditDegerGoster,
  },
  'sendika-istifa': {
    diffSatirlari: sendikaIstifaAuditDiffSatirlari,
    degerGoster: sendikaIstifaAuditDegerGoster,
  },
}

export interface ModulHubKart {
  key: string
  kod?: string
  baslik: string
  aciklama: string
  href: string
  renk: string
  ikonRenk: string
  ikon: ReactNode
  sayi: ReactNode
  altMetin: string
  badge?: string | null
  sonIslem: HubSonIslemOzet | null
  auditLoglar: AuditLog[]
  auditTip?: ModulHubAuditTip
  gecmisBaslik?: string
}

interface Props {
  baslik: string
  aciklama: string
  kartlar: ModulHubKart[]
  ustBilesen?: ReactNode
  altBilesen?: ReactNode
  gridClassName?: string
}

function tarihSaatGoster(v: string | null | undefined): string {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('tr-TR')
}

export default function ModulHubClient({
  baslik,
  aciklama,
  kartlar,
  ustBilesen,
  altBilesen,
  gridClassName = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5',
}: Props) {
  const [gecmisKey, setGecmisKey] = useState<string | null>(null)
  const gecmisKart = gecmisKey ? kartlar.find(k => k.key === gecmisKey) : null
  const gecmisAudit = gecmisKart?.auditTip ? AUDIT_TIP_MAP[gecmisKart.auditTip] : null

  return (
    <div>
      {ustBilesen}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{aciklama}</p>
      </div>

      <div className={gridClassName}>
        {kartlar.map(k => (
          <article
            key={k.key}
            className={`rounded-xl border-2 ${k.renk} p-6 flex flex-col hover:shadow-md transition-all`}>
            <div className="flex items-start justify-between mb-4 gap-2">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`p-3 rounded-xl shrink-0 ${k.ikonRenk}`}>{k.ikon}</div>
                <div className="min-w-0 pt-0.5">
                  {k.kod && (
                    <span className="text-xs font-bold tracking-widest opacity-60">{k.kod}</span>
                  )}
                  <h2 className="font-semibold text-slate-800 leading-snug">{k.baslik}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {k.badge && (
                  <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {k.badge}
                  </span>
                )}
                {k.auditLoglar.length > 0 && (
                  <button
                    type="button"
                    title="İşlem geçmişi"
                    onClick={() => setGecmisKey(k.key)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50/80 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.5 2" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.5 9.5A9 9 0 113 12m.5-2.5L1.75 7.25M3.5 9.5L6 8.75"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <p className="text-2xl font-bold text-slate-800 tabular-nums">{k.sayi}</p>
            <p className="text-xs text-slate-500 mb-3">{k.altMetin}</p>
            <p className="text-sm text-slate-500 leading-relaxed flex-1">{k.aciklama}</p>

            <div className="mt-auto space-y-2 pt-3 border-t border-black/5">
              <Link
                href={k.href}
                className="inline-flex items-center justify-center w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white/70 hover:bg-white border border-black/10 text-slate-800 transition-colors">
                Modülü Aç →
              </Link>

              <div className="text-[11px] leading-relaxed opacity-90 space-y-1 px-0.5">
                {k.sonIslem ? (
                  <div>
                    <p className="font-medium text-slate-700">Son işlem:</p>
                    <p className="opacity-85">{k.sonIslem.ozet}</p>
                    <p className="opacity-75 tabular-nums">
                      {tarihSaatGoster(k.sonIslem.tarih)}
                      {k.sonIslem.actor_email ? ` · ${k.sonIslem.actor_email}` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="opacity-75 italic">Henüz işlem kaydı yok.</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {altBilesen}

      <AuditGecmisPanel
        acik={gecmisKey != null}
        onKapat={() => setGecmisKey(null)}
        auditLoglar={gecmisKart?.auditLoglar ?? []}
        baslik={gecmisKart?.gecmisBaslik ?? (gecmisKart ? `İşlem Geçmişi — ${gecmisKart.baslik}` : 'İşlem Geçmişi')}
        aciklama="Satıra tıklayarak alan bazlı eski/yeni değerleri görebilirsiniz."
        diffSatirlari={gecmisAudit?.diffSatirlari ?? (() => [])}
        degerGoster={gecmisAudit?.degerGoster ?? (() => '—')}
      />
    </div>
  )
}
