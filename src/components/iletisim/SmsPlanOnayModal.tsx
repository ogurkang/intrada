'use client'

import Modal from '@/components/ui/Modal'

export function planTarihSaatYazi(tarihSaat: string): string {
  const d = new Date(tarihSaat)
  if (Number.isNaN(d.getTime())) return tarihSaat
  return d.toLocaleString('tr-TR', { dateStyle: 'full', timeStyle: 'short' })
}

export default function SmsPlanOnayModal({
  open,
  tarihSaat,
  aliciSayisi,
  bekliyor,
  onKapat,
  onOnayla,
}: {
  open: boolean
  tarihSaat: string
  aliciSayisi: number
  bekliyor: boolean
  onKapat: () => void
  onOnayla: () => void
}) {
  return (
    <Modal open={open} onClose={bekliyor ? () => undefined : onKapat} title="Gönderim zamanını onayla" size="sm">
      <p className="text-sm text-slate-700">
        {aliciSayisi} alıcıya SMS, aşağıdaki tarih ve saatte gönderilmek üzere planlanacak.
      </p>
      <p className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">
        {planTarihSaatYazi(tarihSaat)}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onKapat}
          disabled={bekliyor}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onOnayla}
          disabled={bekliyor}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {bekliyor ? 'Planlanıyor…' : 'Onayla ve planla'}
        </button>
      </div>
    </Modal>
  )
}
