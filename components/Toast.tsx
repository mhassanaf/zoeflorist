'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'loading'
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'loading', duration?: number) => string
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'loading' = 'success',
    duration = 4000
  ) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto dismiss for non-loading toasts
    if (type !== 'loading') {
      setTimeout(() => {
        dismissToast(id)
      }, duration)
    }

    return id
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      {/* Floating Toasts Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-[calc(100%-3rem)] pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border bg-white/95 backdrop-blur shadow-xl flex items-center gap-3 animate-fade-in-up smooth-transition ${
              toast.type === 'success'
                ? 'border-green-600/35 border-l-4 border-l-green-600'
                : toast.type === 'error'
                ? 'border-brand-accent-bold/35 border-l-4 border-l-brand-accent-bold'
                : 'border-brand-neutral-1/35 border-l-4 border-l-brand-primary'
            }`}
          >
            {/* Icon depending on type */}
            {toast.type === 'loading' ? (
              <div className="w-4 h-4 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin flex-shrink-0" />
            ) : toast.type === 'success' ? (
              <svg
                className="w-5 h-5 text-green-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-brand-accent-bold flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}

            {/* Message */}
            <span className="text-xs font-semibold text-brand-primary font-sans leading-relaxed flex-grow">
              {toast.message}
            </span>

            {/* Dismiss cross button */}
            {toast.type !== 'loading' && (
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-brand-primary/30 hover:text-brand-primary p-0.5 smooth-transition cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
