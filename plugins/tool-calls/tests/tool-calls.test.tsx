import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  component: 'Pane',
  requestId: 'tool-calls',
  props: {
    title: 'Tool calls',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
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

// ツールの代役。text はエンジンが付ける「モデルが読む結果」に相当する
const answer = (text: string) => ({ result: { stdout: text, stderr: '', interrupted: false }, text })

test('/tool-calls opens the pane, then closes it', async ($, on) => {
  // ペイン管理の代役: 開いているペインを覚えておく。$ の呼び出しへの答えは { value } で返す
  const open = new Set<string>()
  on('ui.open', (_$, e) => (open.add(e.id), { value: { isPlaced: true } }))
  on('ui.close', (_$, e) => (open.delete(e.id), { value: undefined }))
  on('ui.panes', () => ({
    value: [...open].map(id => ({ id, title: id, isShown: true, isFocused: false, isPlaced: true })),
  }))

  expect((await $.command.run(run('tool-calls'))).text).toContain('開きました')
  expect(open.has('tool-calls')).toBe(true)
  expect((await $.command.run(run('tool-calls'))).text).toContain('閉じました')
  expect(open.size).toBe(0)
})

test('a call shows as done, a refused one as denied, on every surface', async ($, on) => {
  mock.clock(on)
  on('tool.call', { tool: 'Bash' }, (_$, e) => (e.command.startsWith('rm') ? { deny: 'no' } : answer('')))

  await $.tool.call({ tool: 'Bash', command: 'ls -la', tool_use_id: 'ls' })
  await $.tool.call({ tool: 'Bash', command: 'rm x', tool_use_id: 'rm' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'tool-calls', surface, ...PANE })
    expect((await ui.find({ key: 'row:ls' }))?.text).toMatch(/✓ Bash .*ls -la/)
    expect((await ui.find({ key: 'row:rm' }))?.text).toMatch(/⊘ Bash .*rm x/)
    await ui.unmount()
  }
})

test('pressing a row expands its full input and result head', async ($, on) => {
  mock.clock(on)
  on('tool.call', { tool: 'Bash' }, () => answer('first line\nsecond line'))
  await $.tool.call({ tool: 'Bash', command: 'echo hi', tool_use_id: 'call-1' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'tool-calls', surface, ...PANE })
    expect(await ui.find({ type: 'Text', text: /second line/ })).toBeUndefined()

    await ui.press({ key: 'row:call-1' })
    expect(await ui.find({ type: 'Text', text: /second line/ })).toBeDefined()

    await ui.press({ key: 'row:call-1' })
    expect(await ui.find({ type: 'Text', text: /second line/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('a long input is cut to the pane width', async ($, on) => {
  mock.clock(on)
  on('tool.call', { tool: 'Bash' }, () => answer(''))
  await $.tool.call({ tool: 'Bash', command: `echo ${'x'.repeat(200)}`, tool_use_id: 'long' })

  const ui = await $.ui.mount({ plugin: 'tool-calls', surface: 'terminal', ...PANE })
  const row = await ui.find({ key: 'row:long' })
  expect(row?.text).toMatch(/echo x+…$/)
  expect(row?.text.length ?? Infinity).toBeLessThanOrEqual(PANE.props.bodyColumns)
  await ui.unmount()
})

test('Clear empties the list', async ($, on) => {
  mock.clock(on)
  on('tool.call', () => answer(''))
  await $.tool.call({ tool: 'Bash', command: 'pwd' })

  const ui = await $.ui.mount({ plugin: 'tool-calls', surface: 'terminal', ...PANE })
  await ui.press({ key: 'clear' })
  expect(await ui.find({ type: 'Text', text: /No tool calls yet/ })).toBeDefined()
  await ui.unmount()
})
