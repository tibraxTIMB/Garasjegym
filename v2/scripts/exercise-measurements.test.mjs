import test from 'node:test';
import assert from 'node:assert/strict';
import { getExerciseMeasurementFlags, isErgExercise } from '../src/lib/exerciseMeasurements.js';

test('Row and erg machines use distance/calories/time, while strength rows retain kg',()=>{
  for(const name of ['Row','RowErg','Romaskin','SkiErg','BikeErg','Assault Bike']){
    assert.equal(isErgExercise({name}),true)
    assert.deepEqual(getExerciseMeasurementFlags({name}),{usesHeight:false,usesLoad:false})
  }
  for(const name of ['Bent Over Row','Pendlay Row','Dumbbell Row']){
    assert.equal(isErgExercise({name}),false)
    assert.equal(getExerciseMeasurementFlags({name}).usesLoad,true)
  }
});

test('plain plyo box exercises use height rather than load', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Box jump', equipment: 'Kasse' }),
    { usesHeight: true, usesLoad: false },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Box Jump Over', equipment: 'Kasse' }),
    { usesHeight: true, usesLoad: false },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Box Step-over', equipment: 'Kasse' }),
    { usesHeight: true, usesLoad: false },
  );
});

test('plyo box step-ups use height only unless external load is specified', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Box Step-up', equipment: 'Plyoboks' }),
    { usesHeight: true, usesLoad: false },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Step-up', equipment: 'Kasse' }),
    { usesHeight: true, usesLoad: false },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Dumbbell Step-up', equipment: 'Manualar / kasse' }),
    { usesHeight: true, usesLoad: true },
  );
});

test('dumbbell box step-over supports both box height and external load', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Dumbbell Box Step-over', equipment: 'Manualar / kasse' }),
    { usesHeight: true, usesLoad: true },
  );
});

test('ordinary loaded strength exercises retain kilogram measurement', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Back squat', equipment: 'Vektstong' }),
    { usesHeight: false, usesLoad: true },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({ name: 'Dumbbell Romanian Deadlift', equipment: 'Manualar' }),
    { usesHeight: false, usesLoad: true },
  );
});

test('saved height and load values preserve both measurements when a WOD is reopened', () => {
  assert.deepEqual(
    getExerciseMeasurementFlags({
      name: 'Box Step-over',
      equipment: 'Kasse',
      levels: { rx: { heightCm: '60', loadMode: 'kg', loadKgMen: '15', loadKgWomen: '10' } },
    }),
    { usesHeight: true, usesLoad: true },
  );
  assert.deepEqual(
    getExerciseMeasurementFlags({
      name: 'Dumbbell Box Step-over',
      equipment: 'Manualar / kasse',
      sets: [{ reps: '10', height_cm: '50', load_kg: '12.5' }],
    }),
    { usesHeight: true, usesLoad: true },
  );
});

test('TRX and static holds do not ask for kilograms unless externally loaded', () => {
  for (const name of ['TRX Row', 'TRX Chest Press', 'Dead Hang', 'Wall Sit', 'Ab Wheel Rollout']) {
    assert.deepEqual(getExerciseMeasurementFlags({ name, equipment: name.startsWith('TRX') ? 'TRX' : '' }), { usesHeight: false, usesLoad: false });
  }
  assert.deepEqual(getExerciseMeasurementFlags({name:'Dead Hang',equipment:'Pull-up-stong',sets:[{load_kg:10}]}),{usesHeight:false,usesLoad:true});
});

test('Bear Crawl is a bodyweight distance exercise, not a loaded lift', () => {
  assert.deepEqual(getExerciseMeasurementFlags({name:'Bear Crawl',equipment:'Kroppsvekt'}),{usesHeight:false,usesLoad:false});
});

import {exerciseBrowseCategory} from '../src/lib/exerciseCategories.js';
import {isQualityOnlyExercise,isMobilityExercise} from '../src/lib/exerciseQuality.js';
import {isSideSelectableExercise} from '../src/lib/wodSides.js';
import {exerciseMuscleProfile} from '../src/lib/exerciseMuscleProfiles.js';
test('mobility and stability have purposeful browse group and no compulsory load',()=>{
 for(const name of ['I-T-Y-W','Wall slides','Scapular push-ups','Scapular pull-ups','Open book','90/90 hip switches','Hip CARs','Cossack squat','Deep squat hold','Jefferson curl']){
  const row={name,category:'Mobilitet',equipment:name==='Scapular pull-ups'?'Pull-up-stong':'Kroppsvekt'};
  assert.equal(exerciseBrowseCategory(row),'Mobilitet');
  assert.equal(isMobilityExercise(row),true);
  assert.deepEqual(getExerciseMeasurementFlags(row),{usesHeight:false,usesLoad:false});
  assert.ok(exerciseMuscleProfile(name));
  assert.equal(isQualityOnlyExercise(name),true);
 }
 assert.equal(getExerciseMeasurementFlags({name:'Jefferson curl',equipment:'Manualar'}).usesLoad,true);
 assert.equal(getExerciseMeasurementFlags({name:'Cossack squat',sets:[{load_kg:10}]}).usesLoad,true);
 assert.equal(isQualityOnlyExercise('Back squat'),false);
 for(const name of ['Open book','Hip CARs','Cossack squat','Bird dog','Dead bug'])assert.ok(isSideSelectableExercise({name,equipment:'Matte'}));
 assert.equal(isSideSelectableExercise({name:'I-T-Y-W',equipment:'Matte'}),false);
});

import {readFileSync} from 'node:fs';
test('Bibliothekar snapshot has full exact anatomical classification',()=>{
 const snapshot=JSON.parse(readFileSync(new URL('../supabase/catalog/bibliothekar_review_2026_11_26.json',import.meta.url),'utf8'));
 assert.equal(snapshot.names.length,snapshot.activeCount+snapshot.candidateCount);
 assert.equal(new Set(snapshot.names.map(s=>s.toLowerCase().replace(/[^a-z0-9æøå]+/g,' ').trim())).size,snapshot.names.length);
 for(const name of snapshot.names)assert.ok(exerciseMuscleProfile(name),name);
});

test('explicit unweighted equipment does not imply compulsory kilograms',()=>{
 for(const [name,equipment] of [['Bird dog','Matte'],['Dead bug','Matte'],['Single-leg glute bridge','Matte'],['Pallof press','Strikk'],['Single-leg balance','Kroppsvekt']])assert.equal(getExerciseMeasurementFlags({name,equipment}).usesLoad,false);
 assert.equal(getExerciseMeasurementFlags({name:'Glute bridge',equipment:'Matte',sets:[{load_kg:10}]}).usesLoad,true);
});
