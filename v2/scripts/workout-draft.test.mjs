import test from 'node:test'
import assert from 'node:assert/strict'
import {restoreWorkoutDraft,saveWorkoutDraft,clearWorkoutDraft,resumedElapsedSeconds} from '../src/lib/workoutDraft.js'
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
