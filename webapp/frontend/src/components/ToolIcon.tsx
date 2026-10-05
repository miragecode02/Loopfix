import { Compass, FilePlus, FileText, FolderOpen, GearSix, GitDiff, MagnifyingGlass, PencilSimple, TestTube } from '@phosphor-icons/react'

const ICONS = {
  search_text: MagnifyingGlass,
  search_symbol: Compass,
  read_file: FileText,
  list_directory: FolderOpen,
  edit_file: PencilSimple,
  create_file: FilePlus,
  run_tests: TestTube,
  get_diff: GitDiff,
} as const

export default function ToolIcon({ tool }: { tool: string }) {
  const Icon = tool in ICONS ? ICONS[tool as keyof typeof ICONS] : GearSix
  return <Icon size={16} weight="regular" aria-hidden="true" />
}
