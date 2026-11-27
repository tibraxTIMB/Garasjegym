// Server-only candidate. The Auth service verifies the bearer before any
// decoded claim is trusted. The restricted query adapter never uses a browser role.
import {createSynchronHttpHandler} from './synchronHttp.js'
import {createPostgresSynchronHost} from './synchronPostgresHost.js'
import {createSynchronRestrictedQueries} from './synchronRestrictedQueries.js'

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const jwt=/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
function claimsAfterVerification(token){
 try{
  const encoded=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')
  const decoded=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decoded))
  return value&&typeof value==='object'&&!Array.isArray(value)?value:null
 }catch{return null}
}
export function createSynchronIdentityVerifier({auth,sessionActive,issuer,now=Date.now}={}){
 if(typeof auth?.getUser!=='function'||typeof sessionActive!=='function'||typeof issuer!=='string'||!issuer.startsWith('https://')||typeof now!=='function')throw Error('Trusted Auth configuration required')
 return async token=>{
  if(typeof token!=='string'||token.length>8192||!jwt.test(token))return null
  try{
   const response=await auth.getUser(token)
   const actor=response?.data?.user
   if(response?.error||!actor||!uuid.test(actor.id)||actor.is_anonymous===true)return null
   const c=claimsAfterVerification(token)
   if(!c||c.sub!==actor.id||c.iss!==issuer||c.role!=='authenticated'||c.aud!=='authenticated'||!uuid.test(c.session_id)||!Number.isSafeInteger(c.exp)||c.exp<=Math.floor(now()/1000))return null
   // Signed-out sessions must not retain access just because a JWT has not expired.
   if(await sessionActive({actorId:actor.id,sessionId:c.session_id})!==true||c.exp<=Math.floor(now()/1000))return null
   return actor.id
  }catch{return null}
 }
}
export function createSynchronSupabaseHandler({auth,query,sessionQuery,issuer,allowedOrigins,enabled=false,resultSavingEnabled=false,now=Date.now}={}){
 // No handler is mounted by default. Deployment and role/session lookup require
 // an independently verified configuration; never use the owner connection.
 if(enabled!==true)return null
 if(typeof query!=='function'||typeof sessionQuery!=='function'||!Array.isArray(allowedOrigins)||!allowedOrigins.length)throw Error('Trusted restricted PostgreSQL configuration required')
 const verifyToken=createSynchronIdentityVerifier({auth,issuer,now,sessionActive:async({actorId,sessionId})=>{
  const result=await query('SELECT gg_synchron_private.session_active($1::uuid,$2::uuid) AS value',[actorId,sessionId])
  return Array.isArray(result?.rows)&&result.rows.length===1&&result.rows[0].value===true
 }})
 return createSynchronHttpHandler({verifyToken,allowedOrigins,createHost:async({actorId,token})=>{
  // createHost is called only after verifyToken accepts this exact bearer.
  const claims=claimsAfterVerification(token)
  if(!claims||claims.sub!==actorId||!uuid.test(claims.session_id))return null
  const boundQuery=async(sql,args)=>{
   if(claims.exp<=Math.floor(now()/1000))throw Error('Session unavailable')
   // sessionQuery must lock and verify this Auth session in the very same
   // database transaction as the parameterized operation. No fallback.
   return sessionQuery({actorId,sessionId:claims.session_id},sql,args)
  }
  return createPostgresSynchronHost({query:boundQuery,actorId,now,resultSavingEnabled})
 }})
}

// Deployment-facing factory. Disabled by default; no raw owner query fallback.
export function createSynchronRestrictedHandler({begin,enabled=false,...config}={}){
 if(enabled!==true)return null
 const queries=createSynchronRestrictedQueries({begin})
 return createSynchronSupabaseHandler({...config,...queries,enabled:true})
}
