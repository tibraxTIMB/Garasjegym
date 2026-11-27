import test from 'node:test'
import assert from 'node:assert/strict'
import {createSynchronIdentityVerifier,createSynchronSupabaseHandler} from '../server/synchronSupabaseAuth.js'
const actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',issuer='https://gg.fixture.invalid/auth/v1'
const claims={sub:actor,iss:issuer,role:'authenticated',aud:'authenticated',session_id:sid,exp:100}
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
const token=(patch={})=>encode({alg:'fixture'})+'.'+encode({...claims,...patch})+'.fixture'
test('verified user, matching claims and active session are all mandatory',async()=>{
 let checks=0,authCalls=0
 const verify=createSynchronIdentityVerifier({auth:{getUser:async()=>{authCalls++;return {data:{user:{id:actor}}}}},sessionActive:async request=>{checks++;assert.deepEqual(request,{actorId:actor,sessionId:sid});return true},issuer,now:()=>1000})
 assert.equal(await verify(token()),actor)
 for(const patch of [{sub:sid},{iss:'https://other.invalid/auth/v1'},{role:'service_role'},{aud:'anon'},{session_id:null},{exp:1},{exp:'100'}])assert.equal(await verify(token(patch)),null)
 assert.equal(await verify('invalid'),null)
 assert.equal(checks,1);assert.equal(authCalls,8)
})
test('revoked session, unavailable Auth, anonymous account, and malformed result fail closed',async()=>{
 const auth={getUser:async()=>({data:{user:{id:actor}}})}
 for(const sessionActive of [async()=>false,async()=>null,async()=>{throw Error('unavailable')}])assert.equal(await createSynchronIdentityVerifier({auth,sessionActive,issuer,now:()=>1000})(token()),null)
 for(const getUser of [async()=>({error:Error('invalid')}),async()=>({data:{user:{id:actor,is_anonymous:true}}}),async()=>{throw Error('offline')}])assert.equal(await createSynchronIdentityVerifier({auth:{getUser},sessionActive:async()=>true,issuer,now:()=>1000})(token()),null)
 let now=1000
 const delayed=createSynchronIdentityVerifier({auth,sessionActive:async()=>{now=100000;return true},issuer,now:()=>now})
 assert.equal(await delayed(token()),null)
})
test('handler is disabled by default and requires explicit origin and DB configuration',()=>{
 assert.equal(createSynchronSupabaseHandler(),null)
 assert.throws(()=>createSynchronSupabaseHandler({enabled:true,issuer,allowedOrigins:[]}))
})
