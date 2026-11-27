import {createPostgresBegin,synchronConnectionOptions} from './synchronPostgresDriver.js'
import {createSynchronRestrictedHandler} from './synchronSupabaseAuth.js'
const project='izwzwvlexqxqewzijhhd'
const api='https://'+project+'.supabase.co'
const origin='https://tibraxtimb.github.io'
const unavailable=()=>new Response(JSON.stringify({issue:'Fellesøkta er ikkje tilgjengeleg.'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}})
// This is a deployment candidate, not an enabled production endpoint.
// Never read the platform owner database URL, service-role key or browser input.
export function createSynchronEdgeCandidate({env,postgres,createClient}={}){
 if(typeof env!=='function'||env('GG_SYNCHRON_ENABLED')!=='true')return unavailable
 if(typeof postgres!=='function'||typeof createClient!=='function'||env('SUPABASE_URL')!==api)throw Error('Invalid SYNCHRON deployment configuration')
 const key=env('GG_SYNCHRON_PUBLISHABLE_KEY')
 if(typeof key!=='string'||!key.startsWith('sb_publishable_'))throw Error('Publishable Auth key required')
 const raw=env('GG_SYNCHRON_DB_URL')
 const options=synchronConnectionOptions(raw,project)
 const client=postgres(raw,options)
 const auth=createClient(api,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}).auth
 return createSynchronRestrictedHandler({enabled:true,begin:createPostgresBegin(client),auth,issuer:api+'/auth/v1',allowedOrigins:[origin],resultSavingEnabled:env('GG_SYNCHRON_RESULT_SAVING_ENABLED')==='true'})
}
