// ISOLATED TEST ONLY. Synthetic credentials, SQLite in an OS temp directory.
// No browser, Supabase SDK, live account or production connection.
import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createSynchronHttpHandler} from '../server/synchronHttp.js'
import {createAuthenticatedSynchronRuntime} from '../src/lib/synchronHttpClient.js'

const sid1='12345678-1234-4234-8234-123456789012',sid2='22345678-1234-4234-8234-123456789012'
const sid3='32345678-1234-4234-8234-123456789012'
const wod={id:'fixture-wod',name:'Isolert Chipper',format:'Chipper',is_published:true,timer_settings:{workout_schema:{items:[{exercise_id:'step',exercise_name:'Step-up',levels:{rx:{reps:100}}}]}}}
const request=(id,leader)=>({wodId:wod.id,level:'rx',memberIds:['b'],leaderParticipates:true,sessionId:id,doses:{'movement-1':{[leader]:{variant:'50cm',loadKg:null},b:{variant:'40cm',loadKg:null}}}})
const schema=`
 PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,active INTEGER NOT NULL,coach INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS clients(coach TEXT NOT NULL REFERENCES accounts(id),member TEXT NOT NULL REFERENCES accounts(id),PRIMARY KEY(coach,member));
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,actor TEXT NOT NULL REFERENCES accounts(id),fingerprint TEXT NOT NULL,revision INTEGER NOT NULL,state TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS outbox(session_id TEXT NOT NULL REFERENCES sessions(id),recipient TEXT NOT NULL REFERENCES accounts(id),payload TEXT NOT NULL,PRIMARY KEY(session_id,recipient));
 CREATE TABLE IF NOT EXISTS active_slots(actor TEXT PRIMARY KEY REFERENCES accounts(id),session_id TEXT NOT NULL REFERENCES sessions(id));
`
function openFixture(file,clock){
 const db=new DatabaseSync(file)
 db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
 const one=(sql,...args)=>db.prepare(sql).get(...args)
 const run=(sql,...args)=>db.prepare(sql).run(...args)
 const all=(sql,...args)=>db.prepare(sql).all(...args)
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value}catch(error){db.exec('ROLLBACK');throw error}}
 const active=id=>one('SELECT active,coach FROM accounts WHERE id=?',id)?.active===1
 const coach=id=>active(id)&&one('SELECT coach FROM accounts WHERE id=?',id)?.coach===1
 const eligible=(a,b)=>coach(a)&&active(b)&&!!one('SELECT 1 FROM clients WHERE coach=? AND member=?',a,b)
 const row=id=>one('SELECT * FROM sessions WHERE id=?',id)
 const state=id=>{const r=row(id);return r?JSON.parse(r.state):null}
 const slot=id=>one('SELECT session_id FROM active_slots WHERE actor=?',id)?.session_id??null
 const authorized=(s,actor)=>!!s&&coach(s.plan.leaderId)&&active(actor)&&(s.plan.leaderId===actor||s.plan.members.includes(actor)&&eligible(s.plan.leaderId,actor))
 let failCreation=false, beforeCas=null
 const host={
  authenticate:async credential=>{const id={'fixture-a':'a','fixture-b':'b','fixture-c':'c'}[credential];return active(id??'')?id:null},
  readCoachContext:async actor=>({canCoach:coach(actor),eligibleMemberIds:all('SELECT member FROM clients WHERE coach=?',actor).map(r=>r.member).filter(id=>eligible(actor,id))}),
  readWod:async(id,actor)=>id===wod.id&&coach(actor)?wod:null,
  readCreation:async id=>{const r=row(id);return r?{actorId:r.actor,fingerprint:r.fingerprint}:null},
  createAtomic:async record=>tx(()=>{
   const s=record.state,id=s.plan.id,leader=s.plan.leaderId
   if(record.actorId!==leader||!coach(leader)||s.plan.sourceWodId!==wod.id||row(id)||slot(leader)||s.plan.members.some(m=>m!==leader&&(!eligible(leader,m)||slot(m))))return false
   run('INSERT INTO sessions VALUES(?,?,?,?,?)',id,leader,record.fingerprint,s.revision,JSON.stringify(s))
   run('INSERT INTO active_slots VALUES(?,?)',leader,id)
   if(failCreation)throw Error('synthetic rollback')
   for(const i of record.invitations)run('INSERT INTO outbox VALUES(?,?,?)',id,i.recipientId,JSON.stringify(i))
   return true
  }),
  read:async id=>state(id),
  authorizeSession:async({actorId,sessionId})=>authorized(state(sessionId),actorId),
  authorizeDiscovery:async actor=>active(actor),
  readActiveSession:async actor=>slot(actor),
  compareAndSwap:async(id,revision,next,actor)=>{
   if(beforeCas){const fn=beforeCas;beforeCas=null;fn()}
   return tx(()=>{
    const old=state(id)
    if(!authorized(old,actor)||old.revision!==revision||next.revision!==revision+1||JSON.stringify(old.plan)!==JSON.stringify(next.plan))return false
    const occupied=next.phase==='finished'?[]:[...new Set([next.plan.leaderId,...next.joined])]
    if(occupied.some(m=>!authorized(next,m)||slot(m)&&slot(m)!==id))return false
    const changed=run('UPDATE sessions SET revision=?,state=? WHERE id=? AND revision=?',next.revision,JSON.stringify(next),id,revision)
    if(changed.changes!==1)throw Error('synthetic CAS failed')
    run('DELETE FROM active_slots WHERE session_id=?',id)
    for(const m of occupied)run('INSERT INTO active_slots VALUES(?,?)',m,id)
    return true
   })
  },
  now:()=>clock.at
 }
 return {db,host,one,run,all,state,slot,failNextCreation(){failCreation=true},beforeNextCas(fn){beforeCas=fn}}
}
function runtime(f,actor){
 const token='fixture.'+actor+'.token',origin='https://gg.fixture.invalid'
 const handler=createSynchronHttpHandler({allowedOrigins:[origin],verifyToken:async value=>value===token?f.host.authenticate('fixture-'+actor):null,createHost:async()=>f.host})
 const auth={getSession:async()=>({data:{session:{user:{id:actor},access_token:token}},error:null})}
 const functions={invoke:async(name,{body,headers})=>{
  assert.equal(name,'synchron-live')
  const response=await handler(new Request(origin+'/functions/v1/synchron-live',{method:'POST',headers:{...headers,origin,'content-type':'application/json'},body:JSON.stringify(body)}))
  return response.ok?{data:await response.json(),error:null}:{data:null,error:Error('HTTP '+response.status)}
 }}
 return createAuthenticatedSynchronRuntime({actorId:actor,auth,functions,enabled:true})
}

test('durable isolated session/outbox, atomic permission and exclusive slots',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'gg-synchron-')),file=join(dir,'fixture.sqlite'),clock={at:0}
 let f,g
 try{
  f=openFixture(file,clock);f.db.exec(schema)
  f.db.exec("INSERT INTO accounts VALUES('a',1,1),('b',1,0),('c',1,1); INSERT INTO clients VALUES('a','b'),('c','b');")
  g=openFixture(file,clock)
  let a=runtime(f,'a'),b=runtime(g,'b'),c=runtime(g,'c')
  assert.deepEqual(await a.discover(),{active:null})
  assert.equal((await a.create(request(sid1,'a'))).sessionId,sid1)
  assert.equal((await a.create(request(sid1,'a'))).duplicate,true)
  assert.equal(f.one('SELECT count(*) AS n FROM outbox').n,1)
  assert.ok((await a.create(request(sid3,'a'))).issue)
  assert.equal((await c.create(request(sid2,'c'))).sessionId,sid2)
  assert.deepEqual(await b.discover(),{active:null})
  const ad=a.adapter(sid1),bd=b.adapter(sid1),second=b.adapter(sid2)
  const race=await Promise.all([ad.command({id:'join-a',type:'join',revision:0}),bd.command({id:'join-b',type:'join',revision:0})])
  assert.equal(race.filter(x=>!x.issue).length,1)
  assert.equal(f.state(sid1).revision,1)
  const joined=f.state(sid1).joined[0]
  const other=joined==='a'?bd:ad
  assert.ok(!(await other.command({id:'join-remaining',type:'join',revision:1})).issue)
  assert.equal(f.slot('b'),sid1)
  assert.ok((await second.command({id:'second-join',type:'join',revision:0})).issue)
  assert.equal(f.state(sid2).revision,0)
  assert.equal((await b.discover()).active.sessionId,sid1)
  const member=await bd.read()
  for(const key of ['plan','currentDoses','events','invitations','participants','seal'])assert.equal(Object.hasOwn(member.snapshot,key),false)
  assert.ok((await c.adapter(sid1).read()).issue)
  // Close both database connections; new server instance reads durable state.
  f.db.close();f=null;g.db.close();g=null
  f=openFixture(file,clock);g=openFixture(file,clock)
  a=runtime(f,'a');b=runtime(g,'b');c=runtime(g,'c')
  assert.equal((await b.discover()).active.revision,2)
  assert.equal(f.one('SELECT count(*) AS n FROM outbox').n,2)
  assert.ok(!(await a.adapter(sid1).command({type:'start',id:'start',revision:2,memberId:'a'})).issue)
  clock.at=16000
  // Revocation between gateway check and transactional write must win.
  g.beforeNextCas(()=>f.run("UPDATE accounts SET active=0 WHERE id='b'"))
  assert.ok((await b.adapter(sid1).command({type:'takeover',id:'revoked-cas',revision:3})).issue)
  assert.equal(f.state(sid1).revision,3)
  assert.ok((await b.discover()).issue)
  f.run("UPDATE accounts SET active=1 WHERE id='b'")
  assert.ok(!(await b.adapter(sid1).command({type:'takeover',id:'takeover',revision:3})).issue)
  const retry=await b.adapter(sid1).command({type:'takeover',id:'takeover',revision:3})
  assert.equal(retry.duplicate,true)
  assert.equal(f.state(sid1).revision,4)
  clock.at=22000
  assert.ok(!(await a.adapter(sid1).command({type:'finish',id:'finish',revision:4,actual:100})).issue)
  assert.deepEqual(await b.discover(),{active:null})
  assert.deepEqual(await a.discover(),{active:null})
  assert.ok(!(await b.adapter(sid2).command({type:'join',id:'join-after-finish',revision:0})).issue)
  assert.equal((await b.discover()).active.sessionId,sid2)
  // Failure after session/slot insertion rolls back the complete creation.
  f.failNextCreation()
  const rollbackRequest={...request(sid3,'a'),memberIds:[],doses:{'movement-1':{a:{variant:'50cm',loadKg:null}}}}
  // The domain requires at least two participants; use an eligible fresh fixture.
  f.db.exec("INSERT INTO accounts VALUES('d',1,0); INSERT INTO clients VALUES('a','d');")
  rollbackRequest.memberIds=['d'];rollbackRequest.doses['movement-1'].d={variant:'40cm',loadKg:null}
  assert.ok((await a.create(rollbackRequest)).issue)
  assert.equal(f.state(sid3),null)
  assert.equal(f.slot('a'),null)
  assert.equal(f.one('SELECT count(*) AS n FROM outbox WHERE session_id=?',sid3).n,0)
 }finally{if(f)f.db.close();if(g)g.db.close();rmSync(dir,{recursive:true,force:true})}
})
