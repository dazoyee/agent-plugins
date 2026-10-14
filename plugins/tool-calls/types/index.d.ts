export type ToolCallStatus = 'run' | 'ok' | 'err' | 'deny'

export type ToolCall = {
  id: string
  tool: string
  label: string
  result: string[]
  status: ToolCallStatus
  startedAt: number
  ms: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'tool-calls': { calls: ToolCall[]; expanded: string | null }
  }
}
