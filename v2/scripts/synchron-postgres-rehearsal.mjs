// Test-only psql transport, fixed local fixture endpoint. Never reads DATABASE_URL.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createPostgresSynchronHost} from '../server/synchronPostgresHost.js'
import {createSynchronHttpHandler} from '../server/synchronHttp.js'
import {createAuthenticatedSynchronRuntime} from '../src/lib/synchronHttpClient.js'
const ids={a:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',c:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',d:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}
const {a,b,c,d}=ids,w='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',sid='11111111-1111-4111-8111-111111111111',sid2='22222222-2222-4222-8222-222222222222',sid3='33333333-3333-4333-8333-333333333333'
function psql(sql,args=[]){
 return new Promise((resolve,reject)=>{
  // psql quoted variable substitution on stdin, not string-interpolated SQL values.
  const vars=args.flatMap((v,i)=>['-v','v'+(i+1)+'='+String(v)])
  const child=spawn('psql',['-X','-qAt','-h','127.0.0.1','-p','5432','-U','postgres','-d','gg_synchron_fixture','-v','ON_ERROR_STOP=1',...vars],{env:{...process.env,PGPASSWORD:'fixture-only',PGOPTIONS:''},stdio:['pipe','pipe','pipe']})
  let out='',err='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('close',code=>code===0?resolve(out.trim()):reject(Error(err||'psql '+code)))
  child.stdin.end(sql.replace(/\$(\d+)/g,(_,i)=>":'v"+i+"'")+";\n")
 })
}
const query=async(sql,args)=>({rows:[JSON.parse(await psql('SELECT row_to_json(q) FROM ('+sql+') q',args))]})
const read=async(sql,args)=>JSON.parse(await psql(sql,args))
await psql("INSERT INTO public.profiles VALUES($1,true,'approved','admin'),($2,true,'approved','member'),($3,true,'approved','member'),($4,true,'approved','member'); INSERT INTO public.pt_coaches VALUES($1,true),($3,true); INSERT INTO public.pt_client_assignments VALUES($1,$2,'active'),($3,$2,'active'),($1,$4,'active'); INSERT INTO public.wods VALUES($5,'Chipper','Chipper',true,false,$6::jsonb)",[a,b,c,d,w,JSON.stringify({workout_schema:{items:[{exercise_id:'step',exercise_name:'Step-up',levels:{rx:{reps:100}}}]}})])
let now=0
const request=(leader,member,id)=>({wodId:w,level:'rx',leaderParticipates:true,memberIds:[member],sessionId:id,doses:{'movement-1':{[leader]:{variant:'50cm',loadKg:null},[member]:{variant:'40cm',loadKg:null}}}})
const origin='https://gg.fixture.invalid'
function runtime(actor){
 const token='fixture.'+actor+'.token'
 const handler=createSynchronHttpHandler({allowedOrigins:[origin],verifyToken:async t=>t===token?actor:null,createHost:async({actorId})=>createPostgresSynchronHost({query,actorId,now:()=>now})})
 return createAuthenticatedSynchronRuntime({actorId:actor,enabled:true,auth:{getSession:async()=>({data:{session:{user:{id:actor},access_token:token}}})},functions:{invoke:async(name,{body,headers})=>{assert.equal(name,'synchron-live');const r=await handler(new Request(origin,{method:'POST',headers:{...headers,origin,'content-type':'application/json'},body:JSON.stringify(body)}));return {data:await r.json(),error:r.ok?null:Error('HTTP '+r.status)}}}})
}
const A=runtime(a),B=runtime(b),C=runtime(c)
assert.deepEqual(await A.discover(),{active:null})
assert.equal((await A.create(request(a,b,sid))).sessionId,sid)
assert.equal((await A.create(request(a,b,sid))).duplicate,true)
assert.equal((await C.create(request(c,b,sid2))).sessionId,sid2)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.outbox'),2)
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
assert.ok(!(await B.adapter(sid2).command({id:'join-other-now',revision:0,type:'join'})).issue)
// Force failure after session/slot insert; transaction must roll back both.
await psql("CREATE FUNCTION public.fail_fixture_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture rollback'; END $$; CREATE TRIGGER fixture_outbox_failure BEFORE INSERT ON gg_synchron_private.outbox FOR EACH ROW EXECUTE FUNCTION public.fail_fixture_outbox()")
assert.ok((await A.create(request(a,d,sid3))).issue)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.sessions WHERE id=$1::uuid',[sid3]),0)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.slots WHERE actor=$1::uuid',[a]),0)
assert.equal(await read('SELECT count(*) FROM gg_synchron_private.outbox WHERE session_id=$1::uuid',[sid3]),0)
for(const role of ['anon','authenticated']){
 assert.equal(await psql("SELECT has_schema_privilege($1,'gg_synchron_private','USAGE')",[role]),'f')
 assert.equal(await psql("SELECT has_table_privilege($1,'gg_synchron_private.sessions','SELECT')",[role]),'f')
 assert.equal(await psql("SELECT has_function_privilege($1,'gg_synchron_private.cas(uuid,uuid,bigint,jsonb)','EXECUTE')",[role]),'f')
}
console.log('SYNCHRON PostgreSQL: verified HTTP identity fixture, concurrent CAS, private state, exclusivity, revocation, restart and atomic rollback passed')
