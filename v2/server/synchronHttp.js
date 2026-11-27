// SERVER ONLY. No deployment, credentials or DB client are supplied here.
// The trusted host must implement fresh authorization and atomic persistence.
import {createSynchronDispatcher} from '../src/lib/synchronRuntime.js'
const LIMIT=64*1024
const genericIssue='Fellesøkta er ikkje tilgjengeleg.'
async function boundedJson(request){
 const length=request.headers.get('content-length')
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>LIMIT))throw Error('size')
 if(!request.body)throw Error('body')
 const reader=request.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true})
 let bytes=0,text=''
 try{
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>LIMIT){await reader.cancel();throw Error('size')}text+=decoder.decode(value,{stream:true})}
  text+=decoder.decode();return JSON.parse(text)
 }finally{reader.releaseLock()}
}
export function createSynchronHttpHandler({verifyToken,createHost,allowedOrigins=[]}={}){
 if(typeof verifyToken!=='function'||typeof createHost!=='function'||!Array.isArray(allowedOrigins)||allowedOrigins.some(o=>typeof o!=='string'||o==='*'||o==='null'))throw Error('Trusted HTTP configuration required')
 const origins=new Set(allowedOrigins)
 return async request=>{
  const origin=request.headers.get('origin'),allowed=!origin||origins.has(origin)
  const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','vary':'Origin'}
  if(origin&&allowed)headers['access-control-allow-origin']=origin
  const respond=(status,data)=>new Response(JSON.stringify(data),{status,headers})
  const deny=status=>respond(status,{issue:genericIssue})
  if(!allowed)return deny(403)
  if(request.method==='OPTIONS'){
   if(!origin||request.headers.get('access-control-request-method')!=='POST')return deny(405)
   return new Response(null,{status:204,headers:{...headers,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'authorization, apikey, content-type, x-client-info'}})
  }
  if(request.method!=='POST')return deny(405)
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return deny(415)
  const raw=request.headers.get('authorization')||'',match=/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.exec(raw)
  if(!match||raw.length>8192)return deny(401)
  const token=match[1]
  let actorId
  try{actorId=await verifyToken(token)}catch{return deny(401)}
  if(typeof actorId!=='string'||!actorId||actorId.length>128)return deny(401)
  let body
  try{body=await boundedJson(request)}catch{return deny(400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return deny(400)
  try{
   const host=await createHost({actorId,token})
   if(!host)return deny(503)
   // Identity is bound to the verified request, never to JSON or metadata.
   const dispatch=createSynchronDispatcher({...host,authenticate:async credential=>credential===token?actorId:null})
   return respond(200,await dispatch(token,body))
  }catch{return deny(503)}
 }
}
