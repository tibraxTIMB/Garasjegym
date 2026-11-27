// Descriptive comparison only: not a fatigue curve, an estimated 1RM,
// an intensity recommendation or proof of actual repetitions.
// Host must verify identity, maximal single test, load convention and provenance.
const id=x=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=128
const positive=x=>Number.isFinite(x)&&x>0
export function synchronStrengthReferenceIssue(r){
 if(r?.version!==1||r.kind!=='tested_1rm'||r.source!=='observed'||r.reps!==1||r.maximal!==true||r.loadKind!=='external_kg'||!id(r.referenceId)||!id(r.memberId)||!id(r.exerciseId)||!id(r.variant)||!positive(r.loadKg)||!Number.isSafeInteger(r.observedAt)||r.observedAt<0)return 'Manglar dokumentert maksløft med eintydig belastning.'
 return null
}
export function synchronRelativeLoad(records,query){
 if(!Array.isArray(records)||!query||!positive(query.loadKg)||!Number.isSafeInteger(query.before))return null
 const matching=records.filter(r=>!synchronStrengthReferenceIssue(r)&&r.memberId===query.memberId&&r.exerciseId===query.exerciseId&&r.variant===query.variant&&r.observedAt<query.before)
 if(!matching.length)return null
 // Do not choose a favourable value from inconsistent duplicate evidence.
 const seen=new Map()
 for(const r of matching){const sig=JSON.stringify([r.observedAt,r.loadKg]);if(seen.has(r.referenceId)&&seen.get(r.referenceId)!==sig)return null;seen.set(r.referenceId,sig)}
 const newest=Math.max(...matching.map(r=>r.observedAt)),latest=matching.filter(r=>r.observedAt===newest)
 if(new Set(latest.map(r=>r.loadKg)).size!==1)return null
 const referenceKg=latest[0].loadKg,ratio=100*query.loadKg/referenceKg
 if(!Number.isFinite(ratio*10))return null
 return {version:1,kind:'external_kg_vs_tested_1rm',referenceKg,referenceAt:newest,percent:Math.round(ratio*10)/10,ageDays:Math.floor((query.before-newest)/86400000),aboveReference:ratio>100}
}
// Stored metadata validation; the historical ratio is frozen, never silently
// recomputed against a newer record.
export function validSynchronRelativeLoad(value,loadKg){
 if(value?.version!==1||value.kind!=='external_kg_vs_tested_1rm'||!positive(loadKg)||!positive(value.referenceKg)||!Number.isSafeInteger(value.referenceAt)||value.referenceAt<0||!Number.isSafeInteger(value.ageDays)||value.ageDays<0)return null
 const ratio=100*loadKg/value.referenceKg
 if(!Number.isFinite(ratio*10)||value.percent!==Math.round(ratio*10)/10||value.aboveReference!==(ratio>100))return null
 return {version:1,kind:value.kind,referenceKg:value.referenceKg,referenceAt:value.referenceAt,percent:value.percent,ageDays:value.ageDays,aboveReference:value.aboveReference}
}
