import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const admin = source('../src/components/Admin.jsx')
const management = source('../src/components/PTManagement.jsx')
const inquiry = source('../src/components/PTInquiry.jsx')
const studio = source('../src/components/PTStudio.jsx')
const records = source('../src/components/ExercisePRCenter.jsx')

test('drift opens PT enquiries directly and hides occasional tasks behind a choice', () => {
  assert.match(admin, /onOpenPTAdmin/)
  assert.match(admin, /PT og førespurnader/)
  assert.match(admin, /Reinhald og vedlikehald/)
  assert.match(admin, /<details className="admin-advanced-tools admin-drift-details"/)
})

test('member can send one non-binding PT enquiry and follow its status', () => {
  assert.match(inquiry, /Uforpliktande førespurnad/)
  assert.match(inquiry, /activeRequest \? <div className="pt-enquiry-existing"/)
  assert.match(inquiry, /setTab\('mine'\)/)
  assert.match(inquiry, /\.from\('pt_service_requests'\)\.insert/)
  assert.match(inquiry, /ingen time er bestilt/)
})

test('PT request needs explicit confirmation rather than submit-on-select', () => {
  assert.match(management, /selectedCoachByRequest/)
  assert.match(management, /Stadfest tildeling/)
  assert.match(management, /onClick=\{\(\)=>handleRequest\(r,coachId\)\}/)
  assert.doesNotMatch(management, /onChange=\{e=>\{if\(e\.target\.value\)handleRequest/)
  assert.match(management, /\.rpc\('assign_pt_coach'/)
})

test('PT leads remain in the actionable queue until resolved and preserve history', () => {
  assert.match(management, /const pending=requests\.filter\(r=>r\.status==='pending'\|\|r\.status==='reviewing'\)/)
  assert.match(management, /showRequestHistory/)
  assert.match(management, /focusServiceRequest\?\.id/)
  assert.match(management, /setShowRequestHistory\(true\)/)
})

test('coach workspace shows assigned clients only and fewer primary tabs', () => {
  assert.match(studio, /if\(coachMode&&!staff\)/)
  assert.match(studio, /\.from\('pt_client_assignments'\)\.select\('member_id'\)/)
  assert.match(studio, /clients=clients\.in\('id',assigned\.map\(row=>row\.member_id\)\)/)
  assert.match(studio, /pt2-coach-primary-tabs/)
  assert.match(studio, /Fleire PT-verktøy/)
})

test('admin can open a customer for a real time conversation after assignment', () => {
  assert.match(management, /onOpenClient\(r\.member_id,'pt-timar'\)/)
  assert.match(studio, /onOpenClient=\{\(id,section='oversikt'\)=>/)
  assert.match(studio, /tab==='pt-timar'&&<PT/)
})

test('PR center starts with categories and limits exercise results', () => {
  assert.match(records, /useState\(null\)/)
  assert.match(records, /exercise-pr-category-grid/)
  assert.match(records, /const hasExerciseSelection = Boolean\(query\|\|recordCategory\)/)
  assert.match(records, /visibleExercises\.slice\(0,showAll \? visibleExercises\.length : query \? 16 : 10\)/)
  assert.match(records, /exercise-pr-manual-categories/)
})

test('deadlift remains available as a standard PR lift', () => {
  const directory = source('../src/lib/prDirectory.js')
  assert.match(directory, /name: 'Deadlift'/)
})


test('PT status notification opens the member request history rather than PT messages', () => {
  const app = source('../src/App.jsx')
  assert.match(app, /item\.title==='Svar på PT-førespurnaden'\?'forespurnader':'meldingar'/)
  assert.match(studio, /initialTab=\{tab==='forespurnader'\?'mine':'start'\}/)
  assert.match(inquiry, /initialTab === 'mine' \? 'mine' : 'start'/)
})

test('PT enquiry owner flow distinguishes received from completed and exposes the existing coach register', () => {
  assert.match(management, /Dette avsluttar ikkje førespurnaden/)
  assert.match(management, /Saka er motteken, men står framleis open/)
  assert.match(management, /Ingen aktive PT-ar er registrerte/)
  assert.match(management, /onClick=\{\(\)=>setTab\('trenarar'\)\}/)
})


test('PT coach chooses customer explicitly and intake is reachable', () => {
  assert.doesNotMatch(studio, /results\[0\]\.data\[0\]\.id/)
  assert.match(studio, /onClick=\{\(\)=>setShowIntake\(true\)\}/)
  assert.match(studio, /Opprett første programmal/)
  assert.match(management, /async function declineRequest\(row\)/)
  assert.match(management, /Førespurnaden er avslått og avslutta/)
})


test('first PT enquiries have an explicit decline and program follow-up', () => {
  assert.match(management,/async function declineRequest\(row\)/)
  assert.match(management,/Avslå førespurnad/)
  assert.match(management,/onOpenClient\(r\.member_id,'plan'\)/)
  assert.match(management,/p_service_request_id:requests\.find/)
})

test('selected PT client has directly accessible existing onboarding and scoped status', () => {
 const app=source('../src/App.jsx')
 const notifs=source('../src/components/Notifications.jsx')
 const css=source('../src/components/pt-studio-refine.css')
 const sql=source('../supabase/migrations/20261123204500_pt_intake_request_to_existing_form.sql')
 assert.match(studio,/DU JOBBAR MED/)
 assert.match(studio,/Send oppstartskartlegging/)
 assert.match(studio,/supabase\.rpc\('request_pt_intake'/)
 assert.match(studio,/get_pt_intake_request_state/)
 assert.match(studio,/Kartleggingshistorikk for/)
 assert.match(studio,/setProgramTargetClientId\(''\)/)
 assert.match(css,/pt2-customer-quickstart/)
 assert.match(app,/href==='pt-intake-start'/)
 assert.match(studio,/initialTab==='ny-kartlegging'\?'tenester'/)
 assert.match(notifs,/Svar på oppstartskartlegging/)
 assert.match(sql,/app_private\.is_pt_coach_for_member/)
 assert.match(sql,/public\.pt_intakes/)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.request_pt_intake\(uuid\) FROM PUBLIC,anon/)
})


test('PT client follow-up avoids empty template dead ends and refreshes onboarding answers',()=>{
 const studio=source('../src/components/PTStudio.jsx')
 assert.match(studio,/if\(activeProgram\|\|!templates\.length\)\{setTab\('plan'\);return\}/)
 assert.match(studio,/Opprett første programmal/)
 assert.match(studio,/Oppdater kundestatus/)
 assert.match(studio,/onClick=\{\(\)=>load\(\)\}/)
 assert.match(studio,/initialTab==='ny-kartlegging'\?'Send svar til PT'/)
 assert.match(studio,/Kartlegging gjennomgått/)
})


test('PT client work opens in a single tap from home or the owner drift area', () => {
 const app=source('../src/App.jsx')
 const overview=source('../src/components/Overview.jsx')
 const admin=source('../src/components/Admin.jsx')
 assert.match(app,/function openPTClientWorkspace\(\)/)
 assert.match(app,/onOpenPTClients=\{openPTClientWorkspace\}/)
 assert.match(overview,/PT Studio – arbeid med kundar/)
 assert.match(admin,/PT-register og førespurnader/)
 assert.match(admin,/onOpenPTClients/)
})
test('PT sees the exact onboarding questions and a named recipient before sending', () => {
 assert.match(studio,/INTAKE_PREVIEW_QUESTIONS/)
 assert.match(studio,/KONTROLLER FØR UTSENDING/)
 assert.match(studio,/Ingen melding er sendt enno/)
 assert.match(studio,/Mottakar: \{intakePreview\.name\}/)
 assert.match(studio,/onClick=\{previewIntroIntake\}/)
 assert.match(studio,/onClick=\{sendIntroIntake\}/)
 assert.match(studio,/recipient\.id!==clientId/)
 assert.match(studio,/intakePreview\.id!==clientId/)
 assert.doesNotMatch(studio,/window\.confirm\('Send oppstartskartlegging/)
 for(const label of ['Kva ønskjer du å oppnå?','Treningsnivå','Kvifor ønskjer du PT?','Kva forventar du av PT-en?'])assert.ok(studio.includes(label))
})
test('PT uses Garasjekadett rank from actual workout count, not a manual text field', () => {
 assert.match(studio,/rankForCount\(/)
 assert.match(studio,/get_member_workout_leaderboard/)
 assert.match(studio,/TRENINGSRANG/)
 assert.doesNotMatch(studio,/saveRank\(/)
 assert.doesNotMatch(studio,/member_rank/)
})
