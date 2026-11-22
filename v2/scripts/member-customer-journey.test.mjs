import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveSimpleMode, displayModePreference } from '../src/lib/memberViewMode.js'

const src = file => readFileSync(new URL(file, import.meta.url), 'utf8')

test('ordinary customers start in simple mode even with old default-false rows', () => {
  assert.equal(resolveSimpleMode('member', null), true)
  assert.equal(resolveSimpleMode('member', { super_simple_mode: false }), true)
  assert.equal(resolveSimpleMode('member', { preferred_display_mode: 'advanced' }), false)
  assert.equal(resolveSimpleMode('member', { preferred_display_mode: 'simple' }), true)
  assert.equal(resolveSimpleMode('admin', { preferred_display_mode: 'simple' }), false)
  assert.equal(resolveSimpleMode('manager', null), false)
})

test('an explicit choice is written to the personal preference record', () => {
  assert.equal(displayModePreference('test-user', false).preferred_display_mode, 'advanced')
  assert.equal(displayModePreference('test-user', true).super_simple_mode, true)
})

test('customers have one canonical plan and both PT-program and WOD launch paths', () => {
  const app = src('../src/App.jsx')
  const plan = src('../src/components/MyTraining.jsx')
  const nav = src('../src/components/AppMobileNavigation.jsx')
  assert.match(app, /Min treningsplan/)
  assert.match(app, /onLaunchProgramSession=/)
  assert.match(plan, /pt_programs/)
  assert.match(plan, /pt_program_sessions/)
  assert.match(plan, /onLaunchProgramSession/)
  assert.match(nav, /item\.id !== 'mi-trening'/)
})
