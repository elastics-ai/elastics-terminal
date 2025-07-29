'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { RiskDashboard } from '@/components/risk/RiskDashboard'

export default function RiskPage() {
  return (
    <AppLayout>
      <RiskDashboard />
    </AppLayout>
  )
}