import * as React from "react"
import { cn } from "@/lib/utils"
import { useToast } from "./use-toast"

export function ToastProvider() {
  const { toasts } = useToast()

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "relative overflow-hidden rounded-lg p-4 shadow-lg transition-all",
            "animate-in slide-in-from-bottom-2",
            toast.variant === "destructive"
              ? "bg-red-600 text-white"
              : "bg-white border border-gray-200 text-gray-900"
          )}
        >
          {toast.title && (
            <div className="font-semibold">{toast.title}</div>
          )}
          {toast.description && (
            <div className="mt-1 text-sm opacity-90">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  )
}