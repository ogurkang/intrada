'use client'

import Modal from '@/components/ui/Modal'

type Props = {
  open: boolean
  onClose: () => void
}

export default function GorevYeriListeGuncellendiModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Bilgi" size="sm">
      <p className="text-sm text-slate-600 mb-6">
        Görev Yerine Göre Personel Listesi güncellenmiştir.
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Tamam
        </button>
      </div>
    </Modal>
  )
}
