// Server-only, fixed operation map; no SQL forwarded to the Data API.
import {createSynchronSupabaseHandler} from './synchronSupabaseAuth.js'
const operations=new Map([
 ["SELECT gg_synchron_private.save_own_result($1::uuid,$2::uuid) AS value",{op:'save_own_result',shape:["actor","id"]}],
 ["SELECT jsonb_build_object('canCoach',gg_synchron_private.coach($1::uuid),'eligibleMemberIds',coalesce((SELECT jsonb_agg(member_id) FROM public.pt_client_assignments WHERE coach_user_id=$1::uuid AND gg_synchron_private.eligible($1::uuid,member_id)),'[]'::jsonb)) AS value",{op:'coach_context',shape:["actor"]}],
 ["SELECT (SELECT to_jsonb(w) FROM public.wods w WHERE id=$1::uuid AND is_published AND NOT coalesce(is_archived,false) AND gg_synchron_private.coach($2::uuid)) AS value",{op:'read_wod',shape:["id","actor"]}],
 ["SELECT (SELECT jsonb_build_object('actorId',leader,'fingerprint',fingerprint) FROM gg_synchron_private.sessions WHERE id=$1::uuid AND leader=$2::uuid AND gg_synchron_private.coach($2::uuid)) AS value",{op:'read_creation',shape:["id","actor"]}],
 ["SELECT gg_synchron_private.create_atomic($1::uuid,$2::text::jsonb) AS value",{op:'create_atomic',shape:["actor","payload"]}],
 ["SELECT (SELECT state FROM gg_synchron_private.sessions WHERE id=$1::uuid AND gg_synchron_private.authorized($2::uuid,state)) AS value",{op:'read_state',shape:["id","actor"]}],
 ["SELECT coalesce((SELECT gg_synchron_private.authorized($2::uuid,state) FROM gg_synchron_private.sessions WHERE id=$1::uuid),false) AS value",{op:'authorize',shape:["id","actor"]}],
 ["SELECT gg_synchron_private.cas($1::uuid,$2::uuid,$3::bigint,$4::text::jsonb) AS value",{op:'cas',shape:["actor","id","revision","payload"]}],
 ["SELECT gg_synchron_private.active_account($1::uuid) AS value",{op:'active_account',shape:["actor"]}],
 ["SELECT (SELECT session_id::text FROM gg_synchron_private.slots WHERE actor=$1::uuid) AS value",{op:'read_active_session',shape:["actor"]}]
])
const sessionSql='SELECT gg_synchron_private.session_active($1::uuid,$2::uuid) AS value'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function createSynchronManagedQueries({rpc}={}){
 if(typeof rpc!=='function')throw Error('Trusted server RPC required')
 const invoke=async request=>{
  const response=await rpc('gg_synchron_edge_query',{p_request:request})
  if(!response||response.error||!Object.hasOwn(response,'data'))throw Error('SYNCHRON database unavailable')
  return {rows:[{value:response.data}]}
 }
 return {
  query:(sql,args)=>{
   if(sql!==sessionSql||!Array.isArray(args)||args.length!==2||!args.every(v=>typeof v==='string'&&uuid.test(v)))throw Error('Unbound session check')
   return invoke({op:'session_active',actor:args[0],session:args[1]})
  },
  sessionQuery:({actorId,sessionId}={},sql,args=[])=>{
   const entry=operations.get(sql)
   if(!entry||!uuid.test(actorId||'')||!uuid.test(sessionId||'')||!Array.isArray(args)||args.length!==entry.shape.length)throw Error('Unbound server operation')
   const req={op:entry.op,actor:actorId,session:sessionId}
   for(const [i,key] of entry.shape.entries()){
    const val=args[i]
    if(key==='actor'){if(val!==actorId)throw Error('Actor mismatch')}
    else if(key==='id'){if(typeof val!=='string'||!uuid.test(val))throw Error('Invalid target');req.id=val}
    else if(key==='revision'){if(!Number.isSafeInteger(val)||val<0)throw Error('Invalid revision');req.revision=val}
    else if(key==='payload'){const payload=JSON.parse(val);if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Invalid payload');req.payload=payload}
   }
   return invoke(req)
  }
 }
}
const key=(env,name,legacy)=>{const raw=env(name);if(raw){const parsed=JSON.parse(raw);if(typeof parsed.default==='string'&&parsed.default)return parsed.default}return env(legacy)}
export function createSynchronManagedEdge({env,createClient,enabled=false,resultSavingEnabled=false}={}){
 const unavailable=()=>new Response(JSON.stringify({issue:'Fellesøkta er ikkje tilgjengeleg.'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}})
 if(enabled!==true)return unavailable
 const api='https://izwzwvlexqxqewzijhhd.supabase.co'
 if(typeof env!=='function'||typeof createClient!=='function'||env('SUPABASE_URL')!==api)throw Error('Invalid SYNCHRON project')
 const publishable=key(env,'SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),secret=key(env,'SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY')
 if(!publishable||!secret||publishable===secret)throw Error('Managed server credentials missing')
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
 const auth=createClient(api,publishable,options).auth
 const server=createClient(api,secret,options)
 const queries=createSynchronManagedQueries({rpc:server.rpc.bind(server)})
 return createSynchronSupabaseHandler({...queries,auth,issuer:api+'/auth/v1',allowedOrigins:['https://tibraxtimb.github.io'],enabled:true,resultSavingEnabled})
}
