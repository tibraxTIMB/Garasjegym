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
