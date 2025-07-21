'use client'

interface MarketSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function MarketSearchBar({ value, onChange }: MarketSearchBarProps) {
  return (
    <div className="border border-bloomberg-amber/50 p-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-bold">SEARCH:</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by market question, category, or tags..."
          className="flex-1 bg-transparent border-b border-bloomberg-amber/50 outline-none text-bloomberg-amber placeholder:text-bloomberg-amber/50 pb-1"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-bloomberg-amber/70 hover:text-bloomberg-amber text-sm"
          >
            CLEAR
          </button>
        )}
      </div>
    </div>
  )
}