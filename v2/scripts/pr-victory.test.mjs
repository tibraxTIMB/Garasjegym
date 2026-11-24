import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {findPRVictories,workoutPRVictories,isPRVictorySoundEnabled,setPRVictorySoundEnabled} from '../src/lib/prVictory.js'
const lift=(name,kg,reps=1)=>({exercise_name:name,sets:[{load_kg:kg,reps}]})
const previous={workout_exercises:[lift('Deadlift',80),lift('Kettlebell swing',16),lift('Bench press',60)]}
test('only strictly higher real weight in Big Seven with existing baseline',()=>{
 const result=findPRVictories([lift('Deadlift',90),lift('Kettlebell swing',20),lift('Bench press',60),lift('Snatch',40),lift('Front squat',70,0)], [previous])
 assert.deepEqual(result.map(p=>[p.name,p.previous_kg,p.load_kg]),[['Deadlift',80,90]])
})
test('existing independent PR and any earlier higher registered weight suppress celebration',()=>{
 assert.deepEqual(findPRVictories([lift('Deadlift',90)],[previous],[{exercise_name:'Deadlift',unit:'kg',result:100}]),[])
 assert.deepEqual(findPRVictories([lift('Deadlift',90)],[{workout_exercises:[lift('Deadlift',100,'')]}]),[])
})
test('historical marker requires the actual matching weight and positive repetitions',()=>{
 const victories=findPRVictories([lift('Deadlift',90)],[previous])
 assert.equal(workoutPRVictories({result_data:{pr_victories:victories},workout_exercises:[lift('Deadlift',90)]}).length,1)
 assert.equal(workoutPRVictories({result_data:{pr_victories:victories},workout_exercises:[lift('Deadlift',85)]}).length,0)
 assert.equal(workoutPRVictories({result_data:{pr_victories:victories},workout_exercises:[lift('Deadlift',90,0)]}).length,0)
})

test('PR sound is an independent preference and never disables ordinary timer sounds',()=>{const data=new Map([['garasjegym.timer.sound_enabled','on']]);const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};assert.equal(isPRVictorySoundEnabled(storage),true);setPRVictorySoundEnabled(false,storage);assert.equal(isPRVictorySoundEnabled(storage),false);assert.equal(data.get('garasjegym.timer.sound_enabled'),'on');setPRVictorySoundEnabled(true,storage);assert.equal(isPRVictorySoundEnabled(storage),true)})

import {createHash} from 'node:crypto'
test('single static PanserGorilla celebration has correct verified local image and both orientations',()=>{
 const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
 const o=read('../src/components/PRVictoryOverlay.jsx'),c=read('../src/components/pr-victory-overlay.css')
 const poster=readFileSync(new URL('../src/assets/pansergorilla-rekord.webp',import.meta.url))
 assert.equal(createHash('sha256').update(poster).digest('hex'),'311221d91a78f3b3dfc973ce85ff25aa9d3ec7795ed249143a217ee9bbc010f3')
 assert.equal(poster.toString('ascii',0,4),'RIFF')
 assert.equal(poster.toString('ascii',8,12),'WEBP')
 assert.match(o,/DU HAST <em>REKORD!/);assert.match(o,/pansergorilla-rekord\.webp/);assert.match(o,/if\(!victories.length\)return null/);assert.match(o,/12000/)
 assert.doesNotMatch(o,/GameRekordScene|RekordLift|RekordGorilla|<video|load_kg|previous_kg/)
 assert.match(c,/orientation:landscape/);assert.match(c,/object-fit:contain/);assert.doesNotMatch(c,/animation\s*:|@keyframes/)
})
