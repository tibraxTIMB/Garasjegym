// Translate user intent to existing timer/result contracts. No new runtime.
import {teamChipperConfig,youGoIGoConfig,doubleEmomConfig,engineSwapConfig,ironTwinsConfig,qualityRowConfig,activeRecoveryConfig,samspelChipper,samspelRelay,samspelDouble,samspelEmom,samspelStrength,samspelQuality,samspelRecovery} from './samspel.js'
import {isEmomFormat,emomIntervalSeconds} from './wodEngine.js'
export function partWorkOptions(block={}){
 if(block.warmup_group)return [['solo','Kvar for oss']]
 const options=[['solo','Kvar for oss']]
 if(['Chipper','For Time','AMRAP'].includes(block.format)||isEmomFormat(block.format))options.push(['together','Saman · same øvingar'])
 if(block.format==='Chipper')options.push(['share','Fordel repetisjonane'])
 if(block.format==='AMRAP')options.push(['turns','Annankvar runde'])
 if(isEmomFormat(block.format))options.push(['tracks','To øvingar · byt på tid'],['machine','Éi maskin · byt på tid'])
 if(block.format==='Strength')options.push(['strength','Tren styrke saman'])
 if(block.format==='Eigen økt')options.push(['quality','Øving og roing · byt'],['recovery','Rolig arbeid saman'])
 return options
}
export function partWorkIntent(block={}){
 const s=block.samspel
 if(samspelChipper(s))return 'share'
 if(samspelRelay(s))return 'turns'
 if(samspelDouble(s))return 'tracks'
 if(samspelEmom(s))return 'machine'
 if(samspelStrength(s))return 'strength'
 if(samspelQuality(s))return 'quality'
 if(samspelRecovery(s))return 'recovery'
 if(block.collaboration==='synchronized')return 'together'
 if(!s&&(!block.participation||block.participation==='individual'))return 'solo'
 return 'legacy'
}
export function partWorkPatch(block,intent,count=2){
 if(!partWorkOptions(block).some(([key])=>key===intent))return null
 const n=['tracks','strength','quality'].includes(intent)?2:Math.max(2,Math.min(8,Math.floor(Number(count)||2)))
 const duration=Math.round(Number(block.minutes||0)*60),every=emomIntervalSeconds(block.format,{work_every_seconds:block.emomIntervalSeconds})
 let samspel=null,collaboration='solo'
 if(intent==='together')collaboration='synchronized'
 if(intent==='share'){samspel=teamChipperConfig();collaboration='free_split'}
 if(intent==='turns'){samspel=youGoIGoConfig();collaboration='you_go_i_go'}
 if(intent==='tracks'){samspel=doubleEmomConfig(every,duration);collaboration='parallel'}
 if(intent==='machine'){samspel=engineSwapConfig(every,duration);collaboration='parallel'}
 if(intent==='strength'){samspel=ironTwinsConfig();collaboration='parallel'}
 if(intent==='quality'){samspel=qualityRowConfig(duration);collaboration='parallel'}
 if(intent==='recovery'){samspel=activeRecoveryConfig(duration);collaboration='parallel'}
 if(samspel)samspel={...samspel,participant_count:n}
 return {participation:intent==='solo'?'individual':n===2?'partner':'team',participant_count:intent==='solo'?1:n,collaboration,samspel,scoreMode:samspel?'none':'auto',flowReporting:samspel?'done':'auto'}
}
export function partWorkLabel(block){const intent=partWorkIntent(block);return partWorkOptions(block).find(([key])=>key===intent)?.[1]||'Tilpassa gjennomføring'}
