export function normalizeWorkoutNote(value){
 return String(value||'').replace(/\\n/g,'\n').replace(/\r\n?/g,'\n')
}

export function splitWorkoutNote(value){
 const lines=normalizeWorkoutNote(value).split('\n')
 const system=[],personal=[]
 for(const line of lines){
  if(/^\s*(Timer:|Mellomtider:)/i.test(line))system.push(line.trim())
  else personal.push(line)
 }
 return {personal:personal.join('\n').trim(),system}
}

export function formatWorkoutSeconds(value){
 const seconds=Math.max(0,Math.floor(Number(value)||0))
 return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')
}

export function formatWorkoutSet(set){
 const parts=[]
 if(set.reps!=null)parts.push(set.reps+' reps')
 if(set.load_kg!=null)parts.push(set.load_kg+' kg')
 if(set.height_cm!=null)parts.push(set.height_cm+' cm')
 if(set.time_text)parts.push(set.time_text)
 else if(set.time_seconds!=null)parts.push(formatWorkoutSeconds(set.time_seconds))
 return parts.length?parts.join(' · '):'Ingen måleverdiar'
}

export function optionalNumber(value){
 const raw=String(value??'').trim().replace(',','.')
 if(!raw)return null
 const result=Number(raw)
 if(!Number.isFinite(result)||result<0)throw new Error('Bruk eit gyldig tal som er 0 eller høgare.')
 return result
}
