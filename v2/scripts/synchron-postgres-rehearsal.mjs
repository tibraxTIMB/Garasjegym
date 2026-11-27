// Test-only psql transport, fixed local fixture endpoint. Never reads DATABASE_URL.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import process from 'node:process'
import {Buffer} from 'node:buffer'
import {createPostgresBegin} from '../server/synchronPostgresDriver.js'
import {createSynchronRestrictedQueries} from '../server/synchronRestrictedQueries.js'
import {createSynchronSupabaseHandler} from '../server/synchronSupabaseAuth.js'
import {createAuthenticatedSynchronRuntime} from '../src/lib/synchronHttpClient.js'
const ids={a:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',c:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',d:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}
const {a,b,c,d}=ids,w='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',sid='11111111-1111-4111-8111-111111111111',sid2='22222222-2222-4222-8222-222222222222',sid3='33333333-3333-4333-8333-333333333333'
function psql(sql,args=[],login='postgres'){
 if(!['postgres','gg_synchron_login'].includes(login))throw Error('Invalid fixture login')
 return new Promise((resolve,reject)=>{
  // psql quoted variable substitution on stdin, not string-interpolated SQL values.
  const vars=args.flatMap((v,i)=>['-v','v'+(i+1)+'='+String(v)])
  const child=spawn('psql',['-X','-qAt','-h','127.0.0.1','-p','5432','-U',login,'-d','gg_synchron_fixture','-v','ON_ERROR_STOP=1',...vars],{env:{...process.env,PGPASSWORD:'fixture-only',PGOPTIONS:''},stdio:['pipe','pipe','pipe']})
  let out='',err='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('close',code=>code===0?resolve(out.trim()):reject(Error(err||'psql '+code)))
  child.stdin.end(sql.replace(/\$(\d+)/g,(_,i)=>":'v"+i+"'")+";\n")
 })
}
const psqlQuery=async(sql,args)=>({rows:[JSON.parse(await psql('BEGIN; SET LOCAL ROLE gg_synchron_server; SELECT row_to_json(q) FROM ('+sql+') q; COMMIT',args,'gg_synchron_login'))]})
// Verify and lock the session in the same transaction as the operation.
const psqlSessionQuery=async({actorId,sessionId},sql,args=[])=>{
 const lock='SELECT gg_synchron_private.require_active_session('+String.fromCharCode(36)+(args.length+1)+'::uuid,'+String.fromCharCode(36)+(args.length+2)+'::uuid)'
 const output=await psql('BEGIN; SET LOCAL ROLE gg_synchron_server; '+lock+'; SELECT row_to_json(q) FROM ('+sql+') q; COMMIT',[...args,actorId,sessionId],'gg_synchron_login')
 return {rows:[JSON.parse(output)]}
}
// The CI driver mode uses the actual pinned Postgres.js package and the
// deployment-facing restricted transaction adapter. psql remains fixture control only.
const driverMode=process.argv.includes('--driver')
const driver=driverMode?(await import('npm:postgres@3.4.7')).default('postgres://gg_synchron_login:fixture-only@127.0.0.1:5432/gg_synchron_fixture',{ssl:false,prepare:false,max:4,connect_timeout:5,idle_timeout:2}):null
const {query,sessionQuery}=driver?createSynchronRestrictedQueries({begin:createPostgresBegin(driver)}):{query:psqlQuery,sessionQuery:psqlSessionQuery}
const read=async(sql,args)=>JSON.parse(await psql(sql,args))
await psql("INSERT INTO public.profiles VALUES($1,true,'approved','admin'),($2,true,'approved','member'),($3,true,'approved','member'),($4,true,'approved','member'); INSERT INTO public.pt_coaches VALUES($1,true),($3,true); INSERT INTO public.pt_client_assignments VALUES($1,$2,'active'),($3,$2,'active'),($1,$4,'active'); INSERT INTO public.wods VALUES($5,'Chipper','Chipper',true,false,$6::jsonb)",[a,b,c,d,w,JSON.stringify({workout_schema:{items:[{exercise_id:'step',exercise_name:'Step-up',levels:{rx:{reps:100}}}]}})])
let now=0
const request=(leader,member,id)=>({wodId:w,level:'rx',leaderParticipates:true,memberIds:[member],sessionId:id,doses:{'movement-1':{[leader]:{variant:'50cm',loadKg:null},[member]:{variant:'40cm',loadKg:null}}}})
const origin='https://gg.fixture.invalid'
const issuer='https://gg.fixture.invalid/auth/v1'
const sessionIds={ [a]:'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',[b]:'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb',[c]:'cccccccc-1111-4111-8111-cccccccccccc',[d]:'dddddddd-1111-4111-8111-dddddddddddd'}
for(const [actor,session] of Object.entries(sessionIds))await psql('INSERT INTO auth.sessions(id,user_id) VALUES($1::uuid,$2::uuid)',[session,actor])
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
function runtime(actor,{boundQuery=sessionQuery}={}){
 const token=encode({alg:'fixture'})+'.'+encode({sub:actor,iss:issuer,role:'authenticated',aud:'authenticated',session_id:sessionIds[actor],exp:86400})+'.fixture'
 // Fixture Auth service stub verifies only the exact known token. It is not a real JWT signature test.
 const auth={getUser:async t=>t===token?{data:{user:{id:actor}}}:{error:Error('invalid')}}
 const handler=createSynchronSupabaseHandler({enabled:true,issuer,allowedOrigins:[origin],auth,query,sessionQuery:boundQuery,now:()=>now,resultSavingEnabled:true})
 return createAuthenticatedSynchronRuntime({actorId:actor,enabled:true,resultSavingEnabled:true,auth:{getSession:async()=>({data:{session:{user:{id:actor},access_token:token}}})},functions:{invoke:async(name,{body,headers})=>{assert.equal(name,'synchron-live');const r=await handler(new Request(origin,{method:'POST',headers:{...headers,origin,'content-type':'application/json'},body:JSON.stringify(body)}));return {data:await r.json(),error:r.ok?null:Error('HTTP '+r.status)}}}})
}
// Prove the actual request path is running without owner or RLS bypass.
assert.equal(await psql("SELECT session_user||':'||current_user",[],'gg_synchron_login'),'gg_synchron_login:gg_synchron_login')
assert.equal(await psql("BEGIN; SET LOCAL ROLE gg_synchron_server; SELECT session_user||':'||current_user; COMMIT",[],'gg_synchron_login'),'gg_synchron_login:gg_synchron_server')
assert.equal(await psql("SELECT rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolinherit FROM pg_roles WHERE rolname='gg_synchron_login'"),'f')
await assert.rejects(psql('SELECT * FROM gg_synchron_private.sessions',[],'gg_synchron_login'))
await assert.rejects(psql('SET ROLE postgres',[],'gg_synchron_login'))
assert.equal(await psql("SET ROLE gg_synchron_server; SELECT current_user"),'gg_synchron_server')
assert.equal(await psql("SELECT rolcanlogin OR rolsuper OR rolbypassrls FROM pg_roles WHERE rolname='gg_synchron_server'"),'f')
for(const role of ['anon','authenticated']){
 assert.equal(await psql("SELECT pg_has_role($1,'gg_synchron_server','MEMBER')",[role]),'f')
}
for(const sql of [
 "UPDATE public.profiles SET id=id",
 "UPDATE public.pt_coaches SET user_id=user_id",
 "UPDATE public.pt_client_assignments SET member_id=member_id",
 "UPDATE public.wods SET id=id",
 "DELETE FROM public.profiles",
 "INSERT INTO public.notifications(recipient_id,title,category) VALUES($1::uuid,'unsealed','pt')",
 "INSERT INTO public.workout_logs(member_id,save_token,title,workout_date,format,rounds,note,result_data) VALUES($1::uuid,gen_random_uuid(),'unsealed',CURRENT_DATE,'Chipper',1,'','{}')"
]){
 await assert.rejects(psql('SET ROLE gg_synchron_server; '+sql,sql.includes('$1')?[a]:[]))
}
const A=runtime(a),B=runtime(b),C=runtime(c)
assert.deepEqual(await A.discover(),{active:null})
await assert.rejects(psql('SET ROLE gg_synchron_server; SELECT * FROM auth.sessions'))
await psql('DELETE FROM auth.sessions WHERE id=$1::uuid',[sessionIds[a]])
assert.ok((await A.discover()).issue)
await psql('INSERT INTO auth.sessions(id,user_id) VALUES($1::uuid,$2::uuid)',[sessionIds[a],a])
assert.deepEqual(await A.discover(),{active:null})
assert.equal(await psql("SET ROLE gg_synchron_server; SELECT gg_synchron_private.session_active($1::uuid,$2::uuid)",[a,sessionIds[b]]),'f')
// Revoke after the Auth verifier succeeds, before a protected operation.
let revokedBetweenChecks=false
const stale=runtime(a,{boundQuery:async(identity,sql,args)=>{
 if(!revokedBetweenChecks){revokedBetweenChecks=true;await psql('DELETE FROM auth.sessions WHERE id=$1::uuid',[sessionIds[a]])}
 return sessionQuery(identity,sql,args)
}})
assert.ok((await stale.create(request(a,b,sid))).issue)
assert.equal(revokedBetweenChecks,true)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.sessions'),0)
await psql('INSERT INTO auth.sessions(id,user_id) VALUES($1::uuid,$2::uuid)',[sessionIds[a],a])
// The host supplies JSON text, not a driver-native JSON object. Ensure
// that parameter inference cannot turn serialized state into a JSON string.
const probe=await sessionQuery({actorId:a,sessionId:sessionIds[a]},'SELECT jsonb_typeof($1::text::jsonb) AS value',[JSON.stringify({fixture:true})])
assert.equal(probe.rows[0].value,'object')
const created=await A.create(request(a,b,sid))
assert.equal(created.sessionId,sid,JSON.stringify(created))
assert.equal((await A.create(request(a,b,sid))).duplicate,true)
assert.equal((await C.create(request(c,b,sid2))).sessionId,sid2)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.outbox'),2)
assert.equal(await read('SELECT count(*) FROM public.notifications'),2)
assert.equal(await read('SELECT count(*) FROM public.notifications WHERE recipient_id=$1::uuid AND category=\'pt\' AND href=$2 AND dedupe_key=$3 AND NOT requires_action AND NOT requires_ack',[b,'synchron-session:'+sid,'synchron-invite:'+sid]),1)
assert.equal(await read('SELECT count(*) FROM public.notifications WHERE recipient_id<>$1::uuid',[b]),0)
assert.equal((await B.open('synchron-session:'+sid)).sessionId,sid)
assert.ok((await C.open('synchron-session:'+sid)).issue)
await psql('UPDATE public.notifications SET is_read=true WHERE recipient_id=$1::uuid AND href=$2',[b,'synchron-session:'+sid])
assert.equal((await A.create(request(a,b,sid))).duplicate,true)
assert.equal(await read('SELECT count(*) FROM public.notifications'),2)
assert.equal(await psql('SELECT is_read FROM public.notifications WHERE recipient_id=$1::uuid AND href=$2',[b,'synchron-session:'+sid]),'t')
const ad=A.adapter(sid),bd=B.adapter(sid)
const race=await Promise.all([ad.command({id:'join-a',revision:0,type:'join'}),bd.command({id:'join-b',revision:0,type:'join'})])
assert.equal(race.filter(r=>!r.issue).length,1)
assert.equal((await ad.read()).snapshot.revision,1)
const other=race[0].issue?ad:bd
assert.ok(!(await other.command({id:'join-second',revision:1,type:'join'})).issue)
assert.equal((await runtime(b).discover()).active.sessionId,sid)
assert.ok((await B.adapter(sid2).command({id:'join-other',revision:0,type:'join'})).issue)
assert.ok((await C.adapter(sid).read()).issue)
assert.ok(!(await ad.command({id:'start',revision:2,type:'start',memberId:a})).issue)
now=16000
await psql("UPDATE public.pt_client_assignments SET status='ended' WHERE coach_user_id=$1 AND member_id=$2",[a,b])
assert.ok((await bd.command({id:'revoked',revision:3,type:'takeover'})).issue)
assert.ok((await B.discover()).issue)
assert.equal((await ad.read()).snapshot.revision,3)
await psql("UPDATE public.pt_client_assignments SET status='active' WHERE coach_user_id=$1 AND member_id=$2",[a,b])
assert.ok(!(await bd.command({id:'swap',revision:3,type:'takeover'})).issue)
assert.equal((await bd.command({id:'swap',revision:3,type:'takeover'})).duplicate,true)
now=22000
assert.ok(!(await ad.command({id:'finish',revision:4,type:'finish',actual:100})).issue)
assert.deepEqual(await B.discover(),{active:null})
// Real database result writer: no synthetic measured sets, no client-supplied payload.
assert.ok((await ad.saveResult(5)).issue)
assert.ok((await C.adapter(sid).saveResult(5)).issue)
now=23000
assert.ok(!(await ad.command({type:'review_update',id:'review-a',revision:5,movementId:'movement-1',quality:'confirmed',value:60})).issue)
assert.ok(!(await bd.command({type:'review_update',id:'review-b',revision:6,movementId:'movement-1',quality:'estimated',value:40})).issue)
assert.ok(!(await ad.command({type:'review_approve',id:'approve-a',revision:7})).issue)
assert.ok((await ad.saveResult(8)).issue)
assert.ok(!(await bd.command({type:'review_approve',id:'approve-b',revision:8})).issue)
await psql("CREATE FUNCTION public.fail_fixture_receipt() RETURNS trigger LANGUAGE plpgsql AS $fixture$ BEGIN IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.state#>'{seal,entries}') e WHERE e->'receipt'<>'null'::jsonb) THEN RAISE EXCEPTION 'fixture receipt rollback'; END IF; RETURN NEW; END $fixture$; CREATE TRIGGER fixture_receipt_failure BEFORE UPDATE ON gg_synchron_private.sessions FOR EACH ROW EXECUTE FUNCTION public.fail_fixture_receipt()")
assert.ok((await ad.saveResult(9)).issue)
assert.equal(await read('SELECT count(*) FROM public.workout_logs'),0)
assert.equal((await ad.read()).snapshot.review.sealed,true)
await psql('DROP TRIGGER fixture_receipt_failure ON gg_synchron_private.sessions')
const saved=await Promise.all([ad.saveResult(9),bd.saveResult(9),ad.saveResult(9)])
assert.ok(saved.every(r=>r.saved===true))
assert.equal(saved[0].workoutId,saved[2].workoutId)
assert.notEqual(saved[0].workoutId,saved[1].workoutId)
assert.equal(await read('SELECT count(*) FROM public.workout_logs'),2)
const result=await read("SELECT result_data FROM public.workout_logs WHERE member_id=$1::uuid",[b])
assert.equal(result.participation_verified,'team')
assert.equal(result.synchron_result.pr_eligible,false)
assert.equal(result.synchron_result.rows[0].amount,40)
assert.equal(result.synchron_result.rows[0].quality,'estimated')
assert.equal(await read('SELECT count(*) FROM public.workout_logs WHERE score_reps IS NOT NULL OR score_load_kg IS NOT NULL OR score_time_seconds IS NOT NULL'),0)
assert.equal((await runtime(a).adapter(sid).saveResult(9)).duplicate,true)
await assert.rejects(psql('SET ROLE gg_synchron_server; UPDATE public.workout_logs SET id=id'))
await assert.rejects(psql('SET ROLE gg_synchron_server; DELETE FROM public.workout_logs'))
await assert.rejects(psql('SET ROLE gg_synchron_server; SELECT * FROM public.notifications'))
const snapshot=(await ad.read()).snapshot
assert.equal(Object.hasOwn(snapshot,'seal'),false)
assert.ok(!JSON.stringify(snapshot).includes('saveToken'))
await psql('DELETE FROM public.workout_logs WHERE member_id=$1::uuid',[a])
assert.ok((await ad.saveResult(9)).issue)
assert.equal(await read('SELECT count(*) FROM public.workout_logs'),1)
assert.ok(!(await B.adapter(sid2).command({id:'join-other-now',revision:0,type:'join'})).issue)
// Force failure after session/slot insert; transaction must roll back both.
await psql("CREATE FUNCTION public.fail_fixture_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture rollback'; END $$; CREATE TRIGGER fixture_outbox_failure BEFORE INSERT ON gg_synchron_private.outbox FOR EACH ROW EXECUTE FUNCTION public.fail_fixture_outbox()")
assert.ok((await A.create(request(a,d,sid3))).issue)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.sessions WHERE id=$1::uuid',[sid3]),0)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.slots WHERE actor=$1::uuid',[a]),0)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.outbox WHERE session_id=$1::uuid',[sid3]),0)
await psql('DROP TRIGGER fixture_outbox_failure ON gg_synchron_private.outbox')
// Failure in actual inbox insertion must also roll back session, slot and outbox.
await psql("CREATE FUNCTION public.fail_fixture_notification() RETURNS trigger LANGUAGE plpgsql AS $notice$ BEGIN RAISE EXCEPTION 'fixture notification rollback'; END $notice$; CREATE TRIGGER fixture_notification_failure BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.fail_fixture_notification()")
assert.ok((await A.create(request(a,d,sid3))).issue)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.sessions WHERE id=$1::uuid',[sid3]),0)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.slots WHERE actor=$1::uuid',[a]),0)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.outbox WHERE session_id=$1::uuid',[sid3]),0)
assert.equal(await read('SELECT count(*) FROM public.notifications WHERE recipient_id=$1::uuid',[d]),0)
await psql('DROP TRIGGER fixture_notification_failure ON public.notifications')
assert.equal((await A.create(request(a,d,sid3))).sessionId,sid3)
assert.equal((await A.create(request(a,d,sid3))).duplicate,true)
assert.equal(await read('SELECT count(*) FROM public.notifications WHERE recipient_id=$1::uuid',[d]),1)
for(const role of ['anon','authenticated']){
 assert.equal(await psql("SELECT has_schema_privilege($1,'gg_synchron_private','USAGE')",[role]),'f')
 assert.equal(await psql("SELECT has_table_privilege($1,'gg_synchron_private.sessions','SELECT')",[role]),'f')
 assert.equal(await psql("SELECT has_function_privilege($1,'gg_synchron_private.cas(uuid,uuid,bigint,jsonb)','EXECUTE')",[role]),'f')
 assert.equal(await psql("SELECT has_function_privilege($1,'gg_synchron_private.save_own_result(uuid,uuid)','EXECUTE')",[role]),'f')
 assert.equal(await psql("SELECT has_function_privilege($1,'gg_synchron_private.deliver_invitation()','EXECUTE')",[role]),'f')
 assert.equal(await psql("SELECT has_function_privilege($1,'gg_synchron_private.require_active_session(uuid,uuid)','EXECUTE')",[role]),'f')
}
if(driver)await driver.end({timeout:5})
console.log('SYNCHRON PostgreSQL: verified HTTP identity fixture, concurrent CAS, private state, exclusivity, revocation, restart, atomic rollback sealed result receipts and atomic inbox delivery passed')
