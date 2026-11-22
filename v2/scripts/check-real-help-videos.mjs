import {execFileSync} from 'node:child_process'
import {readFileSync,statSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {HELP_VIDEOS} from '../src/lib/helpVideos.js'
import {storyboardHash} from './generate-help-videos.mjs'

const folder=fileURLToPath(new URL('../public/help/videos/',import.meta.url))
const manifest=JSON.parse(readFileSync(folder+'manifest.json','utf8'))
if(manifest.renderer!=='real-ui-demo')throw new Error('Forventa skjermopptak, men fann illustrerte videoar.')
if(manifest.narration!=='piper-no_NO-talesyntese-medium-en-ipa-v2.1')throw new Error('Manglar godkjend norsk opplesing 2.1 med engelsk uttale av treningsord.')
if(manifest.sourceHash!==storyboardHash())throw new Error('Videoane er ikkje baserte på gjeldande hjelpetekst.')
for(const video of HELP_VIDEOS){
  if(!manifest.videos.includes(video.id))throw new Error(`Manglar videokapittel: ${video.id}`)
  const file=folder+video.id+'.mp4'
  if(statSync(file).size<25000)throw new Error(`For kort eller tom video: ${video.id}`)
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'}).trim())
  if(!Number.isFinite(duration)||duration<10||duration>240)throw new Error(`Ugyldig videolengd (${duration} s): ${video.id}`)
  const mp4Audio=execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_name','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'}).trim()
  if(mp4Audio!=='aac')throw new Error(`MP4 manglar opplesing: ${video.id}`)
  const webm=folder+video.id+'.webm'
  if(statSync(webm).size<25000)throw new Error(`Manglande WebM-fallback: ${video.id}`)
  const webmCodec=execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name','-of','default=noprint_wrappers=1:nokey=1',webm],{encoding:'utf8'}).trim()
  if(webmCodec!=='vp9')throw new Error(`Uventa WebM-kodek (${webmCodec}): ${video.id}`)
  const webmAudio=execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_name','-of','default=noprint_wrappers=1:nokey=1',webm],{encoding:'utf8'}).trim()
  if(webmAudio!=='opus')throw new Error(`WebM manglar opplesing: ${video.id}`)
  const png=readFileSync(folder+video.id+'.png')
  if(png.length<3000||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`Manglande plakat: ${video.id}`)
  console.log(`${video.id}: verifisert opptak, ${duration.toFixed(1)} sekund`)
}
