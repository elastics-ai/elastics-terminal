'use client'

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface ElasticsModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

export function ElasticsModelSelector({ selectedModel, onModelChange }: ElasticsModelSelectorProps) {
  const models = [
    { value: 'SSVI', label: 'SSVI' },
    { value: 'ESSI', label: 'ESSI' },
    { value: 'LSTM', label: 'LSTM' },
    { value: 'Linear', label: 'Linear' }
  ]

  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Model</h3>
      <RadioGroup value={selectedModel} onValueChange={onModelChange}>
        <div className="flex gap-6">
          {models.map((model) => (
            <div key={model.value} className="flex items-center space-x-2">
              <RadioGroupItem value={model.value} id={model.value} />
              <Label htmlFor={model.value} className="cursor-pointer">
                {model.label}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  )
}