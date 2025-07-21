'use client'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  disabled?: boolean
}

export function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "Processing..." : "Ask anything..."}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50 transition-all"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  )
}
