import {useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Plus,Search,Trash2,ArrowUp,ArrowDown,Save,LoaderCircle,WandSparkles,Dices,Info,Copy,Dumbbell,X} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {addWodSortOrder,getWodSchemaItems,moveWodItemByKey,sortWodItems} from '../lib/wodOrdering.js'
import {COMPLEX_EXERCISES,formatComplexSequence} from '../lib/wodComplexes.js'
import { createWodEngineConfig, buildLegacyCompatibleBlock, normalizeWodEngine, scoreForWodFormat, PARTICIPATION_MODES, COLLABORATION_MODES, SCORE_TYPES, isEmomFormat, emomIntervalSeconds, emomDisplayLabel } from '../lib/wodEngine.js'
import { getFixedSlotTimerState } from '../lib/timerClock.js'
import { wodFormatNeedsTime } from '../lib/wodTimeDial.js'
import { applySharedReps, hasIndependentReps } from '../lib/wodReps.js'
import { WOD_SIDE_OPTIONS, getWodSideLabel, getWodSideMode, isSideSelectableExercise } from '../lib/wodSides.js'
import { exerciseBrowseCategory } from '../lib/exerciseCategories.js'
import WodTimeDial from './WodTimeDial.jsx'
import {COMPOSITE_FORMAT, COMPOSITE_BLOCK_FORMATS, defaultCompositeBlocks, compositeBlockDuration, compositeTotalSeconds, validateCompositeBlocks, compositeBlockForTimer, isValidRirTarget, COMPOSITE_INTERVAL_FORMATS, COMPOSITE_STRENGTH_FORMATS} from '../lib/compositeWod.js'
import './wod-ordering.css'
import './wod-builder-contrast.css'
import './wod-wizard-refine.css'

const categories=['Alle','CrossFit','Burpees','Olympiske løft','TRX','Kettlebell','Manualar','Vektstong','Styrke','Complex','Kjerne','Kondisjon','Gymnastikk','Pilates','Yoga','Mobilitet','Rehab','Golf']
const areas=['Alle område','Heile kroppen','Overkropp','Underkropp','Kjerne','Hofte og sete','Rygg','Skuldrer og armar','Bryst','Fullkropp','Bein','Mage']
const formatIcons={'Samansett økt':'▦','AMRAP':'⏱','For Time':'🏁','Chipper':'☷','Couplet':'2×','Triplet':'3×','Ladder':'↗','Death By':'☠','EMOM':'◷','Stasjonssirkel':'⌘','E1MOM':'◷','E1.25MOM':'◷','E2MOM':'◷','E3MOM':'◷','E4MOM':'◷','E5MOM':'◷','E6MOM':'◷','E7MOM':'◷','Intervall':'▥','Tabata':'▥','Row Intervals':'🚣','Strength':'🏋','Superset':'⇄','Complex':'▤','Eigen økt':'✳'}
const formats=[
 {group:'Metcon',items:['AMRAP','For Time','Chipper','Couplet','Triplet','Ladder','Death By']},
 {group:'Gruppetime',items:['Stasjonssirkel','EMOM']},
 {group:'Intervall',items:['Intervall','Tabata','Row Intervals']},
 {group:'Styrke',items:['Strength','Superset','Complex']},
 {group:'Anna',items:['Eigen økt',COMPOSITE_FORMAT]}
]
const allFormats=formats.flatMap(x=>x.items)
const featuredFormats=[
 {name:'AMRAP',description:'Flest mogleg rundar på fast tid'},
 {name:'For Time',description:'Fullfør arbeidet raskast mogleg'},
 {name:'EMOM',description:'Vel intervall i minutt og sekund'},
 {name:'Tabata',description:'Arbeid og pause i intervall'},
 {name:'Stasjonssirkel',description:'Roter mellom stasjonar'},
 {name:'Strength',description:'Sett, repetisjonar og belastning'},
]
const otherFormats=allFormats.filter(item=>!featuredFormats.some(x=>x.name===item))
const GOLF_EXERCISES=[
 ['Golf – Open Book','Mobilitet','Rygg','Matte','Rotasjon i brystrygg. Ligg på sida med knær samla, før øvste arm roleg bakover og følg handa med blikket. 8–10 per side.'],
 ['Golf – Thread the Needle','Mobilitet','Rygg','Matte','Rotasjon og kontroll i brystrygg på alle fire. Før armen under kroppen og opna opp. 8 per side.'],
 ['Golf – Half-kneeling Thoracic Rotation','Mobilitet','Rygg','Matte','Halvkneståande rotasjon med hofter stabile. 8 per side.'],
 ['Golf – Standing Club Rotation','Mobilitet','Rygg','Golfkølle','Kontrollert rotasjon med kølle over skuldrene, utan å tvinga ytterstilling. 10 per side.'],
 ['Golf – Hip 90/90 Switch','Mobilitet','Hofte','Matte','Aktiv inn- og utrotasjon i hofta frå 90/90-sit. 8–10 skifte.'],
 ['Golf – Hip Airplane (assistert)','Mobilitet','Hofte','Kroppsvekt','Eittbeins hofterotasjon med støtte. Hald bekkenet kontrollert. 5–6 per side.'],
 ['Golf – Half-kneeling Hip Flexor Stretch','Mobilitet','Hofte','Matte','Tipp bekkenet lett bakover og flytt hofta fram. 30–40 sekund per side.'],
 ['Golf – Adductor Rock Back','Mobilitet','Hofte','Matte','På alle fire med eitt bein ut til sida, før hofta roleg bakover. 10 per side.'],
 ['Golf – Ankle Knee-to-Wall','Mobilitet','Bein','Kroppsvekt','Ankelmobilitet med hælen i golvet. 10–12 per side.'],
 ['Golf – Shoulder CARs','Mobilitet','Skulder','Kroppsvekt','Kontrollerte store skuldersirklar med ribbein og bekken stabile. 5 per retning.'],
 ['Golf – Wall Slide','Mobilitet','Skulder','Vegg','Før underarmane opp langs veggen utan å svaia i korsryggen. 10 reps.'],
 ['Golf – Goblet Squat','Styrke','Bein','Kettlebell / manual','Knebøy med last framfor brystet. Bygg bein- og hoftestyrke. 3 × 8–10.'],
 ['Golf – Split Squat','Styrke','Bein','Manualar / kroppsvekt','Kontrollert utfall på staden. 3 × 8 per side.'],
 ['Golf – Single-leg Romanian Deadlift','Styrke','Bein','Manual','Eittbeins hoftehinge for bakside lår, sete og balanse. 3 × 8 per side.'],
 ['Golf – Hip Thrust','Styrke','Hofte','Stong / manual','Seteløft med kontrollert topposisjon. 3 × 10.'],
 ['Golf – Lateral Lunge','Styrke','Bein','Manual / kroppsvekt','Sideutfall for adduktorar og sideveis kraft. 3 × 8 per side.'],
 ['Golf – Calf Raise','Styrke','Bein','Trapp / manual','Tåhev med full kontroll i botn og topp. 3 × 12–15.'],
 ['Golf – Pallof Press','Kjerne','Mage','Strikk / kabel','Anti-rotasjon: press rett fram utan at overkroppen roterer. 3 × 10 per side.'],
 ['Golf – Dead Bug','Kjerne','Mage','Matte','Stabiliser korsryggen medan motsett arm og bein strekkjer seg ut. 3 × 8 per side.'],
 ['Golf – Side Plank','Kjerne','Mage','Matte','Sideplanke for lateral kjernestabilitet. 3 × 20–40 sekund per side.'],
 ['Golf – Bird Dog','Kjerne','Rygg','Matte','Strekk motsett arm og bein utan rotasjon i bekkenet. 3 × 8 per side.'],
 ['Golf – Cable/Band Chop','Kjerne','Mage','Kabel / strikk','Diagonal kraftoverføring frå høgt til lågt med kontrollert hofte- og overkroppsrotasjon. 3 × 8 per side.'],
 ['Golf – Cable/Band Lift','Kjerne','Mage','Kabel / strikk','Diagonal løft frå lågt til høgt. Kontroller rotasjonen og hald balansen. 3 × 8 per side.'],
 ['Golf – Medicine Ball Rotational Throw','Golf','Fullkropp','Medisinball','Eksplosiv rotasjon med hofte- og overkroppssamspel. Kast mot vegg berre med trygg plass og lett ball. 3 × 5 per side.'],
 ['Golf – Step-and-Rotate','Golf','Fullkropp','Medisinball','Steg inn i kontrollert rotasjon og kast/overføring. 3 × 5 per side.'],
 ['Golf – Farmer Carry','Styrke','Fullkropp','Manualar','Gå med tunge manualar, høg haldning og stabil kjerne. 3 × 30–40 meter.'],
 ['Golf – Suitcase Carry','Kjerne','Fullkropp','Kettlebell / manual','Gå med last på éi side utan å lene deg. 3 × 20–30 meter per side.'],
 ['Golf – Band External Rotation','Styrke','Skulder','Strikk','Rotatorcuff med albogen inntil sida. 2–3 × 12–15.'],
 ['Golf – Band Row','Styrke','Rygg','Strikk','Trekk skulderblada roleg saman og hald overkroppen stabil. 3 × 12.'],
 ['Golf – Single-leg Balance with Reach','Golf','Bein','Kroppsvekt','Balanse på eitt bein med kontrollert rekkeøving i fleire retningar. 3 × 5 per side.']
].map(([name,focus,body_area,equipment,description],i)=>({id:'golf-'+i,name,category:'Golf',golf_focus:focus,body_area,equipment,description,video_url:null,is_rehab:false,is_golf:true}))

const REHAB_EXERCISES=[
 ['Fysio – Hælløft','Bein','Bein','Trapp / støtte','Stå med støtte. Løft hælane roleg, hald eit sekund på toppen og senk kontrollert. Start med 2 × 10.','https://www.ouh.nhs.uk/physiotherapy/outpatients/videos/'],
 ['Fysio – Ankelmobilitet mot vegg','Bein','Bein','Vegg','Hald hælen i golvet og før kneet kontrollert fram mot veggen over tærne. 2 × 10 per side.','https://www.ouh.nhs.uk/physiotherapy/outpatients/videos/'],
 ['Fysio – Sittande knestrekk','Bein','Kne','Stol','Sit oppreist. Strekk eitt kne roleg, spenn framsida av låret og senk kontrollert. 2 × 10 per side.','https://patient.info/video/patient-physio'],
 ['Fysio – Setehev','Bein','Hofte','Matte','Ligg på ryggen med bøygde kne. Spenn setet og løft hofta utan å svaie i korsryggen. 2 × 10.','https://www.ouh.nhs.uk/physiotherapy/outpatients/videos/'],
 ['Fysio – Clamshell','Hofte','Hofte','Matte','Ligg på sida med bøygde kne og føtene samla. Opne øvste kne utan å rulle bekkenet bakover. 2 × 12 per side.','https://patient.info/video/patient-physio'],
 ['Fysio – Hofteabduksjon ståande','Hofte','Hofte','Stol / støtte','Stå stødig og før beinet roleg ut til sida utan å lene overkroppen. 2 × 10 per side.','https://patient.info/video/patient-physio'],
 ['Fysio – Hoftebøyarstrekk','Hofte','Hofte','Matte','Stå i halvt kneståande. Tipp bekkenet lett bakover og flytt kroppen varsamt fram til du kjenner strekk framme i hofta. 20–30 sek per side.','https://patient.info/video/patient-physio'],
 ['Fysio – Bekkenvipp','Rygg','Rygg','Matte','Ligg med bøygde kne. Vipp bekkenet slik at korsryggen nærmar seg underlaget, slepp roleg tilbake. 10–12 repetisjonar.','https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/neck-and-back-problems-and-conditions/exercises-for-back-pain/'],
 ['Fysio – Kne til bryst','Rygg','Rygg','Matte','Ligg på ryggen og før eitt kne varsamt mot brystet. Hald kort og byt side. 5–8 per side.','https://www.csp.org.uk/conditions/back-pain/video-exercises-back-pain'],
 ['Fysio – Cat Camel','Rygg','Rygg','Matte','Stå på alle fire. Rund ryggen roleg og før han deretter varsamt mot ein lett svai. 8–10 repetisjonar.','https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/neck-and-back-problems-and-conditions/exercises-for-back-pain/'],
 ['Fysio – Kne-rulling','Rygg','Rygg','Matte','Ligg på ryggen med bøygde kne og føtene i golvet. La knærne falle roleg frå side til side innanfor komfortabelt utslag. 8–10 per side.','https://www.nhsinform.scot/illnesses-and-conditions/muscle-bone-and-joints/neck-and-back-problems-and-conditions/exercises-for-back-pain/'],
 ['Fysio – Nakkedreiing','Nakke','Nakke','Stol','Sit med avslappa skuldrer. Drei hovudet roleg mot høgre og venstre utan å presse ytterstillinga. 5–8 per side.','https://patient.info/video/patient-physio'],
 ['Fysio – Nakkebøy sidevegs','Nakke','Nakke','Stol','Før øyret varsamt mot skuldra utan å løfte skuldra. Hald 5 sekund og byt side. 5 per side.','https://www.whittington.nhs.uk/default.asp?c=26915'],
 ['Fysio – Hakeinntrekk','Nakke','Nakke','Stol / vegg','Trekk haka rett bakover som om du lagar dobbelthake. Hald 3–5 sekund utan å bøye hovudet ned. 8–10 repetisjonar.','https://patient.info/video/patient-physio']
].map(([name,body_area,region,equipment,description,video_url],i)=>({id:'rehab-'+i,name,category:'Rehab / fysio',body_area,equipment,description,video_url,is_rehab:true,is_golf:false,rehab_region:region}))
const CLASSIC_WODS=[
 {name:'Fran',group:'The Girls',format:'For Time',minutes:10,rounds:3,items:[['Thruster','21-15-9'],['Pull-up','21-15-9']],notes:'Original benchmark: 21-15-9 thrusters og pull-ups. RX-vekt: 95/65 lb (ca. 43/30 kg).'},
 {name:'Cindy',group:'The Girls',format:'AMRAP',minutes:20,items:[['Pull-up','5'],['Push-up','10'],['Air squat','15']],notes:'20 minutt AMRAP: 5 pull-ups, 10 push-ups, 15 air squats.'},
 {name:'Grace',group:'The Girls',format:'For Time',minutes:10,items:[['Clean and jerk','30']],notes:'30 clean & jerks for time. RX-vekt: 135/95 lb (ca. 61/43 kg).'},
 {name:'Helen',group:'The Girls',format:'For Time',minutes:20,rounds:3,items:[['Run','400 m'],['Kettlebell swing','21'],['Pull-up','12']],notes:'3 rundar: 400 m løp, 21 kettlebell swings, 12 pull-ups.'},
 {name:'Diane',group:'The Girls',format:'For Time',minutes:10,rounds:3,items:[['Deadlift','21-15-9'],['Handstand push-up','21-15-9']],notes:'21-15-9 deadlifts og handstand push-ups. RX deadlift: 225/155 lb.'},
 {name:'Elizabeth',group:'The Girls',format:'For Time',minutes:10,rounds:3,items:[['Clean','21-15-9'],['Ring dip','21-15-9']],notes:'21-15-9 cleans og ring dips. RX clean: 135/95 lb.'},
 {name:'Annie',group:'The Girls',format:'For Time',minutes:15,items:[['Double-under','50-40-30-20-10'],['Sit-up','50-40-30-20-10']],notes:'50-40-30-20-10 double-unders og sit-ups.'},
 {name:'Angie',group:'The Girls',format:'For Time',minutes:30,items:[['Pull-up','100'],['Push-up','100'],['Sit-up','100'],['Air squat','100']],notes:'100 pull-ups, 100 push-ups, 100 sit-ups, 100 squats.'},
 {name:'Barbara',group:'The Girls',format:'For Time',minutes:40,rounds:5,items:[['Pull-up','20'],['Push-up','30'],['Sit-up','40'],['Air squat','50']],notes:'5 rundar. Kvile nøyaktig 3 minutt mellom rundane.'},
 {name:'Jackie',group:'The Girls',format:'For Time',minutes:15,items:[['Row','1000 m'],['Thruster','50'],['Pull-up','30']],notes:'1000 m roing, 50 thrusters, 30 pull-ups. RX thruster: 45/35 lb.'},
 {name:'Karen',group:'The Girls',format:'For Time',minutes:15,items:[['Wall ball','150']],notes:'150 wall-ball shots for time.'},
 {name:'Nancy',group:'The Girls',format:'For Time',minutes:20,rounds:5,items:[['Run','400 m'],['Overhead squat','15']],notes:'5 rundar: 400 m løp og 15 overhead squats.'},
 {name:'Isabel',group:'The Girls',format:'For Time',minutes:10,items:[['Snatch','30']],notes:'30 snatches for time. RX-vekt: 135/95 lb (ca. 61/43 kg).'},
 {name:'Murph',group:'Hero WODs',format:'For Time',minutes:60,items:[['Run','1 mile'],['Pull-up','100'],['Push-up','200'],['Air squat','300'],['Run','1 mile']],notes:'Hero WOD til minne om Lt. Michael Murphy. Del gjerne opp pull-ups, push-ups og squats. Vektvest er valfri; RX 20 lb.'},
 {name:'DT',group:'Hero WODs',format:'For Time',minutes:20,rounds:5,items:[['Deadlift','12'],['Hang power clean','9'],['Push jerk','6']],notes:'5 rundar: 12 deadlifts, 9 hang power cleans, 6 push jerks. RX-vekt: 155/105 lb.'},
 {name:'Michael',group:'Hero WODs',format:'For Time',minutes:30,rounds:3,items:[['Run','800 m'],['Back extension','50'],['Sit-up','50']],notes:'3 rundar: 800 m løp, 50 back extensions, 50 sit-ups.'},
 {name:'JT',group:'Hero WODs',format:'For Time',minutes:20,rounds:3,items:[['Handstand push-up','21-15-9'],['Ring dip','21-15-9'],['Push-up','21-15-9']],notes:'21-15-9 handstand push-ups, ring dips og push-ups.'},
 {name:'Nate',group:'Hero WODs',format:'AMRAP',minutes:20,items:[['Muscle-up','2'],['Handstand push-up','4'],['Kettlebell swing','8']],notes:'20 minutt AMRAP: 2 muscle-ups, 4 handstand push-ups, 8 kettlebell swings.'},
 {name:'Randy',group:'Hero WODs',format:'For Time',minutes:15,items:[['Power snatch','75']],notes:'75 power snatches for time. RX-vekt: 75/55 lb.'},
 {name:'Badger',group:'Hero WODs',format:'For Time',minutes:35,rounds:3,items:[['Squat clean','30'],['Pull-up','30'],['Run','800 m']],notes:'3 rundar: 30 squat cleans, 30 pull-ups, 800 m løp. RX clean: 95/65 lb.'}
]
const nameAdjectives=['Brutale','Wilde','Geile','Scharfe','Eiserne','Explosive','Böse','Dreckige','Donnernde','Panzerstarke','Stählerne','Brachiale','Knallharte','Furchtlose','Massive','Giftige','Hungrige','Brennende','Wuchtige','Legendäre','Gnadenlose','Kraftvolle','Kompromisslose','Jernharde','Svart','Rasande','Dieseldrevne','Elektriske','Høyspent','Ubøyelege','Stålsette','Infernalske']
const nameNouns=['Panzer','Granate','Berserker','Keule','Kampfsau','Eber','Bär','Wolf','Gorilla','Mammut','Kobra','Hammer','Amboss','Donnerfaust','Stahlkoloss','Kraftpaket','Schlachtschiff','Sprengkopf','Dampfwalze','Kommandant','Knochenbrecher','Rammbock','Stahlfaust','Kampfhamster','Muskelmonster','Stålkjeven','Jernvilje','Betongbass','Dieselherz','Eisenwolf','Panzerpuls','Inferno 808','Hardhaus.exe','Tungt Vær','Svart Stål','Nattoget','Turbohelvete','Stålnakke','Betongbryter']
const nameNumbers=['1942','1939','69']
const randomWodName=()=>{
 const base=nameAdjectives[Math.floor(Math.random()*nameAdjectives.length)]+' '+nameNouns[Math.floor(Math.random()*nameNouns.length)]
 if(Math.random()>=0.22)return base
 const n=nameNumbers[Math.floor(Math.random()*nameNumbers.length)]
 return Math.random()<0.5?n+' '+base:base+' '+n
}
const shuffle=items=>[...items].sort(()=>Math.random()-.5)
const newSet=()=>({reps:'8',loadMode:'none',loadKg:'',percent1rm:'',restSeconds:'120',tempo:''})
const makeLevels=(reps='10',profile={})=>{const levels={};for(const level of ['rx','scaled','foundation']){const p=profile?.levels?.[level]||{};const hasKg=p.men_kg!=null||p.women_kg!=null;levels[level]={sets:'',reps,loadMode:hasKg?'kg':'none',loadKg:'',loadKgMen:p.men_kg==null?'':String(p.men_kg),loadKgWomen:p.women_kg==null?'':String(p.women_kg),percent1rm:'',tempo:'',instruction:'',variant:'',rir:'',rirRange:'',heightCm:'',durationSeconds:'',distanceMeters:'',calories:''}}return levels}
const blankItem=ex=>({key:crypto.randomUUID(),...ex,sideMode:/\balternating\b/i.test(ex.name||'')?'alternating':'',reps:ex.is_complex?'5':ex.equipment==='Romaskin'?'':'10',repsMode:'fixed',rowValue:ex.equipment==='Romaskin'?'500':'',rowUnit:'m',loadMode:'none',loadKg:'',percent1rm:'',rir:'',rpe:'',meters:ex.equipment==='Romaskin'?'500':'',calories:'',workSeconds:'',restSeconds:'',tempo:'',coachNote:'',sets:[newSet()],minuteSlot:'',group:'A',levels:makeLevels(ex.is_complex?'5':ex.equipment==='Romaskin'?'500':'10',ex.prescription_profiles||{})})
const doseFieldsFor=ex=>{const n=(ex.name||'').toLowerCase(),eq=(ex.equipment||'').toLowerCase();const height=/box jump|box step.?up|box step.?over|burpee box/.test(n);const time=/plank|stretch|hold|hundred|balance|dead hang|active hang|flexed.arm hang|wall sit/.test(n);const erg=/(?:^|\s)rowerg|bike erg|ski erg|romaskin/.test(n)||/bikeerg|ski.?erg|romaskin/.test(eq);const distance=erg||/carry|walk|run|crawl/.test(n);const calories=erg;const bodyOnly=/air squat|burpee|double under|single under|toes-to-bar|pull-up|push-up|handstand push-up/.test(n)||/^trx\b/.test(n)||time||/ab wheel|rollout/.test(n);const externalLoad=/manual|dumbbell|barbell|vektstong|kettlebell|medisinball|medicine.?ball|landmine|weight vest|vektvest/.test(eq);const load=!!ex.is_complex||externalLoad||((!height||/step.?up/.test(n))&&!bodyOnly&&(/squat|deadlift|press|curl|row|clean|snatch|jerk|thrust|pulldown|leg press|swing|lunge|carry|wall ball|step.?up/.test(n)||externalLoad));return{height,time,distance,calories,load,tempo:load&&!erg}};
const fmtLoad=x=>x.loadMode==='kg'&&x.loadKg?x.loadKg+' kg':x.loadMode==='percent'&&x.percent1rm?x.percent1rm+' % 1RM':x.loadMode==='bodyweight'?'Kroppsvekt':''

const movementTagsFor=ex=>{const n=(ex.name||'').toLowerCase(),b=(ex.body_area||'').toLowerCase(),t=[];if(/deadlift|swing|hinge|romanian deadlift|clean|snatch|good morning/.test(n))t.push('hinge');if(/squat|thruster|lunge|wall ball|step.?up|box jump/.test(n))t.push('squat');if(/press|push.?up|dip|jerk|handstand/.test(n))t.push('push');if(/pull.?up|row|chin.?up|rope climb/.test(n))t.push('pull');if(/sit.?up|toes.?to.?bar|plank|hollow|crunch|dead bug/.test(n)||/mage|kjerne/.test(b))t.push('core');if(/run|rower|romaskin|bike|ski erg|burpee|crawl|double.?under/.test(n))t.push('conditioning');if(/overhead|snatch|jerk|handstand/.test(n))t.push('overhead');const own=[...new Set(t)];return ex.is_complex?[...new Set([...own,...(ex.complex_steps||[]).flatMap(step=>movementTagsFor({name:step.name}))])]:own}
const loadPairFor=ex=>ex.prescription_profiles||null
const analyseWorkout=(items,minutes)=>{const tags=items.flatMap(movementTagsFor),counts=tags.reduce((a,t)=>(a[t]=(a[t]||0)+1,a),{}),warnings=[],volume=items.reduce((s,x)=>s+(Number(x.reps)||0),0);const repeated=Object.entries(counts).filter(([,n])=>n>=2).map(([t])=>t);if(repeated.length)warnings.push('Fleire øvingar belastar same rørslemønster: '+repeated.join(', ')+'. Vurder samla volum og intensitet.');if(minutes>=20&&items.some(x=>x.loadMode==='kg'&&Number(x.loadKg)>=60))warnings.push('Lang økt med tung ekstern belastning: vurder om belastninga held ønskja stimulus.');if(volume>200)warnings.push('Høgt repetisjonsvolum (>200). Vurder reps og belastning.');if(tags.includes('overhead')&&tags.includes('push'))warnings.push('Overlapp mellom press og arbeid over hovudet kan gi lokal skuldertrøyttleik.');return{tags:[...new Set(tags)],volume,warnings}}
const strengthFormats=['Strength','Pyramid','Superset','Complex']
const strengthLike=f=>strengthFormats.includes(f)
const intervalFormats=['Intervall','Tabata','Row Intervals']
const timedFormats=['EMOM','E1MOM','E1.25MOM','E2MOM','E3MOM','E4MOM','E5MOM','E6MOM','E7MOM']
const isRow=x=>x.equipment==='Romaskin'
const quickDoseMetricFor=ex=>{const fields=doseFieldsFor(ex),name=(ex.name||'').toLowerCase();return isRow(ex)?'rowing':fields.height?'height':fields.calories&&/bike|sykkel|assault|echo/.test(name)?'calories':fields.distance?'distance':fields.calories?'calories':fields.time?'time':null}
const rowingDosePatch=(unit,value)=>({reps:'',distanceMeters:unit==='m'?value:'',calories:unit==='cal'?value:'',durationSeconds:unit==='s'?value:unit==='min'&&value!==''?String(Number(value)*60):''})
const equipmentIcon=value=>{const v=(value||'').toLowerCase();if(/power.?rack|squat.?rack|rig|rack/.test(v))return '🏗️';if(/bike|sykkel|spinning|ergometersykkel|air.?bike|echo.?bike|assault.?bike/.test(v))return '🚴';if(/ski.?erg|skierg/.test(v))return '🎿';if(/row|romaskin|ro.?erg|rowing/.test(v))return '🚣';if(/mølle|tredemølle|treadmill|løping|running/.test(v))return '🏃';if(/hoppetau|jump.?rope|skipping/.test(v))return '🪢';if(/ringar|ringar|gymnastic.?rings/.test(v))return '⭕';if(/klatretau|tau|rope climb/.test(v))return '🧗';if(/manual/.test(v))return '💪';if(/kettlebell/.test(v))return '🔔';if(/stong|stang|barbell|vektskive|bumper/.test(v))return '🏋️';if(/medisinball|medicine.?ball/.test(v))return '🏐';if(/strikk|band/.test(v))return '〰️';if(/trx|slynge/.test(v))return '⛓';if(/box|kasse|step.?kasse/.test(v))return '📦';if(/vegg|wall/.test(v))return '🧱';if(/matte|kroppsvekt/.test(v))return '🤸';if(/kabel|cable/.test(v))return '🛠️';if(/benk|bench/.test(v))return '🪑';if(/stige|agility/.test(v))return '🪜';if(/ball/.test(v))return '🏐';return '•'}
const equipmentItems=value=>(value||'Kroppsvekt').split(/[,;+\\/\\n]+/).map(x=>x.trim()).filter(Boolean);
const categoryTone=value=>{const v=(value||'').toLowerCase();return v.includes('kond')||v.includes('cardio')||v.includes('crossfit')?'conditioning':v.includes('kjern')||v.includes('core')||v.includes('pilates')?'core':v.includes('styr')||v.includes('strength')?'strength':v.includes('mobil')?'mobility':v.includes('golf')?'golf':v.includes('rehab')||v.includes('fysio')?'rehab':'other'}

const quickReps=[5,8,10,12,15]
function RepsPicker({value,label,onChange}) {
 const textValue=String(value??'')
 const singleNumber=/^\d+$/.test(textValue)
 const amount=Number(textValue)
 return <div className="gg-reps-picker" role="group" aria-label={label}>
  <span className="gg-reps-label">{label}</span>
  <div className="gg-reps-controls">
   <button type="button" aria-label="Ein repetisjon mindre" disabled={!singleNumber||amount<=1} onClick={()=>onChange(String(Math.max(1,amount-1)))}>−</button>
   <input aria-label={`${label} · skriv repetisjonar`} type="text" inputMode="numeric" value={textValue} onChange={e=>onChange(e.target.value)} placeholder="Reps"/>
   <button type="button" aria-label="Ein repetisjon meir" disabled={!singleNumber} onClick={()=>onChange(String(amount+1))}>+</button>
  </div>
  <div className="gg-reps-quick-values" role="group" aria-label="Hurtigval repetisjonar">{quickReps.map(n=><button type="button" key={n} aria-pressed={textValue===String(n)} className={textValue===String(n)?'selected':''} onClick={()=>onChange(String(n))}>{n}</button>)}</div>
 </div>
}

function QuickDoseLevels({exercise,isStationCircuit,updateLevel,updateItem,copyRxToLevels}) {
 const fields=doseFieldsFor(exercise)
 const levels=exercise.levels||makeLevels(exercise.reps,exercise.prescription_profiles||{})
 const labels={rx:'RX',intermediate:'Intermediate',scaled:'Scaled'}
 const rowing=isRow(exercise)
 const metric=quickDoseMetricFor(exercise)
 const metricField={m:'distanceMeters',cal:'calories',s:'durationSeconds',min:'durationSeconds'}
 const renderDose=level=>{
  const dose=levels[level]||(level==='intermediate'?levels.rx:{})||{}
  const update=patch=>updateLevel(exercise.key,level,patch)
  const noReps=rowing||['distance','calories','time'].includes(metric)||(isStationCircuit&&(exercise.repsMode||'fixed')==='amrap')
  const independent=level!=='rx'&&hasIndependentReps(levels,level)
  const rowUnit=exercise.rowUnit||'m'
  const rowField=metricField[rowUnit]||'distanceMeters'
  const storedRowAmount=level==='rx'?exercise.rowValue??'':dose[rowField]??''
  const rowAmount=level!=='rx'&&rowUnit==='min'&&storedRowAmount!==''?String(Number(storedRowAmount)/60):storedRowAmount
  return <section key={level} className={'gg-level-row gg-level-'+level}>
   <strong>{labels[level]}</strong>
   <div className="gg-level-fields">
    {!noReps&&(level==='rx'?<RepsPicker value={dose.reps??''} label={exercise.is_complex?'Syklusar':'Reps'} onChange={reps=>update({reps})}/>:<div className="gg-reps-level-override">{independent?<><label>{exercise.is_complex?'Syklusar':'Reps'}<input type="text" inputMode="numeric" value={dose.reps??''} onChange={e=>update({reps:e.target.value,repsOverride:true})}/></label><button type="button" onClick={()=>update({reps:levels.rx?.reps??'',repsOverride:false})}>Bruk RX-reps</button></>:<button type="button" onClick={()=>update({reps:levels.rx?.reps??'',repsOverride:true})}>Endra reps <span>({levels.rx?.reps??''} som RX)</span></button>}</div>)}
    {rowing&&<><label>{rowUnit==='cal'?'Kaloriar':rowUnit==='m'?'Distanse (m)':rowUnit==='min'?'Tid (min)':'Tid (sek)'}<input type="number" min="1" value={rowAmount} onChange={e=>{if(level==='rx'){updateItem(exercise.key,{rowValue:e.target.value});update(rowingDosePatch(rowUnit,e.target.value))}else update({[rowField]:rowUnit==='min'&&e.target.value!==''?String(Number(e.target.value)*60):e.target.value})}}/></label>{level==='rx'&&<label>Mål<select value={rowUnit} onChange={e=>{updateItem(exercise.key,{rowUnit:e.target.value,rowValue:''});update(rowingDosePatch(e.target.value,''))}}><option value="m">Meter</option><option value="cal">Kaloriar</option><option value="s">Sekund</option><option value="min">Minutt</option></select></label>}</>}
    {!rowing&&metric==='time'&&<label>Tid (sek)<input type="number" min="1" value={dose.durationSeconds??''} onChange={e=>update({durationSeconds:e.target.value})}/></label>}
    {!rowing&&metric==='distance'&&<label>Distanse (m)<input type="number" min="1" value={dose.distanceMeters??''} onChange={e=>update({distanceMeters:e.target.value})}/></label>}
    {!rowing&&metric==='calories'&&<label>Kaloriar<input type="number" min="1" value={dose.calories??''} onChange={e=>update({calories:e.target.value})}/></label>}
    {!rowing&&fields.height&&<div className="gg-box-height"><span>Bokshøgd · cm</span><div role="group" aria-label={`${labels[level]} bokshøgd`}>{[50,60,75].map(n=><button type="button" key={n} className={Number(dose.heightCm)===n?'selected':''} aria-pressed={Number(dose.heightCm)===n} onClick={()=>update({heightCm:String(n)})}>{n}</button>)}</div></div>}
    {fields.load&&!['percent','rir','bodyweight'].includes(dose.loadMode)&&<><label>Vekt M (kg)<input type="number" min="0" step="0.5" value={dose.loadKgMen??''} onChange={e=>update({loadMode:'kg',loadKgMen:e.target.value})}/></label><label>Vekt K (kg)<input type="number" min="0" step="0.5" value={dose.loadKgWomen??''} onChange={e=>update({loadMode:'kg',loadKgWomen:e.target.value})}/></label></>}
    {['percent','rir','bodyweight'].includes(dose.loadMode)&&<small className="gg-dose-alt-mode">{dose.loadMode==='percent'?'% 1RM':dose.loadMode==='rir'?'RIR':'Kroppsvekt'} · endra under Avansert</small>}
   </div>
  </section>
 }
 return <div className="gg-quick-dosage">
  <div className="gg-quick-dose-heading"><strong>RX · hovuddosering</strong><small>Felta følgjer øvingstypen</small></div>
  {isSideSelectableExercise(exercise)&&<label className="gg-dose-side-choice">Arm / side<select value={exercise.sideMode||''} onChange={e=>updateItem(exercise.key,{sideMode:e.target.value})}>{WOD_SIDE_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
  {renderDose('rx')}
  <details className="gg-secondary-dosage"><summary>Tilpass nivå · Intermediate / Scaled</summary><p>Valfritt. Juster berre det som skal skilja seg frå RX.</p>{renderDose('intermediate')}{renderDose('scaled')}<button type="button" className="gg-copy-rx" onClick={()=>copyRxToLevels(exercise.key)}>Kopier RX til dei andre nivåa</button></details>
 </div>
}

function WodReviewOrder({ selected, onMove, onEdit }) {
 const labels={rx:'RX',intermediate:'Intermediate',scaled:'Scaled',foundation:'Foundation'}
 const describe=(ex,level)=>{
  if(ex.is_rest)return `${Number(ex.pauseSeconds)||30} sek pause`
  const d=ex.levels?.[level]||{}
  const kg=d.loadMode==='kg'?[d.loadKgMen?'M '+d.loadKgMen+' kg':'',d.loadKgWomen?'K '+d.loadKgWomen+' kg':''].filter(Boolean).join(' / '):''
  const rowField=ex.rowUnit==='cal'?'calories':ex.rowUnit==='s'||ex.rowUnit==='min'?'durationSeconds':'distanceMeters'
  const rawRowAmount=level==='rx'?ex.rowValue:(d[rowField]||'')
  const rowAmount=rawRowAmount?level!=='rx'&&ex.rowUnit==='min'?Number(rawRowAmount)/60:rawRowAmount:ex.rowValue
  return [isRow(ex)?`${rowAmount||'–'} ${ex.rowUnit||'m'}`:d.reps?`${d.reps} reps`:'',d.sets?`${d.sets} sett`:'',d.heightCm?`${d.heightCm} cm`:'',!isRow(ex)&&d.durationSeconds?`${d.durationSeconds} sek`:'',!isRow(ex)&&d.distanceMeters?`${d.distanceMeters} m`:'',!isRow(ex)&&d.calories?`${d.calories} cal`:'',kg,d.loadMode==='percent'?`${d.percent1rm||'–'} % 1RM`:''].filter(Boolean).join(' · ')||'Ikkje dosert'
 }
 return <section className="gg-review-order" aria-label="Rekkjefølgje og dosering">
  <div className="gg-review-order-head"><strong>Øvingar og rekkjefølgje</strong><small>Endra rekkjefølgja her eller gå rett til dosering</small></div>
  {selected.map((ex,i)=><article className="gg-review-item" key={ex.key}>
   <div className="gg-review-item-top"><span className="wod-order">{i+1}</span><strong>{ex.name}</strong><div className="gg-reorder-buttons"><button type="button" aria-label={'Flytt '+ex.name+' opp'} disabled={!i} onClick={()=>onMove(ex.key,-1)}><ArrowUp size={17}/></button><button type="button" aria-label={'Flytt '+ex.name+' ned'} disabled={i===selected.length-1} onClick={()=>onMove(ex.key,1)}><ArrowDown size={17}/></button></div></div>
   <div className="gg-review-levels"><div><b>RX</b><span>{describe(ex,'rx')}</span></div>{!ex.is_rest&&<details className="gg-review-optional"><summary>Andre doseringsnivå</summary>{[...(ex.levels?.intermediate?['intermediate']:[]),'scaled','foundation'].map(level=><div key={level}><b>{labels[level]}</b><span>{describe(ex,level)}</span></div>)}</details>}</div>
   <button type="button" className="gg-review-edit" onClick={()=>onEdit(ex.key)}>Endra dosering</button>
  </article>)}
 </section>
}

export default function WodBuilder({assignedClientId=null,onAssigned,editWodId=null,initialImport=null,onImportConsumed,onSaved,onCancel}){
 const wizardTopRef=useRef(null)
 const previousWizardStep=useRef(0)
 const [exercises,setExercises]=useState([]),[search,setSearch]=useState(''),[category,setCategory]=useState('Alle'),[area,setArea]=useState('Alle område'),[equipmentFilter,setEquipmentFilter]=useState('all'),[movementFilter,setMovementFilter]=useState('all'),[openFilter,setOpenFilter]=useState('')
 const rehabBodyAreas=['hofte','skulder','kne','nakke']
 const isRehabExercise=x=>!!(x.is_rehab||x.category==='Rehab / fysio'||rehabBodyAreas.includes((x.body_area||'').toLowerCase()))
 const [selected,setSelected]=useState([]),[editingWodId,setEditingWodId]=useState(null),[name,setName]=useState(randomWodName()),[format,setFormat]=useState('AMRAP'),[libraryWods,setLibraryWods]=useState([]),[builderMode,setBuilderMode]=useState(assignedClientId?'library':'build'),[librarySearch,setLibrarySearch]=useState(''),[selectedLibraryWod,setSelectedLibraryWod]=useState(''),[classicChoice,setClassicChoice]=useState(''),[publishToMembers,setPublishToMembers]=useState(false),[libraryCategory,setLibraryCategory]=useState('standard'),[customLibraryCategory,setCustomLibraryCategory]=useState('')
 const [compositeBlocks,setCompositeBlocks]=useState(defaultCompositeBlocks),[activeBlockId,setActiveBlockId]=useState('a')
 const [minutes,setMinutes]=useState('20'),[durationSeconds,setDurationSeconds]=useState('0'),[notes,setNotes]=useState(''),[stimulus,setStimulus]=useState('Jamn intensitet · teknisk kvalitet · kontrollert tempo')
 const [rounds,setRounds]=useState('5'),[intervalExerciseCount,setIntervalExerciseCount]=useState('1'),[workSeconds,setWorkSeconds]=useState('60'),[restSeconds,setRestSeconds]=useState('10'),[timeCap,setTimeCap]=useState('20'),[timeCapSeconds,setTimeCapSeconds]=useState('0'),[stationCount,setStationCount]=useState('4'),[stationWork,setStationWork]=useState('45'),[stationTransition,setStationTransition]=useState('15'),[stationRounds,setStationRounds]=useState('3')
 const [ladderStart,setLadderStart]=useState('2'),[ladderStep,setLadderStep]=useState('2'),[ladderDirection,setLadderDirection]=useState('up')
 const [emomIntervalMin,setEmomIntervalMin]=useState('1'),[emomIntervalSec,setEmomIntervalSec]=useState('0')
 const [deathByIntervalMin,setDeathByIntervalMin]=useState('1'),[deathByIntervalSec,setDeathByIntervalSec]=useState('0')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[canPublishWod,setCanPublishWod]=useState(false),[publishRoleReady,setPublishRoleReady]=useState(false)
 const [prescription,setPrescription]=useState('rx'),[customInstructions,setCustomInstructions]=useState(''),[customUseSets,setCustomUseSets]=useState(false),[combinationMode,setCombinationMode]=useState('For Time')
 const [wizardStep,setWizardStep]=useState(0),[libraryOpen,setLibraryOpen]=useState(false),[pickerFeedback,setPickerFeedback]=useState(null),[rxNotes,setRxNotes]=useState(''),[scaledNotes,setScaledNotes]=useState(''),[intensity,setIntensity]=useState('2')
 const [editingSelectedKey,setEditingSelectedKey]=useState(null),[doseLevelByKey,setDoseLevelByKey]=useState({})
 const [participation,setParticipation]=useState('individual'),[collaboration,setCollaboration]=useState('solo'),[partnerCount,setPartnerCount]=useState('3')
 useEffect(()=>{
  if(previousWizardStep.current===wizardStep)return
  previousWizardStep.current=wizardStep
  wizardTopRef.current?.scrollIntoView({block:'start',behavior:'instant'})
 },[wizardStep])

 async function loadWodForEdit(id){
  if(!id)return
  setLoading(true);setError('')
  const {data:w,error:e}=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,is_published,timer_settings,category').eq('id',id).single()
  if(e){setError('Kunne ikkje opna WOD for redigering: '+e.message);setLoading(false);return}
  const schema=w.timer_settings?.workout_schema||{}
  const items=sortWodItems(getWodSchemaItems(schema))
  const engine=normalizeWodEngine(schema,{format:w.format});setParticipation(engine.participation);setCollaboration(engine.collaboration);setPartnerCount(String(engine.participant_count||3));setEditingWodId(w.id);setName(w.name);const legacyFormat=w.format||'AMRAP';const emomMatch=/^EMOM(?: ([1-7]))?$/.exec(legacyFormat);const mappedFormat=isEmomFormat(legacyFormat)?'EMOM':legacyFormat==='Pyramid'?'Strength':legacyFormat==='Couplet / Triplet'?(schema.items?.filter(item=>!item.is_rest).length>=3?'Triplet':'Couplet'):legacyFormat==='Ladder / Death By'?(schema.ladder?.type==='Death By'?'Death By':'Ladder'):legacyFormat==='Intervall / Tabata'?(schema.interval?.work_seconds===20&&schema.interval?.rest_seconds===10?'Tabata':'Intervall'):legacyFormat;setFormat(mappedFormat);setPublishToMembers(canPublishWod&&!!w.is_published);const storedLibraryCategory=schema.library_category||(w.category==='warmup'?'warmup':'standard');const normalizedLibraryCategory=storedLibraryCategory==='daily'?'standard':storedLibraryCategory;const knownLibraryCategories=['warmup','standard','benchmark','assessment','rehab','recovery','other'];setLibraryCategory(knownLibraryCategories.includes(normalizedLibraryCategory)?normalizedLibraryCategory:'custom');setCustomLibraryCategory(knownLibraryCategories.includes(normalizedLibraryCategory)?'':normalizedLibraryCategory)
  setMinutes(String(schema.duration_seconds?Math.floor(schema.duration_seconds/60):w.duration_minutes||20));setDurationSeconds(String(schema.duration_seconds?schema.duration_seconds%60:0))
  const storedEmomSeconds=emomIntervalSeconds(legacyFormat,schema.interval)
  setEmomIntervalMin(String(Math.floor(storedEmomSeconds/60)));setEmomIntervalSec(String(storedEmomSeconds%60))
  setNotes(schema.coach_notes||w.notes||'');setStimulus(schema.stimulus||'Jamn intensitet · teknisk kvalitet · kontrollert tempo')
  setIntensity(String(schema.intensity||2));setPrescription(schema.prescription||'rx');setCustomInstructions(schema.custom_instructions||'');setRxNotes(schema.rx_notes||'');setScaledNotes(schema.scaled_notes||'');setWizardStep(0)
  if(schema.time_cap_seconds){setTimeCap(String(Math.floor(schema.time_cap_seconds/60)));setTimeCapSeconds(String(schema.time_cap_seconds%60))}else{setTimeCap('');setTimeCapSeconds('0')}
  if(schema.rounds)setRounds(String(schema.rounds))
  if(schema.interval){if(schema.interval.work_seconds)setWorkSeconds(String(schema.interval.work_seconds));if(schema.interval.rest_seconds!=null)setRestSeconds(String(schema.interval.rest_seconds))}
  if(schema.ladder){setLadderStart(String(schema.ladder.start||(mappedFormat==='Death By'?1:2)));setLadderStep(String(schema.ladder.step||(mappedFormat==='Death By'?1:2)));setLadderDirection(schema.ladder.direction||'up')}
  const savedDeathBySeconds=Number(schema.ladder?.interval_seconds)||60
  setDeathByIntervalMin(String(Math.floor(savedDeathBySeconds/60)));setDeathByIntervalSec(String(savedDeathBySeconds%60))
  if(schema.station_circuit){setStationCount(String(schema.station_circuit.station_count||items.length));setStationWork(String(schema.station_circuit.work_seconds||45));setStationTransition(String(schema.station_circuit.transition_seconds||15));setStationRounds(String(schema.station_circuit.rounds||3))}
  const hydrated=items.map(item=>{
   const found=item.is_rest?{id:null,name:'Pause',category:'Pause',body_area:'Heile kroppen',equipment:'Ingen',description:'Planlagd pause mellom øvingar.',is_rest:true}:exercises.find(x=>x.id===item.exercise_id)||{id:item.exercise_id||null,name:item.exercise_name,category:item.category||'Styrke',body_area:item.body_area||'Fullkropp',equipment:item.equipment||'',description:'',video_url:null}
   const base=blankItem(found)
   const sets=(item.sets||[]).map(s=>({...newSet(),reps:String(s.reps??''),loadMode:s.load_mode||'none',loadKg:String(s.load_kg??''),percent1rm:String(s.percent_1rm??''),rir:s.rir==null?'':String(s.rir),rpe:s.rpe==null?'':String(s.rpe),restSeconds:String(s.rest_seconds??120),tempo:s.tempo||''}))
   return {...base,warmup_phase:item.warmup_phase||'specific_prep',is_rest:!!item.is_rest,is_complex:!!item.is_complex||Array.isArray(item.complex_steps),complex_family:item.complex_family||null,complex_steps:Array.isArray(item.complex_steps)?item.complex_steps:[],pauseSeconds:String(item.rest_duration_seconds??30),sideMode:getWodSideMode(item),levels:item.levels||makeLevels(String(item.reps??''),{}),prescription:item.prescription||{rx_m:null,rx_f:null,scaled_m:null,scaled_f:null,unit:'kg',source:'manual',overridden:false},reps:String(item.reps??''),rowValue:String(item.row_value??item.meters??item.calories??item.work_seconds??''),rowUnit:item.row_unit||(item.calories?'cal':item.work_seconds?'s':'m'),loadMode:item.load_mode||'none',loadKg:String(item.load_kg??''),percent1rm:String(item.percent_1rm??''),rir:item.rir==null?'':String(item.rir),rpe:item.rpe==null?'':String(item.rpe),restSeconds:String(item.rest_seconds??''),tempo:item.tempo||'',coachNote:item.coach_note||'',minuteSlot:item.minute_slot||'',group:item.superset_group||'A',sets:sets.length?sets:[newSet()]}
  })
  setCompositeBlocks(Array.isArray(schema.composite_blocks)&&schema.composite_blocks.length?schema.composite_blocks.map(block=>isEmomFormat(block.format)?{...block,format:'EMOM',emomIntervalSeconds:emomIntervalSeconds(block.format,{work_every_seconds:block.emomIntervalSeconds,work_every_minutes:block.interval?.work_every_minutes})}:({...block})):defaultCompositeBlocks());setActiveBlockId(schema.composite_blocks?.[0]?.id||'a');setSelected(hydrated.map((item,index)=>({...item,blockId:items[index]?.block_id||schema.composite_blocks?.[0]?.id||'a',repsMode:items[index]?.reps_mode||items[index]?.station_reps_mode||'fixed'})));setNotice('WOD-en er opna for redigering. Endringane blir lagra på same WOD.');setLoading(false)
 }
 useEffect(()=>{load();loadWods()},[])
 useEffect(()=>{if(editWodId&&exercises.length&&publishRoleReady)loadWodForEdit(editWodId)},[editWodId,exercises.length,publishRoleReady,canPublishWod])
 async function loadWods(){const {data,error:e}=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,timer_settings,created_at,is_published,is_archived').eq('is_archived',false).order('created_at',{ascending:false});if(e)setError(e.message);else setLibraryWods((data||[]).filter(w=>!w.is_archived))}
 async function load(){
  setLoading(true)
  setPublishRoleReady(false)
  const {data:{user}}=await supabase.auth.getUser()
  if(user){
   const {data:memberProfile,error:profileError}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle()
   setCanPublishWod(!profileError&&['admin','manager'].includes(memberProfile?.role))
  }else setCanPublishWod(false)
  setPublishRoleReady(true)
  const {data,error:e}=await supabase.from('exercises').select('id,name,category,equipment,video_url,body_area,description,is_rehab,prescription_profiles').eq('is_active',true).order('name')
  if(e)setError(e.message);else setExercises(data||[])
  setLoading(false)
 }
 const equipmentOptions=[{value:'all',label:'Alt utstyr'},{value:'manual',label:'🏋️ Manualar'},{value:'kettlebell',label:'🔔 Kettlebell'},{value:'stong',label:'🏋️ Vektstong'},{value:'medisinball',label:'⚽ Medisinball'},{value:'kroppsvekt',label:'🤸 Kroppsvekt'},{value:'strikk',label:'〰️ Strikk'},{value:'romaskin',label:'🚣 Romaskin'},{value:'trx',label:'TRX'},{value:'box',label:'📦 Plyo box'}]
 const filtered=useMemo(()=>[...exercises,...GOLF_EXERCISES,...REHAB_EXERCISES,...COMPLEX_EXERCISES].filter(x=>{
  const rehab=isRehabExercise(x)
  const exCategory=(x.category||'').toLowerCase();const matchesCategory=category==='Alle'||(category==='Rehab'?rehab:category==='Golf'?(x.name||'').startsWith('Golf –'):category==='Gymnastikk'?exerciseBrowseCategory(x)==='Gymnastikk':category==='Yoga'?exCategory==='yoga flow'||exCategory==='yoga':!rehab&&exerciseBrowseCategory(x)===category)
  const searchable=[x.name,x.category,x.equipment,x.body_area,x.description].filter(Boolean).join(' ').toLowerCase()
  const movementTags=movementTagsFor(x);const matchesMovement=movementFilter==='all'||movementTags.includes(movementFilter)
  const matchesSearch=!search||searchable.includes(search.toLowerCase())||movementTags.some(tag=>tag.includes(search.toLowerCase()))
  const tags=(x.body_area||'').toLowerCase(),needle=area==='Mage'?'kjerne':area.toLowerCase()
  const eq=(x.equipment||'').toLowerCase()
  const matchesEquipment=equipmentFilter==='all'||(equipmentFilter==='manual'&&/manual|dumbbell/.test(eq))||(equipmentFilter==='kettlebell'&&/kettlebell/.test(eq))||(equipmentFilter==='stong'&&/stong|barbell|rack/.test(eq))||(equipmentFilter==='medisinball'&&/medisinball|medicine ball/.test(eq))||(equipmentFilter==='kroppsvekt'&&/kroppsvekt/.test(eq))||(equipmentFilter==='strikk'&&/strikk|band/.test(eq))||(equipmentFilter==='apparat'&&/apparat|ski erg|bike|ergometer|kabel/.test(eq))||(equipmentFilter==='romaskin'&&/romaskin|rowing/.test(eq))||(equipmentFilter==='trx'&&/trx/.test(eq))||(equipmentFilter==='box'&&/box|kasse/.test(eq))
  return matchesCategory&&matchesSearch&&matchesMovement&&matchesEquipment&&(category==='Rehab'||area==='Alle område'||tags.includes(needle))
 }),[exercises,category,area,search,equipmentFilter,movementFilter])
  const showSets=(strengthLike(format)&&format!=='Complex')||(format==='Eigen økt'&&customUseSets)
 const isInterval=intervalFormats.includes(format)||format==='Tabata'||format==='Row Intervals'||format==='Intervall / Tabata'
 const isTimed=isEmomFormat(format)
 const emomEverySeconds=Number(emomIntervalMin)*60+Number(emomIntervalSec)
 const emomTotalSeconds=Number(minutes)*60+Number(durationSeconds)
 const isLadder=format==='Ladder'||format==='Death By'
 const isDeathBy=format==='Death By'
 const isAmrap=format==='AMRAP'
 const isForTime=['For Time','Chipper'].includes(format)
 const isCoupletTriplet=['Couplet','Triplet'].includes(format)
 const isTabata=format==='Tabata'
 const isRowIntervals=format==='Row Intervals'
 const isStationCircuit=format==='Stasjonssirkel'
 const isCustom=format==='Eigen økt'
  const isComposite=format===COMPOSITE_FORMAT
  const compositeBlocksWithItems=compositeBlocks.map(block=>({...block,itemsCount:selected.filter(item=>item.blockId===block.id&&!item.is_rest).length}))
  const usesSetsForItem=item=>showSets||(isComposite&&COMPOSITE_STRENGTH_FORMATS.includes(compositeBlocks.find(block=>block.id===item.blockId)?.format))
  const isStationItem=item=>isStationCircuit||(isComposite&&compositeBlocks.find(block=>block.id===item.blockId)?.format==='Stasjonssirkel')
  const isOptionalTimedReps=item=>isComposite&&COMPOSITE_INTERVAL_FORMATS.includes(compositeBlocks.find(block=>block.id===item.blockId)?.format)
  const isElapsedFormat=showSets||isLadder||isForTime||(isCoupletTriplet&&combinationMode!=='AMRAP')||isCustom||format==='Complex'
 const automaticScoring=scoreForWodFormat(format,combinationMode)
 const automaticScoreLabel=isComposite?'Resultat per del · etter format':isDeathBy?'Fullførte rundar før fristen':SCORE_TYPES.find(item=>item.value===automaticScoring.type)?.label||'Repetisjonar'
 function loadClassicWod(){
  const preset=CLASSIC_WODS.find(x=>x.name===classicChoice)
  if(!preset)return
  const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'')
  const findExercise=name=>{
   const aliases={'run':['run','running'],'row':['row','rowing','romaskin'],'air squat':['air squat','squat'],'pull-up':['pull up','pullup'],'push-up':['push up','pushup'],'double-under':['double under','doubleunder'],'clean and jerk':['clean and jerk'],'hang power clean':['hang power clean'],'power snatch':['power snatch'],'squat clean':['squat clean'],'handstand push-up':['handstand push up','hspu'],'ring dip':['ring dip'],'wall ball':['wall ball','wallball'],'back extension':['back extension']}
   const candidates=[name,...(aliases[name]||[])]
   return exercises.find(ex=>candidates.some(q=>norm(ex.name)===norm(q)))||null
  }
  const rows=preset.items.map(([movement,reps])=>{
   const match=findExercise(movement)
   const base=blankItem(match||{id:null,name:movement,category:'Kondisjon',equipment:'',body_area:'Fullkropp',video_url:null,description:''})
   return {...base,reps,rowValue:'',coachNote:'',loadMode:'none'}
  })
  setSelected(rows);setName(preset.name);setFormat(preset.format);setMinutes(String(preset.minutes));setDurationSeconds('0');setTimeCap(String(preset.minutes));setTimeCapSeconds('0');setRounds(String(preset.rounds||1));setNotes(preset.notes);setStimulus('Klassisk benchmark WOD · registrer resultat og samanlikn ved seinare gjennomføring.')
  setPrescription('rx');setClassicChoice('');setWizardStep(2);setNotice(preset.name+' er lasta inn. Kontroller øvingar, RX-belastning og skalering før publisering.');setError('')
 }
 function applyImportedWod(parsed){
  const imported=parsed.items.filter(row=>row.exercise).map(row=>{
   const exercise=row.exercise
   const item={...blankItem(exercise),blockId:row.block_id||'a'}
   const quantity=row.quantity
   const metric=quickDoseMetricFor(exercise)
   item.reps=quantity?'':String(row.reps??'10')
   if(Number.isInteger(Number(row.sets))&&Number(row.sets)>1&&Number(row.sets)<=30)item.sets=Array.from({length:Number(row.sets)},()=>({...newSet(),reps:item.reps}))
   const dose={...item.levels.rx,reps:item.reps,...(row.sets?{sets:String(row.sets)}:{}),...(row.rirTarget?{loadMode:'rir',rirRange:row.rirTarget,loadKgMen:'',loadKgWomen:'',loadKg:'',percent1rm:''}:{}),instruction:row.loadKg?'Importert belastning ca. '+row.loadKg.toFixed(1)+' kg. Stadfest korrekt RX/Scaled/Foundation-belastning.':''}
   if(quantity){
    if(metric==='rowing'){item.rowValue=String(quantity.value);item.rowUnit=quantity.unit;Object.assign(dose,rowingDosePatch(quantity.unit,String(quantity.value)))}
    else if(quantity.unit==='cal')dose.calories=String(quantity.value)
    else if(quantity.unit==='m')dose.distanceMeters=String(quantity.value)
    else if(quantity.unit==='s')dose.durationSeconds=String(quantity.value)
    else if(quantity.unit==='min')dose.durationSeconds=String(quantity.value*60)
   }
   item.levels=Object.fromEntries(Object.entries(item.levels).map(([level,existing])=>[level,level==='rx'?dose:{...existing,reps:item.reps,...(quantity?.unit==='m'?{distanceMeters:String(quantity.value)}:{}),...(quantity?.unit==='s'?{durationSeconds:String(quantity.value)}:{}),...(quantity?.unit==='min'?{durationSeconds:String(quantity.value*60)}:{}),...(quantity?.unit==='cal'?{calories:String(quantity.value)}:{})}]))
   item.coachNote=row.loadKg?'Importert belastning ca. '+row.loadKg.toFixed(1)+' kg – stadfest belastning per nivå.':''
   return item
  })
  if(!imported.length){setError('Ingen øvingar er kopla til biblioteket. Gå tilbake til importen og vel øvingar.');return}
  setCompositeBlocks(Array.isArray(parsed.blocks)&&parsed.blocks.length?parsed.blocks:defaultCompositeBlocks());setActiveBlockId(parsed.blocks?.[0]?.id||'a');setName(parsed.name||'Importert WOD');setFormat(parsed.format||'Eigen økt');setMinutes(String(parsed.minutes||20));setTimeCap(parsed.minutes?String(parsed.minutes):'');setRounds(String(parsed.rounds||1));setSelected(imported);setNotes(parsed.notes||'');setStimulus('Importert WOD – kontroller format, øvingar og dosering før lagring.');setLibraryCategory('standard');setPublishToMembers(false);setWizardStep(2);setError('');setNotice('WOD-teksten er tolka og lagd inn i byggjaren. Kontroller alle øvingar, belastningar og doseringsnivå før lagring.')
 }
 useEffect(()=>{
  if(!loading&&initialImport&&!editWodId){applyImportedWod(initialImport);onImportConsumed?.()}
 },[loading,initialImport,editWodId])
 function add(ex){if(isInterval&&selected.length>=Number(intervalExerciseCount)){setError(`Du har valt ${intervalExerciseCount} øvingar/drag. Endre talet i oppsettet dersom du vil leggja til fleire.`);return}if(isStationCircuit&&selected.length>=Number(stationCount)){setError(`Du har valt ${stationCount} stasjonar. Fjern ei øving eller auk talet på stasjonar før du legg til fleire.`);return}setError('');const item={...blankItem(ex),blockId:activeBlockId};item.prescription=loadPairFor(ex)||{};if(isStationItem(item)||isOptionalTimedReps(item)){item.reps='';item.repsMode='amrap';item.levels=Object.fromEntries(Object.entries(item.levels).map(([level,d])=>[level,{...d,reps:''}]))}const metric=quickDoseMetricFor(ex);if(['distance','calories','time','rowing'].includes(metric)){item.reps='';item.levels=Object.fromEntries(Object.entries(item.levels).map(([level,d])=>[level,{...d,reps:'',...(metric==='rowing'&&level==='rx'?rowingDosePatch(item.rowUnit,item.rowValue):{})}]))}const count=selected.filter(x=>ex.id?x.id===ex.id:x.name===ex.name).length+1;setPickerFeedback({name:ex.name,count});setSelected(rows=>[...rows,{...item,...(isStationCircuit?{reps:'',repsMode:'amrap'}:{})}])}
 function addPause(){setError('');setSelected(rows=>[...rows,{...blankItem({id:null,name:'Pause',category:'Pause',body_area:'Heile kroppen',equipment:'Ingen',description:'Planlagd pause mellom øvingar.',is_rest:true}),is_rest:true,pauseSeconds:'30',reps:'',blockId:activeBlockId}]);setLibraryOpen(false)}
 function suggestUniqueWodName(){const existing=new Set(libraryWods.map(w=>(w.name||'').trim().toLowerCase()));for(let i=0;i<60;i++){const candidate=randomWodName();if(!existing.has(candidate.toLowerCase())&&candidate.toLowerCase()!==name.trim().toLowerCase())return candidate}return randomWodName()+' '+String(Date.now()).slice(-4)}
 function updateItem(key,patch){setSelected(rows=>rows.map(x=>x.key===key?{...x,...patch}:x))}
 function updateLevel(key,level,patch){if(patch.loadMode==='rir')patch={...patch,loadKgMen:'',loadKgWomen:'',loadKg:'',percent1rm:''};setSelected(rows=>rows.map(x=>{
  if(x.key!==key)return x
  const levels=x.levels||makeLevels(x.reps,x.prescription_profiles||{})
  if(level==='rx'&&Object.hasOwn(patch,'reps')){
   const shared=applySharedReps(levels,patch.reps)
   return {...x,reps:String(patch.reps),levels:{...shared,rx:{...shared.rx,...patch}}}
  }
  const original=levels[level]||(level==='intermediate'?levels.rx:{})
  const implicitOverride=level!=='rx'&&Object.hasOwn(patch,'reps')&&!Object.hasOwn(patch,'repsOverride')?{repsOverride:true}:{}
  return {...x,levels:{...levels,[level]:{...original,...patch,...implicitOverride}}}
 }))}
 function copyRxToLevels(key){setSelected(rows=>rows.map(x=>{
  if(x.key!==key)return x
  const levels=x.levels||makeLevels(x.reps,x.prescription_profiles||{})
  const rx={...levels.rx}
  if(isRow(x)){
   const field=x.rowUnit==='cal'?'calories':x.rowUnit==='s'||x.rowUnit==='min'?'durationSeconds':'distanceMeters'
   rx[field]=x.rowUnit==='min'?String(Number(x.rowValue||0)*60):x.rowValue
  }
  return {...x,levels:{...levels,intermediate:{...rx},scaled:{...rx},foundation:{...rx}}}
 }))}
 function recalculateSuggestions(){setSelected(rows=>rows.map(x=>({...x,levels:makeLevels(x.reps,x.prescription_profiles||{})})));setNotice('Førehandsprofilar frå øvingsbiblioteket er lasta inn på nytt.')}
 function updateSet(key,index,patch){setSelected(rows=>rows.map(x=>x.key===key?{...x,sets:x.sets.map((s,i)=>i===index?{...s,...patch}:s)}:x))}
 function moveByKey(key,delta){
   setSelected(rows=>moveWodItemByKey(rows,key,delta))
   setNotice('Ny rekkjefølgje er vist under og blir lagra i same rekkjefølgje.')
  }
  function randomWod(){
  const pool=exercises.filter(x=>!x.is_rehab&&x.category!=='Rehab / fysio')
  if(!pool.length)return
  const chosen=shuffle(pool).slice(0,3+Math.floor(Math.random()*4))
  setSelected(chosen.map(blankItem));setFormat(['AMRAP','E1MOM','For Time','Chipper','Intervall'][Math.floor(Math.random()*5)])
  setMinutes(String([10,12,15,18,20][Math.floor(Math.random()*5)]));setDurationSeconds('0');setTimeCap('20');setRounds('5')
  setName(suggestUniqueWodName());setNotes('');setStimulus('Jamn intensitet · god teknikk · hald att litt kapasitet')
  setNotice('Ny WOD er generert. Kontroller dosering og stimulus før publisering.');setError('')
 }
 function reset(){
  setCompositeBlocks(defaultCompositeBlocks());setActiveBlockId('a');setSelected([]);setIntensity('2');setNotes('');setCustomInstructions('');setCustomUseSets(false);setCombinationMode('For Time');setStimulus('Jamn intensitet · teknisk kvalitet · kontrollert tempo')
  setName(suggestUniqueWodName());setWizardStep(0);setError('');setNotice('Økta er forkasta. Du kan byrja på nytt.')
 }
  function doseForItem(x,level=prescription){
   const base=(x.levels||makeLevels(x.reps,x.prescription_profiles||{}))[level]||{}
   return {...base,reps:base.reps??x.reps??'',sets:base.sets??'',loadMode:base.loadMode||'none'}
  }
  function doseLoadLabel(d){
   if(d.loadMode==='kg')return [d.loadKgMen!==''?'M '+d.loadKgMen+' kg':'',d.loadKgWomen!==''?'K '+d.loadKgWomen+' kg':''].filter(Boolean).join(' / ')
   if(d.loadMode==='percent'&&d.percent1rm)return d.percent1rm+'% 1RM'
   if(d.loadMode==='rir'&&(d.rirRange||d.rir!==''))return 'RIR '+(d.rirRange||d.rir)
   if(d.loadMode==='bodyweight')return 'Kroppsvekt'
   return ''
  }
  function buildPrescription(x){
   const d=doseForItem(x)
   if(x.is_rest)return 'Pause · '+(Number(x.pauseSeconds)||30)+' sek'
   if(x.is_complex)return x.name+' – '+(d.reps||5)+' komplekssyklusar · '+formatComplexSequence(x.complex_steps)+(doseLoadLabel(d)?' · '+doseLoadLabel(d):'')
   const metric=quickDoseMetricFor(x)
   const measured=metric==='distance'?`${d.distanceMeters||'–'} m`:metric==='calories'?`${d.calories||'–'} cal`:metric==='time'?`${d.durationSeconds||'–'} sek`:(d.reps||'–')+' reps'
   const target=isStationItem(x)&&x.repsMode==='amrap'?'AMRAP · så mange som mogleg på '+(compositeBlocks.find(block=>block.id===x.blockId)?.workSeconds||stationWork)+' sek.':isRow(x)?(x.rowValue?x.rowValue+' '+({s:'sek',min:'min',m:'m',cal:'cal'}[x.rowUnit]||'m'):'ikkje dosert'):measured
   const dose=showSets?[(d.sets?d.sets+' sett':''),(d.reps?d.reps+' reps':''),doseLoadLabel(d)].filter(Boolean).join(' · '):target+(doseLoadLabel(d)?' · '+doseLoadLabel(d):'')
   const side=getWodSideLabel(x,prescription)
   return x.name+' – '+dose+(side?' · '+side:'')+(d.tempo?' · tempo '+d.tempo:'')+(x.coachNote?' · '+x.coachNote:'')
  }
 async function findActiveAssignment(memberId,wodId){
  const {data,error:e}=await supabase.from('pt_wod_assignments')
   .select('id,status')
   .eq('member_id',memberId)
   .eq('wod_id',wodId)
   .in('status',['assigned','in_progress'])
   .limit(1)
   .maybeSingle()
  if(e)throw e
  return data
 }
 async function assignLibraryWod(){
  const wod=libraryWods.find(x=>x.id===selectedLibraryWod)
  if(!wod||!assignedClientId)return
  setBusy(true);setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   if(!user)throw new Error('Logg inn på nytt.')
   const existing=await findActiveAssignment(assignedClientId,wod.id)
   if(existing){
    setNotice('Denne WOD-en er allereie aktivt tildelt kunden. Ingen duplikat vart oppretta.')
    return
   }
   const {error:e}=await supabase.from('pt_wod_assignments').insert({member_id:assignedClientId,wod_id:wod.id,assigned_by:user.id,location:'Valfritt',coach_note:'Tildelt frå PT Studio'})
   if(e)throw e
   setNotice('Eksisterande WOD er tildelt kunden. Biblioteket er ikkje kopiert eller endra.')
   onAssigned?.()
  }catch(e){if(e.code==='23505')setNotice('Denne WOD-en vart nettopp aktivt tildelt kunden. Ingen duplikat vart oppretta.');else setError(e.message||'Kunne ikkje tildela WOD.')}finally{setBusy(false)}
 }
 async function save(event){
  event.preventDefault();setError('');setNotice('')
  if(!selected.length){setError('Legg minst ei øving til WOD-en.');return}
  if(isCoupletTriplet&&combinationMode!=='Open'&&(!Number.isInteger(Number(timeCap))||Number(timeCap)<1||Number(timeCap)>300)){setError(`${format} i ${combinationMode} krev gyldig tidsramme 1–300 minutt.`);setWizardStep(1);return}
  if(isComposite){const issue=validateCompositeBlocks(compositeBlocks,selected);if(issue){setError(issue);setWizardStep(2);return}}
  if(selected.some(ex=>Object.values(ex.levels||{}).some(d=>d.loadMode==='rir'&&!isValidRirTarget(d.rirRange||d.rir)))){setError('RIR må vera 0–10, -1 ved særskild PT-vurdering eller eit intervall som 2–4.');setWizardStep(3);return}
  if(isAmrap&&(!Number.isInteger(Number(timeCap))||Number(timeCap)<1||Number(timeCap)>600)){setError('AMRAP krev ei tidsramme på mellom 1 og 600 minutt.');setWizardStep(1);return}
  if(isTimed&&(!Number.isInteger(Number(emomIntervalMin))||!Number.isInteger(Number(emomIntervalSec))||Number(emomIntervalMin)<0||Number(emomIntervalSec)<0||Number(emomIntervalSec)>59||emomEverySeconds<5||emomEverySeconds>3600||!Number.isInteger(Number(minutes))||Number(minutes)<0||!Number.isInteger(Number(durationSeconds))||Number(durationSeconds)<0||Number(durationSeconds)>59||emomTotalSeconds<emomEverySeconds||emomTotalSeconds%emomEverySeconds!==0)){setError('EMOM krev gyldig intervall (minutt/sekund) og ei øktlengd som går opp i heile intervall.');setWizardStep(1);return}
  if(format==='Ladder'&&(!Number.isInteger(Number(rounds))||Number(rounds)<1||Number(rounds)>100)){setError('Ladder krev 1–100 planlagde rundar.');setWizardStep(1);return}
  if(isDeathBy){const period=Number(deathByIntervalMin)*60+Number(deathByIntervalSec);if(!Number.isInteger(Number(ladderStart))||Number(ladderStart)<1||!Number.isInteger(Number(ladderStep))||Number(ladderStep)<1||!Number.isInteger(Number(deathByIntervalMin))||!Number.isInteger(Number(deathByIntervalSec))||Number(deathByIntervalMin)<0||Number(deathByIntervalSec)<0||Number(deathByIntervalSec)>59||period<5||period>3600){setError('Death By krev startreps og auking over null, og eit intervall på 5 sekund til 60 minutt.');setWizardStep(1);return}}
   if((format==='Couplet'&&selected.length!==2)||(format==='Triplet'&&selected.length!==3)){setError(`${format} krev nøyaktig ${format==='Couplet'?2:3} øvingar.`);return}
  
  if(selected.some(x=>x.is_rest&&(!Number(x.pauseSeconds)||Number(x.pauseSeconds)<1||Number(x.pauseSeconds)>3600))){setError('Alle pausar må ha ei varigheit mellom 1 og 3600 sekund.');return}
  if(!name.trim()){setError('Gi WOD-en eit namn.');return}
   if(selected.some(x=>{if(x.is_rest||isDeathBy||(isStationItem(x)&&x.repsMode==='amrap')||(isOptionalTimedReps(x)&&!String(doseForItem(x).reps??'').trim()))return false;const d=doseForItem(x);const metric=quickDoseMetricFor(x);if(metric==='rowing')return !(Number(x.rowValue)>0);if(metric==='distance')return !(Number(d.distanceMeters)>0);if(metric==='calories')return !(Number(d.calories)>0);if(metric==='time')return !(Number(d.durationSeconds)>0);return !(Number(d.reps)>0||/^\d+(?:[-–/]\d+)+$/.test(String(d.reps||'').trim()))})){setError('Alle øvingar må ha gyldig reps, vekt, distanse, høgd, tid eller kaloriar i RX-nivået.');setWizardStep(3);return}
   if(selected.some(x=>x.is_rest&&(!Number(x.pauseSeconds)||Number(x.pauseSeconds)<1||Number(x.pauseSeconds)>3600))){setError('Alle pausar må ha ei varigheit mellom 1 og 3600 sekund.');return}
  if(isStationCircuit&&(Number(stationCount)<2||Number(stationCount)>8||selected.length!==Number(stationCount))){setError(`Stasjonssirkel krev ${stationCount} øvingar – éi per stasjon. Vel mellom 2 og 8 stasjonar.`);return}
  if(isStationCircuit&&(
    !Number.isInteger(Number(stationWork))||Number(stationWork)<1||Number(stationWork)>600||
    !Number.isInteger(Number(stationTransition))||Number(stationTransition)<0||Number(stationTransition)>600||
    !Number.isInteger(Number(stationRounds))||Number(stationRounds)<1||Number(stationRounds)>20
  )){setError('Stasjonssirkel krev heile sekund (1–600 arbeid, 0–600 byte) og 1–20 heile rundar.');setWizardStep(1);return}
  if(isInterval&&(
    !Number.isInteger(Number(rounds))||Number(rounds)<1||Number(rounds)>8||
    !Number.isInteger(Number(workSeconds))||Number(workSeconds)<1||Number(workSeconds)>600||
    !Number.isInteger(Number(restSeconds))||Number(restSeconds)<0||Number(restSeconds)>600
  )){setError('Intervall krev 1–8 rundar, 1–600 heile arbeidssekund og 0–600 heile pausesekund.');setWizardStep(1);return}
   if(isInterval&&selected.length!==Number(intervalExerciseCount)){setError(`Du må velja ${intervalExerciseCount} øvingar/drag før du går vidare.`);setWizardStep(2);return}
  if(isTabata&&Number(workSeconds)+Number(restSeconds)<=0){setError('Kontroller arbeid og pause i Tabata.');return}
  if(libraryCategory==='warmup'){const prep=selected.some(x=>!x.is_rest&&x.warmup_phase!=='movement_rehearsal'),rehearsal=selected.some(x=>!x.is_rest&&x.warmup_phase==='movement_rehearsal');if(!prep||!rehearsal){setError('Oppvarminga må ha øvingar i begge delar: Felles oppvarming og Fri teknisk innøving.');setWizardStep(2);return}}
  setBusy(true)
  try{
   const {data:{user}}=await supabase.auth.getUser()
   if(!user)throw new Error('Du må vera innlogga for å publisera WOD.')
    const savedFormat=isTimed?'EMOM':format
   const schema={
    version:6,format:savedFormat,composite_blocks:isComposite?compositeBlocksWithItems.map(block=>({...block,duration_seconds:compositeBlockDuration(block,block.itemsCount)})):null,library_category:libraryCategory==='custom'?(customLibraryCategory.trim()||'other'):libraryCategory,intensity:Number(intensity),warmup_plan:libraryCategory==='warmup'?{version:1,sections:[{id:'specific_prep',title:'Felles oppvarming',purpose:'Gradvis førebuing mot hovud-WOD sin stimulus og rørsleform',items:selected.filter(x=>!x.is_rest&&x.warmup_phase!=='movement_rehearsal').map(x=>x.name)},{id:'movement_rehearsal',title:'Fri teknisk innøving',purpose:'Individuell øving på hovudrørsla med lette vekter for å finne rett arbeidsnivå',items:selected.filter(x=>!x.is_rest&&x.warmup_phase==='movement_rehearsal').map(x=>x.name)}],main_stimulus:stimulus,coach_guidance:'Start lett. Auk gradvis belastninga individuelt til planlagt arbeidsvekt for hovud-WOD.'}:null,analysis:analyseWorkout(selected,Number(isAmrap?timeCap:minutes)||0),structure:isStationCircuit?'station_circuit':(showSets||format==='Complex')?'strength':isTimed?'interval_clock':isInterval?'interval':isAmrap||isForTime||isLadder?'metcon':'custom',
    duration_minutes:isComposite?Math.ceil(compositeTotalSeconds(compositeBlocksWithItems)/60):(isAmrap||isTimed||(isCoupletTriplet&&combinationMode!=='Open'))?(isTimed?Math.ceil(emomTotalSeconds/60):Number(timeCap))||null:null,time_cap_minutes:isAmrap?(Number(timeCap)||null):((isForTime||format==='Ladder'||showSets||(isCoupletTriplet&&combinationMode!=='Open'))&&Number(timeCap)>0?Number(timeCap):null),time_cap_seconds:isAmrap?(Number(timeCap)>0?Number(timeCap)*60:null):((isForTime||format==='Ladder'||showSets||(isCoupletTriplet&&combinationMode!=='Open'))&&Number(timeCap)>0?Number(timeCap)*60:null),combination_mode:isCoupletTriplet?combinationMode:null,
    rounds:isStationCircuit?Number(stationRounds):isInterval?Number(rounds):isForTime||format==='Ladder'?Number(rounds)||null:null,
     interval_exercise_count:isInterval?Number(intervalExerciseCount):null,
     interval_exercises:isInterval?selected.map((x,i)=>({order:i+1,exercise_name:x.name,is_rest:!!x.is_rest,rest_duration_seconds:x.is_rest?Number(x.pauseSeconds):null})):null,
    station_circuit:isStationCircuit?{rotation:'all_rotate_together',station_count:Number(stationCount),work_seconds:Number(stationWork),transition_seconds:Number(stationTransition),rounds:Number(stationRounds),stations:selected.map((x,i)=>{
       const stationDose=doseForItem(x)
       return {station_number:i+1,exercise_name:x.name,reps_mode:x.repsMode||'fixed',reps:(x.repsMode||'fixed')==='amrap'?null:Number(stationDose.reps)||null,load_mode:stationDose.loadMode,load_kg:stationDose.loadMode==='kg'?(stationDose.loadKgMen?Number(stationDose.loadKgMen):(stationDose.loadKgWomen?Number(stationDose.loadKgWomen):null)):null,load_label:doseLoadLabel(stationDose),height_cm:stationDose.heightCm!==''&&stationDose.heightCm!=null?Number(stationDose.heightCm):null,equipment:x.equipment||null,description:x.description||null,coach_note:x.coachNote||null}
     })}:null,
    duration_seconds:isComposite?compositeTotalSeconds(compositeBlocksWithItems):isStationCircuit?getFixedSlotTimerState({workSeconds:Number(stationWork),restSeconds:Number(stationTransition),rounds:Number(stationRounds),slotsPerRound:Number(stationCount)}).totalSeconds:isAmrap?(Number(timeCap)||0)*60:(isCoupletTriplet&&combinationMode==='AMRAP')?(Number(timeCap)||0)*60:isTimed?emomTotalSeconds:isInterval?getFixedSlotTimerState({workSeconds:Number(workSeconds),restSeconds:Number(restSeconds),rounds:Number(rounds),slotsPerRound:selected.length}).totalSeconds:null,
     interval:{work_seconds:isTimed?emomEverySeconds:Number(workSeconds)||null,rest_seconds:isTimed?0:Number(restSeconds)||0,work_every_minutes:isTimed?emomEverySeconds/60:null,work_every_seconds:isTimed?emomEverySeconds:null},
     ladder:isLadder?{type:format,start:Number(ladderStart),step:Number(ladderStep),direction:isDeathBy?'up':ladderDirection,...(isDeathBy?{interval_seconds:Number(deathByIntervalMin)*60+Number(deathByIntervalSec)}:{})}:null,
    stimulus,coach_notes:notes,prescription,custom_instructions:customInstructions,rx_notes:rxNotes,scaled_notes:scaledNotes,
    superset_groups:showSets&&format==='Superset'?Array.from(new Set(selected.map(x=>x.group))):[],
    complex_order:format==='Complex'?selected.map(x=>x.name):[],
    items:addWodSortOrder(selected).map(x=>({
       sort_order:x.sort_order,block_id:isComposite?x.blockId:null,warmup_phase:libraryCategory==='warmup'?(x.warmup_phase||'specific_prep'):null,exercise_id:x.is_rest||x.is_golf||x.is_complex?null:(x.id||null),exercise_name:x.name,category:x.is_rest?'Pause':x.is_complex?'Complex':isRehabExercise(x)?'Rehab':x.category,body_area:x.body_area,equipment:x.equipment,golf_focus:x.golf_focus||null,side_mode:x.sideMode===''?'none':x.sideMode||null,is_rest:!!x.is_rest,rest_duration_seconds:x.is_rest?Number(x.pauseSeconds):null,is_complex:!!x.is_complex,complex_family:x.complex_family||null,complex_steps:Array.isArray(x.complex_steps)?x.complex_steps:[],
      sets:usesSetsForItem(x)?Array.from({length:Math.max(1,Math.min(30,Number(doseForItem(x).sets)||1))},()=>({reps:Number(doseForItem(x).reps)||null,load_mode:doseForItem(x).loadMode,load_kg:doseForItem(x).loadMode==='kg'?(doseForItem(x).loadKgMen?Number(doseForItem(x).loadKgMen):(doseForItem(x).loadKgWomen?Number(doseForItem(x).loadKgWomen):null)):null,percent_1rm:doseForItem(x).percent1rm?Number(doseForItem(x).percent1rm):null,rir:doseForItem(x).rir!==''?Number(doseForItem(x).rir):null,rpe:null,rest_seconds:0,tempo:doseForItem(x).tempo||null})):null,
      reps:usesSetsForItem(x)||x.is_rest||isDeathBy?null:(isStationItem(x)&&(x.repsMode||'fixed')==='amrap'?null:Number(doseForItem(x).reps)||null),reps_mode:isStationItem(x)?(x.repsMode||'fixed'):null,load_mode:usesSetsForItem(x)?null:doseForItem(x).loadMode,load_kg:doseForItem(x).loadMode==='kg'?(doseForItem(x).loadKgMen?Number(doseForItem(x).loadKgMen):(doseForItem(x).loadKgWomen?Number(doseForItem(x).loadKgWomen):null)):null,percent_1rm:doseForItem(x).percent1rm?Number(doseForItem(x).percent1rm):null,rir:doseForItem(x).rir!==''?Number(doseForItem(x).rir):null,rpe:null,
     row_value:isRow(x)?Number(x.rowValue):null,row_unit:isRow(x)?x.rowUnit:null,meters:isRow(x)&&x.rowUnit==='m'?Number(x.rowValue):null,calories:isRow(x)&&x.rowUnit==='cal'?Number(x.rowValue):null,work_seconds:isRow(x)&&x.rowUnit==='s'?Number(x.rowValue):null,
     rest_seconds:usesSetsForItem(x)?null:Number(x.restSeconds)||null,tempo:x.tempo||null,coach_note:x.coachNote||null,
     minute_slot:x.minuteSlot||null,superset_group:x.group||'A',prescription:x.prescription||null,levels:x.levels||makeLevels(x.reps,x.prescription_profiles||{})
    }))
   }
   const engineConfig=createWodEngineConfig({participation,collaboration,partnerCount:Number(partnerCount),scoreType:automaticScoring.type,scoreFields:automaticScoring.fields})
   schema.wod_engine={...engineConfig,blocks:isComposite?compositeBlocksWithItems.map((block,index)=>{const timerBlock=compositeBlockForTimer({...block,items:schema.items.filter(item=>item.block_id===block.id)},index);return {...buildLegacyCompatibleBlock({format:block.format,items:timerBlock.items,durationSeconds:timerBlock.duration_seconds,engine:{...engineConfig,scoring:scoreForWodFormat(block.format,block.combinationMode||'For Time')}}),...timerBlock,scoring:scoreForWodFormat(block.format,block.combinationMode||'For Time')}}):[buildLegacyCompatibleBlock({format:savedFormat,items:schema.items,durationSeconds:schema.duration_seconds,engine:engineConfig,interval:schema.interval})]}
   const movements=selected.map((x,i)=>(i+1)+'. '+(x.is_rest?`Pause · ${Number(x.pauseSeconds)||30} sek`:buildPrescription(x))).join('\n')
   const stationDuration=schema.duration_seconds
   const timer_settings={workout_schema:schema,work_seconds:isStationCircuit?Number(stationWork):isTimed?emomEverySeconds:Number(workSeconds)||null,rest_seconds:isStationCircuit?Number(stationTransition):isTimed?0:Number(restSeconds)||null,rounds:isStationCircuit?Number(stationRounds):isTimed?Math.floor(emomTotalSeconds/emomEverySeconds):Number(rounds)||null,duration_seconds:stationDuration}
   const wodPayload={name:name.trim(),category:libraryCategory==='warmup'?'warmup':'main',format:savedFormat,duration_minutes:Math.ceil(stationDuration/60)||null,movements,notes:[stimulus,notes,rxNotes?'RX: '+rxNotes:'',scaledNotes?'Scaled: '+scaledNotes:'',customInstructions].filter(Boolean).join('\n\n'),is_published:canPublishWod&&publishToMembers,timer_settings}
   if(!editingWodId)wodPayload.created_by=user.id
   let savedWodId=editingWodId||null
   if(assignedClientId){
    const existingAssignment=editingWodId?await findActiveAssignment(assignedClientId,editingWodId):null
    if(existingAssignment){
     const {data:savedWod,error:e}=await supabase.from('wods').update(wodPayload).eq('id',editingWodId).select('id').single()
     if(e)throw e
     savedWodId=savedWod.id
     setNotice('WOD-en er oppdatert. Den aktive tildelinga til kunden er bevart utan duplikat.')
    }else{
     const {data:assignedWodId,error:e}=await supabase.rpc('save_wod_with_pt_assignment',{
      p_wod:wodPayload,
      p_member_id:assignedClientId,
      p_wod_id:editingWodId||null
     })
     if(e)throw e
     if(!assignedWodId)throw new Error('WOD og PT-tildeling vart ikkje stadfesta av databasen.')
     savedWodId=assignedWodId
     setNotice('WOD-en er lagra og tildelt kunden.')
    }
    onAssigned?.()
   }else{
    const wodRequest=editingWodId?supabase.from('wods').update(wodPayload).eq('id',editingWodId).select('id').single():supabase.from('wods').insert(wodPayload).select('id').single()
    const {data:savedWod,error:e}=await wodRequest
    if(e)throw e
    savedWodId=savedWod?.id||savedWodId
   }
   setNotice(assignedClientId?(canPublishWod&&publishToMembers?'WOD er publisert og tildelt kunden.':'Privat WOD er lagra og tildelt kunden.'):editingWodId?'WOD-en er oppdatert.':canPublishWod&&publishToMembers?'WOD lagra i biblioteket og publisert for medlemmene.':'WOD lagra i det interne biblioteket som utkast.')
   setCompositeBlocks(defaultCompositeBlocks());setActiveBlockId('a');setSelected([]);setNotes('');setLibraryCategory('standard');setCustomInstructions('');setRxNotes('');setScaledNotes('');setWizardStep(0);setName(suggestUniqueWodName());setEditingWodId(null);onSaved?.()
  }catch(e){setError(e.message||'Kunne ikkje lagra WOD.')}finally{setBusy(false)}
 }
  function chooseFormat(item){
   const changed=item!==format
   setFormat(item);setError('');setNotice('')
   if(changed){
    if(['Strength','Superset','Complex','Eigen økt','Ladder','Death By'].includes(item)){setTimeCap('');setTimeCapSeconds('0')}
    else if(['For Time','Chipper','Couplet','Triplet'].includes(item)&&!timeCap){setTimeCap('20')}
    if(item==='Tabata'){setWorkSeconds('20');setRestSeconds('10');setRounds('8');setIntervalExerciseCount('1')}
    if(item==='Intervall'||item==='Row Intervals'){setWorkSeconds('60');setRestSeconds('10');setRounds('5');setIntervalExerciseCount('1')}
    if(isEmomFormat(item)){setEmomIntervalMin('1');setEmomIntervalSec('0');setWorkSeconds('60');setRestSeconds('0')}
    if(item==='Death By'){setLadderStart('1');setLadderStep('1');setLadderDirection('up');setDeathByIntervalMin('1');setDeathByIntervalSec('0')}
    if(item==='Stasjonssirkel')setSelected(rows=>rows.map(x=>({...x,repsMode:x.repsMode||'amrap'})))
   }
   setWizardStep(wodFormatNeedsTime(item)?1:2)
  }
  function goToStep(next){
   setError('')
   if(next===2){
    setLibraryOpen(false)
    if(isAmrap&&(!Number.isInteger(Number(timeCap))||Number(timeCap)<1||Number(timeCap)>600)){setError('AMRAP krev ei tidsramme på mellom 1 og 600 minutt.');return}
    if(isStationCircuit&&selected.length>Number(stationCount)){setError('Du har fleire øvingar enn stasjonar. Endra stasjonstalet eller fjern ei øving før du held fram.');return}
   }
   if(next===3){setEditingSelectedKey(current=>current&&selected.some(x=>x.key===current)?current:selected[0]?.key||null)}
   if((next===3||next===4)&&!selected.length){setError('Legg minst ei øving til WOD-en før du går vidare.');return}
   if((next===3||next===4)&&isInterval&&selected.length!==Number(intervalExerciseCount)){setError(`Vel ${intervalExerciseCount} øvingar/drag før du går vidare.`);return}
   if((next===3||next===4)&&isStationCircuit&&selected.length!==Number(stationCount)){setError(`Vel ${stationCount} øvingar – éi per stasjon – før du går vidare.`);return}
   if((next===3||next===4)&&((format==='Couplet'&&selected.length!==2)||(format==='Triplet'&&selected.length!==3))){setError(`${format} krev nøyaktig ${format==='Couplet'?2:3} øvingar.`);return}
   setWizardStep(next)
  }
 return <div ref={wizardTopRef} className={'wod-builder wod-builder-step-'+wizardStep+(libraryOpen?' wod-library-open':'')}>
  <div className="training-heading wod-builder-heading"><div><div className="section-kicker">GARASJEGYM · PROGRAMMERINGSVERKSTAD</div><h3>{editingWodId?'Rediger WOD':'WOD Studio'}</h3><p>Bygg, tilpass og publiser treningsøkter i GarasjeGym.</p></div><div className="wod-builder-heading-actions"><span className="count-pill"><WandSparkles size={14}/> PRO</span>{onCancel&&<button type="button" className="secondary-button" onClick={()=>{if((editingWodId||selected.length>0)&&!window.confirm('Avbryta? Ulagra endringar i WOD-byggaren blir forkasta.'))return;onCancel()}}>Avbryt · WOD-bibliotek</button>}</div></div>
  <div className="wod-wizard-steps gg-wizard-progress" data-step-count={wodFormatNeedsTime(format)?5:4} aria-label="Framdrift i WOD-byggjaren">{[{n:0,label:'Format'},{n:1,label:'Tid'},{n:2,label:'Øvingar'},{n:3,label:'Dosering'},{n:4,label:'Lagre'}].filter(step=>step.n!==1||wodFormatNeedsTime(format)).map((step,index)=><button type="button" key={step.n} className={wizardStep===step.n?'active':wizardStep>step.n?'complete':''} disabled={step.n>wizardStep} onClick={()=>goToStep(step.n)} aria-current={wizardStep===step.n?'step':undefined}><b>{wizardStep>step.n?'✓':index+1}</b>{step.label}</button>)}</div>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
  {assignedClientId&&<div className="pt-wod-mode-switch"><button type="button" className={builderMode==='library'?'selected':''} onClick={()=>setBuilderMode('library')}>Finn WOD i biblioteket</button><button type="button" className={builderMode==='build'?'selected':''} onClick={()=>setBuilderMode('build')}>Bygg ny WOD</button></div>}
  {assignedClientId&&builderMode==='library'?<section className="pt-wod-library-panel"><div className="engine-section-title"><div><h4>Vel frå WOD-biblioteket</h4><p>Bruk same publiserte WOD på fleire kundar utan å laga kopiar.</p></div><span>{libraryWods.length} WOD-ar</span></div><div className="wod-search"><Search size={16}/><input value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)} placeholder="Søk etter namn eller format …"/></div><div className="pt-wod-library-list">{libraryWods.filter(w=>(w.name+' '+w.format).toLowerCase().includes(librarySearch.toLowerCase())).map(w=><button type="button" key={w.id} className={selectedLibraryWod===w.id?'selected':''} onClick={()=>setSelectedLibraryWod(w.id)}><span><strong>{w.name}</strong><small>{w.format} · {w.duration_minutes||'–'} min · {w.movements?.split('\n').filter(Boolean).length||0} øvingar</small></span><span>{selectedLibraryWod===w.id?'Vald':'Vel'}</span></button>)}</div><button type="button" className="primary-button" disabled={!selectedLibraryWod||busy} onClick={assignLibraryWod}><Plus size={15}/>{busy?'Tildeler …':'Tildel vald WOD til kunden'}</button></section>:<div className="pt-wod-builder-form">
  {wizardStep===0&&<section className="gg-format-wizard" aria-label="Vel WOD-format">
   <div className="gg-wizard-intro"><span className="wod-classic-kicker">STEG 1 · BYGG WOD</span><h2>Kva slags økt vil du byggja?</h2><p>Vel formatet. Du får berre dei innstillingane økta treng.</p></div>
   <div className="gg-featured-formats">{featuredFormats.map(item=><button type="button" key={item.name} onClick={()=>chooseFormat(item.name)}><span className="gg-format-icon" aria-hidden="true">{formatIcons[item.name]||'◷'}</span><strong>{item.name==='E1MOM'?'EMOM':item.name==='Strength'?'Styrke':item.name}</strong><small>{item.description}</small></button>)}</div>
   <details className="gg-other-formats"><summary>Fleire WOD-format</summary><div>{otherFormats.map(item=><button type="button" key={item} onClick={()=>chooseFormat(item)}>{item}</button>)}</div><small>Couplet og Triplet er spesialoppsett. Dei kan gjennomførast både på tid og som AMRAP.</small></details>
   <p className="gg-wizard-subtle">Scoring blir automatisk tilpassa det valde formatet. Du kan gå tilbake og endra format seinare.</p>
  </section>}
  {wizardStep===3&&<section className="wod-engine-setup gg-participation-section">
    <div className="engine-section-title"><div><h4>Gjennomføring</h4><p>Individuell er standard. Vel partner eller lag berre når utøvarane deler arbeidet.</p></div></div>
    <div className="gg-participation-choices" role="group" aria-label="Gjennomføringsform">
      {PARTICIPATION_MODES.map(item=><button type="button" key={item.value} aria-pressed={participation===item.value} className={participation===item.value?'selected':''} onClick={()=>{setParticipation(item.value);setCollaboration(item.value==='individual'?'solo':'free_split');setPartnerCount(item.value==='partner'?'2':'3')}}>{item.label}</button>)}
    </div>
    <div className="wod-engine-fields">
      {participation!=='individual'&&<label>Samarbeidsform<select value={collaboration} onChange={e=>setCollaboration(e.target.value)}>{COLLABORATION_MODES.filter(x=>x.value!=='solo').map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>}
      {participation==='team'&&<label>Tal utøvarar<input type="number" min="3" max="30" value={partnerCount} onChange={e=>setPartnerCount(e.target.value)}/></label>}
      <div className="wod-auto-score" role="status"><span>Scoring blir valt automatisk etter format</span><strong>{automaticScoreLabel}</strong></div>
    </div>
    <p className="wod-help">Gruppetime er ikkje det same som lagøkt. Ein gruppetime kan godt ha individuell scoring.</p>
  </section>}
  {wizardStep===0&&<section className="wod-classic-picker"><div className="wod-classic-copy"><span className="wod-classic-kicker">BENCHMARK COLLECTION</span><strong>Klassiske WOD-ar</strong><small>The Girls · Hero WODs · originaloppsett</small></div><div className="wod-classic-controls"><select className="wod-classic-select" value={classicChoice} onChange={e=>setClassicChoice(e.target.value)}><option value="">Vel ei klassisk økt …</option><optgroup label="The Girls">{CLASSIC_WODS.filter(x=>x.group==='The Girls').map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</optgroup><optgroup label="Hero WODs">{CLASSIC_WODS.filter(x=>x.group==='Hero WODs').map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</optgroup></select><button type="button" className="secondary-button" disabled={!classicChoice} onClick={loadClassicWod}>Last inn</button></div></section>}
  {wizardStep===0&&<div className="wod-studio-tools"><button type="button" className="primary-button" onClick={()=>{randomWod();setWizardStep(2)}}><Dices size={17}/> Generer tilfeldig WOD</button><button type="button" className="secondary-button" onClick={reset}><Trash2 size={15}/> Forkast økt</button></div>}
  <div className="wod-builder-layout">
   {wizardStep===2&&<aside className="wod-setup-summary"><div className="wod-setup-summary-kicker">WOD-OPPSETT</div><h4>{name||'Namlaus WOD'}</h4><div className="wod-setup-summary-row"><span>Format</span><strong>{format}</strong></div><div className="wod-setup-summary-row"><span>Tidsramme</span><strong>{isComposite?Math.round(compositeTotalSeconds(compositeBlocksWithItems)/60)+' min':isAmrap?(timeCap?timeCap+' min':'Open AMRAP'):isForTime?(timeCap?timeCap+' min':'Fri tid'):isElapsedFormat?'Medgått tid':minutes+' min'}</strong></div><div className="wod-setup-summary-row"><span>Intensitet</span><strong>{intensity==='1'?'Kontrollert':intensity==='3'?'Høg':'Utfordrande'}</strong></div><div className="wod-setup-summary-hint">Oppsettet er klart. Vel øvingar i biblioteket og legg dei til i ønskt rekkjefølgje.</div></aside>}
   {wizardStep===2&&libraryOpen&&createPortal(<section className="engine-section wod-library wod-library-portal" aria-label="Vel øvingar til WOD"><div className="wod-library-fullscreen-head"><strong>Vel øvingar <span>{selected.length} valde</span></strong><button type="button" className="wod-library-ok-top" disabled={!selected.length} onClick={()=>{setLibraryOpen(false);goToStep(3)}}>Vidare · {selected.length} valde →</button><button type="button" aria-label="Tilbake til WOD-byggjaren" title="Tilbake til WOD-byggjaren" onClick={()=>setLibraryOpen(false)}>×</button></div>{isComposite&&<label className="gg-composite-active-picker">Legg øvingar i del <select value={activeBlockId} onChange={e=>setActiveBlockId(e.target.value)}>{compositeBlocks.map((block,index)=><option key={block.id} value={block.id}>{index+1} · {block.title} · {block.format}</option>)}</select></label>}{pickerFeedback&&<div className="gg-picker-feedback" role="status" aria-live="polite"><span aria-hidden="true">✓</span><strong>{pickerFeedback.name}</strong> lagt til{pickerFeedback.count>1?` · ${pickerFeedback.count} gonger i same WOD`:''}. Du kan velja øvinga på nytt.</div>}<div className="engine-section-title"><h4>Øvingsbibliotek</h4><span>{filtered.length} øvingar</span></div>
    <div className="wod-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søk øving, kroppsdel eller utstyr …"/></div>
    <div className="wod-filter-toolbar" aria-label="Filtrer øvingar">
      <button type="button" className={openFilter==='category'?'active':''} aria-expanded={openFilter==='category'} onClick={()=>setOpenFilter(openFilter==='category'?'':'category')}><b>KATEGORI</b><span>{category}</span><span>{openFilter==='category'?'−':'+'}</span></button>
      <button type="button" className={openFilter==='movement'?'active':''} aria-expanded={openFilter==='movement'} onClick={()=>setOpenFilter(openFilter==='movement'?'':'movement')}><b>RØRSLER</b><span>{movementFilter==='all'?'Alle':({squat:'Knebøy',hinge:'Hoftehinge',push:'Press',pull:'Trekk',core:'Kjerne',conditioning:'Kondisjon',overhead:'Over hovudet'}[movementFilter]||movementFilter)}</span><span>{openFilter==='movement'?'−':'+'}</span></button>
      <button type="button" className={openFilter==='equipment'?'active':''} aria-expanded={openFilter==='equipment'} onClick={()=>setOpenFilter(openFilter==='equipment'?'':'equipment')}><b>UTSTYR</b><span>{equipmentOptions.find(x=>x.value===equipmentFilter)?.label||'Alt utstyr'}</span><span>{openFilter==='equipment'?'−':'+'}</span></button>
      <button type="button" className={openFilter==='area'?'active':''} aria-expanded={openFilter==='area'} onClick={()=>setOpenFilter(openFilter==='area'?'':'area')}><b>KROPPSDEL</b><span>{area}</span><span>{openFilter==='area'?'−':'+'}</span></button>
    </div>
    {(category!=='Alle'||movementFilter!=='all'||equipmentFilter!=='all'||area!=='Alle område')&&<div className="wod-active-filters"><span>Aktive filter</span><button type="button" onClick={()=>{setCategory('Alle');setMovementFilter('all');setEquipmentFilter('all');setArea('Alle område');setOpenFilter('')}}>Nullstill alle <b>×</b></button></div>}
    {openFilter==='category'&&<div className="wod-filter-panel"><div className="wod-category-filter">{categories.filter(x=>x!=='Alle').map(x=><button type="button" key={x} className={category===x?'selected':''} aria-pressed={category===x} onClick={()=>{setCategory(category===x?'Alle':x);if(x==='Rehab')setArea('Alle område')}}>{x}</button>)}</div></div>}
    {openFilter==='movement'&&<div className="wod-filter-panel"><div className="wod-movement-filter">{[{value:"all",label:"Alle"},{value:"squat",label:"Knebøy"},{value:"hinge",label:"Hoftehinge"},{value:"push",label:"Press"},{value:"pull",label:"Trekk"},{value:"core",label:"Kjerne"},{value:"conditioning",label:"Kondisjon"},{value:"overhead",label:"Over hovudet"}].map(x=><button type="button" key={x.value} className={movementFilter===x.value?"selected":""} onClick={()=>setMovementFilter(x.value)}>{x.label}</button>)}</div></div>}
    {openFilter==='equipment'&&<div className="wod-filter-panel"><div className="wod-equipment-filter"><div>{equipmentOptions.map(x=><button type="button" key={x.value} className={equipmentFilter===x.value?'selected':''} onClick={()=>setEquipmentFilter(x.value)}>{x.label}</button>)}</div></div></div>}
    {openFilter==='area'&&<div className="wod-filter-panel"><div className="wod-area-filter">{areas.map(x=><button type="button" key={x} className={area===x?'selected':''} onClick={()=>setArea(x)}>{x}</button>)}</div></div>}
    <div className="wod-pause-insert"><div><strong>Pause</strong><small>Legg inn ein tidsstyrt pause mellom øvingar</small></div><button type="button" className="secondary-button" onClick={addPause}><Plus size={15}/> Legg til pause</button></div>{loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar øvingar …</div>:filtered.length?<div className="wod-exercise-grid">{filtered.map(ex=>{const pickedCount=selected.filter(x=>ex.id?x.id===ex.id:x.name===ex.name).length;return <article className={"wod-exercise-card wod-category-"+categoryTone(ex.category)+(pickedCount?' is-picked':'')} key={ex.id||ex.name}><div className="wod-exercise-info"><div className="wod-exercise-card-top"><span className={"wod-stimulus-tag stimulus-"+categoryTone(ex.category)}>{ex.stimulus||ex.category||'Functional Fitness'}</span>{pickedCount>0&&<span className="wod-picked-count">✓ Vald {pickedCount} {pickedCount===1?'gong':'gonger'}</span>}</div><strong>{ex.name}</strong><small>{isRehabExercise(ex)?'Rehab':ex.category} · {ex.body_area||'Heile kroppen'}</small><div className="wod-equipment-icons">{equipmentItems(ex.equipment).map((item,ei)=><span key={ei} title={item}>{equipmentIcon(item)}</span>)}{ex.movement_pattern&&<span>{ex.movement_pattern}</span>}</div>{ex.description&&<p className={isRehabExercise(ex)?'wod-rehab-description':''}>{ex.description}</p>}
          {ex.is_complex&&<small className="wod-complex-sequence">{formatComplexSequence(ex.complex_steps)}</small>}{ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer">Sjå video</a>}</div><button className="wod-add-button" type="button" onClick={()=>add(ex)} aria-label={pickedCount?`Legg til ${ex.name} på nytt. Vald ${pickedCount} gonger.`:`Legg til ${ex.name} i WOD`} title={pickedCount?'Legg til same øving på nytt':'Legg til øving i WOD'}><Plus size={20}/>{pickedCount?'Legg til igjen':'Legg til'}</button></article>})}</div>:<div className="empty-state">Ingen øvingar treff søket.</div>}
   </section>,document.body)}
   <aside className="engine-section wod-composer">
    <div className="engine-section-title"><h4>{wizardStep===0?'Vel format':wizardStep===1?'Tid og rammer':wizardStep===2?'Vel øvingar':wizardStep===3?'Dosering':'Gjennomgang og lagring'}</h4><span>{isInterval?selected.length+'/'+intervalExerciseCount+' øvingar':selected.length+' øvingar'}</span></div>
    <form className="admin-create-form" onSubmit={save}>
     {wizardStep===1&&<div className="gg-wizard-intro gg-time-intro"><span className="wod-classic-kicker">TIDSOPPSETT · {format}</span><h2>Still inn økta</h2><p>Vel eit snøggval, dra visaren på klokka eller skriv inn nøyaktig tid.</p></div>}
     {wizardStep===4&&<section className="gg-review-before"><div className="gg-wizard-intro"><span className="wod-classic-kicker">SISTE STEG</span><h2>Sjå over og lagre</h2><p>Kontroller WOD-en, flytt øvingar eller gå rett tilbake til dosering.</p></div><div className="gg-review-name"><label>WOD-namn<input value={name} onChange={e=>setName(e.target.value)} required maxLength={120} placeholder="Gi økta eit namn"/></label><button type="button" className="secondary-button" onClick={()=>setName(suggestUniqueWodName())}>Foreslå namn</button></div><p className="gg-review-context">{format} · {isStationCircuit?`${stationCount} stasjonar, ${stationRounds} rundar`:isAmrap?`${timeCap||'–'} minutt`:isTimed?`${minutes} minutt`:isForTime?timeCap?`${timeCap} min tidsgrense`:'Utan tidsgrense':'Etter øvingsoppsettet'} · {selected.length} øvingar</p><WodReviewOrder selected={selected} onMove={moveByKey} onEdit={key=>{setEditingSelectedKey(key);setWizardStep(3)}}/><details className="gg-review-notes"><summary>Mål og instruksjon for økta (valfritt)</summary><label>Planlagt treningsstimulus<textarea rows="2" value={stimulus} onChange={e=>setStimulus(e.target.value)}/></label><label>Intensitet<select value={intensity} onChange={e=>setIntensity(e.target.value)}><option value="1">Kontrollert / teknikk</option><option value="2">Utfordrande</option><option value="3">Høg intensitet</option></select></label><label>Instruktørnotat<textarea rows="2" value={notes} onChange={e=>setNotes(e.target.value)}/></label></details></section>}
     {wizardStep===1&&<div className="wizard-format-panel"><div className="wod-name-field"><label>WOD-namn<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Gje økta eit namn …"/></label><button type="button" className="secondary-button" onClick={()=>setName(suggestUniqueWodName())}>Nytt namn</button></div>
     
     <div className="wod-setup-format">
      <div className="wod-setup-field-label">Format <span>*</span></div>
      <div className="wod-format-tiles" role="group" aria-label="Vel WOD-format">
        {formats.map(group=><section className="wod-format-group" key={group.group}><strong className="wod-format-group-label">{group.group}</strong><div className="wod-format-group-options">{group.items.map(item=><button key={item} type="button" className={format===item?'selected':''} aria-pressed={format===item} onClick={()=>{setFormat(item);setError('');if(['Strength','Superset','Complex','Eigen økt','Ladder','Death By'].includes(item)){setTimeCap('');setTimeCapSeconds('0')}else if(['For Time','Chipper','Couplet','Triplet'].includes(item)&&!timeCap){setTimeCap('20')}if(item==='Tabata'){setWorkSeconds('20');setRestSeconds('10');setRounds('8');setIntervalExerciseCount('1')}if(item==='Intervall'||item==='Row Intervals'){setWorkSeconds('60');setRestSeconds('10');setRounds('5');setIntervalExerciseCount('1')}if(isEmomFormat(item)){setEmomIntervalMin('1');setEmomIntervalSec('0');setWorkSeconds('60');setRestSeconds('0')}if(item==='Death By'){setLadderStart('1');setLadderStep('1');setLadderDirection('up');setDeathByIntervalMin('1');setDeathByIntervalSec('0')}if(item==='Stasjonssirkel'){setSelected(rows=>rows.map(x=>({...x,reps:'',repsMode:'amrap'})))}}}><span className="wod-format-icon">{formatIcons[item]||'○'}</span><strong>{item==='Complex'?'Kompleksstyrke':item}</strong></button>)}</div></section>)}
      </div>
     </div>
     <label className="wod-category-early">Kategori<select value={libraryCategory} onChange={event=>setLibraryCategory(event.target.value)}><option value="warmup">Oppvarming · 2 delar</option><option value="standard">Standard-WOD</option><option value="benchmark">Benchmark-WOD</option><option value="assessment">Test og evaluering</option><option value="rehab">Rehabilitering / tilpassa</option><option value="recovery">Restitusjon og mobilitet</option><option value="other">Anna / spesialøkt</option></select></label><small className="wod-category-help">Kategori seier kva føremål økta har. Format styrer korleis ho blir gjennomført og skåra. Dagens WOD blir planlagt separat i kalenderen.</small>{libraryCategory==='warmup'&&<aside className="warmup-builder-guide"><strong>Oppvarminga har to delar</strong><p><b>1. Felles oppvarming:</b> bygg gradvis opp mot hovud-WOD sin stimulus og rørsleform.</p><p><b>2. Fri teknisk innøving:</b> kvar deltakar prøver hovudrørsla med lette vekter og finn sitt eige arbeidsnivå.</p></aside>}<div className="engine-fields">{!isTimed&&!isStationCircuit&&!isAmrap&&!isInterval&&!showSets&&!isLadder&&!isForTime&&!(isCoupletTriplet&&combinationMode!=='Open')&&<label>Planlagd tid (minutt)<input type="number" min="1" max="600" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}</div>
     {isStationCircuit&&<div className="wod-advanced-fields station-circuit-settings"><WodTimeDial label="Arbeid per stasjon" unit="sek" value={stationWork} onChange={setStationWork}/><label>Tal stasjonar<select value={stationCount} onChange={e=>{const count=Number(e.target.value);setStationCount(String(count));if(selected.length>count)setNotice('Du har fleire øvingar enn stasjonar. Gå til øvingsvalet og fjern overflødige øvingar.')}}>{[2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>Bytetid (sek.)<input type="number" min="0" max="600" step="1" value={stationTransition} onChange={e=>setStationTransition(e.target.value)}/></label><label>Tal rundar<input type="number" min="1" max="20" step="1" value={stationRounds} onChange={e=>setStationRounds(e.target.value)}/></label><p className="wod-help">Vel 2–8 stasjonar, arbeidstid, bytetid og rundar. Alle gruppene roterer samtidig; total tid blir rekna automatisk.</p></div>}
      {isTimed&&<div className="wod-advanced-fields"><div className="engine-fields two"><label>Start nytt intervall kvart · minutt<input type="number" min="0" max="60" step="1" value={emomIntervalMin} onChange={e=>setEmomIntervalMin(e.target.value)}/></label><label>Sekund<input type="number" min="0" max="59" step="1" value={emomIntervalSec} onChange={e=>setEmomIntervalSec(e.target.value)}/></label></div><WodTimeDial label="Øktlengd · minutt" value={minutes} onChange={setMinutes}/><label>Øktlengd · ekstra sekund<input type="number" min="0" max="59" value={durationSeconds} onChange={e=>setDurationSeconds(e.target.value)}/></label><p className="wod-help">{emomEverySeconds>0?`${emomDisplayLabel(emomEverySeconds)} · ${Math.floor(emomTotalSeconds/emomEverySeconds)} intervall. ${emomTotalSeconds%emomEverySeconds?'Øktlengda må gå opp i intervalla.':''}`:'Vel intervall.'} Start oppgåva kvar gong klokka når null. Kvile er tida du får att etter å ha fullført repetisjonane.</p></div>}
      {isInterval&&<div className="wod-advanced-fields"><WodTimeDial label="Arbeid per intervall" unit="sek" value={workSeconds} onChange={setWorkSeconds}/><label>Tal øvingar / drag<select value={intervalExerciseCount} onChange={e=>{setIntervalExerciseCount(e.target.value);if(selected.length>Number(e.target.value))setNotice('Fjern overflødige øvingar i øvingssteget før du held fram.')}}>{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} {n===1?'øving/drag':'øvingar/drag'}</option>)}</select></label><label>Tal rundar<select value={rounds} onChange={e=>setRounds(e.target.value)}>{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} {n===1?'runde':'rundar'}</option>)}</select></label><label>Pause (sekund)<input type="number" min="0" max="600" step="1" value={restSeconds} onChange={e=>setRestSeconds(e.target.value)}/></label><p className="wod-help">{format==='Tabata'?'Standard Tabata: 20 sek arbeid / 10 sek pause × 8 rundar.':'Vel arbeidstid, pause, tal rundar og drag. Øvingane blir gjennomførte i vald rekkjefølgje.'}</p></div>}
      {isLadder&&<div className="wod-advanced-fields"><label>Startreps<input type="number" min="1" value={ladderStart} onChange={e=>setLadderStart(e.target.value)}/></label><label>Auking per runde<input type="number" min="1" value={ladderStep} onChange={e=>setLadderStep(e.target.value)}/></label>{!isDeathBy&&<label>Retning<select value={ladderDirection} onChange={e=>setLadderDirection(e.target.value)}><option value="up">Aukande</option><option value="down">Minkande</option></select></label>}{isDeathBy&&<><label>Intervall · minutt<input type="number" min="0" max="60" step="1" value={deathByIntervalMin} onChange={e=>setDeathByIntervalMin(e.target.value)}/></label><label>Intervall · sekund<input type="number" min="0" max="59" step="1" value={deathByIntervalSec} onChange={e=>setDeathByIntervalSec(e.target.value)}/></label><p className="wod-help">Start med {ladderStart||1} reps. Auka med {ladderStep||1} i kvar nye intervallrunde. Klokka tel ned kvar gong og stoppar automatisk når målet ikkje er stadfesta før fristen.</p></>}</div>}
     {format==='Ladder'&&<div className="wod-advanced-fields"><label>Planlagde rundar / stigetrinn<input type="number" min="1" max="100" step="1" value={rounds} onChange={e=>setRounds(e.target.value)}/></label><p className="wod-help">Fullfør eit stigetrinn og trykk «Runde fullført» for å gå vidare. Klokka tel medgått tid; ho startar ikkje nye trinn automatisk kvart minutt.</p></div>}
      {isAmrap&&<div className="wod-advanced-fields"><WodTimeDial label="Kor lenge skal AMRAP-en vara?" value={timeCap} onChange={setTimeCap}/><p className="wod-help">AMRAP har alltid fast tid. Resultatet blir registrert som rundar og ekstra repetisjonar.</p></div>}
      {(isForTime||format==='Ladder'||showSets)&&<div className="wod-advanced-fields"><div className="gg-cap-choice"><strong>Tidsgrense (valfri)</strong><button type="button" aria-pressed={!timeCap} className={!timeCap?'selected':''} onClick={()=>setTimeCap('')}>Utan tidsgrense</button><button type="button" aria-pressed={!!timeCap} className={timeCap?'selected':''} onClick={()=>setTimeCap(current=>current||'20')}>Med tidsgrense</button></div>{timeCap!==''&&<WodTimeDial label="Tidsgrense" value={timeCap} onChange={setTimeCap}/>} {isForTime&&format!=='Chipper'&&<label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(e.target.value)}/></label>}<p className="wod-help">Tidsgrensa er valfri. Når ho går ut, blir utført arbeid lagra.</p></div>}
      {isCoupletTriplet&&<div className="wod-advanced-fields"><label>Tidsstruktur<select value={combinationMode} onChange={e=>setCombinationMode(e.target.value)}><option value="For Time">For Time</option><option value="AMRAP">AMRAP</option><option value="Open">Open / utan klokke</option></select></label>{combinationMode!=='Open'&&<label>Tidsgrense (min)<input type="number" min="1" max="300" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label>}<p className="wod-help">{format} krev {format==='Couplet'?2:3} øvingar. Tidsstrukturen avgjer korleis dei blir gjennomførte.</p></div>}
      
     {format==='Superset'&&<p className="wod-help">Gruppér øvingar med same bokstav. Utfør gruppa etter kvarandre, kvil etterpå.</p>}
      {format==='Complex'&&<p className="wod-help">Vel komplekse rørslesekvensar frå øvingsbiblioteket. Repetisjonar, syklusar og belastning blir styrte i doseringssteget. Tida blir registrert som medgått tid.</p>}
     
     {isCustom&&<><label className="wod-custom-sets"><input type="checkbox" checked={customUseSets} onChange={e=>setCustomUseSets(e.target.checked)}/> Bruk sett-programmering på øvingane</label><label>Fri struktur / instruksjon<textarea rows="3" value={customInstructions} onChange={e=>setCustomInstructions(e.target.value)} placeholder="Beskriv struktur, sett, rundar, pausar og gjennomføring …"/></label></>}
     </div>}{wizardStep===2&&!libraryOpen&&<div className="wizard-selected-stage">
       {isComposite&&<section className="gg-composite-editor" aria-label="Øktdelar">
 <div className="engine-section-title"><h4>Delar i økta</h4><span>{compositeBlocks.length} delar · {Math.ceil(compositeTotalSeconds(compositeBlocksWithItems)/60)} min inkl. pausane</span></div>
 <p className="wod-help">Vel format, øvingar og dosering for kvar del. Pause mellom delane kan vera manuell eller ha eiga nedteljing. Alle øvingane brukar det vanlege biblioteket.</p>
 {compositeBlocks.map((block,index)=>{
  const exerciseCount=selected.filter(x=>x.blockId===block.id&&!x.is_rest).length
  const isIntervalPart=COMPOSITE_INTERVAL_FORMATS.includes(block.format)||block.format==='Stasjonssirkel'
  const duration=compositeBlockDuration(block,exerciseCount)
  const updateBlock=patch=>setCompositeBlocks(rows=>rows.map(x=>x.id===block.id?{...x,...patch}:x))
  return <div className="gg-composite-block" key={block.id}>
   <div className="gg-composite-block-head"><strong>Del {index+1} · {block.title||block.format}</strong><small>{exerciseCount} øvingar · {Math.floor(duration/60)}:{String(duration%60).padStart(2,'0')} arbeid</small></div>
   <div className="gg-composite-block-fields">
    <label>Namn<input value={block.title} onChange={e=>updateBlock({title:e.target.value})} maxLength={60}/></label>
    <label>Format<select value={block.format} onChange={e=>updateBlock({format:e.target.value,workSeconds:e.target.value==='Tabata'?20:45,restSeconds:e.target.value==='Tabata'?10:15,rounds:e.target.value==='Tabata'?8:3,...(e.target.value==='Death By'?{ladderStart:1,ladderStep:1,ladderDirection:'up',deathByIntervalSeconds:60}:{}),...(e.target.value==='EMOM'?{emomIntervalSeconds:60}:{})})}>{COMPOSITE_BLOCK_FORMATS.filter(f=>!/^E\d+(?:\.\d+)?MOM$/.test(f)).map(f=><option key={f} value={f}>{f}</option>)}</select></label>
    {isIntervalPart?<><label>Arbeid (sek)<input type="number" min="1" max="600" value={block.workSeconds??(block.format==='Tabata'?20:45)} onChange={e=>updateBlock({workSeconds:e.target.value})}/></label>
     <label>Byte/kvile (sek)<input type="number" min="0" max="600" value={block.restSeconds??(block.format==='Tabata'?10:15)} onChange={e=>updateBlock({restSeconds:e.target.value})}/></label>
     <label>Rundar<input type="number" min="1" max="30" value={block.rounds??(block.format==='Tabata'?8:3)} onChange={e=>updateBlock({rounds:e.target.value})}/></label>
    </>:<label>{COMPOSITE_STRENGTH_FORMATS.includes(block.format)||block.format==='Eigen økt'?'Planlagd tid (min)':block.format==='Death By'?'Maksimal øktlengd (min)':'Øktlengd / time cap (min)'}<input type="number" min="1" max="180" value={block.minutes} onChange={e=>updateBlock({minutes:e.target.value})}/></label>}

    {isEmomFormat(block.format)&&<><label>Start intervall kvar · minutt<input type="number" min="0" max="60" step="1" value={Math.floor((Number(block.emomIntervalSeconds)||emomIntervalSeconds(block.format))/60)} onChange={e=>{const old=Number(block.emomIntervalSeconds)||emomIntervalSeconds(block.format);updateBlock({emomIntervalSeconds:Math.max(0,Number(e.target.value)||0)*60+old%60})}}/></label><label>Intervall · sekund<input type="number" min="0" max="59" step="1" value={(Number(block.emomIntervalSeconds)||emomIntervalSeconds(block.format))%60} onChange={e=>{const old=Number(block.emomIntervalSeconds)||emomIntervalSeconds(block.format);updateBlock({emomIntervalSeconds:Math.floor(old/60)*60+Math.max(0,Math.min(59,Number(e.target.value)||0))})}}/></label><p className="wod-help">{emomDisplayLabel(block.emomIntervalSeconds||emomIntervalSeconds(block.format))} · øktlengda må gå opp i heile intervall.</p></>}
    {['Couplet','Triplet'].includes(block.format)&&<label>Tidsstruktur<select value={block.combinationMode||'For Time'} onChange={e=>updateBlock({combinationMode:e.target.value})}><option value="For Time">For Time</option><option value="AMRAP">AMRAP</option><option value="Open">Open · stoppeklokke</option></select></label>}
    {['Ladder','Death By'].includes(block.format)&&<><label>Startreps<input type="number" min="1" max="100" value={block.ladderStart??(block.format==='Death By'?1:2)} onChange={e=>updateBlock({ladderStart:e.target.value})}/></label><label>Auking per runde<input type="number" min="1" max="100" value={block.ladderStep??(block.format==='Death By'?1:2)} onChange={e=>updateBlock({ladderStep:e.target.value})}/></label>{block.format!=='Death By'&&<label>Retning<select value={block.ladderDirection||'up'} onChange={e=>updateBlock({ladderDirection:e.target.value})}><option value="up">Aukande</option><option value="down">Minkande</option></select></label>}{block.format==='Death By'&&<><label>Intervall · minutt<input type="number" min="0" max="60" value={Math.floor((Number(block.deathByIntervalSeconds)||60)/60)} onChange={e=>updateBlock({deathByIntervalSeconds:Math.max(0,Number(e.target.value)||0)*60+(Number(block.deathByIntervalSeconds)||60)%60})}/></label><label>Intervall · sekund<input type="number" min="0" max="59" value={(Number(block.deathByIntervalSeconds)||60)%60} onChange={e=>updateBlock({deathByIntervalSeconds:Math.floor((Number(block.deathByIntervalSeconds)||60)/60)*60+Math.max(0,Math.min(59,Number(e.target.value)||0))})}/></label><p className="wod-help">Kvar runde tel ned dette intervallet. Stadfest rundemålet før klokka går ut.</p></>}</>}
   </div>
   {index<compositeBlocks.length-1&&<div className="gg-composite-transition-fields">
    <label>Overgang til neste del<select value={block.transitionMode||'manual'} onChange={e=>updateBlock({transitionMode:e.target.value})}><option value="manual">Manuell · trykk Neste del</option><option value="timed">Fast pause · nedteljing</option></select></label>
    {block.transitionMode==='timed'&&<label>Pause (sek)<input type="number" min="1" max="3600" value={block.transitionSeconds||60} onChange={e=>updateBlock({transitionSeconds:e.target.value})}/></label>}
   </div>}
   <div className="gg-composite-block-actions"><button type="button" className="secondary-button" onClick={()=>{setActiveBlockId(block.id);setLibraryOpen(true)}}><Plus size={15}/> Legg til øving i del {index+1}</button>
    {compositeBlocks.length>2&&<button type="button" className="secondary-button" disabled={selected.some(x=>x.blockId===block.id)} onClick={()=>{setCompositeBlocks(rows=>rows.filter(x=>x.id!==block.id));if(activeBlockId===block.id)setActiveBlockId(compositeBlocks[0].id)}}>Fjern del</button>}
   </div>
  </div>
 })}
 {compositeBlocks.length<8&&<button type="button" className="secondary-button" onClick={()=>{const id=crypto.randomUUID();setCompositeBlocks(rows=>[...rows,{id,title:'Del '+(rows.length+1),format:'AMRAP',minutes:8,transitionMode:'manual',transitionSeconds:0}]);setActiveBlockId(id)}}><Plus size={15}/> Legg til øktdel</button>}
 </section>}
       <div className="wizard-stage-intro"><strong>Øvingane i WOD-en</strong><span>Vel øvingar, sorter dei og gå vidare til eitt samla doseringssteg.</span></div>
       <div className="gg-exercise-actions"><button type="button" className="primary-button wod-open-library" onClick={()=>setLibraryOpen(true)}><Plus size={17}/> Legg til øving</button><button type="button" className="secondary-button gg-add-pause" onClick={addPause}><Plus size={16}/> Legg til pause</button></div>
       <div className="wod-selected-list">
        {selected.length?selected.map((ex,i)=><article data-order={i+1} className={"wod-selected-card wod-category-"+categoryTone(ex.category)} key={ex.key}>
         <span className={"wod-order wod-order-"+categoryTone(ex.category)}>{i+1}</span>
         <div className="wod-selected-info">
          <div className="wod-selected-title"><strong>{ex.name}</strong><span className={"wod-stimulus-tag stimulus-"+categoryTone(ex.category)}>{ex.is_complex?'COMPLEX':ex.stimulus||ex.category}</span></div>
          <small>{ex.body_area||'Heile kroppen'} · {equipmentItems(ex.equipment).map((item,ei)=><span key={ei} title={item}>{equipmentIcon(item)}{ei<equipmentItems(ex.equipment).length-1?' · ':''}</span>)}</small>
          {isComposite&&<label className="warmup-phase-picker">Del i økta<select value={ex.blockId||compositeBlocks[0].id} onChange={event=>updateItem(ex.key,{blockId:event.target.value})}>{compositeBlocks.map((block,index)=><option key={block.id} value={block.id}>{index+1} · {block.title}</option>)}</select></label>}
          {libraryCategory==='warmup'&&!ex.is_rest&&<label className="warmup-phase-picker">Del av oppvarming<select value={ex.warmup_phase||'specific_prep'} onChange={event=>setSelected(rows=>rows.map(row=>row.key===ex.key?{...row,warmup_phase:event.target.value}:row))}><option value="specific_prep">1 · Felles oppvarming</option><option value="movement_rehearsal">2 · Fri teknisk innøving</option></select></label>}
          {ex.is_complex&&<small className="wod-complex-sequence">{formatComplexSequence(ex.complex_steps)}</small>}
          {ex.is_rest&&<small className="wod-pause-summary">Pause · {Number(ex.pauseSeconds)||30} sekund · blir justert i doseringssteget</small>}
          {!ex.is_rest&&ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer">Sjå øvingsvideo</a>}
         </div>
         <div className="wod-reorder-controls">
          <button type="button" title="Flytt opp" aria-label={`Flytt ${ex.name} opp`} disabled={!i} onClick={()=>moveByKey(ex.key,-1)}><ArrowUp size={16}/></button>
          <button type="button" title="Flytt ned" aria-label={`Flytt ${ex.name} ned`} disabled={i===selected.length-1} onClick={()=>moveByKey(ex.key,1)}><ArrowDown size={16}/></button>
          <button type="button" title="Fjern øving" aria-label={`Fjern ${ex.name}`} onClick={()=>setSelected(rows=>rows.filter(x=>x.key!==ex.key))}><Trash2 size={16}/></button>
         </div>
        </article>):<div className="empty-state">Vel «Legg til øving» for å byggja WOD-en.</div>}
       </div>
       <p className="wod-order-feedback" role="status" aria-live="polite" aria-atomic="true">Rekkjefølgje: {selected.map((ex,i)=>(i+1)+'. '+ex.name).join(' → ')}</p>
      <div className="wizard-stage-actions wizard-stage-actions-sticky"><button type="button" className="secondary-button" onClick={()=>setWizardStep(wodFormatNeedsTime(format)?1:0)}>Tilbake</button><button type="button" className="primary-button" disabled={!selected.length||(isInterval&&selected.length!==Number(intervalExerciseCount))} onClick={()=>goToStep(3)}>Vidare · {selected.length} {selected.length===1?"øving":"øvingar"}</button></div></div>}
     {wizardStep===1&&<div className="wizard-stage-actions gg-time-next"><button type="button" className="secondary-button" onClick={()=>setWizardStep(0)}>Tilbake til format</button><button type="button" className="primary-button" onClick={()=>goToStep(2)}>Vidare til øvingar</button></div>}
     {wizardStep===3&&<div className="wizard-dose-stage">
      <div className="wizard-dose-intro"><div><span className="wod-classic-kicker">DOSERING</span><h2>Dosering og nivå</h2><p>Set reps, belastning og tilpass nivå for kvar øving. Bruk pilene for å endra rekkefølgja.</p></div><span className="wod-dose-count">{selected.length} øvingar</span></div>
      {isCustom&&<details className="gg-dose-advanced gg-custom-options"><summary>Eigne instruksjonar og fri struktur</summary><label><input type="checkbox" checked={customUseSets} onChange={e=>setCustomUseSets(e.target.checked)}/> Bruk sett-programmering</label><label>Beskriv gjennomføringa<textarea rows="3" value={customInstructions} onChange={e=>setCustomInstructions(e.target.value)} placeholder="Struktur, sett, rundar og pausar …"/></label></details>}
      {showSets&&<details className="gg-dose-advanced gg-custom-options"><summary>Valfri tidsgrense for styrke</summary><label>Time Cap (minutt)<input type="number" min="0" max="600" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label><small>La feltet stå tomt for styrke utan tidsgrense.</small></details>}
      <div className="wizard-dose-exercises">{selected.map((ex,i)=>{const level=doseLevelByKey[ex.key]||'rx';const dose=(ex.levels||makeLevels(ex.reps,ex.prescription_profiles||{}))[level]||makeLevels(ex.reps,ex.prescription_profiles||{})[level];const update=patch=>updateLevel(ex.key,level,patch);const summary=(key)=>{const d=(ex.levels||makeLevels(ex.reps,ex.prescription_profiles||{}))[key]||{};const load=d.loadMode==='kg'?[d.loadKgMen!==''?'M '+d.loadKgMen+' kg':'',d.loadKgWomen!==''?'K '+d.loadKgWomen+' kg':''].filter(Boolean).join(' / '):d.loadMode==='percent'&&d.percent1rm?d.percent1rm+' % 1RM':d.loadMode==='rir'&&(d.rirRange||d.rir!=='')?'RIR '+(d.rirRange||d.rir):d.loadMode==='bodyweight'?'Kroppsvekt':'';return [ex.is_rest?'Pause · '+(Number(ex.pauseSeconds)||30)+' sek':ex.is_complex?(d.reps||5)+' komplekssyklusar':isRow(ex)?(ex.rowValue||'–')+' '+ex.rowUnit:d.reps?d.reps+' reps':'Ikkje dosert',d.heightCm?d.heightCm+' cm':'',d.durationSeconds?d.durationSeconds+' sek':'',d.distanceMeters?d.distanceMeters+' m':'',d.calories?d.calories+' cal':'',load,].filter(Boolean).join(' · ')};return <article className="wizard-dose-card" key={ex.key}>
       <div className="gg-dose-card-bar"><button type="button" className="wizard-dose-card-head" aria-expanded={editingSelectedKey===ex.key} onClick={()=>setEditingSelectedKey(current=>current===ex.key?null:ex.key)}><span className="wod-order">{i+1}</span><strong>{ex.name}</strong><span className="wizard-dose-card-summary">{summary('rx')}</span><span>{editingSelectedKey===ex.key?'⌃':'⌄'}</span></button><div className="gg-reorder-buttons"><button type="button" aria-label={`Flytt ${ex.name} opp`} title="Flytt opp" disabled={!i} onClick={()=>moveByKey(ex.key,-1)}><ArrowUp size={17}/></button><button type="button" aria-label={`Flytt ${ex.name} ned`} title="Flytt ned" disabled={i===selected.length-1} onClick={()=>moveByKey(ex.key,1)}><ArrowDown size={17}/></button></div></div>
       {editingSelectedKey===ex.key&&<div className="wizard-dose-card-body">{ex.is_complex&&<div className="wizard-dose-complex-sequence"><strong>Kompleksrekkjefølgje</strong><ol>{ex.complex_steps.map((step,stepIndex)=><li key={stepIndex}>{step.reps} × {step.name}</li>)}</ol></div>}
         {isComposite&&<label>Øktdel<select value={ex.blockId||compositeBlocks[0].id} onChange={e=>updateItem(ex.key,{blockId:e.target.value})}>{compositeBlocks.map(block=><option key={block.id} value={block.id}>{block.title}</option>)}</select></label>}
         {ex.is_rest?<label className="wizard-dose-pause">Pausevarigheit · sekund<input type="number" min="1" max="3600" value={ex.pauseSeconds||'30'} onChange={e=>updateItem(ex.key,{pauseSeconds:e.target.value})}/></label>:<><QuickDoseLevels exercise={ex} isStationCircuit={isStationItem(ex)} updateLevel={updateLevel} updateItem={updateItem} copyRxToLevels={copyRxToLevels}/><details className="gg-dose-advanced"><summary>Avansert dosering og instruksjonar</summary><div className="wizard-dose-level-tabs">{[{id:'rx',label:'RX'},{id:'intermediate',label:'Intermediate'},{id:'scaled',label:'Scaled'},{id:'foundation',label:'Foundation'}].map(x=><button type="button" key={x.id} className={level===x.id?'active':''} onClick={()=>setDoseLevelByKey(v=>({...v,[ex.key]:x.id}))}>{x.label}</button>)}</div>
        {doseFieldsFor(ex).load&&<div className="wizard-dose-suggestion"><strong>Øvingsprofil · {ex.prescription_profiles?.variant_label||ex.equipment||'Uspesifisert variant'}</strong><span>{dose.loadKgMen!==''||dose.loadKgWomen!==''?'Standardverdiar frå øvingsbiblioteket':'Ingen standardverdiar registrerte for dette nivået.'}</span><small>PT-konfigurerte verdiar per øving og variant – ikkje automatisk skalerte frå RX.</small></div>}
        <div className="wizard-dose-fields">
           {usesSetsForItem(ex)&&<label>Sett<input type="number" min="1" max="30" value={dose.sets??''} onChange={e=>update({sets:e.target.value})} placeholder="T.d. 3"/></label>}
           {!isRow(ex)&&(!doseFieldsFor(ex).distance||ex.is_complex)&&(!isStationItem(ex)||(ex.repsMode||'fixed')==='fixed')&&<label>{ex.is_complex?'Komplekssyklusar':'Reps / mengd'}<input type="text" inputMode="numeric" pattern="[0-9]+([-/][0-9]+)*" value={dose.reps??''} onChange={e=>update({reps:e.target.value})} placeholder={ex.is_complex?'T.d. 5':'T.d. 10 eller 21-15-9'}/></label>}
           {isRow(ex)&&<><label>Roing · mengd<input type="number" min="1" value={ex.rowValue||''} onChange={e=>updateItem(ex.key,{rowValue:e.target.value})} placeholder="T.d. 500"/></label><label>Eining<select value={ex.rowUnit||'m'} onChange={e=>updateItem(ex.key,{rowUnit:e.target.value})}><option value="m">Meter</option><option value="cal">Kaloriar</option><option value="s">Sekund</option><option value="min">Minutt</option></select></label></>}
          {doseFieldsFor(ex).height&&<label>Bokshøgd / høgd (cm)<input type="number" min="1" value={dose.heightCm||''} onChange={e=>update({heightCm:e.target.value})} placeholder="T.d. 60"/></label>}
          {doseFieldsFor(ex).time&&<label>Varigheit (sek.)<input type="number" min="1" value={dose.durationSeconds||''} onChange={e=>update({durationSeconds:e.target.value})} placeholder="T.d. 30"/></label>}
           {!isRow(ex)&&doseFieldsFor(ex).distance&&<label>Distanse (meter)<input type="number" min="1" value={dose.distanceMeters||''} onChange={e=>update({distanceMeters:e.target.value})} placeholder="T.d. 500"/></label>}
           {!isRow(ex)&&doseFieldsFor(ex).calories&&<label>Kaloriar (cal)<input type="number" min="1" value={dose.calories||''} onChange={e=>update({calories:e.target.value})}/></label>}
           {isStationItem(ex)&&<label>Doseringstype<select value={ex.repsMode||'fixed'} onChange={e=>updateItem(ex.key,{repsMode:e.target.value})}><option value="fixed">Fast reps</option><option value="amrap">AMRAP · maks reps på stasjonen</option></select></label>}
          {doseFieldsFor(ex).load&&<label>Belastningsmetode<select value={dose.loadMode||'none'} onChange={e=>update({loadMode:e.target.value})}><option value="none">Ikkje oppgitt</option><option value="kg">Fast vekt (kg)</option><option value="percent">% av 1RM</option><option value="rir">RIR – repetisjonar i reserve</option><option value="bodyweight">Kroppsvekt</option></select></label>}
          {dose.loadMode==='kg'&&doseFieldsFor(ex).load&&<><label>Vekt menn (kg)<input type="number" min="0" step="0.5" value={dose.loadKgMen??''} onChange={e=>update({loadKgMen:e.target.value})}/></label><label>Vekt kvinner (kg)<input type="number" min="0" step="0.5" value={dose.loadKgWomen??''} onChange={e=>update({loadKgWomen:e.target.value})}/></label></>}
          {dose.loadMode==='percent'&&doseFieldsFor(ex).load&&<label>Prosent av 1RM (%)<input type="number" min="1" max="150" value={dose.percent1rm||''} onChange={e=>update({percent1rm:e.target.value})}/></label>}
          {dose.loadMode==='rir'&&doseFieldsFor(ex).load&&<label>RIR · repetisjonar i reserve<input type="text" inputMode="text" value={dose.rirRange??(dose.rir??'')} onChange={e=>update({rirRange:e.target.value,rir:''})} placeholder="T.d. 2–4"/><small>Utøvaren vel vekt sjølv. 0 = ingen reps igjen. -1 er ein særskild PT-markør for arbeid utover failure.</small></label>}
          
           {isTimed&&<label>Intervallnummer / oppgåve<input value={ex.minuteSlot||''} onChange={e=>updateItem(ex.key,{minuteSlot:e.target.value})} placeholder="T.d. 1, 2 eller 3 · tomt = roter"/></label>}
          {doseFieldsFor(ex).tempo&&<label>Tempo<input type="text" value={dose.tempo||''} onChange={e=>update({tempo:e.target.value})} placeholder="T.d. 3–1–1–0"/></label>}
           {(format==='Superset'||(isComposite&&compositeBlocks.find(block=>block.id===ex.blockId)?.format==='Superset'))&&<label>Supersett-gruppe<input value={ex.group||'A'} onChange={e=>updateItem(ex.key,{group:e.target.value.toUpperCase().slice(0,2)})}/></label>}{(format==='Intervall'||format==='Row Intervals')&&<label>Pause etter øving · sekund<input type="number" min="0" value={ex.restSeconds||''} onChange={e=>updateItem(ex.key,{restSeconds:e.target.value})}/></label>}
          <label>Alternativ øving / variant<input type="text" value={dose.variant||''} onChange={e=>update({variant:e.target.value})} placeholder="Valfri skalering av rørsla"/></label>
          <label className="wizard-dose-instruction">Instruksjon (valfritt)<textarea rows="2" value={dose.instruction||''} onChange={e=>update({instruction:e.target.value})} placeholder="Teknikk, krav og gjennomføring …"/></label>
         </div>
        <div className="wizard-dose-copy"><span>{level==='rx'?'Føreskriven standard':level==='scaled'?'Tilpassa nivå':'Grunnnivå'}</span><span>Verdiane er uavhengige per nivå</span></div></details>
         </>}
        </div>}
      </article>})}</div>
      <section className="wizard-dose-method"><strong>{libraryCategory==='warmup'?'Hovud-WOD · stimulus og rørsleform':'Felles treningsstimulus'}</strong>{libraryCategory==='warmup'&&<p>Skildre kva hovudøkta krev. Den felles delen skal førebu dette gradvis, og den frie delen skal la kvar deltakar finne rett arbeidsbelastning.</p>}<label>Intensitetsnivå<select value={intensity} onChange={e=>setIntensity(e.target.value)}><option value="1">1 · Kontrollert / teknikk</option><option value="2">2 · Utfordrande</option><option value="3">3 · Høg intensitet</option></select></label><label>{libraryCategory==='warmup'?'Stimulus og rørsleform i hovud-WOD':'Planlagd treningsstimulus'}<textarea rows="2" value={stimulus} onChange={e=>setStimulus(e.target.value)} placeholder={libraryCategory==='warmup'?'T.d. frontbøy og pull-ups · kraft frå hofte · stabil overkropp …':'Jamn intensitet, teknisk kvalitet, kontrollert tempo …'}/></label><label>Coach-notat<textarea rows="2" value={notes} onChange={e=>setNotes(e.target.value)} placeholder={libraryCategory==='warmup'?'Kva skal instruktøren sjå etter? Korleis skal deltakarane auke vekta?':'Tekniske krav og beskjed til PT …'}/></label></section>
       <p className="wizard-dose-summary-note">RX, Scaled og Foundation blir lagra som separate doseringsnivå for kvar øving.</p>
      <div className="wizard-stage-actions"><button type="button" className="secondary-button" onClick={()=>setWizardStep(2)}>Tilbake</button><button type="button" className="primary-button" onClick={()=>goToStep(4)}>Vidare til publisering →</button></div>
     </div>}{wizardStep===4&&<div className="wizard-publish-stage wizard-final-stage"><div className="wizard-stage-intro"><strong>{assignedClientId&&!canPublishWod?'Ferdigstilling og tildeling':'Ferdigstilling og publisering'}</strong><span>{assignedClientId&&!canPublishWod?'WOD-en blir lagra privat og tildelt den valde kunden.':'Kontroller WOD-en før du lagrar eller publiserer han.'}</span></div><section className="wod-final-preview"><div><span className="wod-classic-kicker">WOD-FØREHANDSVISNING</span><h2>{name||'Namlaus WOD'}</h2><p>{format} · {isComposite?Math.round(compositeTotalSeconds(compositeBlocksWithItems)/60)+' min':isAmrap?(timeCap?timeCap+' min':'Open AMRAP'):isForTime?(timeCap?timeCap+' min':'Fri tid'):isElapsedFormat?'Medgått tid':minutes+' min'} · {selected.length} øvingar</p></div>{isComposite&&<div className="gg-composite-final-list">{compositeBlocks.map((block,index)=><div key={block.id} className="gg-composite-final-block"><strong>{index+1}. {block.title} · {block.format} · {Math.floor(compositeBlockDuration(block,selected.filter(ex=>ex.blockId===block.id&&!ex.is_rest).length)/60)}:{String(compositeBlockDuration(block,selected.filter(ex=>ex.blockId===block.id&&!ex.is_rest).length)%60).padStart(2,'0')} min:sek</strong><small>{selected.filter(ex=>ex.blockId===block.id).map(ex=>ex.name).join(' · ')||'Ingen øvingar'}</small></div>)}</div>}<ol>{selected.map((ex,i)=><li key={ex.key}><strong>{i+1}. {ex.name}</strong>{ex.is_complex&&<small className="wod-complex-sequence">{formatComplexSequence(ex.complex_steps)}</small>}{ex.is_rest?<span>Pause · {Number(ex.pauseSeconds)||30} sek</span>:isStationCircuit?<span>{ex.repsMode==='amrap'?'AMRAP · maks reps':(ex.reps||'–')+' reps'} · {stationWork}s arbeid{ex.levels?.[doseLevelByKey[ex.key]||'rx']?.heightCm?' · '+ex.levels[doseLevelByKey[ex.key]||'rx'].heightCm+' cm':''}</span>:<div className="wod-final-level-doses">{['rx','scaled','foundation'].map(level=>{const d=ex.levels?.[level]||{};const parts=[d.sets?d.sets+' sett':'',ex.is_complex?(d.reps||5)+' komplekssyklusar':d.reps?d.reps+' reps':'',d.heightCm?d.heightCm+' cm':'',d.durationSeconds?d.durationSeconds+' sek':'',d.distanceMeters?d.distanceMeters+' m':'',d.calories?d.calories+' cal':'',d.loadMode==='kg'?[d.loadKgMen?'M '+d.loadKgMen+' kg':'',d.loadKgWomen?'K '+d.loadKgWomen+' kg':''].filter(Boolean).join(' / '):d.loadMode==='percent'&&d.percent1rm?d.percent1rm+' % 1RM':d.loadMode==='rir'&&(d.rirRange||d.rir!=='')?'RIR '+(d.rirRange||d.rir):d.loadMode==='bodyweight'?'Kroppsvekt':'',d.tempo?'Tempo '+d.tempo:'',d.variant?'Variant: '+d.variant:'',d.instruction||''].filter(Boolean).join(' · ');return <span key={level}><b>{level.toUpperCase()}</b> · {parts||'Ikkje dosert'}</span>})}</div>}</li>)}</ol><p>{stimulus}</p></section><label>Type i medlemsbiblioteket<select value={libraryCategory} onChange={e=>setLibraryCategory(e.target.value)}><option value="warmup">Oppvarming-WOD</option><option value="standard">Standard-WOD</option><option value="benchmark">Benchmark-WOD</option><option value="assessment">Test og evaluering</option><option value="rehab">Rehabilitering / tilpassa</option><option value="recovery">Restitusjon og mobilitet</option><option value="other">Anna / spesialøkt</option><option value="custom">Eigendefinert kategori …</option></select></label>{libraryCategory==='custom'&&<label>Namnet på kategorien<input value={customLibraryCategory} onChange={e=>setCustomLibraryCategory(e.target.value)} maxLength={40} placeholder="Skriv kategorinamn" required/></label>}{canPublishWod?<label className="wod-publish-toggle"><input type="checkbox" checked={publishToMembers} onChange={e=>setPublishToMembers(e.target.checked)}/> Publiser for medlemmer</label>:<p className="wod-help">PT-WOD blir lagra privat. Når du byggjer for ein kunde, blir WOD-en tildelt kunden utan å bli publisert i medlemsbiblioteket.</p>}<div className="wizard-stage-actions"><button type="button" className="secondary-button" onClick={()=>setWizardStep(3)}>Tilbake til dosering</button><button type="submit" className="primary-button" disabled={busy||!selected.length||!name.trim()}><Save size={16}/>{busy?'Lagrar …':editingWodId?'Lagre endringar':assignedClientId&&canPublishWod&&publishToMembers?'Publiser og tildel WOD':canPublishWod&&publishToMembers?'Publiser WOD':assignedClientId?'Lagre og tildel WOD':'Lagre WOD som utkast'}</button></div></div>}
    </form>
   </aside>
   <aside className="wod-live-preview">
    <div className="wod-live-preview-head"><span className="wod-classic-kicker">LIVE WOD</span><strong>{selected.length} / {isStationCircuit?stationCount:'∞'} øvingar</strong></div>
    <h4>{name||'Namlaus WOD'}</h4>
    <div className="wod-live-meta"><span>{format}</span><span>{isStationCircuit?stationWork+'s arbeid / '+stationTransition+'s byte':isComposite?Math.round(compositeTotalSeconds(compositeBlocksWithItems)/60)+' min':isAmrap?(timeCap?timeCap+' min':'Open'):isForTime?(timeCap?timeCap+' min':'Fri tid'):minutes+' min'}</span></div>
    {isStationCircuit&&<div className="wod-live-station-meta">{stationCount} stasjonar · {stationRounds} rundar</div>}
    <ol className="wod-live-exercises">{selected.map((ex,i)=><li key={ex.key}><span className="wod-live-number">{i+1}</span><div><strong>{ex.name}</strong>{ex.is_complex&&<small className="wod-complex-sequence">{formatComplexSequence(ex.complex_steps)}</small>}<small>{ex.is_rest?`Pause · ${Number(ex.pauseSeconds)||30} sek`:isStationCircuit?(ex.repsMode==='amrap'?'AMRAP':(doseForItem(ex).reps||ex.reps||'Reps ikkje sett')+' reps'):showSets?ex.sets.length+' sett':isRow(ex)?(ex.rowValue||'Dosering manglar')+' '+ex.rowUnit:(doseForItem(ex).reps||ex.reps||'Dosering manglar')+' reps'}</small></div></li>)}</ol>
    {!selected.length&&<p className="wod-live-empty">Vel øvingar i biblioteket. Dei kjem opp her i rett rekkjefølgje.</p>}
    <div className="wod-live-footer"><span>Stimulus</span><p>{stimulus}</p></div>
   </aside>
  </div></div>}
 </div>
}
