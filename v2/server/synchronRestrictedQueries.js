// Trusted server-side connection adapter. Inject a driver whose begin()
// keeps the callback on a single connection and commits only on success.
// No connection string, secret, driver import or runtime enablement here.
const loginCheck="SELECT current_user = 'gg_synchron_login' AND session_user = 'gg_synchron_login' AND NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolinherit) AS ok FROM pg_roles r WHERE r.rolname=current_user"
const roleCheck="SELECT current_user = 'gg_synchron_server' AND session_user = 'gg_synchron_login' AND NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolcanlogin) AS ok FROM pg_roles r WHERE r.rolname=current_user"
const sessionCheck='SELECT gg_synchron_private.session_active($1::uuid,$2::uuid) AS value'
const lockSession='SELECT gg_synchron_private.require_active_session($1::uuid,$2::uuid)'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const verified=rows=>Array.isArray(rows)&&rows.length===1&&rows[0]?.ok===true
export function createSynchronRestrictedQueries({begin}={}){
 if(typeof begin!=='function')throw Error('Restricted transaction driver required')
 const run=(operation)=>begin(async tx=>{
  if(typeof tx?.query!=='function')throw Error('Restricted transaction required')
  const execute=(sql,args=[])=>tx.query(sql,args)
  if(!verified(await execute(loginCheck)))throw Error('Unsafe database login')
  await execute('SET LOCAL ROLE gg_synchron_server')
  if(!verified(await execute(roleCheck)))throw Error('Unsafe database role')
  await execute("SET LOCAL statement_timeout = '5000ms'")
  await execute("SET LOCAL lock_timeout = '2000ms'")
  await execute("SET LOCAL idle_in_transaction_session_timeout = '5000ms'")
  const rows=await operation(execute)
  if(!Array.isArray(rows))throw Error('Invalid database response')
  return {rows}
 })
 return {
  query:(sql,args)=>{
   if(sql!==sessionCheck||!Array.isArray(args)||args.length!==2||args.some(x=>typeof x!=='string'||!uuid.test(x)))throw Error('Unbound database operation')
   return run(execute=>execute(sql,args))
  },
  sessionQuery:({actorId,sessionId}={},sql,args=[])=>{
   if(typeof actorId!=='string'||typeof sessionId!=='string'||!uuid.test(actorId)||!uuid.test(sessionId)||typeof sql!=='string'||!Array.isArray(args))throw Error('Invalid session binding')
   return run(async execute=>{
    await execute(lockSession,[actorId,sessionId])
    return execute(sql,args)
   })
  }
 }
}
