import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Turn, TurnTotals } from '../types'

const SLOW_TURN_SECONDS = 120

const last = atom({ plugin: 'turn-band', key: 'last' } as const, null)
const totals = atom({ plugin: 'turn-band', key: 'totals' } as const, { turns: 0, tools: 0, outputTokens: 0 })
const isHidden = atom({ plugin: 'turn-band', key: 'isHidden' } as const, false)

const formatTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

export const register: Register = on => {
  let tools = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'turn-band',
      description: 'プロンプト上のターン情報の表示を切り替える',
    })

    return next(e)
  })

  on('command.run', { command: 'turn-band' }, async $ => {
    const hidden = await update($, isHidden, value => !value)

    return { text: hidden ? 'turn-band を隠しました' : 'turn-band を表示しました' }
  })

  on('prompt.submit', ($, e, next) => {
    tools = 0

    return next(e)
  })

  on('tool.call', ($, e, next) => {
    tools += 1

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    // サブエージェントのターンは数えない
    if (e.agentId === undefined) {
      const turn: Turn = {
        seconds: Math.round(e.durationMs / 1000),
        tools,
        outputTokens: e.usage?.output_tokens ?? 0,
      }
      await update($, last, () => turn)
      await update(
        $,
        totals,
        (sum): TurnTotals => ({
          turns: sum.turns + 1,
          tools: sum.tools + turn.tools,
          outputTokens: sum.outputTokens + turn.outputTokens,
        }),
      )

      if (turn.seconds > SLOW_TURN_SECONDS) {
        $.ui.toast(`このターンは ${turn.seconds}s かかりました`)
      }
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const turn = await read($, last)

    if (e.props.hasSurvey || turn === null || (await read($, isHidden))) {
      return next(e)
    }

    const sum = await read($, totals)
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text dimColor>
          前回 {turn.seconds}s · ツール {turn.tools} 回 · 出力 {formatTokens(turn.outputTokens)} tok ｜ 累計{' '}
          {sum.turns} ターン · ツール {sum.tools} 回 · 出力 {formatTokens(sum.outputTokens)} tok{' '}
        </Text>
        <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
