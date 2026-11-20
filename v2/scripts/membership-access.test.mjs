import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canManageMemberAccess,
  getMembershipGate,
  hasApprovedActiveMembership,
  isStaff,
} from '../src/lib/membershipAccess.js'

const admin = { id:'admin-1', role:'admin', active:true, membership_status:'approved' }
const manager = { id:'manager-1', role:'manager', active:true, membership_status:'approved' }
const member = { id:'member-1', role:'member', active:true, membership_status:'approved' }

test('berre aktive og godkjende profilar har medlemsadgang', () => {
  assert.equal(hasApprovedActiveMembership(member), true)
  assert.equal(hasApprovedActiveMembership({ ...member, membership_status:'pending' }), false)
  assert.equal(hasApprovedActiveMembership({ ...member, membership_status:'rejected' }), false)
  assert.equal(hasApprovedActiveMembership({ ...member, membership_status:null }), false)
  assert.equal(hasApprovedActiveMembership({ ...member, active:false }), false)
  assert.equal(hasApprovedActiveMembership(null), false)
})

test('staff krev både aktiv konto og godkjent medlemskap', () => {
  assert.equal(isStaff(admin), true)
  assert.equal(isStaff(manager), true)
  assert.equal(isStaff(member), false)
  assert.equal(isStaff({ ...admin, membership_status:'pending' }), false)
  assert.equal(isStaff({ ...admin, active:false }), false)
  assert.equal(isStaff({ ...admin, membership_status:undefined }), false)
})

test('app-gate stenger avviste, inaktive og ukjende statusar', () => {
  assert.equal(getMembershipGate(admin), 'approved')
  assert.equal(getMembershipGate({ ...member, membership_status:'pending' }), 'pending')
  assert.equal(getMembershipGate({ ...member, membership_status:'rejected' }), 'denied')
  assert.equal(getMembershipGate({ ...member, active:false }), 'denied')
  assert.equal(getMembershipGate({ ...member, membership_status:null }), 'pending')
  assert.equal(getMembershipGate({ ...member, membership_status:'unexpected' }), 'pending')
  assert.equal(getMembershipGate(null), 'pending')
})

test('admin kan handtere medlemsprofilar, men ikkje manager eller seg sjølv via manager-regelen', () => {
  assert.equal(canManageMemberAccess(admin, member), true)
  assert.equal(canManageMemberAccess(admin, admin), true)
  assert.equal(canManageMemberAccess(manager, member), true)
  assert.equal(canManageMemberAccess(manager, manager), false)
  assert.equal(canManageMemberAccess(manager, { ...member, role:'manager' }), false)
  assert.equal(canManageMemberAccess(manager, { ...member, membership_status:'pending' }), false)
  assert.equal(canManageMemberAccess(manager, { ...member, active:false }), false)
  assert.equal(canManageMemberAccess({ ...manager, membership_status:'pending' }, member), false)
  assert.equal(canManageMemberAccess(member, { ...member, id:'member-2' }), false)
})
