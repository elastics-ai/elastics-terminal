export interface DatasetFeatures {
  btc: boolean
  eth: boolean
  bnb: boolean
  sol: boolean
}

export interface IssueCount {
  critical: number
  warning: number
  info: number
}

export interface ElasticsDataset {
  id: number
  name: string
  provider: string
  description: string
  category: string
  schema: string
  publisher: string
  region: string
  history: string
  products: string
  last_update?: string
  status: 'active' | 'inactive' | 'pending' | 'error'
  features: DatasetFeatures
  issues?: IssueCount
  highlight?: boolean
}

export interface ElasticsMajor {
  id: number
  name: string
  provider: string
  description: string
  products: string
  status: string
  since: string
  features: DatasetFeatures
}

export interface ElasticsStats {
  total_datasets: number
  active_datasets: number
  total_products: number
  issues: IssueCount
  last_updated?: string
}

export interface ElasticsResponse {
  datasets: ElasticsDataset[]
  majors: ElasticsMajor[]
  stats: ElasticsStats
  filters?: any
}