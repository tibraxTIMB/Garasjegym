import {execFileSync} from 'node:child_process'
import {readFileSync,statSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {HELP_VIDEOS} from '../src/lib/helpVideos.js'
import {storyboardHash} from './generate-help-videos.mjs'

const folder=fileURLToPath(new URL('../public/help/videos/',import.meta.url))
const manifest=JSON.parse(readFileSync(folder+'manifest.json','utf8'))
if(manifest.renderer!=='real-ui-demo')throw new Error('Forventa skjermopptak, men fann illustrerte videoar.')
if(manifest.sourceHash!==storyboardHash())throw new Error('Videoane er ikkje baserte på gjeldande hjelpetekst.')
for(const video of HELP_VIDEOS){
  if(!manifest.videos.includes(video.id))throw new Error(`Manglar videokapittel: ${video.id}`)
  const file=folder+video.id+'.mp4'
  if(statSync(file).size<25000)throw new Error(`For kort eller tom video: ${video.id}`)
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'}).trim())
  if(!Number.isFinite(duration)||duration<10||duration>240)throw new Error(`Ugyldig videolengd (${duration} s): ${video.id}`)
  const png=readFileSync(folder+video.id+'.png')
  if(png.length<3000||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`Manglande plakat: ${video.id}`)
  console.log(`${video.id}: verifisert opptak, ${duration.toFixed(1)} sekund`)
}
