export type TaskStatus = 'resolved' | 'unresolved' | 'errored' | 'unknown'

export function statusOf(task: { resolved: number | boolean | null; error?: string | null }): TaskStatus {
  if (task.error) return 'errored'
  if (task.resolved === null) return 'unknown'
  return task.resolved === true || (typeof task.resolved === 'number' && task.resolved > 0) ? 'resolved' : 'unresolved'
}
