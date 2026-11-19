const normalize=value=>String(value||'').toLocaleLowerCase('nn-NO').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()
const formatFrom=text=>{
 const value=text.toLowerCase()
 if(/\bamrap\b/.test(value))return 'AMRAP'
 if(/\btabata\b/.test(value))return 'Tabata'
 if(/\be[1-7]mom\b|\bemom\b/.test(value)){const n=Number(value.match(/e([1-7])mom/)?.[1]||1);return 'E'+n+'MOM'}
 if(/\bstation|stasjonssirkel\b/.test(value))return 'Stasjonssirkel'
 if(/\bcomplex\b|kompleks/.test(value))return 'Complex'
 if(/\bintervall|intervals\b/.test(value))return 'Intervall'
 return null
}
export function parseWodImport(source,exerciseCatalog=[]){
 const lines=String(source||'').split(/\r?\n/).map(line=>line.replace(/[•·]/g,' ').trim()).filter(Boolean)
 if(!lines.length)throw new Error('Lim inn WOD-tekst eller last opp ei tekstfil først.')
 const whole=lines.join('\n')
 const schemeLine=lines.find(line=>/\b\d{1,3}\s*[-–/]\s*\d{1,3}(?:\s*[-–/]\s*\d{1,3})+\b/.test(line))
 const scheme=schemeLine?.match(/\d{1,3}/g)?.map(Number)||null
 const first=lines[0]
 const firstIsMetadata=/\b(amrap|emom|tabata|for time|chipper|intervall|rounds?|rundar)\b/i.test(first)||/\d+\s*(min|minutes|minutt)/i.test(first)
 const name=!firstIsMetadata&&first.length<=48&&!/^\d/.test(first)?first:'Importert WOD'
 const minutesMatch=whole.match(/\b(\d{1,3})\s*(?:min(?:utt)?|minutes?)\b/i)
 const minutes=minutesMatch?Number(minutesMatch[1]):null
 const roundsMatch=whole.match(/\\b(\\d{1,2})\\s*(?:rounds?|rundar)\\b/i)
 const rounds=roundsMatch?Number(roundsMatch[1]):1
 const items=[]
 for(const line of lines){
  if(line===name||line===schemeLine)continue
  if(/\b(amrap|emom|tabata|for time|chipper|stasjonssirkel|intervall)\b/i.test(line)&&!/(thruster|squat|deadlift|pull|push|row|run|clean|snatch|burpee|plank|press|bike|wall ball|box)/i.test(line))continue
  if(/^\d+\s*(?:min|minutes|minutt)/i.test(line)||/^\d+\s*(?:rounds?|rundar)/i.test(line))continue
  const loadMatch=line.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)\b/i)
  const load=loadMatch?Number(loadMatch[1].replace(',','.'))*(/lb/i.test(loadMatch[2])?0.45359237:1):null
  let exerciseText=line.replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|kgs|lb|lbs)\b/ig,'').trim()
  let reps=scheme?scheme.join('-'):null
  const prefix=exerciseText.match(/^(\d+(?:\s*[-–/]\s*\d+)*)\s*(?:x|×)?\s+(.+)$/i)
  if(prefix){reps=prefix[1].replace(/\s/g,'');exerciseText=prefix[2].trim()}
  const suffix=exerciseText.match(/^(.+?)\s+(\d+(?:\s*[-–/]\s*\d+)*)\s*(?:reps?|repetisjonar?)?$/i)
  if(suffix){exerciseText=suffix[1].trim();reps=suffix[2].replace(/\s/g,'')}
  exerciseText=exerciseText.replace(/^[-–*\d.)\s]+/,'').replace(/\s+/g,' ').trim()
  if(!exerciseText||/^(round|runde|rest|pause)$/i.test(exerciseText))continue
  const key=normalize(exerciseText)
  const match=exerciseCatalog.find(ex=>normalize(ex.name)===key)||exerciseCatalog.find(ex=>normalize(ex.name).includes(key)||key.includes(normalize(ex.name)))
  items.push({name:match?.name||exerciseText,exercise:match||null,reps:reps||'10',loadKg:load,matched:Boolean(match)})
 }
 if(!items.length)throw new Error('Fann ingen sikre øvingslinjer. Kontroller teksten og prøv igjen.')
 const format=formatFrom(whole)||(scheme?'For Time':null)
 return {name,format,minutes,rounds,items,notes:'Importert kjeldetekst:\n'+whole,unmatched:items.filter(item=>!item.matched).map(item=>item.name)}
}
