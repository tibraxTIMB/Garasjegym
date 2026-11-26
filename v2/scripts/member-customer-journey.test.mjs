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

test('the simple/advanced view control exists only on Mi side', () => {
  const home = src('../src/components/SimpleCustomerHome.jsx')
  const myPage = src('../src/components/MyPage.jsx')
  const app = src('../src/App.jsx')
  assert.doesNotMatch(home, /onAdvanced|simple-mode-toggle|Slå på avansert visning/)
  assert.match(myPage, /simple-mode-setting/)
  assert.match(myPage, /onSimpleModeChange\(!simpleMode\)/)
  assert.match(app, /onSimpleModeChange=\{changeSimpleMode\}/)
})

test('customers have one canonical plan and both PT-program and WOD launch paths', () => {
  const app = src('../src/App.jsx')
  const plan = src('../src/components/MyTraining.jsx')
  const nav = src('../src/components/AppMobileNavigation.jsx')
  assert.match(src('../src/components/SimpleCustomerHome.jsx'), /Min treningsplan/)
  assert.match(app, /onPlan=\{openMyTraining\}/)
  assert.match(app, /onLaunchProgramSession=/)
  assert.match(plan, /pt_programs/)
  assert.match(plan, /pt_program_sessions/)
  assert.match(plan, /onLaunchProgramSession/)
  assert.match(nav, /const PRIMARY_IDS = \['oversikt', 'wod', 'trening', 'timeplan', 'mi-side'\]/)
  assert.match(src('../src/components/MyPage.jsx'), /onHelpNavigate\('plan'\)/)
})

test('the home and group timetable lead to a genuine PT enquiry', () => {
  const home = src('../src/components/SimpleCustomerHome.jsx')
  const schedule = src('../src/components/ScheduleHub.jsx')
  const studio = src('../src/components/PTStudio.jsx')
  const app = src('../src/App.jsx')
  assert.match(home, /Mi PT-oversikt/)
  assert.match(home, /<strong>Gruppetimar<\/strong>/)
  assert.match(schedule, /Spør om PT/)
  assert.match(studio, /<PTInquiry profile=\{profile\}/)
  assert.match(app, /setPTStudioInitialTab\(isPTCoach\?'oversikt':'tenester'\)/)
})

test('PT enquiries work without published services and have an honest status and cancellation', () => {
  const inquiry = src('../src/components/PTInquiry.jsx')
  assert.match(inquiry, /service_id: service\?\.id \|\| null/)
  assert.match(inquiry, /Uforpliktande PT-prat/)
  assert.match(inquiry, /Dette er ikkje ei timebestilling/)
  assert.match(inquiry, /Spør om denne PT-en/)
  assert.match(inquiry, /Trekk tilbake førespurnad/)
  assert.match(inquiry, /pt_service_requests/)
})

test('Mi side updates only the user display name with a database guard', () => {
  const profile = src('../src/components/MyPage.jsx')
  const migration = src('../../supabase/migrations/20261122101026_member_profile_name_and_public_pt_coaches.sql')
  assert.match(profile, /update\(\{display_name:next\}\)\.eq\('id',profile\.id\)/)
  assert.match(profile, /onProfileUpdated\(data\.display_name\)/)
  assert.match(migration, /to_jsonb\(new\) - 'display_name' - 'updated_at'/)
  assert.match(migration, /on public\.profiles for update to authenticated/)
  assert.match(migration, /pt_coaches add column public_name/)
})

test('optional after-action entry appears only after a confirmed save and is member scoped',()=>{
 const app=src('../src/App.jsx'),training=src('../src/components/Training.jsx')
 assert.match(app,/afterActionMember===session\.user\.id/)
 assert.match(app,/setAfterActionMember\(session\.user\.id\)/)
 assert.match(app,/aria-label="Etter økta"/)
 assert.match(app,/setAfterActionMember\(null\);navigateTo\('kaffi'\)/)
 assert.match(app,/setAfterActionMember\(null\);setScheduleTab\('booking'\)/)
 assert.ok(training.indexOf('savedId=workoutId')<training.indexOf('onSaved?.({victories})'))
 assert.match(training,/onSaved\?\.\(\{victories\}\)\s+await loadAll\(\)/)
})

test('Mission Control preserves personal training routes for staff without duplicate coach entry',()=>{
 const app=src('../src/App.jsx'),home=src('../src/components/SimpleCustomerHome.jsx'),overview=src('../src/components/Overview.jsx')
 assert.match(app,/coach=\{isPTCoach\|\|isStaff\(profile\)\}/)
 assert.match(app,/<Overview key=\{session\.user\.id\}[^\n]+onPlan=\{openMyTraining\}/)
 assert.match(overview,/Min treningsplan/)
 assert.match(overview,/onFree\|\|/)
 assert.match(overview,/Kaffibar/)
 assert.doesNotMatch(home,/\{coach&&<button/)
})
