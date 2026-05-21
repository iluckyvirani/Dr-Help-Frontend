import { useState } from 'react'
import { Button } from '../ui'

interface ConfirmModalProps {
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

const ConfirmModal = ({
  open,
  title = 'Delete Item',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in">
        <div className="p-6 text-center">
          {/* Icon */}
          <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 p-4 border-t border-slate-100">
          <Button
            variant="outline"
            className="flex-1 cursor-pointer"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            className="flex-1 cursor-pointer"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
