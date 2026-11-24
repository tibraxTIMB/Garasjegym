// Gazelle: planning only; the existing fixed-slot timer remains authoritative.
import {getFixedSlotTimerState} from './timerClock.js'
import {isEmomFormat,emomIntervalSeconds} from './wodEngine.js'

export const isFixedInterval=format=>['Intervall','Tabata','Row Intervals'].includes(format)
export const clockLabel=seconds=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')
export function fixedIntervalSummary({workSeconds,restSeconds,rounds,exerciseCount}){
 if([workSeconds,restSeconds,rounds,exerciseCount].some(x=>x===''||x==null))return null
 const [work,rest,cycles,count]=[workSeconds,restSeconds,rounds,exerciseCount].map(Number)
 if(![work,rest,cycles,count].every(Number.isInteger)||work<1||work>600||rest<0||rest>600||cycles<1||cycles>30||count<1||count>8)return null
 const state=getFixedSlotTimerState({workSeconds:work,restSeconds:rest,rounds:cycles,slotsPerRound:count})
 return {workSeconds:work,restSeconds:rest,rounds:cycles,exerciseCount:count,totalIntervals:cycles*count,totalSeconds:state.totalSeconds,workTotal:work*cycles*count,restTotal:rest*(cycles*count-1)}
}
export function fixedIntervalLabel(plan){
 return plan?plan.rounds+' rundar × '+plan.exerciseCount+' øvingar = '+plan.totalIntervals+' arbeidsintervall · '+clockLabel(plan.totalSeconds)+' (utan siste kvilepause)':'Kontroller arbeid, kvile, rundar og øvingstal.'
}
// Compact box notation E2MOM35 means 35 total minutes, not 35 repetitions.
export function readEmomHeader(text){
 const raw=String(text||'')
 const repeat=raw.match(/\b(E(?:[1-7](?:[.,](?:25|5|75))?)?MOM)[ \t]*[x×][ \t]*(\d{1,3})\b/i)
 if(repeat){const format=repeat[1].toUpperCase().replace(',','.');return {format,minutes:Number(repeat[2])*emomIntervalSeconds(format)/60}}
 const every=raw.match(/\bevery[ \t]+(\d{1,4})[ \t]*(sec(?:onds?)?|s|min(?:utes?)?)[ \t]*[x×][ \t]*(\d{1,3})\b/i)
 if(every){const seconds=Number(every[1])*(/^min/i.test(every[2])?60:1);if(seconds>=5&&seconds<=3600)return {format:'EMOM',minutes:seconds*Number(every[3])/60,emomIntervalSeconds:seconds}}
 const m=raw.match(/\b(E(?:[1-7](?:[.,](?:25|5|75))?)?MOM)[ \t]*[:–-]?[ \t]*(\d{1,3})\b(?![ \t]*\/)/i)
 return m?{format:m[1].toUpperCase().replace(',','.'),minutes:Number(m[2])}:null
}
// Only labelled timing or a complete slash pair in a format/standalone line.
export function readFixedTiming(text){
 const pairs=[]
 for(const line of String(text||'').split(/\r?\n/)){
  const s=line.trim()
  let m=s.match(/(?:^|\b)(\d{1,3})\s*(?:sek(?:und)?|s|sec(?:onds?)?)?\s*(?:arbeid|work)\s*[,/+\-–]?\s*(\d{1,3})\s*(?:sek(?:und)?|s|sec(?:onds?)?)?\s*(?:kvile|pause|rest)\b/i)
  if(!m&&(/^(?:\d{1,3}\s*\/\s*\d{1,3})(?:\s*(?:sek|s|sec))?(?:\s*(?:[x×]\s*\d+|\d+\s*(?:rundar|rounds|arbeidsintervall)))?\s*$/i.test(s)||/\b(?:intervall|intervals?|tabata|E(?:[1-7](?:[.,]\d+)?)?MOM)\b/i.test(s)||readEmomHeader(s))){
   m=s.match(/(?<![\d/-])(\d{1,3})\s*\/\s*(\d{1,3})(?![\d/-])/)
  }
  if(m)pairs.push([Number(m[1]),Number(m[2])])
 }
 const unique=[...new Set(pairs.map(x=>x.join('/')))]
 if(unique.length!==1)return null
 const [workSeconds,restSeconds]=unique[0].split('/').map(Number)
 return workSeconds>0&&workSeconds<=600&&restSeconds>=0&&restSeconds<=600?{workSeconds,restSeconds}:null
}
export function intervalAdvice({format,periodSeconds,durationSeconds,workSeconds,restSeconds,exerciseCount,rotating}){
 if(!isEmomFormat(format)||!rotating||!Number.isInteger(Number(periodSeconds))||Number(periodSeconds)<5||!Number.isInteger(Number(durationSeconds))||Number(durationSeconds)<=0||Number(workSeconds)+Number(restSeconds)!==Number(periodSeconds)||Number(durationSeconds)%Number(periodSeconds)!==0)return null
 const plan=fixedIntervalSummary({workSeconds,restSeconds,rounds:Number(durationSeconds)/Number(periodSeconds)/Number(exerciseCount),exerciseCount})
 return plan?{...plan,format:'Intervall',sourceSeconds:Number(durationSeconds),finalRestSeconds:plan.restSeconds}:null
}
export function importIntervalAdvice(parsed,exerciseCount){
 const timing=parsed?.fixedTiming
 if(!timing||!isEmomFormat(parsed?.format))return null
 return intervalAdvice({format:parsed.format,periodSeconds:emomIntervalSeconds(parsed.format,{work_every_seconds:parsed.emomIntervalSeconds}),durationSeconds:Number(parsed.minutes)*60,...timing,exerciseCount,rotating:true})
}
