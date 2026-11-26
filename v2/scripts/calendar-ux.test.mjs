import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {localCalendarDay,monthCalendarCells,weekCalendarDays} from '../src/lib/calendarView.js'
import {memberPlanCalendarEntries} from '../src/lib/ptSchedule.js'

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')

test('month view uses seven aligned weekday columns without dropping dates',()=>{
 const nov=monthCalendarCells(2026,10)
 assert.equal(nov.length,42)
 assert.equal(nov.slice(0,6).every(day=>day===null),true)
 assert.equal(nov[6].getDate(),1)
 assert.equal(nov.filter(Boolean).length,30)
 assert.equal(localCalendarDay(nov[6]),'2026-11-01')
})

test('week view starts on Monday even across a month boundary',()=>{
 assert.deepEqual(weekCalendarDays(new Date(2026,10,1)).map(localCalendarDay),[
  '2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'
 ])
})

test('database date-only values retain their local day',()=>{
 assert.equal(localCalendarDay('2026-11-21'),'2026-11-21')
 assert.equal(localCalendarDay(new Date(2026,10,21,23,30)),'2026-11-21')
 assert.equal(localCalendarDay('broken'), '')
})

test('mobile navigation centres a distinct ØKT action and exposes timeplan for staff',()=>{
 const nav=read('../src/components/AppMobileNavigation.jsx')
 const app=read('../src/App.jsx')
 assert.match(nav,/\['oversikt', 'wod', 'trening', 'timeplan', 'mi-side'\]/)
 assert.match(nav,/id === 'trening'\) return 'ØKT'/)
 assert.match(nav,/app-mobile-nav-item--start/)
 assert.match(app,/const staffNavigation=sections\.filter\(item=>item\.id!=='pt-info'\)/)
 assert.match(app,/if\(id==='timeplan'\)setScheduleTab\('mine'\)/)
 assert.doesNotMatch(app,/Bygd for å <em>prestera/)
})

test('timeplan has a true calendar grid and My Page no longer substitutes a date list on phones',()=>{
 const personal=read('../src/components/PersonalCalendar.jsx')
 const hub=read('../src/components/ScheduleHub.jsx')
 const styles=read('../src/styles/mobile/calendar-unified.css')
 assert.match(personal,/monthCalendarCells\(cursor\.getFullYear\(\),cursor\.getMonth\(\)\)/)
 assert.match(personal,/\['month','Månad'\],\['week','Veke'\],\['day','Dag'\]/)
 assert.match(personal,/aria-current=\{key===today\?'date':undefined\}/)
 assert.match(hub,/activeTab==='mine'\?<PersonalCalendar/)
 assert.match(styles,/\.my-page \.history-calendar \.calendar-grid \{ display:block !important;/)
 assert.match(styles,/\.my-page \.history-mobile-agenda \{ display:none !important;/)
})

test('member calendar uses shared schedule semantics and preserves assignment identity on launch',()=>{
 const personal=read('../src/components/PersonalCalendar.jsx')
 const hub=read('../src/components/ScheduleHub.jsx')
 const app=read('../src/App.jsx')
 assert.match(personal,/calendarEntries\(\{assignments:assignments\.data/)
 assert.match(personal,/onOpenAssignment\(event\.wodId,event\.assignmentId\)/)
 assert.doesNotMatch(personal,/\.gte\('due_date',lowerDay\)/)
 assert.match(hub,/onOpenAssignment\?\.\(wodId,assignmentId\)/)
 assert.match(app,/<ScheduleHub[^\n]*onOpenAssignment=\{\(wodId,assignmentId\)=>\{setLaunchWodId\(wodId\);setLaunchAssignmentId\(assignmentId\)/)
})

test('member calendar preserves program sequence locks across months and same-WOD repetitions',()=>{
 const program={id:'p',status:'active',start_date:'2026-11-30',flow_unlock_mode:'sequence'}
 const first={id:'first',program_id:'p',week_no:1,day_no:1,sequence_no:1,title:'WOD',wod_id:'w',status:'planned',session_kind:'training',workout_snapshot:{schedule_time:'17:00'}}
 const second={...first,id:'second',week_no:6,day_no:2,sequence_no:2,workout_snapshot:{schedule_time:'18:15'}}
 const other={...first,id:'other',program_id:'other'}
 const archive={...first,id:'old',archived_at:'2026-11-25'}
 const events=memberPlanCalendarEntries(program,[second,first,other,archive],'2026-11-30')
 assert.deepEqual(events.map(e=>[e.key,e.date,e.time,e.canStart]),[['plan:first','2026-11-30','17:00',true],['plan:second','2027-01-05','18:15',false]])
 assert.equal(memberPlanCalendarEntries(program,[{...first,status:'completed',flow_requires_approval:true},second],'2026-12-01')[1].canStart,false)
 assert.equal(memberPlanCalendarEntries(program,[{...first,status:'completed',flow_requires_approval:true,flow_approved:true},second],'2026-12-01')[1].canStart,true)
 assert.equal(memberPlanCalendarEntries({...program,status:'paused'},[first],'2026-11-30').length,0)
 assert.equal(memberPlanCalendarEntries({...program,flow_unlock_mode:'date'},[{...first,scheduled_date:'2026-12-03'}],'2026-11-30')[0].canStart,false)
})
test('calendar program launch retains session identity and uses server start authorization',()=>{
 const personal=read('../src/components/PersonalCalendar.jsx')
 const hub=read('../src/components/ScheduleHub.jsx')
 const app=read('../src/App.jsx')
 assert.match(personal,/memberPlanCalendarEntries\(program,programSessions\.data/)
 assert.match(personal,/supabase\.rpc\('pt_flow_can_start',\{p_session_id:event\.programSession\.id\}\)/)
 assert.match(personal,/if\(launchError\|\|data!==true\)/)
 assert.match(hub,/onOpenProgramSession=\{onOpenProgramSession\}/)
 assert.match(app,/<ScheduleHub[^\n]*onOpenProgramSession=\{session=>\{setLaunchWodId\(session\.wod_id\|\|null\);setLaunchAssignmentId\(null\);setLaunchProgramSessionId\(session\.id\)/)
})
