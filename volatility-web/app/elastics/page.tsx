'use client'

import { ElasticsLayout } from '@/components/layout/elastics-layout'
import { DataCatalog } from '@/components/elastics/data-catalog'
import { useState } from 'react'

export default function ElasticsPage() {
  const [activeTab, setActiveTab] = useState('data')

  return (
    <ElasticsLayout>
      <div className="flex-1 bg-background">
        <div className="border-b border-border bg-card">
          <div className="flex items-center space-x-8 px-6 py-3">
            <button
              onClick={() => setActiveTab('data')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'data'
                  ? 'border-[hsl(var(--accent))] text-[hsl(var(--accent))]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Data
            </button>
          </div>
        </div>
        
        {activeTab === 'data' && <DataCatalog />}
      </div>
    </ElasticsLayout>
  )
}