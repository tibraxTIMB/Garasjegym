// Explicit opt-in client transport. Never use a caller-supplied endpoint.
// Supabase verifies the user token on the server; local session is only a transport credential.
import {createSynchronRuntime} from './synchronRuntime.js'
import {startupDeadline} from './startupDeadline.js'
const unavailable=()=>({issue:'Fellesøkta er ikkje stadfesta. Kontroller tilkoplinga før nytt forsøk.'})
export function createAuthenticatedSynchronRuntime({actorId,auth,functions,enabled=false,individualCalibrationEnabled=false,resultSavingEnabled=false}={}){
 if(enabled!==true||typeof actorId!=='string'||!actorId||typeof auth?.getSession!=='function'||typeof functions?.invoke!=='function')return null
 async function sessionToken(){
  const result=await startupDeadline(()=>auth.getSession()),session=result?.data?.session
  if(result?.error||session?.user?.id!==actorId||typeof session.access_token!=='string'||!session.access_token)return null
  return session.access_token
 }
 async function invoke(body){
  try{
   const token=await sessionToken()
   if(!token)return unavailable()
   const result=await startupDeadline(()=>functions.invoke('synchron-live',{body,headers:{Authorization:'Bearer '+token}}))
   // A changed session (including a refresh) must not acknowledge an uncertain action.
   if(await sessionToken()!==token||result?.error||!result?.data||typeof result.data!=='object'||Array.isArray(result.data))return unavailable()
   return result.data
  }catch{return unavailable()}
 }
 return createSynchronRuntime({actorId,invoke,discoveryEnabled:true,individualCalibrationEnabled,resultSavingEnabled})
}
