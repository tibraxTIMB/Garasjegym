export function flowKeyValue(value,key,{decimal=false,negative=false,time=false,fresh=false}={}){
 let v=String(value??'').replace(',','.')
 if(key==='clear')return ''
 if(key==='backspace')return fresh?'':v.slice(0,-1)
 if(key==='-')return negative?(v.startsWith('-')?v.slice(1):'-'+v):v
 if(key==='.'||key===','){if(!decimal||time)return v;return fresh?'0.':v.includes('.')?v:(v||'0')+'.'}
 if(key===':'){if(!time||fresh||!v||v.includes(':'))return v;return v+':'}
 if(!/^[0-9]$/.test(key))return v
 return fresh?key:v==='0'?key:v+key
}
export function flowStepValue(value,delta,min=0,max=Infinity){
 if(value==null||String(value).trim()===''||!Number.isFinite(Number(value)))return String(value??'')
 return String(Math.min(Number(max),Math.max(Number(min),Math.round((Number(value)+delta)*1000)/1000)))
}
export function flowAcceptValue(value,{decimal=false,negative=false,time=false}={}){
 const v=String(value??'').replace(',','.')
 if(time)return /^\d*(?::\d{0,2})?$/.test(v)?v:null
 const rule=decimal?(negative?/^-?\d*(?:\.\d*)?$/:/^\d*(?:\.\d*)?$/):(negative?/^-?\d*$/:/^\d*$/)
 return rule.test(v)?v:null
}
