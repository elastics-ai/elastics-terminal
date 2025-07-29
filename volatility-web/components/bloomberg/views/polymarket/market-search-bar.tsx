'use client'

interface MarketSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function MarketSearchBar({ value, onChange }: MarketSearchBarProps) {
  return (
    <div className="border border-border p-4 rounded-lg">
      <div className="flex items-center gap-4">
        <label className="text-sm font-bold text-muted-foreground">SEARCH:</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by market question, category, or tags..."
          className="flex-1 bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground pb-1 focus:border-primary transition-colors"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            CLEAR
          </button>
        )}
      </div>
    </div>
  )
}