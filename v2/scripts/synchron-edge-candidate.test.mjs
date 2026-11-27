import test from 'node:test'
import assert from 'node:assert/strict'
import {createPostgresBegin,synchronConnectionOptions} from '../server/synchronPostgresDriver.js'
import {createSynchronEdgeCandidate} from '../server/synchronEdgeCandidate.js'
const project='izwzwvlexqxqewzijhhd'
test('only dedicated login, correct project, session port and verified TLS are accepted',()=>{
 const direct='postgres://gg_synchron_login:fixture@db.'+project+'.supabase.co:5432/postgres'
 const pooled='postgres://gg_synchron_login.'+project+':fixture@aws-0-eu-north-1.pooler.supabase.com:5432/postgres'
 for(const url of [direct,pooled]){
  const options=synchronConnectionOptions(url,project)
  assert.equal(options.ssl.rejectUnauthorized,true)
  assert.equal(options.prepare,false)
  assert.equal(options.max,1)
 }
 for(const url of [direct.replace('gg_synchron_login','postgres'),direct.replace(':5432',':6543'),direct+'?sslmode=disable',direct.replace(project,'aaaaaaaaaaaaaaaaaaaa'),direct.replace('.supabase.co','.supabase.co.example.invalid'),pooled.replace(project,'aaaaaaaaaaaaaaaaaaaa')])assert.throws(()=>synchronConnectionOptions(url,project))
})
test('driver forwards only parameterized arguments on the reserved transaction',async()=>{
 const calls=[]
 const begin=createPostgresBegin({begin:async fn=>fn({unsafe:async(sql,args)=>{calls.push([sql,args]);return [{value:true}]}})})
 assert.deepEqual(await begin(tx=>tx.query('SELECT $1::text AS value',['fixture'])),[{value:true}])
 assert.deepEqual(calls,[['SELECT $1::text AS value',['fixture']]])
 await assert.rejects(begin(tx=>tx.query(null,[])))
})
test('disabled Edge candidate creates no connection or Auth client',async()=>{
 const fail=()=>{throw Error('must not be called')}
 const handler=createSynchronEdgeCandidate({env:()=>undefined,postgres:fail,createClient:fail})
 assert.equal((await handler()).status,503)
 assert.throws(()=>createSynchronEdgeCandidate({env:key=>key==='GG_SYNCHRON_ENABLED'?'true':undefined,postgres:fail,createClient:fail}))
})
