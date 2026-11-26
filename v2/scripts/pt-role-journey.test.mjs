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
  assert.match(admin, /PT-register og førespurnader/)
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
  assert.match(studio, /\['pt-timar','dialog','notat'\]\.includes\(tab\)&&<PT/)
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
 assert.match(studio,/AKTIV PT-KUNDE/)
 assert.match(studio,/Sjå og send oppstartsskjema/)
 assert.match(studio,/supabase\.rpc\('request_pt_intake'/)
 assert.match(studio,/get_pt_intake_request_state/)
 assert.match(studio,/Kartleggingshistorikk for/)
 assert.match(studio,/setProgramTargetClientId\(''\)/)
 assert.match(source('../src/components/pt-client-followup.css'),/pt2-customer-rank-pill/)
 assert.match(app,/href==='pt-intake-start'/)
 assert.match(studio,/initialTab==='ny-kartlegging'\?'tenester'/)
 assert.match(notifs,/Svar på oppstartskartlegging/)
 assert.match(sql,/app_private\.is_pt_coach_for_member/)
 assert.match(sql,/public\.pt_intakes/)
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.request_pt_intake\(uuid\) FROM PUBLIC,anon/)
})


test('PT client follow-up avoids empty template dead ends and refreshes onboarding answers',()=>{
 const studio=source('../src/components/PTStudio.jsx')
 assert.match(studio,/pt2-plan-template-details/)
 assert.match(studio,/Opprett første programmal/)
 assert.match(studio,/Oppdater svar/)
 assert.match(studio,/onClick=\{\(\)=>load\(\)\}/)
 assert.match(studio,/initialTab==='ny-kartlegging'\?'Send svar til PT'/)
 assert.match(studio,/i.status==='reviewed'\?'Gjennomgått'/)
})


test('PT clients are directly available from Drift without cluttering Home', () => {
 const app=source('../src/App.jsx')
 const overview=source('../src/components/Overview.jsx')
 const admin=source('../src/components/Admin.jsx')
 assert.match(app,/function openPTClientWorkspace\(\)/)
 assert.match(app,/onOpenPTClients=\{openPTClientWorkspace\}/)
 assert.doesNotMatch(overview,/overview-pt-entry/)
 assert.doesNotMatch(overview,/PT Studio – arbeid med kundar/)
 assert.match(admin,/PT-kundar – dagleg oppfølging/)
 assert.match(admin,/PT-register og førespurnader/)
 assert.match(admin,/onOpenPTClients/)
})
test('four compact Drift statistics open the existing corresponding screens', () => {
 const app=source('../src/App.jsx')
 const admin=source('../src/components/Admin.jsx')
 const css=source('../src/components/admin-advanced.css')
 assert.match(admin,/admin-stats-compact/)
 assert.match(admin,/setMemberFilter\('all'\);setAdminTab\('medlemmer'\)/)
 assert.match(admin,/setMemberFilter\('active'\);setAdminTab\('medlemmer'\)/)
 assert.match(admin,/onClick=\{onOpenWodLibrary\}/)
 assert.match(admin,/onClick=\{\(\)=>setAdminTab\('ovingar'\)\}/)
 assert.match(app,/onOpenWodLibrary=\{\(\)=>\{setFocusWodId\(null\);navigateTo\('wod'\)\}\}/)
 assert.match(css,/admin-stats-compact/)
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
 assert.match(studio,/pt2-customer-rank-pill/)
 assert.doesNotMatch(studio,/saveRank\(/)
 assert.doesNotMatch(studio,/member_rank/)
})


test('PT chooses a customer before work, and previously sent intake is always inspectable without resending',()=>{
 assert.match(studio,/setShowCustomerPicker\(true\)/)
 assert.match(studio,/Sjå utsendt skjema/)
 assert.match(studio,/readOnly:intakeRequestState==='pending'/)
 assert.match(studio,/!intakePreview\.readOnly&&<button/)
 assert.match(studio,/recipient\.readOnly\|\|intakeRequestState==='pending'/)
})

test('new PT follow-up scopes WOD status to the selected client without private workout history',()=>{
 const followup=source('../src/components/PTClientWods.jsx')
 const app=source('../src/App.jsx')
 const css=source('../src/components/pt-client-followup.css')
 assert.match(followup,/\.from\('pt_wod_assignments'\)/)
 assert.match(followup,/\.eq\('member_id',clientId\)/)
 assert.match(followup,/setAssignments\(\[\]\)/)
 assert.doesNotMatch(followup,/\.from\('workout_logs'\)/)
 assert.match(followup,/workout_log_id/)
 assert.match(followup,/statusLabel\(row\.status\)/)
 assert.match(followup,/completedStatus\(session\.status\)\?'Gjennomført'/)
 assert.match(followup,/assignedClientId=\{clientId\}/)
 assert.match(studio,/PTClientWods clientId=\{clientId\}/)
 assert.match(studio,/\['wodar','WOD-ar \/ resultat'\]/)
 assert.match(studio,/PTScheduleDialog key=\{assignRequest.id\} clientId=\{clientId\}/)
 assert.match(studio,/assignRequest\?\.clientId===clientId/)
 assert.match(studio,/\.eq\('member_id',clientId\)/)
 assert.match(studio,/selectedRank\.title/)
 assert.match(studio,/selectedRank\.stars/)
 assert.match(css,/pt2-coach-primary-tabs\{display:flex/)
 assert.match(app,/label: 'PT Studio'/)
})

test('PT daily completion is scoped to the active client program',()=>{const s=readFileSync(new URL('../src/components/PTStudio.jsx',import.meta.url),'utf8');assert.ok(s.includes('markClientSessionComplete'));assert.ok(s.includes('activeProgram.client_id!==clientId'));assert.ok(s.includes("eq('program_id',activeProgram.id)"));assert.ok(s.includes('Marker utført'));assert.ok(s.includes('PT-arbeidsflate'))})

test('PT plan default is follow-up; equivalent evidence preserves original result',()=>{const s=source('../src/components/PTStudio.jsx');assert.ok(s.includes('editPlan,setEditPlan'));assert.ok(s.includes('pt-plan-picker-modal'));assert.ok(s.includes('eq(\'member_id\',clientId)'));assert.ok(s.includes('verified.workout_log_id!==a.workout_log_id'));assert.ok(s.includes('pt_equivalent:evidence'));assert.ok(s.includes('Rett gjennomføring'));assert.ok(s.includes('session.status===\'completed\'||session.workout_log_id'));assert.ok(!s.includes('wod_id:wod?.id||null,title:wod?.name||session.title'))})
