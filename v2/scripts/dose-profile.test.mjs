import test from 'node:test'
import assert from 'node:assert/strict'
import {doseProfile,userDoseProfile,prescribedKg,prescribedKgLabel,saveDoseProfile} from '../src/lib/doseProfile.js'
import {fillResultPlan} from '../src/lib/compactWorkout.js'
import {cardDose} from '../src/lib/wodCard.js'
const dose={loadMode:'kg',loadKgMen:40,loadKgWomen:25,reps:6}
test('voluntary account choice selects only exact programmed weight',()=>{
 assert.equal(doseProfile('other'),'common')
 assert.equal(userDoseProfile({user_metadata:{gg_dose_variant:'women'}}),'women')
 assert.equal(prescribedKg(dose,'men'),'40')
 assert.equal(prescribedKg(dose,'women'),'25')
 assert.equal(prescribedKg(dose,'common'),null)
 assert.equal(prescribedKg({...dose,loadKgWomen:''},'women'),null)
 assert.equal(prescribedKg({loadMode:'percent',percent1rm:60},'women'),null)
 assert.equal(prescribedKgLabel(dose,'common'),'M 40 kg / K 25 kg')
 assert.match(cardDose({levels:{rx:dose}},'rx',true,'women'),/25 kg/)
 assert.doesNotMatch(cardDose({levels:{rx:dose}},'rx',true,'women'),/40 kg/)
 const item={uses_load:true,prescription_levels:{rx:dose},sets:[{reps:'5',load_kg:''},{reps:'',load_kg:'30'}]}
 assert.deepEqual(fillResultPlan(item,'rx','women').sets.map(({reps,load_kg})=>({reps,load_kg})),[{reps:'5',load_kg:'25'},{reps:'6',load_kg:'30'}])
})
test('save preference only to currently authenticated own account and validate acknowledgement',async()=>{
 const calls=[]
 const auth={getUser:async()=>({data:{user:{id:'own'}}}),updateUser:async args=>{calls.push(args);return {data:{user:{id:'own',user_metadata:args.data}}}}}
 assert.equal(userDoseProfile(await saveDoseProfile(auth,'own','women')),'women')
 assert.deepEqual(calls,[{data:{gg_dose_variant:'women'}}])
 assert.equal(userDoseProfile(await saveDoseProfile(auth,'own','common')),'common')
 await assert.rejects(saveDoseProfile(auth,'other','men'))
 await assert.rejects(saveDoseProfile(auth,'own','invalid'))
 assert.equal(calls.length,2)
})
