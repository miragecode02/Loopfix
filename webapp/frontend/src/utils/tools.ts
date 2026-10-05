/**
 * Human-readable names and one-line explanations for each tool the agent
 * can call. The task log stores the raw tool id (e.g. `search_text`); this
 * maps it to something a reader who has never seen the codebase can follow.
 */
export interface ToolMeta {
  label: string
  description: string
}

const TOOL_META: Record<string, ToolMeta> = {
  search_text: { label: 'Search text', description: 'Searches the repository for a text pattern (ripgrep).' },
  search_symbol: { label: 'Find symbol', description: 'Looks up where a function or class is defined.' },
  read_file: { label: 'Read file', description: 'Reads a file, or a slice of one, from the repository.' },
  list_directory: { label: 'List directory', description: 'Lists the files and folders in a directory.' },
  edit_file: { label: 'Edit file', description: 'Replaces an exact snippet of a file with new code.' },
  create_file: { label: 'Create file', description: 'Writes a new file into the repository.' },
  run_tests: { label: 'Run tests', description: 'Runs the test suite inside the isolated Docker sandbox.' },
  get_diff: { label: 'Get diff', description: 'Shows the current patch — everything changed so far.' },
}

export function toolMeta(tool: string): ToolMeta {
  return TOOL_META[tool] ?? { label: tool, description: 'A tool the agent invoked during this task.' }
}
