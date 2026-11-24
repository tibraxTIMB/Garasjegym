import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
const root=fileURLToPath(new URL('..',import.meta.url))
const spec=JSON.parse(readFileSync(path.join(root,'audio-source','generative-studio.json'),'utf8'))
const base='http://127.0.0.1:8001'
async function request(route,body){
 const res=await fetch(base+route,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(120000)})
 if(!res.ok)throw Error('ACE-Step HTTP '+res.status)
 const result=await res.json()
 if(result.code!==200)throw Error('ACE-Step rejected request: '+String(result.error))
 return result.data
}
export function generationRequest(profile,kind){
 return {task_type:'text2music',caption:kind==='victory'?profile.victory:profile.caption,lyrics:'[Instrumental]',instrumental:true,bpm:profile.bpm,key_scale:profile.key,time_signature:'4',audio_duration:kind==='victory'?24:48,batch_size:2,audio_format:'wav'}
}
async function generate(profile,kind,outDir){
 const params=generationRequest(profile,kind)
 const data=await request('/release_task',params)
 const taskId=data.task_id
 if(!taskId)throw Error('ACE-Step returned no task ID')
 const deadline=Date.now()+3600000
 while(Date.now()<deadline){
  const result=await request('/query_result',{task_id_list:[taskId]})
  const task=result.find(x=>x.task_id===taskId)
  if(task?.status===2)throw Error('Generation failed: '+profile.name+'/'+kind)
  if(task?.status===1){
   const tracks=typeof task.result==='string'?JSON.parse(task.result):task.result
   if(!Array.isArray(tracks)||!tracks.length)throw Error('No audio takes')
   const takes=[]
   for(const [i,track] of tracks.entries()){
    const url=new URL(track.file,base)
    if(url.origin!==base||url.pathname!=='/v1/audio')throw Error('Refusing nonlocal audio URL')
    const res=await fetch(url,{signal:AbortSignal.timeout(120000)})
    if(!res.ok)throw Error('Audio download failed')
    const buffer=Buffer.from(await res.arrayBuffer())
    if(buffer.length<1024)throw Error('Empty generation')
    const filename=profile.id+'-'+kind+'-'+(i+1)+'.wav'
    writeFileSync(path.join(outDir,filename),buffer,{flag:'wx'})
    takes.push({filename,sha256:createHash('sha256').update(buffer).digest('hex'),metadata:track.metas??null})
   }
   writeFileSync(path.join(outDir,profile.id+'-'+kind+'.json'),JSON.stringify({generator:'ACE-Step 1.5 local API',params,takes},null,2),{flag:'wx'})
   return
  }
  await delay(5000)
 }
 throw Error('ACE-Step generation timed out; no pack published')
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const selected=spec.profiles.filter(p=>!process.argv[2]||p.id===process.argv[2])
 if(!selected.length)throw Error('Choose pt, personal or group')
 const outDir=path.join(root,'audio-source','studio-takes',new Date().toISOString().replace(/[:.]/g,'-'))
 await request('/health')
 mkdirSync(outDir,{recursive:true})
 for(const p of selected)for(const kind of ['theme','victory']){console.log('Generating original takes: '+p.name+' / '+kind);await generate(p,kind,outDir)}
 console.log('Listening candidates saved to '+outDir+'. No production audio changed.')
}
