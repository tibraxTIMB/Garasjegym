import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {missingPtLeadAlerts} from '../src/lib/ptNotificationSafety.js'

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')

test('no PT lead is silently hidden when its database notice is missing',()=>{
 const leads=[{id:'new-lead',status:'pending',service_title:'Spørsmål om PT',created_at:'2026-11-22T15:00:00Z'}]
 const alerts=missingPtLeadAlerts(leads,[])
 assert.equal(alerts.length,1)
 assert.equal(alerts[0].href,'pt-service-request:new-lead')
 assert.equal(alerts[0].priority,'high')
 assert.equal(alerts[0].requires_action,true)
 assert.equal(alerts[0].virtualPTLead,true)
})

test('valid open database notification suppresses duplicate fallback, but a resolved one does not',()=>{
 const lead={id:'lead-1',status:'reviewing',created_at:'2026-11-22T15:00:00Z'}
 assert.equal(missingPtLeadAlerts([lead],[{href:'pt-service-request:lead-1',status:'open'}]).length,0)
 assert.equal(missingPtLeadAlerts([lead],[{href:'pt-service-request:lead-1',status:'resolved'}]).length,1)
 assert.equal(missingPtLeadAlerts([{...lead,status:'assigned'}],[]).length,0)
})

test('PT alert opens the actionable admin queue and cannot be dismissed as handled',()=>{
 const app=read('../src/App.jsx')
 const notifications=read('../src/components/Notifications.jsx')
 const management=read('../src/components/PTManagement.jsx')
 assert.match(app,/href\.startsWith\('pt-service-request:'\)&&isStaff\(profile\)/)
 assert.match(app,/setPTStudioInitialTab\('administrasjon'\)/)
 assert.match(management,/staff\?'bestillingar':'tenester'/)
 assert.match(notifications,/!item\.href\?\.startsWith\('pt-service-request:'\)/)
 assert.match(notifications,/missingPtLeadAlerts/)
})

test('starting review records the handler required by the live PT RLS policy',()=>{
 const management=read('../src/components/PTManagement.jsx')
 assert.match(management,/\.update\(\{status:'reviewing',handled_by:profile\.id,handled_at:new Date\(\)\.toISOString\(\)\}\)/)
 assert.match(management,/\.eq\('id',row\.id\)\.eq\('status','pending'\)/)
})

test('the mobile inbox is a viewport dialog rather than a clipped header popover',()=>{
 const notifications=read('../src/components/Notifications.jsx')
 const app=read('../src/App.jsx')
 const styles=read('../src/styles/mobile/notification-center.css')
 assert.match(notifications,/createPortal\(/)
 assert.match(notifications,/document\.body\)/)
 assert.match(notifications,/role="dialog" aria-modal="true"/)
 assert.match(styles,/\.notification-panel-v2\s*\{\s*position:\s*fixed;/)
 assert.match(styles,/bottom:\s*calc\(var\(--gg-shell-nav-height/)
 assert.match(app,/has-route-back/)
 assert.match(styles,/\.topbar\.has-route-back \.mobile-brand/)
})

test('PT notifications have insert and status triggers, idempotent backfill and locked-down privileges',()=>{
 const migration=read('../supabase/migrations/20261122204937_notify_pt_service_requests_reliably.sql')
 assert.match(migration,/AFTER INSERT ON public\.pt_service_requests/)
 assert.match(migration,/AFTER UPDATE OF status ON public\.pt_service_requests/)
 assert.match(migration,/ON CONFLICT \(recipient_id, dedupe_key\)/)
 assert.match(migration,/WHERE req\.status IN \('pending', 'reviewing'\)/)
 assert.match(migration,/REVOKE ALL ON FUNCTION public\.notify_staff_pt_service_request\(\) FROM PUBLIC, anon, authenticated/)
})
