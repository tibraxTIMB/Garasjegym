// Read-only live HTTP verification; no test users, writes, or secret credentials.
import assert from 'node:assert/strict'
const project='https://izwzwvlexqxqewzijhhd.supabase.co'
const origin='https://tibraxtimb.github.io'
const key='sb_publishable_jZyaYhD8_jZgpgutKF7lRg_EcJ0EGSQ'
const edge=project+'/functions/v1/synchron-live'
async function request(url,opts){return fetch(url,{...opts,signal:AbortSignal.timeout(15000),redirect:'error'})}
const preflight=await request(edge,{method:'OPTIONS',headers:{origin,'access-control-request-method':'POST','access-control-request-headers':'authorization,apikey,content-type'}})
assert.equal(preflight.status,204,'Live endpoint / managed service-role RPC readiness')
assert.equal(preflight.headers.get('access-control-allow-origin'),origin)
console.log('PASS: live Edge Function and fixed service-only RPC readiness')
const foreign=await request(edge,{method:'OPTIONS',headers:{origin:'https://example.invalid','access-control-request-method':'POST'}})
assert.equal(foreign.status,403,'Foreign origin denial')
for(const authorization of [undefined,'Bearer invalid.invalid.invalid']){
 const headers={origin,apikey:key,'content-type':'application/json',...(authorization?{authorization}:{})}
 const response=await request(edge,{method:'POST',headers,body:'{"op":"discover"}'})
 assert.equal(response.status,401,'Unauthorized request denial')
}
const denied=await request(project+'/rest/v1/rpc/gg_synchron_edge_query',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({p_request:{op:'session_active',actor:'00000000-0000-4000-8000-000000000000',session:'00000000-0000-4000-8000-000000000001'}})})
assert.ok([401,403,404].includes(denied.status),'Publishable key must not invoke private bridge')
console.log('PASS: foreign origin, missing/invalid bearer, direct public RPC denial')
