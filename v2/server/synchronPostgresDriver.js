// Server-only adapter for Postgres.js. No owner-role or psql fallback.
export function createPostgresBegin(client){
 if(typeof client?.begin!=='function')throw Error('PostgreSQL transaction client required')
 return callback=>client.begin(async transaction=>{
  if(typeof transaction?.unsafe!=='function')throw Error('PostgreSQL transaction unavailable')
  return callback({query:async(sql,args=[])=>{
   if(typeof sql!=='string'||!Array.isArray(args))throw Error('Invalid parameterized query')
   return Array.from(await transaction.unsafe(sql,args))
  }})
 })
}
// Validate the dedicated connection before opening a socket. Use direct or
// session-pool mode; do not use transaction pool mode for this driver.
export function synchronConnectionOptions(raw,projectRef){
 if(typeof projectRef!=='string'||!/^[a-z0-9]{20}$/.test(projectRef)||typeof raw!=='string')throw Error('Restricted connection configuration required')
 let u
 try{u=new URL(raw)}catch{throw Error('Restricted connection configuration required')}
 const direct=u.hostname==='db.'+projectRef+'.supabase.co'&&u.username==='gg_synchron_login'
 const pooled=u.hostname.endsWith('.pooler.supabase.com')&&u.username==='gg_synchron_login.'+projectRef
 if(!['postgres:','postgresql:'].includes(u.protocol)||!(direct||pooled)||u.port!=='5432'||u.pathname!=='/postgres'||!u.password||u.search||u.hash)throw Error('Unsafe database connection configuration')
 return {ssl:{rejectUnauthorized:true},prepare:false,max:1,connect_timeout:5,idle_timeout:15,max_lifetime:120}
}
