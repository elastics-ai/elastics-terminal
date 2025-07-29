'use client'

import React, { useState } from 'react'
import { YONSelector, YONValue } from '@/components/ui/yon-selector'

export default function YONDemo() {
  const [decision, setDecision] = useState<YONValue>(null)
  const [customDecision, setCustomDecision] = useState<YONValue>(null)

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">YON (Yes/Or/No) Selector Demo</h1>
      
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Basic YON Selector</h2>
          <div className="mb-4">
            <p className="text-gray-600 mb-2">Should we proceed with this option?</p>
            <YONSelector
              value={decision}
              onChange={setDecision}
            />
          </div>
          <p className="text-sm text-gray-500">
            Selected: {decision ? decision.toUpperCase() : 'None'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Custom Labels</h2>
          <div className="mb-4">
            <p className="text-gray-600 mb-2">Do you agree with the terms?</p>
            <YONSelector
              value={customDecision}
              onChange={setCustomDecision}
              labels={{
                yes: 'Agree',
                or: 'Maybe',
                no: 'Disagree'
              }}
            />
          </div>
          <p className="text-sm text-gray-500">
            Selected: {customDecision ? customDecision.toUpperCase() : 'None'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Disabled State</h2>
          <div className="mb-4">
            <p className="text-gray-600 mb-2">This selector is disabled:</p>
            <YONSelector
              value="or"
              disabled
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Use Cases</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Decision making interfaces where "maybe" or "undecided" is a valid option</li>
            <li>Survey forms with three-way choices</li>
            <li>Configuration settings with yes/no/auto options</li>
            <li>Trading decisions: Buy/Hold/Sell</li>
            <li>Risk assessment: High/Medium/Low</li>
          </ul>
        </div>
      </div>
    </div>
  )
}