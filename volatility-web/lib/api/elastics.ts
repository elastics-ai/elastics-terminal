import { ElasticsDataset, ElasticsMajor, ElasticsStats, ElasticsResponse } from '@/types/elastics'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ElasticsFilter {
  search?: string
  category?: string
  schema?: string
  publisher?: string
  region?: string
  status?: string
}

export const elasticsApi = {
  /**
   * Get all datasets with optional filtering
   */
  async getDatasets(filters?: ElasticsFilter): Promise<ElasticsDataset[]> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
    }
    
    const response = await fetch(`${API_BASE_URL}/api/elastics/datasets?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch datasets: ${response.statusText}`)
    }
    return response.json()
  },

  /**
   * Get major data providers
   */
  async getMajors(): Promise<ElasticsMajor[]> {
    const response = await fetch(`${API_BASE_URL}/api/elastics/majors`)
    if (!response.ok) {
      throw new Error(`Failed to fetch majors: ${response.statusText}`)
    }
    return response.json()
  },

  /**
   * Get Elastics statistics
   */
  async getStats(): Promise<ElasticsStats> {
    const response = await fetch(`${API_BASE_URL}/api/elastics/stats`)
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`)
    }
    return response.json()
  },

  /**
   * Get all Elastics data in one call
   */
  async getAll(filters?: ElasticsFilter): Promise<ElasticsResponse> {
    const body = filters ? { filters } : {}
    
    const response = await fetch(`${API_BASE_URL}/api/elastics/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all data: ${response.statusText}`)
    }
    return response.json()
  },

  /**
   * Get SSVI volatility surface data
   */
  async getSSVISurface(symbol: string = 'BTC') {
    const response = await fetch(`${API_BASE_URL}/api/elastics/ssvi-surface?symbol=${symbol}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch SSVI surface: ${response.statusText}`)
    }
    return response.json()
  },

  /**
   * Get risk-neutral density data
   */
  async getRiskNeutralDensity(symbol: string = 'BTC', maturity: number = 0.25) {
    const response = await fetch(
      `${API_BASE_URL}/api/elastics/risk-neutral-density?symbol=${symbol}&maturity=${maturity}`
    )
    if (!response.ok) {
      throw new Error(`Failed to fetch risk-neutral density: ${response.statusText}`)
    }
    return response.json()
  },

  /**
   * Calculate option price
   */
  async calculatePrice(params: {
    strike: number
    maturity: number
    option_type: string
    pricer_type?: string
    symbol?: string
  }) {
    const response = await fetch(`${API_BASE_URL}/api/elastics/calculate-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strike: params.strike,
        maturity: params.maturity,
        option_type: params.option_type,
        pricer_type: params.pricer_type || 'BS',
        symbol: params.symbol || 'BTC',
      }),
    })
    if (!response.ok) {
      throw new Error(`Failed to calculate option price: ${response.statusText}`)
    }
    return response.json()
  },

  /**
   * Get Elastics metrics
   */
  async getMetrics() {
    const response = await fetch(`${API_BASE_URL}/api/elastics/metrics`)
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.statusText}`)
    }
    return response.json()
  },
}

// Helper function to format product counts
export function formatProductCount(count: string | number): string {
  if (typeof count === 'string') return count
  return new Intl.NumberFormat('en-US').format(count) + ' products'
}

// Helper function to get feature display
export function getFeatureDisplay(features: Record<string, boolean>) {
  return Object.entries(features).map(([key, enabled]) => ({
    name: key.toUpperCase(),
    enabled,
  }))
}