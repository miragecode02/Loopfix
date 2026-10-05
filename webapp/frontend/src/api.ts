export interface RunSummary {
  id: number
  started_at: number
  finished_at: number
  model: string | null
  task_count: number
  resolved_count: number
  errored_count: number
  unresolved_count: number
}

export interface TaskResult {
  id: number
  task_name: string
  resolved: number
  test_iterations: number | null
  tool_calls: number | null
  duration_seconds: number | null
  log_path: string | null
  log_id: string | null
  error: string | null
}

export interface RunDetail {
  run: RunSummary
  tasks: TaskResult[]
}

export interface ToolCall {
  tool: string
  input: unknown
  reason?: string
  output: unknown
  iteration?: number
}

export interface TaskLog {
  task_id: string
  mode: string
  repo_root: string
  task_description: string
  model: string | null
  max_iterations: number
  started_at: number
  finished_at: number
  duration_seconds: number
  resolved: boolean | null
  test_iterations: number | null
  report: string | null
  call_log: ToolCall[]
  diff?: string
  benchmark_task?: string
  error?: string | null
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    let detail = ''
    try {
      const body: unknown = await res.json()
      if (typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string') {
        detail = `: ${body.detail}`
      }
    } catch {
      // Keep the HTTP status as a useful fallback for empty or non-JSON responses.
    }
    throw new Error(`${res.status} ${res.statusText}${detail}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  listRuns: () => getJSON<RunSummary[]>('/api/runs'),
  getRun: (id: number) => getJSON<RunDetail>(`/api/runs/${id}`),
  getLog: (logId: string) => getJSON<TaskLog>(`/api/logs/${encodeURIComponent(logId)}`),
}
