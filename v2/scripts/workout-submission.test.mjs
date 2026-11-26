import assert from 'node:assert/strict'
import {readWorkoutSubmission,rememberWorkoutSubmission,clearWorkoutSubmission,workoutSubmissionConflict,workoutSaveFingerprint,saveWorkoutDraft,restoreWorkoutDraft} from '../src/lib/workoutDraft.js'
const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}
const draft={mode:'active',saveToken:'token-a',items:[{sets:[{reps:5}]}],participantScores:{1:{rounds:'2'}},timerSnapshot:{elapsed:60,savedAt:1},resultSetIndex:0,resultSummary:true}
const fingerprint=workoutSaveFingerprint(draft)
assert.equal(readWorkoutSubmission('a','token-a',storage),null)
assert.equal(rememberWorkoutSubmission('a','token-a',fingerprint,storage),true)
const receipt=readWorkoutSubmission('a','token-a',storage)
assert.equal(receipt.fingerprint,fingerprint)
assert.equal(readWorkoutSubmission('b','token-a',storage),null)
assert.equal(readWorkoutSubmission('a','token-b',storage),null)
assert.equal(workoutSubmissionConflict(receipt,'token-a',fingerprint),false)
assert.equal(workoutSubmissionConflict(receipt,'token-a',workoutSaveFingerprint({...draft,items:[{sets:[{reps:6}]}]})),true)
assert.equal(workoutSubmissionConflict(receipt,'token-a',workoutSaveFingerprint({...draft,participantScores:{1:{rounds:'3'}}})),true)
assert.equal(workoutSaveFingerprint({...draft,resultSetIndex:2,flowDetailed:true,resultSummary:false,timerSnapshot:{elapsed:60,savedAt:2}}),fingerprint)
assert.equal(saveWorkoutDraft('a',draft,storage),true)
assert.equal(readWorkoutSubmission('a','token-a',storage).fingerprint,fingerprint)
assert.equal(restoreWorkoutDraft('a',storage).saveToken,'token-a')
clearWorkoutSubmission('a','token-b',storage)
assert.equal(readWorkoutSubmission('a','token-a',storage).fingerprint,fingerprint)
clearWorkoutSubmission('a','token-a',storage)
assert.equal(readWorkoutSubmission('a','token-a',storage),null)
assert.equal(restoreWorkoutDraft('a',storage).saveToken,'token-a')
assert.equal(rememberWorkoutSubmission('a','token-a',fingerprint,{setItem(){throw Error('quota')}}),false)
console.log('16 workout submission checks passed')

const frozen={...draft,timerSnapshot:{elapsed:60,phase:'FULLFØRT',roundsCompleted:2,laps:[25,30],ghost_target:60,samspel_swaps:[20,40],remaining:0,displayTime:0,running:false}}
const stable=workoutSaveFingerprint(frozen)
assert.equal(workoutSaveFingerprint({...frozen,timerSnapshot:{...frozen.timerSnapshot,restored:true,savedAt:99,remaining:2,displayTime:2,samspel_roles:['AMRAP','Sykkel'],samspel_next_switch:null,currentRound:3}}),stable)
for(const patch of [{elapsed:59},{phase:'PAUSE'},{roundsCompleted:3},{laps:[25,31]},{ghost_target:61},{samspel_swaps:[21,40]},{block_results:{a:{elapsed:60}}}])assert.notEqual(workoutSaveFingerprint({...frozen,timerSnapshot:{...frozen.timerSnapshot,...patch}}),stable)
assert.notEqual(workoutSaveFingerprint({...frozen,participantScores:{'station-1':{erg:'120'}}}),stable)
console.log('9 final snapshot fingerprint checks passed')
