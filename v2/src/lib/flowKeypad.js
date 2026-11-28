export function flowKeyValue(value,key,{decimal=false,negative=false,time=false,fresh=false}={}){
 let v=String(value??'').replace(',','.')
 if(key==='clear')return ''
 if(key==='backspace')return fresh?'':v.slice(0,-1)
 if(key==='-')return negative?(v.startsWith('-')?v.slice(1):'-'+v):v
 if(key==='.'||key===','){if(!decimal||time)return v;return fresh?'0.':v.includes('.')?v:(v||'0')+'.'}
 if(key===':'){if(!time||fresh||!v||v.endsWith(':')||v.split(':').length>=3)return v;const next=v+':';return flowAcceptValue(next,{time:true})??v}
 if(!/^[0-9]$/.test(key))return v
 const next=fresh?key:v==='0'?key:v+key
 return flowAcceptValue(next,{decimal,negative,time})??v
}
export function flowStepValue(value,delta,min=0,max=Infinity){
 if(value==null||String(value).trim()===''||!Number.isFinite(Number(value)))return String(value??'')
 return String(Math.min(Number(max),Math.max(Number(min),Math.round((Number(value)+delta)*1000)/1000)))
}
export function flowAcceptValue(value,{decimal=false,negative=false,time=false}={}){
 const v=String(value??'').replace(',','.')
 if(time)return /^(?:\d{1,3}(?::\d{0,2}){0,2})?$/.test(v)&&!v.includes('::')?v:null
 const rule=decimal?(negative?/^-?\d*(?:\.\d*)?$/:/^\d*(?:\.\d*)?$/):(negative?/^-?\d*$/:/^\d*$/)
 return rule.test(v)?v:null
}

// Return null at a boundary; never wrap or jump from a stale active element.
export function flowNavigationIndex(fields,active,delta,sameField=false){
 const index=fields.findIndex(x=>x===active)
 if(index<0||![-1,1].includes(delta))return null
 const key=active?.dataset?.flowField
 if(sameField&&!key)return null
 for(let i=index+delta;i>=0&&i<fields.length;i+=delta){
  if(!sameField||fields[i]?.dataset?.flowField===key)return i
 }
 return null
}

// Optional device feedback. Browser/OS policy may decline vibration; never block input.
export function flowHaptic(kind='tap',device=typeof navigator==='undefined'?null:navigator){
 const pattern=kind==='reject'?[12,24,12]:kind==='next'?18:kind==='done'?24:9
 try{return typeof device?.vibrate==='function'&&device.vibrate(pattern)===true}catch{return false}
}
