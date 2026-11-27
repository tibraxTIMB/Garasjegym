import test from 'node:test'
import assert from 'node:assert/strict'
import {createSynchronHttpHandler} from '../server/synchronHttp.js'
import {createAuthenticatedSynchronRuntime} from '../src/lib/synchronHttpClient.js'
const origin='https://gg.fixture.invalid',token='fixture.a.token'
const host={authenticate:async()=>{throw Error('Must not use unverified body identity')},readCoachContext:async()=>({canCoach:false,eligibleMemberIds:[]}),readWod:async()=>null,readCreation:async()=>null,createAtomic:async()=>false,read:async()=>null,compareAndSwap:async()=>false,now:()=>0,authorizeSession:async()=>false,authorizeDiscovery:async actor=>actor==='a',readActiveSession:async actor=>{assert.equal(actor,'a');return null}}
test('HTTP request boundary and verified actor only',async()=>{
 let verifications=0,hosts=0
 const handler=createSynchronHttpHandler({allowedOrigins:[origin],verifyToken:async value=>{verifications++;return value===token?'a':null},createHost:async ctx=>{hosts++;assert.deepEqual(ctx,{actorId:'a',token});return host}})
 const req=(body,overrides={})=>new Request(origin+'/functions/v1/synchron-live',{method:'POST',headers:{origin,authorization:'Bearer '+token,'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body),...overrides})
 const ok=await handler(req({op:'discover'}));assert.equal(ok.status,200);assert.deepEqual(await ok.json(),{active:null});assert.equal(ok.headers.get('access-control-allow-origin'),origin);assert.equal(ok.headers.get('cache-control'),'no-store')
 const spoof=await handler(req({op:'discover',actorId:'b'}));assert.ok((await spoof.json()).issue)
 const bad=await handler(req({op:'discover'},{headers:{origin,authorization:'Bearer fixture.b.token','content-type':'application/json'}}));assert.equal(bad.status,401)
 assert.equal((await handler(req({op:'discover'},{headers:{origin,'content-type':'application/json'}}))).status,401)
 assert.equal((await handler(req({op:'discover'},{headers:{origin:'https://evil.invalid',authorization:'Bearer '+token,'content-type':'application/json'}}))).status,403)
 assert.equal((await handler(req({op:'discover'},{headers:{origin,authorization:'Bearer '+token,'content-type':'text/plain'}}))).status,415)
 assert.equal((await handler(req('not json'))).status,400)
 assert.equal((await handler(req('x'.repeat(65537)))).status,400)
 assert.equal((await handler(req([]))).status,400)
 assert.equal((await handler(new Request(origin,{method:'GET',headers:{origin}}))).status,405)
 const pre=await handler(new Request(origin,{method:'OPTIONS',headers:{origin,'access-control-request-method':'POST'}}));assert.equal(pre.status,204)
 assert.equal(hosts,2);assert.equal(verifications,6)
 assert.throws(()=>createSynchronHttpHandler({verifyToken:async()=>null,createHost:async()=>host,allowedOrigins:['*']}))
})
test('client opt-in and session change fail closed without mutation replay',async()=>{
 let session={user:{id:'a'},access_token:token},calls=0,swap=false,fail=false
 const auth={getSession:async()=>({data:{session},error:null})}
 const functions={invoke:async(name,options)=>{calls++;assert.equal(name,'synchron-live');assert.equal(options.headers.Authorization,'Bearer '+token);assert.deepEqual(options.body,{op:'discover'});if(swap)session={user:{id:'b'},access_token:'fixture.b.token'};if(fail)throw Error('offline');return {data:{active:null},error:null}}}
 assert.equal(createAuthenticatedSynchronRuntime({actorId:'a',auth,functions}),null)
 const r=createAuthenticatedSynchronRuntime({actorId:'a',auth,functions,enabled:true})
 assert.deepEqual(await r.discover(),{active:null})
 swap=true;assert.ok((await r.discover()).issue);assert.equal(calls,2)
 assert.ok((await r.discover()).issue);assert.equal(calls,2)
 session={user:{id:'a'},access_token:token};swap=false;fail=true
 assert.ok((await r.discover()).issue);assert.equal(calls,3)
})
