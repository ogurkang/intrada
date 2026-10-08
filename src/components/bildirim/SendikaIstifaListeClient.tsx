'use client'

import { useState, useTransition } from 'react'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import Modal from '@/components/ui/Modal'
import { CopKutusuSilDugmesi, GozDetayLink, IndirLink, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import {
  sendikaIstifaAuditDegerGoster,
  sendikaIstifaAuditDiffSatirlari,
} from '@/lib/sendika-istifa-audit'
import type { Tables } from '@/types/database'

export type IstifaSilmeDurumu = 'uyelik-acilir' | 'iki-uyelik' | 'uyelik-degismez'

export interface SendikaIstifaListeKayit {
  id: number
  sicil_no: string
  ad_soyad: string
  tckn: string | null
  sendika_adi: string
  silmeDurumu: IstifaSilmeDurumu
}

interface Props {
  kayitlar: SendikaIstifaListeKayit[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  adminMi: boolean
  onSil: (id: number) => Promise<{ hata?: string; uyelikGeriAlindi?: boolean }>
}

export default function SendikaIstifaListeClient({
  kayitlar,
  auditLoglarByRefId,
  adminMi,
  onSil,
}: Props) {
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [silinecek, setSilinecek] = useState<SendikaIstifaListeKayit | null>(null)
  const [engel, setEngel] = useState<string | null>(null)
  const [sonuc, setSonuc] = useState<string | null>(null)
  const [bekliyor, start] = useTransition()

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-20">Sıra No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Adı Soyadı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">T.C. Kimlik No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Sendika Adı</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-44">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kayitlar.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Henüz bildirim oluşturulmadı.
                  </td>
                </tr>
              ) : (
                kayitlar.map((k, idx) => {
                  const refId = String(k.id)
                  const auditLoglar = auditLoglarByRefId[refId] ?? []
                  return (
                    <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-800">
                        <span className="font-medium">{k.ad_soyad}</span>
                        <span className="text-slate-500 font-mono text-xs ml-2">{k.sicil_no}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{k.tckn || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[240px] truncate" title={k.sendika_adi}>
                        {k.sendika_adi}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <SaatGecmisDugmesi
                            sayi={auditLoglar.length}
                            onClick={() => setGecmisRefId(refId)}
                            title="İşlem geçmişi"
                          />
                          <GozDetayLink href={`/bildirim/sendika-istifa/${k.id}`} title="Detay" />
                          <IndirLink
                            href={`/api/bildirim/sendika-istifa/word?id=${k.id}`}
                            title="Word İndir"
                          />
                          {adminMi && (
                            <CopKutusuSilDugmesi
                              onClick={() => {
                                if (k.silmeDurumu === 'iki-uyelik') {
                                  setEngel(
                                    'Bu işlem ile eski sendika üyeliği aktif olacağından ve aktif bir sendika üyeliği olduğundan silme işlemi yapılamaz.',
                                  )
                                  return
                                }
                                setSilinecek(k)
                              }}
                              disabled={bekliyor}
                              title="Sil"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={silinecek != null}
        onClose={() => !bekliyor && setSilinecek(null)}
        title="İstifa kaydını sil"
        size="md"
      >
        <p className="text-sm text-slate-700 leading-relaxed">
          {silinecek?.silmeDurumu === 'uyelik-acilir'
            ? 'Bu işlem ile personelin eski sendika üyeliği yeniden aktif olacak. Silme işlemini onaylıyor musunuz?'
            : 'Bu dilekçe bir üyeliği kapatmamış. Silinirse sendika üyeliği değişmez. Silme işlemini onaylıyor musunuz?'}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSilinecek(null)}
            disabled={bekliyor}
            className="px-3 py-1.5 text-sm text-slate-600"
          >
            Hayır
          </button>
          <button
            type="button"
            disabled={bekliyor || !silinecek}
            onClick={() => {
              if (!silinecek) return
              const id = silinecek.id
              start(async () => {
                const res = await onSil(id)
                setSilinecek(null)
                if (res.hata) {
                  setEngel(res.hata)
                  return
                }
                setSonuc(
                  res.uyelikGeriAlindi
                    ? 'Dilekçe silindi. Kapattığı üyelik yeniden açıldı; personel yine o sendikanın üyesi görünür.'
                    : 'Dilekçe silindi. Bu dilekçe bir üyeliği kapatmamıştı. Sendika bildirimindeki üyelik aynı kaldı.',
                )
              })
            }}
            className="px-3 py-1.5 text-sm bg-red-700 text-white rounded-lg disabled:opacity-50"
          >
            {bekliyor ? 'Siliniyor…' : 'Tamam'}
          </button>
        </div>
      </Modal>

      <Modal open={engel != null} onClose={() => setEngel(null)} title="Silme yapılamaz" size="md">
        <p className="text-sm text-slate-700 leading-relaxed">{engel}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setEngel(null)}
            className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg"
          >
            Tamam
          </button>
        </div>
      </Modal>

      <Modal open={sonuc != null} onClose={() => setSonuc(null)} title="Silme sonucu" size="sm">
        <p className="text-sm text-slate-700 leading-relaxed">{sonuc}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setSonuc(null)}
            className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg"
          >
            Tamam
          </button>
        </div>
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []}
        baslik="Sendika İstifa Bildirimi Geçmişi"
        diffSatirlari={sendikaIstifaAuditDiffSatirlari}
        degerGoster={sendikaIstifaAuditDegerGoster}
      />
    </>
  )
}
