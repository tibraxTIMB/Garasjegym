// Sikkert bibliotektreff automatisk; liknande øvingar må stadfestast før import.
const normalize=value=>String(value||'').toLocaleLowerCase('nn-NO').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/æ/g,'ae').replace(/ø/g,'o').replace(/å/g,'a').replace(/[^a-z0-9]+/g,' ').trim()
const stem=value=>normalize(value).split(' ').map(word=>word.length>3&&!word.endsWith('ss')?word.replace(/ies$/,'y').replace(/(ches|shes|xes|zes)$/,(end)=>end.slice(0,-2)).replace(/s$/,''):word).join(' ')
import {COMPOSITE_FORMAT} from './compositeWod.js'

const aliases=[
 ['row','rowing','roing','romaskin','row erg','concept2 row'],
 ['strict press','striktpress','strictpress'],
 ['push press','pushpress'],
 ['goblet squat','hantel goblet squat','dumbbell goblet squat'],
 ['alternating dumbbell push jerk','alternerande hantel push jerk','hantel push jerk'],
 ['burpee over dumbbell','burpee over hantel','burpees over hantel'],
 ['bear crawl','bjørnekrabb','bjørnegang'],
 ['pull up','pull ups','pullup','pullups','strict pull up','chins'],
 ['push up','push ups','pushup','pushups','armheving','armhevingar'],
 ['air squat','air squats','kroppsvekt kneboy','kroppsvekt squat'],
 ['squat','squats','kneboy','knebøy'],
 ['wall ball','wall balls','wall ball shot','wall ball shots','wallball','wallballs'],
 ['thruster','thrusters'],['burpee','burpees'],
 ['deadlift','deadlifts','markloft','markløft'],
 ['box jump','box jumps','bokshopp','kassehopp'],
 ['double under','double unders','doubleunders','dobbelthopp'],
 ['run','running','loping','løping','jogging'],
 ['kettlebell swing','kettlebell swings','kb swing','kb swings'],
 ['clean and jerk','clean jerk','clean & jerk'],
 ['snatch','snatches'],['sit up','sit ups','situp','situps'],
 ['toes to bar','t2b'],['handstand push up','handstand push ups','hspu'],
 ['ski erg','ski ergometer','skierg'],
]
const aliasGroup=new Map(aliases.flatMap((group,index)=>group.map(alias=>[stem(alias),index])))
const words=value=>stem(value).split(' ').filter(Boolean)
const editDistance=(a,b)=>{
 const previous=Array.from({length:b.length+1},(_,i)=>i)
 for(let i=1;i<=a.length;i++){
  let diagonal=previous[0];previous[0]=i
  for(let j=1;j<=b.length;j++){
   const old=previous[j]
   previous[j]=Math.min(previous[j]+1,previous[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1))
   diagonal=old
  }
 }
 return previous[b.length]
}
const matchScore=(query,exercise)=>{
 const a=stem(query),b=stem(exercise.name)
 if(!a||!b)return 0
 if(a===b)return 1
 if(aliasGroup.has(a)&&aliasGroup.get(a)===aliasGroup.get(b))return .97
 const aWords=words(query),bWords=words(exercise.name)
 const overlap=aWords.filter(word=>bWords.includes(word)).length
 const wordScore=overlap/Math.max(aWords.length,bWords.length)
 const editScore=1-editDistance(a,b)/Math.max(a.length,b.length)
 const containing=a.length>=5&&b.length>=5&&(a.includes(b)||b.includes(a))
 let score=Math.max(wordScore*.83,editScore*.82,containing?.74:0)
 if(aliasGroup.has(a)&&aliasGroup.get(a)!==aliasGroup.get(b))score=Math.min(score,.7)
 return score
}
export function suggestWodExercises(query,catalog=[],limit=4){
 return catalog.filter(ex=>ex?.name).map(ex=>({exercise:ex,score:matchScore(query,ex)}))
  .filter(x=>x.score>=.4).sort((a,b)=>b.score-a.score||a.exercise.name.localeCompare(b.exercise.name,'nn-NO')).slice(0,limit)
}
const formatFrom=text=>{
 const value=text.toLowerCase()
 if(/\bamrap\b/.test(value))return 'AMRAP'
 if(/\btabata\b/.test(value))return 'Tabata'
 if(/\be(?:[1-7](?:\.25|\.5|\.75)?)?mom\b/.test(value)){
  const n=value.match(/\be([1-7](?:\.25|\.5|\.75)?)mom\b/)?.[1]
  return n?'E'+n+'MOM':'EMOM'
 }
 if(/\bstation|stasjonssirkel\b/.test(value))return 'Stasjonssirkel'
 if(/\bcomplex\b|kompleks/.test(value))return 'Complex'
 if(/\bintervall|intervals\b/.test(value))return 'Intervall'
 if(/\bfor\s*time\b|\bchipper\b/.test(value))return 'For Time'
 return null
}
const isHeading=line=>/^(?:økt|okt|workout|wod|treningsøkt)\s*(?:[#.:–-]?\s*\d+|\s*[:–-])/i.test(line)
const isMetadata=line=>{
 const s=normalize(line)
 return !s||/^(?:amrap|emom|e[1-7]mom|tabata|for time|chipper|complex|intervall|interval|rx|scaled|foundation|intermediate|exercise|exercises|ovingar|ovelser|movements|warmup|oppvarming|time cap|tidsgrense|reps|repetisjonar|rest|pause|round|rounds|runde|rundar|runder|workout notes|notes|notat)(?:\b|$)/.test(s)
  ||/^\d+\s*(?:min|minutes|minutt|rounds?|rundar|runder|sets?|sett)(?:\s+(?:amrap|emom|for time))?$/.test(s)
  ||/^(?:time cap|tidsgrense|duration|varigheit|tid|total tid|format)\b/.test(s)
  ||/^(?:m|k|men|women|menn|kvinner)\s*\d+\s*(?:kg|lbs?)\b/.test(s)
  ||/^\d+(?:\s*[-–/]\s*\d+){2,}$/.test(line.trim())
  ||/^(?:https?:\/\/|www\.)/i.test(line)
}
const parseMovementLine=(line,scheme)=>{
 const loadMatch=line.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)\b/i)
 const loadKg=loadMatch?Number(loadMatch[1].replace(',','.'))*(/lb/i.test(loadMatch[2])?.45359237:1):null
 let movement=line.replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|kgs|lb|lbs)\b/ig,'').replace(/^\s*(?:[-*•]|\d+[.)])\s+/,'').trim()
 let reps=scheme?scheme.join('-'):null,quantity=null
 const qtyStart=movement.match(/^(\d+(?:[.,]\d+)?)\s*(cal(?:ories)?|kcal|m|meters?|metres?|km|sek(?:und)?|sec(?:onds)?|min(?:utes?|utt)?)\s+(.+)$/i)
 const qtyEnd=movement.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(cal(?:ories)?|kcal|m|meters?|metres?|km|sek(?:und)?|sec(?:onds)?|min(?:utes?|utt)?)$/i)
 const qty=qtyStart||qtyEnd
 if(qty){
  const value=Number((qtyStart?qty[1]:qty[2]).replace(',','.'))
  const unit=(qtyStart?qty[2]:qty[3]).toLowerCase()
  quantity={value:unit==='km'?value*1000:value,unit:/^(cal|kcal)/.test(unit)?'cal':/^(sek|sec)/.test(unit)?'s':/^min/.test(unit)?'min':'m'}
  movement=(qtyStart?qty[3]:qty[1]).trim();reps=''
 }else{
  const prefix=movement.match(/^(\d+(?:\s*[-–/]\s*\d+)*)\s*(?:x|×)?\s+(.+)$/i)
  if(prefix){reps=prefix[1].replace(/\s/g,'');movement=prefix[2].trim()}
  const suffix=movement.match(/^(.+?)\s+(\d+(?:\s*[-–/]\s*\d+)*)\s*(?:reps?|repetisjonar?)?$/i)
  if(suffix){movement=suffix[1].trim();reps=suffix[2].replace(/\s/g,'')}
 }
 movement=movement.replace(/^[-–*\s]+/,'').replace(/\s+/g,' ').trim()
 return {text:movement,reps:reps??'10',quantity,loadKg}
}

/**
 * Distinguish workout instructions from movement lines. Pain Cave is a
 * multi-format WOD: E3MOM + AMRAP must remain separate on the clock.
 */

/**
 * Import clearly structured A–H workouts without guessing or calling paid AI.
 * Every part keeps its source text; uncertain exercises require admin review.
 */
function parseGeneralComposite(lines,catalog){
 const section=/^(?:del|part|blokk?|block)\s*([A-H])(?:\s*[-–—:.]\s*|\s+|$)(.*)$/i
 const found=lines.map((line,index)=>{const match=line.match(section);return match?{index,letter:match[1].toLowerCase(),title:match[2]?.trim()||''}:null}).filter(Boolean)
 if(found.length<2)return null
 if(found.length>8)throw Error('WOD-importen støttar høgst åtte delar (A–H).')
 const ids=new Set(found.map(x=>x.letter))
 if(ids.size!==found.length)throw Error('Same delbokstav finst fleire gonger. Kontroller A–H.')
 const blocks=[],items=[],warnings=[]
 const add=(name,reps,quantity,block,sourceLine,sets=null)=>{
  const candidates=suggestWodExercises(name,catalog)
  const exact=candidates.find(c=>c.score>=.95)
  const exercise=exact?.exercise||null
  items.push({name:exercise?.name||name,rawName:name,sourceLine,exercise,reps:String(reps??''),quantity:quantity||null,loadKg:null,
   block_id:block.id,matched:!!exercise,suggestions:exercise?[]:candidates.map(c=>c.exercise),sets})
 }
 const parseFormat=line=>{
  const text=line.toLowerCase()
  const emom=text.match(/\be(1(?:[.,]25)?|[2-7])mom\b(?:\s*[:–-]?\s*(\d{1,3}))?/)
  if(emom)return {format:'E'+emom[1].replace(',','.')+'MOM',minutes:Number(emom[2])||null}
  const amrap=text.match(/\bamrap\b(?:\s*(\d{1,3}))?/)
  if(amrap)return {format:'AMRAP',minutes:Number(amrap[1])||null}
  if(/\btabata\b/.test(text))return {format:'Tabata',minutes:null}
  if(/\bstasjonssirkel|station\s*circuit\b/.test(text))return {format:'Stasjonssirkel',minutes:null}
  if(/\brow\s*intervals\b/.test(text))return {format:'Row Intervals',minutes:null}
  if(/\bintervall|intervals?\b/.test(text))return {format:'Intervall',minutes:null}
  if(/\bsuperset|supersett\b/.test(text))return {format:'Superset',minutes:null}
  if(/\bcomplex|kompleks\b/.test(text))return {format:'Complex',minutes:null}
  if(/\bstrength|styrke\b/.test(text))return {format:'Strength',minutes:null}
  if(/\bchipper\b/.test(text))return {format:'Chipper',minutes:null}
  if(/\bcouplet\b/.test(text))return {format:'Couplet',minutes:null}
  if(/\btriplet\b/.test(text))return {format:'Triplet',minutes:null}
  if(/\bladder\b/.test(text))return {format:'Ladder',minutes:null}
  if(/\bdeath\s*by\b/.test(text))return {format:'Death By',minutes:null}
  if(/\bfor\s*time\b/.test(text))return {format:'For Time',minutes:null}
  if(/\bmobilitet|mobility\b/.test(text))return {format:'Eigen økt',minutes:null}
  return null
 }
 const findDuration=line=> {
  const match=line.match(/\b(?:time\s*cap|tidsgrense|varigheit|duration|tid|cap|inntil)\s*[:–-]?\s*(\d{1,3})\s*(?:min(?:utt)?|minutes?)?\b/i)||
    line.match(/\b(\d{1,3})\s*(?:minutt|min|minutes?)\b/i)
  return match?Number(match[1]):null
 }
 const parseRest=line=>{
  const m=line.match(/^(?:pause|kvile|rest|byte)\s*[:–-]?\s*(\d{1,4})\s*(sek(?:und)?|s|min(?:utt)?)\b/i)||
   line.match(/^(\d{1,4})\s*(sek(?:und)?|s|min(?:utt)?)\s*(?:pause|kvile|rest|byte)\b/i)
  return m?Number(m[1])*(m[2].toLowerCase().startsWith('min')?60:1):null
 }
 for(let j=0;j<found.length;j++){
  const mark=found[j],stop=found[j+1]?.index??lines.length
  const segment=lines.slice(mark.index,stop),block={id:mark.letter,title:'Del '+mark.letter.toUpperCase()+(mark.title?' – '+mark.title:''),format:null,minutes:null,transitionMode:'manual',transitionSeconds:0}
  let parsedInline=false
  const movementLines=[]
  for(const [rowIndex,line] of segment.entries()){
   if(rowIndex===0&&!mark.title)continue
   const pause=parseRest(line)
   if(pause!=null&&j<found.length-1){block.transitionMode='timed';block.transitionSeconds=pause;continue}
   const info=parseFormat(line)
   if(info){block.format=info.format;block.minutes=info.minutes||block.minutes}
   if(!block.minutes){const minutes=findDuration(line);if(minutes)block.minutes=minutes}
   const pairing=line.match(/:\s*(\d{1,3}\s+[\p{L}][^+;,]{2,75})\s*\+\s*(\d{1,3}\s+[\p{L}][^+;,]{2,75})/iu)
   if(pairing){
    for(const raw of [pairing[1],pairing[2]]){
     const clean=raw.replace(/\.\s*(?:originalen|rir|pt-notat).*$/i,'').trim()
     const result=parseMovementLine(clean,null)
     add(result.text,result.reps,result.quantity,block,line)
    }
    parsedInline=true
    continue
   }
   if(rowIndex===0||info||/^(?:notat|pt[-\s]?notat|original|skalering|variant|score|resultat|tips|oppvarming|warmup|tempo)\b/i.test(line))continue
   if(/^(\d{1,3}(?:\s*x\s*\d{1,3})?\s+(?:\d+(?:[.,]\d+)?\s*(?:m|km|cal|sek)\s+)?[\p{L}])/iu.test(line)){
    movementLines.push(line)
   } else if(!/^(?:\d+\s*(?:min|sek|rundar|rounds|sett)|(?:arbeid|kvile|pause)\b)/i.test(line)&&line.length>8){
    // No guessing: retain instruction for admin rather than introducing a fake movement.
    warnings.push('Kontroller tekst i '+block.title+': '+line.slice(0,90))
   }
  }
  if(!block.format)throw Error('Fann del '+mark.letter.toUpperCase()+', men ikkje eintydig WOD-format. Legg formatet inn i teksten.')
  const timed=/^(?:Intervall|Tabata|Row Intervals|Stasjonssirkel)$/.test(block.format)
  if(timed){
   const joint=segment.join(' ')
   const intervals=joint.match(/\b(\d{1,3})\s*(?:\/|sek\s*arbeid\s*[,+]\s*)\s*(\d{1,3})\s*(?:sek)?\b/i)
   const rounds=joint.match(/(?:[x×]\s*|rundar?\s*[:=]?\s*|rounds?\s*[:=]?\s*)(\d{1,2})\b/i)
   if(intervals){block.workSeconds=Number(intervals[1]);block.restSeconds=Number(intervals[2])}
   else if(block.format==='Tabata'){block.workSeconds=20;block.restSeconds=10}
   else warnings.push('Arbeid/kvile må kontrollerast i '+block.title)
   if(rounds)block.rounds=Number(rounds[1])
   else if(block.format==='Tabata')block.rounds=8
   else warnings.push('Rundar må kontrollerast i '+block.title)
  }
  for(const line of movementLines){
   const sets=line.match(/^(\d{1,2})\s*[x×]\s*(\d{1,3})\s+(.+)$/i)
   const parsed=parseMovementLine(sets?sets[2]+' '+sets[3]:line,null)
   if(parsed.text&&parsed.text.length<100)add(parsed.text,parsed.reps,parsed.quantity,block,line,sets?Number(sets[1]):null)
  }
  if(!items.some(x=>x.block_id===block.id))throw Error(block.title+' manglar tydelege øvingslinjer. Kontroller OCR-teksten.')
  if(timed&&!block.minutes && block.rounds && block.workSeconds){
   const count=items.filter(x=>x.block_id===block.id).length*block.rounds
   block.minutes=Math.max(1,Math.ceil((count*block.workSeconds+(count-1)*(block.restSeconds??0))/60))
  }
  if(!block.minutes)throw Error(block.title+' manglar varigheit eller tidsgrense. Legg inn minutt før import.')
  if(parsedInline&&movementLines.length===0)warnings.push('Kontroller repstal og E*MOM-timer i '+block.title)
  blocks.push(block)
 }
 const personalized=lines.join(' ').match(/\b(?:du|kunden|utøvar|utøvaren|personleg)\s*:\s*[^.]*?(\d{1,2})\s*[-–]\s*(\d{1,2})\s*RIR/i)
 const genericRir=lines.join(' ').match(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s*RIR/i)
 const rirTarget=personalized?personalized[1]+'–'+personalized[2]:genericRir?genericRir[1]+'–'+genericRir[2]:''
 if(rirTarget){
  for(const item of items){
   const parent=blocks.find(b=>b.id===item.block_id)
   if(parent&&(/MOM|Strength|Superset|Complex|Eigen økt/.test(parent.format)))item.rirTarget=rirTarget
  }
 }
 const unrecognized=items.filter(item=>!item.matched)
 const candidateTitle=lines[0].replace(/^(?:økt|okt)\s*\d+\s*[-–—:.·]?\s*/i,'').trim()
 const name=found[0].index>0&&candidateTitle.length>2&&candidateTitle.length<100?candidateTitle:'Samansett WOD'
 return {name,format:COMPOSITE_FORMAT,minutes:blocks.reduce((n,b)=>n+b.minutes,0),rounds:1,blocks,items,ignored:[],warnings,
  notes:'Importert kjeldetekst:\n'+lines.join('\n'),unmatched:unrecognized.map(item=>item.name)}
}

function parseStructuredComposite(lines, catalog) {
 const a=lines.findIndex(line=>/\bdel\s*a\b/i.test(line))
 const b=lines.findIndex((line,i)=>i>a&&/\bdel\s*b\b/i.test(line))
 if(a<0||b<a+1)return null
 const blockA=lines.slice(a,b).join(' ')
 const blockB=lines.slice(b).join(' ')
 const aFormat=blockA.match(/\b(E[1-7]MOM)\s*(\d{1,3})/i)
 const bFormat=blockB.match(/\bAMRAP\s*(\d{1,3})/i)
 if(!aFormat||!bFormat)return null
 const aPair=blockA.match(/(\d{1,2})\s*(striktpress|strict\s*press)\s*\+\s*(\d{1,2})\s*(pushpress|push\s*press)/i)
 if(!aPair)return null
 const blocks=[
  {id:'a',title:lines[a].replace(/^del\s*a\s*[-–:]?\s*/i,'Del A – '),format:aFormat[1].toUpperCase(),minutes:Number(aFormat[2])},
  {id:'b',title:'Del B – AMRAP',format:'AMRAP',minutes:Number(bFormat[1])}
 ]
 const items=[]
 const makeItem=(raw,reps,quantity,blockId,sourceLine,rirTarget='')=>{
  const candidates=suggestWodExercises(raw,catalog)
  const match=candidates.find(x=>x.score>=.95)?.exercise||null
  items.push({name:match?.name||raw,rawName:raw,sourceLine,exercise:match,reps:String(reps||''),quantity:quantity||null,loadKg:null,block_id:blockId,rirTarget,matched:!!match,suggestions:match?[]:candidates.map(x=>x.exercise)})
 }
 const individualized=lines.join(' ').match(/\b(?:du|kunden|utøvar)\s*:\s*[^.]*?([0-9]+)\s*[-–]\s*([0-9]+)\s*RIR/i)
 const rirTarget=individualized?individualized[1]+'–'+individualized[2]:''
 makeItem(aPair[2],aPair[1],null,'a',aPair[0],rirTarget)
 makeItem(aPair[4],aPair[3],null,'a',aPair[0],rirTarget)
 const cutoff=lines.findIndex((line,i)=>i>b&&/^(?:frå originalen|fra originalen|originale vek|pt.notat|skalering|etter økta|etter okt)/i.test(line))
 const end=cutoff>b?cutoff:lines.length
 for (const line of lines.slice(b+1,end)) {
  if(!/^\d{1,3}(?:\s*(?:m|meter|metres|cal|sek))?\s+\S/i.test(line))continue
  const parsed=parseMovementLine(line,null)
  if(parsed.text&&parsed.text.length<70)makeItem(parsed.text,parsed.reps,parsed.quantity,'b',line)
 }
 if(items.length<3)return null
 const sourceName=lines[0].replace(/^\s*(?:ØKT|OKT)\s*\d+\s*(?:[·.\-–:]|\s)\s*/i,'').trim()
 const name=sourceName&&sourceName.length<=100?sourceName:'Samansett WOD'
 return {name,format:COMPOSITE_FORMAT,minutes:blocks.reduce((sum,x)=>sum+x.minutes,0),rounds:1,blocks,items,ignored:[],notes:'Importert kjeldetekst:\n'+lines.join('\n'),unmatched:items.filter(x=>!x.matched).map(x=>x.name)}
}

export function parseWodImport(source,exerciseCatalog=[]){
 const lines=String(source||'').split(/\r?\n/).map(line=>line.replace(/[•·]/g,' ').trim()).filter(Boolean)
 if(!lines.length)throw new Error('Lim inn WOD-tekst eller last opp ei tekstfil først.')
 const structured=parseGeneralComposite(lines,exerciseCatalog)
 if(structured)return structured
 const composite=parseStructuredComposite(lines,exerciseCatalog)
 if(composite)return composite
 // Do not silently flatten multi-format OCR into one unsafe AMRAP.
 if(lines.some(line=>/\bdel\s*a\b/i.test(line))&&lines.some(line=>/\bdel\s*b\b/i.test(line))&&lines.some(line=>/\bE[1-7]MOM\b/i.test(line))&&lines.some(line=>/\bAMRAP\b/i.test(line)))throw new Error('Fann fleire øktdelar, men teksten var utydeleg. Kontroller OCR-linjene for E3MOM, AMRAP, repetisjonar og øvingsnamn før du importerer.')
 const whole=lines.join('\n')
 const schemeLine=lines.find(line=>/^\s*\d{1,3}\s*[-–/]\s*\d{1,3}(?:\s*[-–/]\s*\d{1,3})+\s*$/.test(line))
 const scheme=schemeLine?.match(/\d{1,3}/g)?.map(Number)||null
 const first=lines[0],firstMovement=parseMovementLine(first,scheme)
 const firstLooksLikeExercise=exerciseCatalog.some(ex=>matchScore(firstMovement.text,ex)>.9)
 const firstIsMetadata=isMetadata(first)||/^\d/.test(first)&&!isHeading(first)
 const name=!firstIsMetadata&&!firstLooksLikeExercise&&first.length<=80?first:'Importert WOD'
 const minutesMatch=whole.match(/\b(?:amrap|emom|time cap[:\s]*|tidsgrense[:\s]*)\s*(\d{1,3})\s*(?:min(?:utt)?|minutes?)?\b|\b(\d{1,3})\s*(?:min(?:utt)?|minutes?)\b/i)
 const minutes=minutesMatch?Number(minutesMatch[1]||minutesMatch[2]):null
 const roundsMatch=whole.match(/\b(\d{1,2})\s*(?:rounds?|rundar|runder)\b/i)
 const rounds=roundsMatch?Number(roundsMatch[1]):1
 const items=[],ignored=[]
 for(const line of lines){
  if(line===name||line===schemeLine||isHeading(line)||isMetadata(line)){if(line!==name&&line!==schemeLine)ignored.push(line);continue}
  const {text,reps,quantity,loadKg}=parseMovementLine(line,scheme)
  if(!text||/^\d+$/.test(text)||text.length>90||/^.{0,12}:\s*\d+$/i.test(text)){ignored.push(line);continue}
  const candidates=suggestWodExercises(text,exerciseCatalog)
  const exact=candidates.find(x=>x.score>=.95)
  const exercise=exact?.exercise||null
  items.push({name:exercise?.name||text,rawName:text,sourceLine:line,exercise,reps,quantity,loadKg,matched:!!exercise,suggestions:exercise?[]:candidates.map(x=>x.exercise)})
 }
 if(!items.length)throw new Error('Fann ingen sikre øvingslinjer. Kontroller teksten og prøv igjen.')
 const format=formatFrom(whole)||(scheme?'For Time':null)
 return {name,format,minutes,rounds,items,ignored,notes:'Importert kjeldetekst:\n'+whole,unmatched:items.filter(item=>!item.matched).map(item=>item.name)}
}
