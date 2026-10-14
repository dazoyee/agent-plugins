export type Turn = { seconds: number; tools: number; outputTokens: number }

export type TurnTotals = { turns: number; tools: number; outputTokens: number }

declare module 'claude-code' {
  interface PluginState {
    'turn-band': { last: Turn | null; totals: TurnTotals; isHidden: boolean }
  }
}
