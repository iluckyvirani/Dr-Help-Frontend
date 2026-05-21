import { useEffect } from 'react'
import { Button } from '../ui'

interface SuccessModalProps {
  open: boolean
  title?: string
  message?: string
  onClose: () => void
  autoCloseMs?: number
}

const SuccessModal = ({
  open,
  title = 'Success!',
  message = 'Operation completed successfully.',
  onClose,
  autoCloseMs = 2000,
}: SuccessModalProps) => {
  useEffect(() => {
    if (open && autoCloseMs > 0) {
      const timer = setTimeout(onClose, autoCloseMs)
      return () => clearTimeout(timer)
    }
  }, [open, autoCloseMs, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in">
        <div className="p-6 text-center">
          {/* Animated check icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>

        <div className="p-4 border-t border-slate-100">
          <Button className="w-full" onClick={onClose}>
            Okay
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SuccessModal
