export interface ApiRequest {
  method: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

export interface ApiResponse<T = unknown> {
  status: number
  headers?: Record<string, string>
  body: T
}
