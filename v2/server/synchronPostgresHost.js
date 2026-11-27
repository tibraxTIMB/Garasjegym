// Trusted server-only candidate adapter. Query must use parameterized SQL with
// a private connection, never the browser/Data API. Only verified actor ID.
export function createPostgresSynchronHost({query,actorId,now=Date.now,resultSavingEnabled=false}={}){
 if(typeof query!=='function'||typeof actorId!=='string'||!actorId)throw Error('Trusted PostgreSQL host required')
 const one=async(sql,args=[])=>{const r=await query(sql,args);if(!Array.isArray(r?.rows)||r.rows.length!==1)throw Error('Unexpected PostgreSQL response');return r.rows[0].value}
 const self=a=>a===actorId
 return {
  now,
  ...(resultSavingEnabled===true?{
   reservation:{workoutDate:state=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(state.startAt));const value=key=>parts.find(p=>p.type===key)?.value;return value('year')+'-'+value('month')+'-'+value('day')},tokenForMember:()=>crypto.randomUUID()},
   persistOwnResult:async(id,a)=>self(a)?one('SELECT gg_synchron_private.save_own_result($1::uuid,$2::uuid) AS value',[a,id]):null
  }:{}),
  // HTTP handler supplies independently verified authenticate.
  readCoachContext:async a=>self(a)?await one("SELECT jsonb_build_object('canCoach',gg_synchron_private.coach($1::uuid),'eligibleMemberIds',coalesce((SELECT jsonb_agg(member_id) FROM public.pt_client_assignments WHERE coach_user_id=$1::uuid AND gg_synchron_private.eligible($1::uuid,member_id)),'[]'::jsonb)) AS value",[a]):{canCoach:false,eligibleMemberIds:[]},
  readWod:async(id,a)=>self(a)?await one("SELECT (SELECT to_jsonb(w) FROM public.wods w WHERE id=$1::uuid AND is_published AND NOT coalesce(is_archived,false) AND gg_synchron_private.coach($2::uuid)) AS value",[id,a]):null,
  readCreation:async id=>one("SELECT (SELECT jsonb_build_object('actorId',leader,'fingerprint',fingerprint) FROM gg_synchron_private.sessions WHERE id=$1::uuid AND leader=$2::uuid AND gg_synchron_private.coach($2::uuid)) AS value",[id,actorId]),
  createAtomic:async r=>one("SELECT gg_synchron_private.create_atomic($1::uuid,$2::text::jsonb) AS value",[actorId,JSON.stringify(r)]),
  read:async id=>one("SELECT (SELECT state FROM gg_synchron_private.sessions WHERE id=$1::uuid AND gg_synchron_private.authorized($2::uuid,state)) AS value",[id,actorId]),
  authorizeSession:async({actorId:a,sessionId})=>self(a)&&await one("SELECT coalesce((SELECT gg_synchron_private.authorized($2::uuid,state) FROM gg_synchron_private.sessions WHERE id=$1::uuid),false) AS value",[sessionId,a])===true,
  compareAndSwap:async(id,revision,next,a)=>self(a)&&await one("SELECT gg_synchron_private.cas($1::uuid,$2::uuid,$3::bigint,$4::text::jsonb) AS value",[a,id,revision,JSON.stringify(next)])===true,
  authorizeDiscovery:async a=>self(a)&&await one("SELECT gg_synchron_private.active_account($1::uuid) AS value",[a])===true,
  readActiveSession:async a=>{if(!self(a))throw Error('Wrong actor');return one("SELECT (SELECT session_id::text FROM gg_synchron_private.slots WHERE actor=$1::uuid) AS value",[a])}
 }
}
