'use client'

import { ElasticsLayout } from '@/components/layout/elastics-layout'
import { ElasticsRiskDashboard } from '@/components/elastics/risk-dashboard'

export default function ElasticsRiskPage() {
  return (
    <ElasticsLayout>
      <ElasticsRiskDashboard />
    </ElasticsLayout>
  )
}