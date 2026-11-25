import test from 'node:test'
import assert from 'node:assert/strict'
import {readOfflineLibrary,writeOfflineLibrary} from '../src/lib/offlineTraining.js'
import {previousExerciseResult} from '../src/lib/previousResult.js'
import {muscleProfile} from '../src/lib/muscleProfile.js'
import {saveWorkoutDraft,restoreWorkoutDraft} from '../src/lib/workoutDraft.js'
test('offline library only contains published non-archived WODs, same member and fresh data',()=>{const m=new Map(),s={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};assert.equal(writeOfflineLibrary('a',[{id:1,is_published:true},{id:2,is_published:false},{id:3,is_published:true,is_archived:true}],[{id:4}],s,1000),true);assert.deepEqual(readOfflineLibrary('a',s,1000).wods.map(w=>w.id),[1]);assert.equal(readOfflineLibrary('b',s,1000),null);assert.equal(readOfflineLibrary('a',s,1000+8*86400000),null)})
test('offline result draft preserves stable save token and explicit review state',()=>{const m=new Map(),s={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};assert.equal(saveWorkoutDraft('a',{mode:'active',saveToken:'stable',finishOpen:true,reviewedResults:{x:true}},s),true);assert.equal(restoreWorkoutDraft('a',s).saveToken,'stable');assert.equal(restoreWorkoutDraft('a',s).reviewedResults.x,true);assert.equal(restoreWorkoutDraft('b',s),null);assert.equal(saveWorkoutDraft('a',{}, {setItem(){throw Error('quota')}}),false)})
test('previous result excludes wrong ID, missing values and unrecorded exercise',()=>{const logs=[{workout_date:'2026-11-01',workout_exercises:[{exercise_id:'x',exercise_name:'Bench press',workout_sets:[{reps:3,load_kg:50}]},{exercise_id:'y',exercise_name:'Bench press',workout_sets:[{load_kg:90}]}]}];assert.equal(previousExerciseResult(logs,{exercise_id:'x',exercise_name:'Bench press'}).summary,'3 reps × 50 kg');assert.equal(previousExerciseResult(logs,{exercise_id:'z',exercise_name:'Bench press'}),null)})
test('muscle map is conservative, no invented mapping of unknown movements or pause',()=>{const p=muscleProfile([{name:'Bench press'},{name:'Deadlift'},{name:'Unknown movement'},{name:'Pause',is_rest:true}]);assert.equal(p.known,2);assert.equal(p.total,3);assert.ok(p.primary.includes('chest'));assert.ok(p.primary.includes('hamstrings'));assert.ok(!p.secondary.includes('chest'))})

test('WOD item identifiers are not exercise identifiers',()=>{assert.equal(previousExerciseResult([{workout_date:'2026-11-01',workout_exercises:[{exercise_id:'exercise',exercise_name:'Bench press',workout_sets:[{reps:4,load_kg:45}]}]}],{id:'wod-item',name:'Bench press'}).summary,'4 reps × 45 kg')})

test('muscle map classifies specific variants and each complex step, without false chest on handstand push-up',()=>{
 const hspu=muscleProfile([{name:'Handstand Push-up'}]);assert.deepEqual(hspu.primary,['shoulders']);assert.ok(!hspu.primary.includes('chest'))
 const complex=muscleProfile([{exercise_name:'2 PC + 1 PJ',complex_steps:[{exercise_id:'pc',name:'Power Clean',reps:2},{exercise_id:'pj',name:'Push Jerk',reps:1}]}]);assert.equal(complex.total,2);assert.equal(complex.known,2);assert.ok(complex.primary.includes('quads'));assert.ok(complex.primary.includes('shoulders'))
 const mixed=muscleProfile([{name:'Row'},{name:'KB Swing'},{name:'Burpee over barbell'},{name:'Unknown movement'}]);assert.equal(mixed.known,3);assert.equal(mixed.total,4);assert.ok(mixed.primary.includes('back'));assert.ok(mixed.primary.includes('glutes'))
 assert.equal(muscleProfile([{name:'Barbell Row'}]).primary[0],'back')
})
