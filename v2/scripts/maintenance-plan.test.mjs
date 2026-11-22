import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {GARAGE_MAINTENANCE_PLAN,maintenanceOverview,maintenanceReminders} from '../src/lib/maintenancePlan.js'

const src=file=>readFileSync(new URL(file,import.meta.url),'utf8')
const day=86400000
const start=Date.UTC(2026,10,22,12)

test('owner has just three compact, equipment-specific recurring checklists',()=>{
 assert.deepEqual(GARAGE_MAINTENANCE_PLAN.map(p=>p.intervalDays),[7,30,90])
 assert.ok(GARAGE_MAINTENANCE_PLAN.every(p=>p.minutes<=15&&p.items.length<=4))
 const labels=GARAGE_MAINTENANCE_PLAN.flatMap(p=>p.items.map(i=>i.label)).join(' ')
 for(const equipment of ['romaskin','sykkelrulle','TRX','stong','plyoboks','benk'])assert.match(labels,new RegExp(equipment,'i'))
})

test('nothing nags during the first week; one reminder appears when weekly check is due',()=>{
 const initial=maintenanceOverview([],new Date(start).toISOString(),start)
 assert.equal(initial.due.length,0)
 assert.equal(maintenanceReminders(initial,start).length,0)
 const afterWeek=maintenanceOverview([],new Date(start).toISOString(),start+7*day)
 assert.deepEqual(afterWeek.due.map(p=>p.id),['weekly'])
 assert.equal(maintenanceReminders(afterWeek,start+7*day)[0].href,'admin-maintenance')
})

test('a receipt resets one period without producing a backlog of old checks',()=>{
 const checks=[{id:'one',period:'weekly',completed_at:new Date(start+8*day).toISOString()}]
 const state=maintenanceOverview(checks,new Date(start).toISOString(),start+14*day)
 assert.equal(state.periods[0].due,false)
 assert.equal(state.periods[0].last.id,'one')
 const later=maintenanceOverview(checks,new Date(start).toISOString(),start+31*day)
 assert.deepEqual(later.due.map(p=>p.id),['weekly','monthly'])
 assert.equal(maintenanceReminders(later,start+31*day).length,1)
})

test('outstanding equipment faults give one extra admin alert and disappear when resolved',()=>{
 const warning={id:'f1',period:'monthly',completed_at:new Date(start).toISOString(),needs_followup:true,resolved_at:null,note:'Sliten strikk'}
 const active=maintenanceOverview([warning],new Date(start).toISOString(),start+day)
 assert.equal(active.issues.length,1)
 assert.equal(maintenanceReminders(active,start+day)[0].priority,'high')
 const resolved=maintenanceOverview([{...warning,resolved_at:new Date(start+2*day).toISOString()}],new Date(start).toISOString(),start+3*day)
 assert.equal(resolved.issues.length,0)
 assert.equal(maintenanceReminders(resolved,start+3*day).length,0)
})

test('Drift has individual receipts and notifications take the admin directly to it',()=>{
 const admin=src('../src/components/Admin.jsx')
 const app=src('../src/App.jsx')
 const maintenance=src('../src/components/GarageMaintenance.jsx')
 const notification=src('../src/components/Notifications.jsx')
 assert.match(admin,/adminTab==='drift'&&<section[^]*?<GarageMaintenance profile=\{profile\}/)
 assert.match(maintenance,/garage_maintenance_log/)
 assert.match(maintenance,/Kvitter og lagre/)
 assert.match(maintenance,/Kvitter som løyst/)
 assert.match(notification,/maintenanceReminders\(maintenanceOverview/)
 assert.match(notification,/item\.virtualMaintenance/)
 assert.match(app,/href==='admin-maintenance'&&profile\.role==='admin'/)
 assert.match(src('../src/lib/helpContent.js'),/id:'garage-maintenance'/)
})

test('maintenance receipts are RLS-protected for admin and immutable after signing',()=>{
 const migration=src('../../supabase/migrations/20261122115744_garage_cleaning_maintenance.sql')
 assert.match(migration,/garage_maintenance_log FOR SELECT TO authenticated/)
 assert.match(migration,/garage_maintenance_log FOR INSERT TO authenticated/)
 assert.match(migration,/garage_maintenance_log FOR UPDATE TO authenticated/)
 assert.match(migration,/ALTER TABLE public\.garage_maintenance_log ENABLE ROW LEVEL SECURITY/)
 assert.match(migration,/completed_by = \(SELECT auth\.uid\(\)\)/)
 assert.match(migration,/CREATE TRIGGER guard_garage_maintenance_receipt_update/)
 assert.doesNotMatch(migration,/CREATE POLICY .*FOR DELETE/)
})
