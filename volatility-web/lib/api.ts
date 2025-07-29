// API client for communicating with the Python backend

// Use dynamic hostname if accessing from another device
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current hostname
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:8000`
  }
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
}

export async function fetchAPI<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`
  
  // Get auth token if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Portfolio API
export const portfolioAPI = {
  getSummary: () => fetchAPI('/api/portfolio/summary'),
  getPositions: () => fetchAPI('/api/portfolio/positions'),
  getPnLBreakdown: () => fetchAPI('/api/portfolio/pnl-breakdown'),
  getMetrics: () => fetchAPI('/api/portfolio/metrics'),
  getExposure: () => fetchAPI('/api/portfolio/exposure'),
  getPerformance: (period?: string) => fetchAPI(`/api/portfolio/performance${period ? `?period=${period}` : ''}`),
  getNews: () => fetchAPI('/api/portfolio/news'),
  
  // Enhanced endpoints
  getOverview: () => fetchAPI('/api/portfolio/overview'),
  getAllocation: () => fetchAPI('/api/portfolio/allocation'),
  getRiskMetrics: () => fetchAPI('/api/portfolio/risk-metrics'),
  getAISuggestions: () => fetchAPI('/api/portfolio/ai-suggestions'),
  executeQuery: (data: {
    query: string
    data_source?: string
    filters?: any
  }) => fetchAPI('/api/portfolio/query', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getHistory: (days?: number) => fetchAPI(`/api/portfolio/history${days ? `?days=${days}` : ''}`),
  getCorrelations: () => fetchAPI('/api/portfolio/correlations'),
}

// Risk API
export const riskAPI = {
  getOverview: () => fetchAPI('/api/risk/overview'),
  getMetrics: () => fetchAPI('/api/risk/metrics'),
  getLimits: () => fetchAPI('/api/risk/limits'),
  getVaR: () => fetchAPI('/api/risk/var'),
  getStressTests: () => fetchAPI('/api/risk/stress-tests'),
  getDrawdowns: () => fetchAPI('/api/risk/drawdowns'),
}

// Market API
export const marketAPI = {
  getSnapshot: () => fetchAPI('/api/market/snapshot'),
  getOptionChain: (symbol: string) => fetchAPI(`/api/market/option-chain/${symbol}`),
  getVolatilitySurface: (symbol: string) => fetchAPI(`/api/market/volatility-surface/${symbol}`),
  getOrderBook: (symbol: string) => fetchAPI(`/api/market/order-book/${symbol}`),
  getGreeks: (symbol: string) => fetchAPI(`/api/market/greeks/${symbol}`),
}

// Agent API
export const agentAPI = {
  getAgents: () => fetchAPI('/api/agents'),
  getAgent: (id: string) => fetchAPI(`/api/agents/${id}`),
  createAgent: (data: any) => fetchAPI('/api/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: string, data: any) => fetchAPI(`/api/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAgent: (id: string) => fetchAPI(`/api/agents/${id}`, { method: 'DELETE' }),
  startAgent: (id: string) => fetchAPI(`/api/agents/${id}/start`, { method: 'POST' }),
  stopAgent: (id: string) => fetchAPI(`/api/agents/${id}/stop`, { method: 'POST' }),
  getAgentNodes: (id: string) => fetchAPI(`/api/agents/${id}/nodes`),
  getAgentPerformance: (id: string) => fetchAPI(`/api/agents/${id}/performance`),
  getAgentLogs: (id: string) => fetchAPI(`/api/agents/${id}/logs`),
}

// Volatility API
export const volatilityAPI = {
  getAlerts: (limit: number = 10) => 
    fetchAPI(`/api/volatility/alerts?limit=${limit}`),
  getLatestSurface: () => fetchAPI('/api/volatility/surface/latest'),
}

// Polymarket API
export const polymarketAPI = {
  getMarkets: async (search?: string) => {
    try {
      const params = new URLSearchParams()
      if (search && search.trim()) params.append('search', search.trim())
      
      const response = await fetchAPI(`/api/polymarket/markets${params.toString() ? '?' + params.toString() : ''}`)
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format from Polymarket API')
      }
      
      if (!Array.isArray(response.markets)) {
        throw new Error('Markets data is not in expected format')
      }
      
      // Validate market data structure
      response.markets.forEach((market: any, index: number) => {
        if (!market.id || !market.question) {
          console.warn(`Market at index ${index} missing required fields:`, market)
        }
        
        // Ensure percentages are numbers
        if (typeof market.yes_percentage !== 'number' || typeof market.no_percentage !== 'number') {
          console.warn(`Market at index ${index} has invalid percentage values:`, market)
        }
      })
      
      return response
    } catch (error) {
      console.error('Polymarket API error:', error)
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Polymarket data: ${error.message}`)
      } else {
        throw new Error('Failed to fetch Polymarket data: Unknown error')
      }
    }
  },
  
  getVolatility: async (search?: string, limit: number = 50) => {
    try {
      const params = new URLSearchParams()
      if (search && search.trim()) params.append('search', search.trim())
      if (limit !== 50) params.append('limit', limit.toString())
      
      const response = await fetchAPI(`/api/polymarket/volatility${params.toString() ? '?' + params.toString() : ''}`)
      
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format from Polymarket volatility API')
      }
      
      if (!Array.isArray(response.markets)) {
        throw new Error('Markets data is not in expected format')
      }
      
      // Validate volatility data structure
      response.markets.forEach((market: any, index: number) => {
        if (!market.id || !market.question) {
          console.warn(`Market at index ${index} missing required fields:`, market)
        }
        
        // Validate volatility fields
        if (market.implied_volatility !== null && typeof market.implied_volatility !== 'number') {
          console.warn(`Market at index ${index} has invalid volatility value:`, market.implied_volatility)
        }
      })
      
      return response
    } catch (error) {
      console.error('Polymarket volatility API error:', error)
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Polymarket volatility data: ${error.message}`)
      } else {
        throw new Error('Failed to fetch Polymarket volatility data: Unknown error')
      }
    }
  },
}

// Chat API
export const chatAPI = {
  sendMessage: (data: {
    content: string
    session_id?: string
    user_id?: string
    conversation_id?: number
    parent_message_id?: number
  }) =>
    fetchAPI('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSuggestions: () => fetchAPI('/api/chat/suggestions'),
  
  // Conversation management
  getConversations: (params?: {
    user_id?: string
    use_case?: string
    search?: string
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.user_id) searchParams.append('user_id', params.user_id)
    if (params?.use_case) searchParams.append('use_case', params.use_case)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    
    return fetchAPI(`/api/chat/conversations${searchParams.toString() ? '?' + searchParams.toString() : ''}`)
  },
  
  getConversation: (id: number) => 
    fetchAPI(`/api/chat/conversations/${id}`),
  
  getConversationMessages: (id: number, limit?: number) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    return fetchAPI(`/api/chat/conversations/${id}/messages${params.toString() ? '?' + params.toString() : ''}`)
  },
  
  getConversationTree: (id: number) =>
    fetchAPI(`/api/chat/conversations/${id}/tree`),
  
  createConversation: (data: {
    session_id: string
    user_id?: string
    title?: string
    use_case?: string
    parent_message_id?: number
  }) =>
    fetchAPI('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  createConversationBranch: (conversationId: number, data: {
    parent_message_id: number
    title?: string
  }) =>
    fetchAPI(`/api/chat/conversations/${conversationId}/branch`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  updateConversation: (id: number, data: {
    title?: string
    use_case?: string
  }) =>
    fetchAPI(`/api/chat/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  deleteConversation: (id: number) =>
    fetchAPI(`/api/chat/conversations/${id}`, {
      method: 'DELETE',
    }),
  
  // Get branches for a specific message
  getMessageBranches: (messageId: number) =>
    fetchAPI(`/api/chat/messages/${messageId}/branches`),
}

// Stats API
export const statsAPI = {
  getRealtime: () => fetchAPI('/api/stats/realtime'),
}

// SQL Modules API
export const modulesAPI = {
  // Get modules with filtering
  getModules: (params?: {
    limit?: number
    offset?: number
    search?: string
    query_type?: string
    favorites_only?: boolean
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.query_type) searchParams.append('query_type', params.query_type)
    if (params?.favorites_only) searchParams.append('favorites_only', params.favorites_only.toString())
    
    return fetchAPI(`/api/modules${searchParams.toString() ? '?' + searchParams.toString() : ''}`)
  },
  
  // Get specific module
  getModule: (id: number) => fetchAPI(`/api/modules/${id}`),
  
  // Get module execution history
  getModuleExecutions: (id: number, limit?: number) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    return fetchAPI(`/api/modules/${id}/executions${params.toString() ? '?' + params.toString() : ''}`)
  },
  
  // Execute module
  executeModule: (id: number) => fetchAPI(`/api/modules/${id}/execute`, {
    method: 'POST',
  }),
  
  // Update module metadata
  updateModule: (id: number, data: {
    title?: string
    description?: string
    is_favorite?: boolean
  }) => fetchAPI(`/api/modules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // Get module statistics
  getStats: () => fetchAPI('/api/modules/stats/overview'),
}

// Data Library API
export const dataLibraryAPI = {
  // Modules
  getModules: (params?: {
    category?: string
    status?: string
    search?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.append('category', params.category)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.search) searchParams.append('search', params.search)
    
    return fetchAPI(`/api/modules${searchParams.toString() ? '?' + searchParams.toString() : ''}`)
  },
  
  getModuleDetails: (moduleId: string) => fetchAPI(`/api/modules/${moduleId}`),
  
  getModuleVersions: (moduleId: string) => fetchAPI(`/api/modules/${moduleId}/versions`),
  
  updateModuleConfig: (moduleId: string, config: any) => fetchAPI(`/api/modules/${moduleId}/config`, {
    method: 'PUT',
    body: JSON.stringify(config),
  }),
  
  validateModuleConfig: (moduleId: string, config: any) => fetchAPI(`/api/modules/${moduleId}/validate`, {
    method: 'POST',
    body: JSON.stringify(config),
  }),
  
  createModuleInstance: (data: any) => fetchAPI('/api/modules/instances', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  activateModuleInstance: (instanceId: string) => fetchAPI(`/api/modules/instances/${instanceId}/activate`, {
    method: 'POST',
  }),
  
  getModuleInstanceLogs: (instanceId: string, limit?: number) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    return fetchAPI(`/api/modules/instances/${instanceId}/logs${params.toString() ? '?' + params.toString() : ''}`)
  },
  
  // Data Catalog
  getDatasets: (params?: {
    search?: string
    source?: string
    category?: string
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append('search', params.search)
    if (params?.source) searchParams.append('source', params.source)
    if (params?.category) searchParams.append('category', params.category)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    
    return fetchAPI(`/api/data-catalog${searchParams.toString() ? '?' + searchParams.toString() : ''}`)
  },
  
  getDatasetDetails: (datasetId: string) => fetchAPI(`/api/data-catalog/${datasetId}`),
  
  getDatasetPreview: (datasetId: string, limit?: number) => {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    return fetchAPI(`/api/data-catalog/${datasetId}/preview${params.toString() ? '?' + params.toString() : ''}`)
  },
  
  // Contracts
  getContracts: (params?: {
    source?: string
    category?: string
    min_volume?: number
    search?: string
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.source) searchParams.append('source', params.source)
    if (params?.category) searchParams.append('category', params.category)
    if (params?.min_volume) searchParams.append('min_volume', params.min_volume.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.offset) searchParams.append('offset', params.offset.toString())
    
    return fetchAPI(`/api/contracts${searchParams.toString() ? '?' + searchParams.toString() : ''}`)
  },
  
  // Risk
  getPortfolioGreeks: () => fetchAPI('/api/risk/greeks'),
  
  getGreeksLimits: () => fetchAPI('/api/risk/greeks/limits'),
  
  updateGreeksLimits: (limits: any) => fetchAPI('/api/risk/greeks/limits', {
    method: 'PUT',
    body: JSON.stringify(limits),
  }),
  
  getRiskMetrics: () => fetchAPI('/api/risk/metrics'),
  
  // Bookkeeper
  getPositionsSummary: () => fetchAPI('/api/bookkeeper/positions'),
  
  getRebalancingSuggestions: () => fetchAPI('/api/bookkeeper/rebalancing'),
  
  calculateRebalancing: (constraints: any) => fetchAPI('/api/bookkeeper/rebalancing/calculate', {
    method: 'POST',
    body: JSON.stringify(constraints),
  }),
  
  executeRebalancing: (trades: any) => fetchAPI('/api/bookkeeper/rebalancing/execute', {
    method: 'POST',
    body: JSON.stringify(trades),
  }),
}