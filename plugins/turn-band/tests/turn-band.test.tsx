import { expect, test } from 'claude-code/testing'

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 115,
    scroll: { offset: 0, bodyRows: 9 },
    view: {},
  },
} as const

// 人がプロンプトから打ったときと同じ入力
const run = (command: string) =>
  ({
    command,
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 120 },
  }) as const

const turn = (durationMs: number, extra: { agentId?: string } = {}) =>
  ({
    answer: 'ok',
    durationMs,
    isAborted: false,
    turnId: `t-${durationMs}`,
    reason: 'answer',
    usage: {
      model: 'm',
      input_tokens: 0,
      output_tokens: 1500,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
    ...extra,
  }) as const

test('/turn-band toggles visibility', async $ => {
  expect((await $.command.run(run('turn-band'))).text).toContain('隠しました')
  expect((await $.command.run(run('turn-band'))).text).toContain('表示しました')
})

test('the band appears after a turn, adds up totals and hides on press', async ($, on) => {
  // エンジン本体の代役: プラグインが next(e) したときの描画と turn.complete の応答
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box key="engine" />
  })
  on('turn.complete', () => ({ text: '' }))

  const before = await $.ui.mount({ plugin: 'turn-band', surface: 'terminal', ...BAND })
  expect(await before.find({ type: 'Text', text: /前回/ })).toBeUndefined()
  await before.unmount()

  await $.turn.complete(turn(12_000))
  await $.turn.complete(turn(3_000))
  await $.turn.complete(turn(99_000, { agentId: 'sub-1' }))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'turn-band', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /前回 3s/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /累計 2 ターン .* 出力 3\.0k tok/ })).toBeDefined()

    await ui.press({ key: 'hide' })
    expect(await ui.find({ type: 'Text', text: /前回/ })).toBeUndefined()

    await $.command.run(run('turn-band'))
    await ui.unmount()
  }
})
