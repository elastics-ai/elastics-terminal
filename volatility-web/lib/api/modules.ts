import { API_BASE_URL } from '../config'

export interface Module {
  id: string
  type: 'Data Source' | 'Function' | 'Risk' | 'Strategy' | 'Execution' | 'Datasource'
  name: string
  description: string
  version: string
  status: 'Active' | 'Inactive'
  tags: string[]
  icon?: string
  created_at?: string
  updated_at?: string
}

export interface ModuleStats {
  module_id: string
  execution_count: number
  success_count: number
  failure_count: number
  last_execution?: string
  average_execution_time?: number
  last_error?: string
}

export interface ModuleResponse {
  module: Module
  stats?: ModuleStats
}

export interface ModulesListResponse {
  modules: Module[]
  total: number
  page: number
  per_page: number
}

export interface ModuleCreateRequest {
  type: Module['type']
  name: string
  description: string
  version?: string
  tags?: string[]
  icon?: string
}

export interface ModuleUpdateRequest {
  name?: string
  description?: string
  version?: string
  status?: Module['status']
  tags?: string[]
  icon?: string
}

class ModulesAPI {
  private baseUrl = `${API_BASE_URL}/api/system-modules`

  async getModules(params?: {
    module_type?: Module['type']
    status?: Module['status']
    search?: string
    page?: number
    per_page?: number
  }): Promise<ModulesListResponse> {
    const searchParams = new URLSearchParams()
    
    if (params?.module_type) searchParams.append('module_type', params.module_type)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString())
    
    const response = await fetch(`${this.baseUrl}?${searchParams}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch modules: ${response.statusText}`)
    }
    return response.json()
  }

  async getModule(id: string): Promise<ModuleResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch module: ${response.statusText}`)
    }
    return response.json()
  }

  async createModule(data: ModuleCreateRequest): Promise<ModuleResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`Failed to create module: ${response.statusText}`)
    }
    return response.json()
  }

  async updateModule(id: string, data: ModuleUpdateRequest): Promise<ModuleResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`Failed to update module: ${response.statusText}`)
    }
    return response.json()
  }

  async deleteModule(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`Failed to delete module: ${response.statusText}`)
    }
    return response.json()
  }

  async toggleModuleStatus(id: string): Promise<ModuleResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/toggle-status`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error(`Failed to toggle module status: ${response.statusText}`)
    }
    return response.json()
  }
}

export const modulesAPI = new ModulesAPI()