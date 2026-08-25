'use client'

import Modal from '@/components/ui/Modal'

export default function SilOnayModal({
  open,
  onClose,
  baslik = 'Silme onayı',
  mesaj,
  onEvet,
  pending = false,
}: {
  open: boolean
  onClose: () => void
  baslik?: string
  mesaj: string
  onEvet: () => void
  pending?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={baslik} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-700">{mesaj}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            Hayır
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onEvet}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Siliniyor…' : 'Evet'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
