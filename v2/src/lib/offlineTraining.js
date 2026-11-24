const key=id=>'garasjegym.offline-library.v1.'+id
const MAX_AGE=7*86400000
export function readOfflineLibrary(id,storage,now=Date.now()){
 try{const x=JSON.parse((storage??globalThis.localStorage).getItem(key(id))||'null')
 return id&&x?.memberId===id&&x.version===1&&now-x.savedAt>=0&&now-x.savedAt<MAX_AGE&&Array.isArray(x.wods)&&Array.isArray(x.exercises)?x:null}catch{return null}
}
export function writeOfflineLibrary(id,wods,exercises,storage,now=Date.now()){
 if(!id||!Array.isArray(wods)||!Array.isArray(exercises))return false
 try{const s=storage??globalThis.localStorage
 const published=wods.filter(w=>w.is_published===true&&!w.is_archived)
 s.setItem(key(id),JSON.stringify({version:1,memberId:id,savedAt:now,wods:published,exercises}))
 return !!readOfflineLibrary(id,s,now)}catch{return false}
}
export function isOffline(){return typeof navigator!=='undefined'&&navigator.onLine===false}
