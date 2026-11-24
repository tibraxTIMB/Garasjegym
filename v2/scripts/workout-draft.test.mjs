import test from 'node:test'
import assert from 'node:assert/strict'
import {restoreWorkoutDraft,saveWorkoutDraft,clearWorkoutDraft,resumedElapsedSeconds,workoutSaveFingerprint,isRetryableWorkoutError} from '../src/lib/workoutDraft.js'
import {exerciseBrowseCategory,exerciseBrowseOrder} from '../src/lib/exerciseCategories.js'

const storage=()=>{
 const map=new Map()
 return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}
}

test('unfinished workouts resume only for the same member',()=>{
 const cache=storage()
 saveWorkoutDraft('member-a',{mode:'active',sessionPrepared:true,items:[{exercise_name:'TRX Row'}],timerSnapshot:{elapsed:17,running:false}},cache)
 assert.equal(restoreWorkoutDraft('member-b',cache),null)
 assert.equal(restoreWorkoutDraft('member-a',cache).items[0].exercise_name,'TRX Row')
 clearWorkoutDraft('member-a',cache)
 assert.equal(restoreWorkoutDraft('member-a',cache),null)
})

test('running timer catches up after a suspended tab while a paused timer does not',()=>{
 assert.equal(resumedElapsedSeconds({elapsed:47,savedAt:1000,running:true},16000),62)
 assert.equal(resumedElapsedSeconds({elapsed:47,savedAt:1000,running:false},16000),47)
 assert.equal(resumedElapsedSeconds({elapsed:47,savedAt:16000,running:true},1000),47)
})

test('specialized exercise groups preserve distinct equipment variants',()=>{
 assert.equal(exerciseBrowseCategory({name:'TRX Row',category:'Styrke',equipment:'TRX'}),'TRX')
 assert.equal(exerciseBrowseCategory({name:'Lateral Burpee Over Barbell',category:'CrossFit',equipment:'Vektstong'}),'Burpees')
 assert.equal(exerciseBrowseCategory({name:'Hang Power Snatch',category:'CrossFit',equipment:'Vektstong'}),'Olympiske løft')
 assert.equal(exerciseBrowseCategory({name:'EZ Bar Biceps Curl',category:'Styrke',equipment:'EZ-stong'}),'Vektstong')
 assert.equal(exerciseBrowseCategory({name:'Dumbbell Biceps Curl',category:'Styrke',equipment:'Manualar'}),'Manualar')
 assert.deepEqual(['Vektstong','TRX','Manualar'].sort(exerciseBrowseOrder),['TRX','Manualar','Vektstong'])
})

test('reconnect retry is restricted to the same submitted result and ignores timestamp refresh',()=>{
 const draft={mode:'active',saveToken:'stable',items:[{sets:[{reps:5}]}],timerSnapshot:{elapsed:60,savedAt:10},reviewedResults:{x:true}}
 const fingerprint=workoutSaveFingerprint(draft)
 assert.equal(workoutSaveFingerprint({...draft,timerSnapshot:{elapsed:60,savedAt:20}}),fingerprint)
 assert.notEqual(workoutSaveFingerprint({...draft,items:[{sets:[{reps:6}]}]}),fingerprint)
 assert.notEqual(workoutSaveFingerprint({...draft,saveToken:'other'}),fingerprint)
 assert.equal(isRetryableWorkoutError({message:'TypeError: Failed to fetch'}),true)
 assert.equal(isRetryableWorkoutError({message:'permission denied'}),false)
 assert.equal(isRetryableWorkoutError({status:503}),true)
 assert.equal(isRetryableWorkoutError({status:401}),false)
})
test('unavailable local storage reports failure instead of claiming protection',()=>{
 assert.equal(saveWorkoutDraft('member-a',{mode:'active'},{setItem(){throw Error('quota')}}),false)
})
