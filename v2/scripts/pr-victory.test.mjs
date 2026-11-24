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

test('celebration shows real record and gain with official mascot logo and accessible motion',()=>{const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');const o=read('../src/components/PRVictoryOverlay.jsx');const m=read('../src/components/RekordGorilla.jsx');const c=read('../src/components/pr-victory-overlay.css');assert.match(o,/DU HAST <em>REKORD!/);assert.match(o,/p\.load_kg-p\.previous_kg/);assert.match(o,/Førre rekord:/);assert.match(m,/garasjegym-49-512\.png/);assert.match(m,/href=\{logo\} x="130" y="149"/);assert.match(c,/prefers-reduced-motion:reduce/);assert.match(c,/orientation:landscape/)})

import {RECORD_LIFT_POSES,sampleRecordPose} from '../src/lib/recordLiftMotion.js'
import {STANDARD_PR_LIFTS} from '../src/lib/prDirectory.js'
test('all seven standard lifts have slow looped motion',()=>{assert.deepEqual(Object.keys(RECORD_LIFT_POSES).sort(),STANDARD_PR_LIFTS.map(x=>x.name).sort());for(const [name,s] of Object.entries(RECORD_LIFT_POSES)){assert.ok(s.duration>=6);assert.deepEqual(sampleRecordPose(name,0),sampleRecordPose(name,1));for(let i=0;i<=100;i++)assert.ok(sampleRecordPose(name,i/100).flat().every(Number.isFinite))}assert.notDeepEqual(sampleRecordPose('Bench press',.4),sampleRecordPose('Deadlift',.4))})
test('independent exercise animation and fixed record data',()=>{const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');assert.match(read('../src/components/PRVictoryOverlay.jsx'),/<RekordLift name=\{p.name\}/);assert.match(read('../src/components/RekordLift.jsx'),/requestAnimationFrame/);assert.match(read('../src/components/pr-victory-overlay.css'),/gg-rekord-confetti\{display:none\}/)})
