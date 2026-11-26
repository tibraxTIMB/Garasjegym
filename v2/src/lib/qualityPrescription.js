import {qualityName,isMobilityExercise} from './exerciseQuality.js'
// Conservative, editable starting points for new WOD occurrences only.
// No universal kg, no overwrite of existing WODs or recorded results.
const starters=Object.freeze({
 "i t y w": {
  "r": 4,
  "n": "4 repetisjonar i kvar bokstavposisjon; roleg kontroll."
 },
 "wall slides": {
  "r": 8
 },
 "scapular push ups": {
  "r": 8
 },
 "scapular pull ups": {
  "r": 5
 },
 "open book": {
  "r": 5,
  "s": "both"
 },
 "90 90 hip switches": {
  "r": 8,
  "s": "alternating"
 },
 "hip cars": {
  "r": 3,
  "s": "both",
  "n": "Kontrollert sirkel i kvar retning."
 },
 "cossack squat": {
  "r": 5,
  "s": "both"
 },
 "deep squat hold": {
  "t": 20
 },
 "jefferson curl": {
  "r": 4,
  "n": "Utan ekstern vekt; roleg, komfortabel rørslebane."
 },
 "shoulder cars": {
  "r": 3,
  "s": "both"
 },
 "wrist circles": {
  "r": 5,
  "s": "both",
  "n": "Kvar retning."
 },
 "wrist flexor stretch": {
  "t": 20,
  "s": "both"
 },
 "wrist extension stretch": {
  "t": 20,
  "s": "both"
 },
 "adductor rock back": {
  "r": 6,
  "s": "both"
 },
 "couch stretch": {
  "t": 20,
  "s": "both"
 },
 "hamstring stretch": {
  "t": 20,
  "s": "both"
 },
 "pec doorway stretch": {
  "t": 20,
  "s": "both"
 },
 "lat stretch": {
  "t": 20
 },
 "child s pose": {
  "t": 20
 },
 "downward dog": {
  "t": 20
 },
 "low lunge": {
  "t": 20,
  "s": "both"
 },
 "pigeon stretch": {
  "t": 20,
  "s": "both"
 },
 "ankle rocks": {
  "r": 8,
  "s": "both"
 },
 "calf stretch": {
  "t": 20,
  "s": "both"
 },
 "cat cow": {
  "r": 8
 },
 "hip flexor stretch": {
  "t": 20,
  "s": "both"
 },
 "shoulder pass through": {
  "r": 8
 },
 "thoracic rotation": {
  "r": 5
 },
 "thread the needle": {
  "r": 5,
  "s": "both"
 },
 "world greatest stretch": {
  "r": 4,
  "s": "both"
 },
 "world s greatest stretch": {
  "r": 4,
  "s": "both"
 },
 "bird dog": {
  "r": 6,
  "s": "both"
 },
 "dead bug": {
  "r": 6,
  "s": "both"
 },
 "single leg balance": {
  "t": 20,
  "s": "both"
 },
 "single leg glute bridge": {
  "r": 8,
  "s": "both"
 },
 "pallof press": {
  "r": 8,
  "s": "both"
 },
 "banded lateral walk": {
  "r": 8,
  "n": "8 steg kvar veg."
 },
 "pilates clam": {
  "r": 8,
  "s": "both"
 },
 "pilates side kick": {
  "r": 8,
  "s": "both"
 },
 "pilates side plank": {
  "t": 15,
  "s": "both"
 },
 "pilates swimming": {
  "t": 20
 },
 "landmine press": {
  "r": 6,
  "s": "both"
 },
 "single leg rdl": {
  "r": 6,
  "s": "both"
 }
})
export function applyQualityStarter(ex,item){
 const preset=starters[qualityName(ex)]
 if(!preset||ex?.is_complex||ex?.is_rest)return item
 // Explicit catalogue profile wins, including a deliberately configured empty value.
 if(Object.keys(ex?.prescription_profiles?.levels||{}).length)return item
 if(preset.t&&Object.values(item.levels||{}).some(l=>l.loadMode==='kg'))return item
 const reps=preset.t?'':String(preset.r)
 const durationSeconds=preset.t?String(preset.t):''
 const levels=Object.fromEntries(Object.entries(item.levels||{}).map(([k,v])=>[k,{...v,reps,durationSeconds}]))
 return {...item,reps,workSeconds:durationSeconds,sideMode:preset.s||item.sideMode,coachNote:preset.n||item.coachNote,levels}
}
// Random timed metcon suggestions must not silently turn quality mobility into speed work.
export function isMetconCandidate(ex){
 const category=String(ex?.category||'').toLowerCase()
 return !!ex&&!ex.is_rest&&!ex.is_rehab&&!/rehab|pilates|yoga/.test(category)&&!isMobilityExercise(ex)&&!starters[qualityName(ex)]
}
