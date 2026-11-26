const prefix='gg.werkstatt.plan-project.v1.'
export function readPlanProject(memberId,storage=globalThis.localStorage){
 if(!memberId)return null
 try{const p=JSON.parse(storage.getItem(prefix+memberId)||'null');return p?.version===1&&typeof p.title==='string'&&Array.isArray(p.rows)&&p.rows.length<=364?p:null}catch{return null}
}
export function savePlanProject(memberId,project,storage=globalThis.localStorage){
 if(!memberId||typeof project?.title!=='string'||!Array.isArray(project.rows)||project.rows.length>364)return false
 try{const rows=project.rows.map(r=>Object.fromEntries(['week','day','title','wod','minutes','kind'].map(k=>[k,r[k]??''])));const data={version:1,title:project.title.slice(0,160),rows};const json=JSON.stringify(data);if(json.length>1000000)return false;storage.setItem(prefix+memberId,json);return storage.getItem(prefix+memberId)===json}catch{return false}
}
export function clearPlanProject(memberId,storage=globalThis.localStorage){if(memberId)try{storage.removeItem(prefix+memberId)}catch{}}
