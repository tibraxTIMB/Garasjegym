import test from 'node:test'
import assert from 'node:assert/strict'
import {createSynchronRestrictedQueries} from '../server/synchronRestrictedQueries.js'
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const check='SELECT gg_synchron_private.session_active($1::uuid,$2::uuid) AS value'
const operation='SELECT gg_synchron_private.cas($1::uuid,$2::uuid,$3::bigint,$4::jsonb) AS value'
function fixture({login=true,role=true,lockFails=false,operationFails=false}={}){
 const events=[]
 const begin=async callback=>{
  events.push(['begin'])
  try{
   const result=await callback({query:async(sql,args)=>{
    events.push([sql,args])
    if(sql.includes("current_user = 'gg_synchron_login'"))return [{ok:login}]
    if(sql.includes("current_user = 'gg_synchron_server'"))return [{ok:role}]
    if(sql.includes('require_active_session')&&lockFails)throw Error('revoked')
    if(sql===operation&&operationFails)throw Error('database failure')
    if(sql===operation||sql===check)return [{value:true}]
    return []
   }})
   events.push(['commit']);return result
  }catch(e){events.push(['rollback']);throw e}
 }
 return {events,adapter:createSynchronRestrictedQueries({begin})}
}
test('session verification and protected operation share a single bounded transaction',async()=>{
 const {adapter,events}=fixture()
 assert.deepEqual(await adapter.query(check,[a,sid]),{rows:[{value:true}]})
 assert.equal(events.at(-1)[0],'commit')
 events.length=0
 const args=[a,sid,1,'{}']
 assert.deepEqual(await adapter.sessionQuery({actorId:a,sessionId:sid},operation,args),{rows:[{value:true}]})
 assert.equal(events.filter(x=>x[0]==='begin').length,1)
 assert.equal(events[2][0],'SET LOCAL ROLE gg_synchron_server')
 assert.ok(events.some(x=>x[0].includes('statement_timeout')))
 assert.deepEqual(events.at(-3),['SELECT gg_synchron_private.require_active_session($1::uuid,$2::uuid)',[a,sid]])
 assert.deepEqual(events.at(-2),[operation,args])
 assert.equal(events.at(-1)[0],'commit')
})
test('owner login, wrong role, revoked session and operation failure fail closed',async()=>{
 for(const opts of [{login:false},{role:false},{lockFails:true},{operationFails:true}]){
  const {adapter,events}=fixture(opts)
  await assert.rejects(adapter.sessionQuery({actorId:a,sessionId:sid},operation,[a,sid,1,'{}']))
  assert.equal(events.at(-1)[0],'rollback')
  if(!opts.operationFails)assert.ok(!events.some(x=>x[0]===operation))
 }
})
test('unbound lookups and malformed identity never acquire a connection',()=>{
 const {adapter,events}=fixture()
 assert.throws(()=>adapter.query('SELECT 1',[]))
 assert.throws(()=>adapter.sessionQuery({actorId:'other',sessionId:sid},operation,[]))
 assert.throws(()=>adapter.query(check,[a]))
 assert.equal(events.length,0)
})
