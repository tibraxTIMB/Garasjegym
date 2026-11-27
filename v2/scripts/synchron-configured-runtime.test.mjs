import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createConfiguredSynchronRuntime} from '../src/lib/synchronConfiguredRuntime.js'
const actorId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const sessionId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
function fixture(){
 const calls=[]
 const config={enabled:'true',project:'https://izwzwvlexqxqewzijhhd.supabase.co',actorId,profile:{id:actorId,active:true,membership_status:'approved'},profileReady:true,authReady:true,client:{auth:{getSession:async()=>({data:{session:{user:{id:actorId},access_token:'fixture'}}})},functions:{invoke:async(name,args)=>{calls.push({name,...args});return {data:{active:null}}}}}}
 return {config,calls}
}
test('default disabled and every approval, project and lab gate fail closed',()=>{
 const {config,calls}=fixture()
 for(const patch of [{enabled:undefined},{enabled:true},{enabled:'false'},{project:'https://wrong.example'},{tabletLab:true},{blocked:true},{authReady:false},{profileReady:false},{actorId:null},{profile:{...config.profile,id:'other'}},{profile:{...config.profile,active:false}},{profile:{...config.profile,membership_status:'pending'}},{client:null}])assert.equal(createConfiguredSynchronRuntime({...config,...patch}),null)
 assert.equal(calls.length,0)
})
test('approved explicit configuration uses existing fixed authenticated endpoint, result saving separately opt-in',async()=>{
 const {config,calls}=fixture()
 const runtime=createConfiguredSynchronRuntime(config)
 assert.equal(runtime.actorId,actorId)
 assert.deepEqual(await runtime.discover(),{active:null})
 assert.deepEqual(calls,[{name:'synchron-live',body:{op:'discover'},headers:{Authorization:'Bearer fixture'}}])
 assert.equal(runtime.adapter(sessionId).saveResult,undefined)
 assert.equal(typeof createConfiguredSynchronRuntime({...config,resultSavingEnabled:'true'}).adapter(sessionId).saveResult,'function')
 assert.equal(runtime.recordIndividualCalibration,undefined)
})
test('App runtime is memoized and ordinary release workflow does not enable it',()=>{
 const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8')
 const release=readFileSync(new URL('../../.github/workflows/deploy-sturmkopf-pages.yml',import.meta.url),'utf8')
 assert.match(app,/const synchronRuntime=useMemo/)
 assert.match(app,/tabletLab\|\|labMode\|\|passwordRecovery\|\|invitationPending/)
 assert.match(app,/VITE_GG_SYNCHRON_ENABLED/)
 assert.doesNotMatch(release,/VITE_GG_SYNCHRON_ENABLED:\s*['"]?true/)
})
