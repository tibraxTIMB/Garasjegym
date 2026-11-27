import test from 'node:test'
import assert from 'node:assert/strict'
import {createSynchronManagedEdge} from '../server/synchronManagedQueries.js'
const origin='https://tibraxtimb.github.io'
const config={SUPABASE_URL:'https://izwzwvlexqxqewzijhhd.supabase.co',SUPABASE_PUBLISHABLE_KEYS:'{"default":"fixture-public"}',SUPABASE_SECRET_KEYS:'{"default":"fixture-private"}'}
function make(result){
 let calls=0
 const handler=createSynchronManagedEdge({enabled:true,env:k=>config[k],createClient:(_url,key)=>key==='fixture-public'?{auth:{getUser:async()=>({error:Error('not authenticated')})}}:{rpc:async(name,args)=>{calls++;assert.equal(name,'gg_synchron_edge_query');assert.deepEqual(args.p_request,{op:'session_active',actor:'00000000-0000-4000-8000-000000000000',session:'00000000-0000-4000-8000-000000000001'});return result}}})
 return {handler,calls:()=>calls}
}
const options=(o=origin)=>new Request(origin,{method:'OPTIONS',headers:{origin:o,'access-control-request-method':'POST'}})
test('readiness checks real RPC result, caches bounded fixed probe, rejects foreign origin',async()=>{
 const {handler,calls}=make({data:false,error:null})
 assert.equal((await handler(options('https://foreign.invalid'))).status,403)
 assert.equal(calls(),0)
 const r=await handler(options());assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin)
 assert.equal((await handler(options())).status,204);assert.equal(calls(),1)
})
test('missing or invalid RPC response fails closed and no bearer cannot invoke domain',async()=>{
 for(const result of [{data:true,error:null},{data:null,error:null},{data:null,error:Error('unavailable')}]){
  const {handler,calls}=make(result)
  assert.equal((await handler(options())).status,503)
  const r=await handler(new Request(origin,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{"op":"discover"}'}))
  assert.equal(r.status,401);assert.equal(calls(),1)
 }
})
