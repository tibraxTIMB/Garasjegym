// Generate automatic walkthroughs from genuine React views using local demo
// data. No account, test database, external video service or paid API is used.
import {spawn, spawnSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {makeVideoStoryboards,storyboardHash} from './generate-help-videos.mjs'
import {HELP_VIDEOS} from '../src/lib/helpVideos.js'

const root=fileURLToPath(new URL('../',import.meta.url))
const output=fileURLToPath(new URL('../public/help/videos/',import.meta.url))
const manifest=fileURLToPath(new URL('../public/help/videos/manifest.json',import.meta.url))
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','vite.video-demo.config.js'],{cwd:root,stdio:'inherit'})
const base='http://127.0.0.1:4173'
let ready=false

try {
  for(let attempt=0;attempt<100;attempt++) {
    if(server.exitCode!==null)throw new Error('Demotenaren stoppa før opptak.')
    try { const response=await fetch(base+'/video-demo.html'); if(response.ok){ready=true;break} } catch {/* waiting for Vite */}
    await new Promise(resolve=>setTimeout(resolve,300))
  }
  if(!ready)throw new Error('Videodemoen starta ikkje innan tidsfristen.')
  const python=process.env.HELP_VIDEO_PYTHON||'python3'
  const script=fileURLToPath(new URL('./record-real-help-videos.py',import.meta.url))
  const result=spawnSync(python,[script,'--base-url',base,'--output',output],{
    cwd:root,input:JSON.stringify(makeVideoStoryboards()),encoding:'utf8',stdio:['pipe','inherit','inherit'],
    timeout:300000,
  })
  if(result.error)throw result.error
  if(result.status!==0)throw new Error(`Videoopptaket feila med kode ${result.status}`)
  writeFileSync(manifest,JSON.stringify({sourceHash:storyboardHash(),renderer:'real-ui-demo',videos:HELP_VIDEOS.map(v=>v.id)},null,2)+'\n')
  console.log('Fem ekte skjermvisingar lagra, berre med demodata.')
} finally {
  server.kill('SIGTERM')
}
