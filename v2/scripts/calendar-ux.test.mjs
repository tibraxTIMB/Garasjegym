import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {localCalendarDay,monthCalendarCells,weekCalendarDays} from '../src/lib/calendarView.js'

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
