import {useEffect,useMemo,useState} from 'react'
import {createPortal} from 'react-dom'
import {Plus,Search,Trash2,ArrowUp,ArrowDown,Save,LoaderCircle,WandSparkles,Dices,Info,Copy,Dumbbell,X} from 'lucide-react'
import {supabase} from '../lib/supabase.js'
import {addWodSortOrder,getWodSchemaItems,moveWodItemByKey,moveWodItemToPosition,sortWodItems} from '../lib/wodOrdering.js'
import {COMPLEX_EXERCISES,formatComplexSequence} from '../lib/wodComplexes.js'
import WodImportPanel from './WodImportPanel.jsx'
import { createWodEngineConfig, buildLegacyCompatibleBlock, normalizeWodEngine, PARTICIPATION_MODES, COLLABORATION_MODES, SCORE_TYPES } from '../lib/wodEngine.js'
import { getFixedSlotTimerState } from '../lib/timerClock.js'
import './wod-ordering.css'

const categories=['Alle','Functional Fitness','Styrke','Complex','Kondisjon','Gymnastikk','Pilates','Yoga Flow','Mobilitet','Rehab','Golf']
const areas=['Alle område','Heile kroppen','Overkropp','Underkropp','Kjerne','Hofte og sete','Rygg','Skuldrer og armar','Bryst','Fullkropp','Bein','Mage']
const formatIcons={'AMRAP':'⏱','For Time':'🏁','Chipper':'☷','Couplet':'2×','Triplet':'3×','Ladder':'↗','Death By':'↘','Stasjonssirkel':'⌘','E1MOM':'◷','E1.25MOM':'◷','E2MOM':'◷','E3MOM':'◷','E4MOM':'◷','E5MOM':'◷','E6MOM':'◷','E7MOM':'◷','Intervall':'▥','Tabata':'▥','Row Intervals':'🚣','Strength':'🏋','Superset':'⇄','Complex':'▤','Eigen økt':'✳'}
const formats=[
 {group:'Metcon',items:['AMRAP','For Time','Chipper','Couplet','Triplet','Ladder','Death By']},
 {group:'Gruppetime',items:['Stasjonssirkel','E1MOM','E1.25MOM','E2MOM','E3MOM','E4MOM','E5MOM','E6MOM','E7MOM']},
 {group:'Intervall',items:['Intervall','Tabata','Row Intervals']},
 {group:'Styrke',items:['Strength','Superset','Complex']},
 {group:'Anna',items:['Eigen økt']}
]
const allFormats=formats.flatMap(x=>x.items)
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
const makeLevels=(reps='10',profile={})=>{const levels={};for(const level of ['rx','scaled','foundation']){const p=profile?.levels?.[level]||{};const hasKg=p.men_kg!=null||p.women_kg!=null;levels[level]={sets:'',reps,loadMode:hasKg?'kg':'none',loadKg:'',loadKgMen:p.men_kg==null?'':String(p.men_kg),loadKgWomen:p.women_kg==null?'':String(p.women_kg),percent1rm:'',tempo:'',instruction:'',variant:'',rir:'',heightCm:'',durationSeconds:'',distanceMeters:'',calories:''}}return levels}
const blankItem=ex=>({key:crypto.randomUUID(),...ex,reps:ex.is_complex?'5':ex.equipment==='Romaskin'?'':'10',repsMode:'fixed',rowValue:ex.equipment==='Romaskin'?'500':'',rowUnit:'m',loadMode:'none',loadKg:'',percent1rm:'',rir:'',rpe:'',meters:ex.equipment==='Romaskin'?'500':'',calories:'',workSeconds:'',restSeconds:'',tempo:'',coachNote:'',sets:[newSet()],minuteSlot:'',group:'A',levels:makeLevels(ex.is_complex?'5':ex.equipment==='Romaskin'?'500':'10',ex.prescription_profiles||{})})
const doseFieldsFor=ex=>{const n=(ex.name||'').toLowerCase(),eq=(ex.equipment||'').toLowerCase();const height=/box jump|box step.?up|box step.?over|burpee box/.test(n);const time=/plank|stretch|hold|hundred|balance/.test(n);const erg=/row|bike erg|ski erg|romaskin/.test(n)||/bikeerg|ski.?erg|romaskin/.test(eq);const distance=erg||/carry|walk|run/.test(n);const calories=erg;const bodyOnly=/air squat|burpee|double under|single under|toes-to-bar|pull-up|push-up|handstand push-up/.test(n);const externalLoad=/manual|dumbbell|barbell|vektstong|kettlebell|medisinball|medicine.?ball|landmine|weight vest|vektvest/.test(eq);const load=!!ex.is_complex||externalLoad||((!height||/step.?up/.test(n))&&!bodyOnly&&(/squat|deadlift|press|curl|row|clean|snatch|jerk|thrust|pulldown|leg press|swing|lunge|carry|wall ball|step.?up/.test(n)||externalLoad));return{height,time,distance,calories,load,tempo:load&&!erg}};
const fmtLoad=x=>x.loadMode==='kg'&&x.loadKg?x.loadKg+' kg':x.loadMode==='percent'&&x.percent1rm?x.percent1rm+' % 1RM':x.loadMode==='bodyweight'?'Kroppsvekt':''

const movementTagsFor=ex=>{const n=(ex.name||'').toLowerCase(),b=(ex.body_area||'').toLowerCase(),t=[];if(/deadlift|swing|hinge|romanian deadlift|clean|snatch|good morning/.test(n))t.push('hinge');if(/squat|thruster|lunge|wall ball|step.?up|box jump/.test(n))t.push('squat');if(/press|push.?up|dip|jerk|handstand/.test(n))t.push('push');if(/pull.?up|row|chin.?up|rope climb/.test(n))t.push('pull');if(/sit.?up|toes.?to.?bar|plank|hollow|crunch|dead bug/.test(n)||/mage|kjerne/.test(b))t.push('core');if(/run|rower|romaskin|bike|ski erg|burpee|double.?under/.test(n))t.push('conditioning');if(/overhead|snatch|jerk|handstand/.test(n))t.push('overhead');const own=[...new Set(t)];return ex.is_complex?[...new Set([...own,...(ex.complex_steps||[]).flatMap(step=>movementTagsFor({name:step.name}))])]:own}
const loadPairFor=ex=>ex.prescription_profiles||null
const analyseWorkout=(items,minutes)=>{const tags=items.flatMap(movementTagsFor),counts=tags.reduce((a,t)=>(a[t]=(a[t]||0)+1,a),{}),warnings=[],volume=items.reduce((s,x)=>s+(Number(x.reps)||0),0);const repeated=Object.entries(counts).filter(([,n])=>n>=2).map(([t])=>t);if(repeated.length)warnings.push('Fleire øvingar belastar same rørslemønster: '+repeated.join(', ')+'. Vurder samla volum og intensitet.');if(minutes>=20&&items.some(x=>x.loadMode==='kg'&&Number(x.loadKg)>=60))warnings.push('Lang økt med tung ekstern belastning: vurder om belastninga held ønskja stimulus.');if(volume>200)warnings.push('Høgt repetisjonsvolum (>200). Vurder reps og belastning.');if(tags.includes('overhead')&&tags.includes('push'))warnings.push('Overlapp mellom press og arbeid over hovudet kan gi lokal skuldertrøyttleik.');return{tags:[...new Set(tags)],volume,warnings}}
const strengthFormats=['Strength','Pyramid','Superset','Complex']
const strengthLike=f=>strengthFormats.includes(f)
const intervalFormats=['Intervall','Tabata','Row Intervals']
const timedFormats=['EMOM','E1MOM','E1.25MOM','E2MOM','E3MOM','E4MOM','E5MOM','E6MOM','E7MOM']
const timedEvery=f=>{const match=String(f||'').match(/^E(\d+(?:\.\d+)?)MOM$/);return match?Number(match[1]):1}
const timedLabel=f=>{const seconds=Math.round(timedEvery(f)*60);return seconds%60===0?'kvart '+seconds/60+'. minutt':'kvart '+Math.floor(seconds/60)+' minutt og '+seconds%60+' sekund'}
const isRow=x=>x.equipment==='Romaskin'
const equipmentIcon=value=>{const v=(value||'').toLowerCase();if(/power.?rack|squat.?rack|rig|rack/.test(v))return '🏗️';if(/bike|sykkel|spinning|ergometersykkel|air.?bike|echo.?bike|assault.?bike/.test(v))return '🚴';if(/ski.?erg|skierg/.test(v))return '🎿';if(/row|romaskin|ro.?erg|rowing/.test(v))return '🚣';if(/mølle|tredemølle|treadmill|løping|running/.test(v))return '🏃';if(/hoppetau|jump.?rope|skipping/.test(v))return '🪢';if(/ringar|ringar|gymnastic.?rings/.test(v))return '⭕';if(/klatretau|tau|rope climb/.test(v))return '🧗';if(/manual/.test(v))return '💪';if(/kettlebell/.test(v))return '🔔';if(/stong|stang|barbell|vektskive|bumper/.test(v))return '🏋️';if(/medisinball|medicine.?ball/.test(v))return '🏐';if(/strikk|band/.test(v))return '〰️';if(/trx|slynge/.test(v))return '⛓';if(/box|kasse|step.?kasse/.test(v))return '📦';if(/vegg|wall/.test(v))return '🧱';if(/matte|kroppsvekt/.test(v))return '🤸';if(/kabel|cable/.test(v))return '🛠️';if(/benk|bench/.test(v))return '🪑';if(/stige|agility/.test(v))return '🪜';if(/ball/.test(v))return '🏐';return '•'}
const equipmentItems=value=>(value||'Kroppsvekt').split(/[,;+\\/\\n]+/).map(x=>x.trim()).filter(Boolean);
const categoryTone=value=>{const v=(value||'').toLowerCase();return v.includes('kond')||v.includes('cardio')||v.includes('crossfit')?'conditioning':v.includes('kjern')||v.includes('core')||v.includes('pilates')?'core':v.includes('styr')||v.includes('strength')?'strength':v.includes('mobil')?'mobility':v.includes('golf')?'golf':v.includes('rehab')||v.includes('fysio')?'rehab':'other'}

export default function WodBuilder({assignedClientId=null,onAssigned,editWodId=null,onSaved,onCancel}){
 const [exercises,setExercises]=useState([]),[search,setSearch]=useState(''),[category,setCategory]=useState('Alle'),[area,setArea]=useState('Alle område'),[equipmentFilter,setEquipmentFilter]=useState('all'),[movementFilter,setMovementFilter]=useState('all'),[openFilter,setOpenFilter]=useState('')
 const rehabBodyAreas=['hofte','skulder','kne','nakke']
 const isRehabExercise=x=>!!(x.is_rehab||x.category==='Rehab / fysio'||rehabBodyAreas.includes((x.body_area||'').toLowerCase()))
 const [selected,setSelected]=useState([]),[editingWodId,setEditingWodId]=useState(null),[name,setName]=useState(randomWodName()),[format,setFormat]=useState('AMRAP'),[libraryWods,setLibraryWods]=useState([]),[builderMode,setBuilderMode]=useState(assignedClientId?'library':'build'),[librarySearch,setLibrarySearch]=useState(''),[selectedLibraryWod,setSelectedLibraryWod]=useState(''),[classicChoice,setClassicChoice]=useState(''),[publishToMembers,setPublishToMembers]=useState(false),[libraryCategory,setLibraryCategory]=useState('standard'),[customLibraryCategory,setCustomLibraryCategory]=useState('')
 const [minutes,setMinutes]=useState('20'),[durationSeconds,setDurationSeconds]=useState('0'),[notes,setNotes]=useState(''),[stimulus,setStimulus]=useState('Jamn intensitet · teknisk kvalitet · kontrollert tempo')
 const [rounds,setRounds]=useState('5'),[intervalExerciseCount,setIntervalExerciseCount]=useState('1'),[workSeconds,setWorkSeconds]=useState('60'),[restSeconds,setRestSeconds]=useState('10'),[timeCap,setTimeCap]=useState('20'),[timeCapSeconds,setTimeCapSeconds]=useState('0'),[stationCount,setStationCount]=useState('4'),[stationWork,setStationWork]=useState('45'),[stationTransition,setStationTransition]=useState('15'),[stationRounds,setStationRounds]=useState('3')
 const [ladderStart,setLadderStart]=useState('2'),[ladderStep,setLadderStep]=useState('2'),[ladderDirection,setLadderDirection]=useState('up')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[canPublishWod,setCanPublishWod]=useState(false),[publishRoleReady,setPublishRoleReady]=useState(false)
 const [prescription,setPrescription]=useState('rx'),[customInstructions,setCustomInstructions]=useState(''),[customUseSets,setCustomUseSets]=useState(false),[combinationMode,setCombinationMode]=useState('For Time')
 const [wizardStep,setWizardStep]=useState(1),[libraryOpen,setLibraryOpen]=useState(false),[rxNotes,setRxNotes]=useState(''),[scaledNotes,setScaledNotes]=useState(''),[intensity,setIntensity]=useState('2')
 const [editingSelectedKey,setEditingSelectedKey]=useState(null),[doseLevelByKey,setDoseLevelByKey]=useState({})
 const [participation,setParticipation]=useState('individual'),[collaboration,setCollaboration]=useState('solo'),[partnerCount,setPartnerCount]=useState('3'),[scoreType,setScoreType]=useState('reps'),[scoreFields,setScoreFields]=useState(['reps'])

 async function loadWodForEdit(id){
  if(!id)return
  setLoading(true);setError('')
  const {data:w,error:e}=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,is_published,timer_settings,category').eq('id',id).single()
  if(e){setError('Kunne ikkje opna WOD for redigering: '+e.message);setLoading(false);return}
  const schema=w.timer_settings?.workout_schema||{}
  const items=sortWodItems(getWodSchemaItems(schema))
  const engine=normalizeWodEngine(schema,{format:w.format});setParticipation(engine.participation);setCollaboration(engine.collaboration);setPartnerCount(String(engine.participant_count||3));setScoreType(engine.scoring?.type||'reps');setScoreFields(engine.scoring?.fields||['reps']);setEditingWodId(w.id);setName(w.name);const legacyFormat=w.format||'AMRAP';const emomMatch=/^EMOM(?: ([1-7]))?$/.exec(legacyFormat);const mappedFormat=emomMatch?'E'+Math.max(1,Math.min(7,Number(emomMatch[1]||schema.interval?.work_every_minutes)||1))+'MOM':legacyFormat==='Pyramid'?'Strength':legacyFormat==='Couplet / Triplet'?(schema.items?.filter(item=>!item.is_rest).length>=3?'Triplet':'Couplet'):legacyFormat==='Ladder / Death By'?(schema.ladder?.type==='Death By'?'Death By':'Ladder'):legacyFormat==='Intervall / Tabata'?(schema.interval?.work_seconds===20&&schema.interval?.rest_seconds===10?'Tabata':'Intervall'):legacyFormat;setFormat(mappedFormat);setPublishToMembers(canPublishWod&&!!w.is_published);const storedLibraryCategory=schema.library_category||(w.category==='warmup'?'warmup':'standard');const normalizedLibraryCategory=storedLibraryCategory==='daily'?'standard':storedLibraryCategory;const knownLibraryCategories=['warmup','standard','benchmark','assessment','rehab','recovery','other'];setLibraryCategory(knownLibraryCategories.includes(normalizedLibraryCategory)?normalizedLibraryCategory:'custom');setCustomLibraryCategory(knownLibraryCategories.includes(normalizedLibraryCategory)?'':normalizedLibraryCategory)
  setMinutes(String(schema.duration_seconds?Math.floor(schema.duration_seconds/60):w.duration_minutes||20));setDurationSeconds(String(schema.duration_seconds?schema.duration_seconds%60:0))
  setNotes(schema.coach_notes||w.notes||'');setStimulus(schema.stimulus||'Jamn intensitet · teknisk kvalitet · kontrollert tempo')
  setIntensity(String(schema.intensity||2));setPrescription(schema.prescription||'rx');setCustomInstructions(schema.custom_instructions||'');setRxNotes(schema.rx_notes||'');setScaledNotes(schema.scaled_notes||'');setWizardStep(1)
  if(schema.time_cap_seconds){setTimeCap(String(Math.floor(schema.time_cap_seconds/60)));setTimeCapSeconds(String(schema.time_cap_seconds%60))}else{setTimeCap('');setTimeCapSeconds('0')}
  if(schema.rounds)setRounds(String(schema.rounds))
  if(schema.interval){if(schema.interval.work_seconds)setWorkSeconds(String(schema.interval.work_seconds));if(schema.interval.rest_seconds!=null)setRestSeconds(String(schema.interval.rest_seconds))}
  if(schema.ladder){setLadderStart(String(schema.ladder.start||2));setLadderStep(String(schema.ladder.step||2));setLadderDirection(schema.ladder.direction||'up')}
  if(schema.station_circuit){setStationCount(String(schema.station_circuit.station_count||items.length));setStationWork(String(schema.station_circuit.work_seconds||45));setStationTransition(String(schema.station_circuit.transition_seconds||15));setStationRounds(String(schema.station_circuit.rounds||3))}
  const hydrated=items.map(item=>{
   const found=item.is_rest?{id:null,name:'Pause',category:'Pause',body_area:'Heile kroppen',equipment:'Ingen',description:'Planlagd pause mellom øvingar.',is_rest:true}:exercises.find(x=>x.id===item.exercise_id)||{id:item.exercise_id||null,name:item.exercise_name,category:item.category||'Styrke',body_area:item.body_area||'Fullkropp',equipment:item.equipment||'',description:'',video_url:null}
   const base=blankItem(found)
   const sets=(item.sets||[]).map(s=>({...newSet(),reps:String(s.reps??''),loadMode:s.load_mode||'none',loadKg:String(s.load_kg??''),percent1rm:String(s.percent_1rm??''),rir:s.rir==null?'':String(s.rir),rpe:s.rpe==null?'':String(s.rpe),restSeconds:String(s.rest_seconds??120),tempo:s.tempo||''}))
   return {...base,warmup_phase:item.warmup_phase||'specific_prep',is_rest:!!item.is_rest,is_complex:!!item.is_complex||Array.isArray(item.complex_steps),complex_family:item.complex_family||null,complex_steps:Array.isArray(item.complex_steps)?item.complex_steps:[],pauseSeconds:String(item.rest_duration_seconds??30),levels:item.levels||makeLevels(String(item.reps??''),{}),prescription:item.prescription||{rx_m:null,rx_f:null,scaled_m:null,scaled_f:null,unit:'kg',source:'manual',overridden:false},reps:String(item.reps??''),rowValue:String(item.row_value??item.meters??item.calories??item.work_seconds??''),rowUnit:item.row_unit||(item.calories?'cal':item.work_seconds?'s':'m'),loadMode:item.load_mode||'none',loadKg:String(item.load_kg??''),percent1rm:String(item.percent_1rm??''),rir:item.rir==null?'':String(item.rir),rpe:item.rpe==null?'':String(item.rpe),restSeconds:String(item.rest_seconds??''),tempo:item.tempo||'',coachNote:item.coach_note||'',minuteSlot:item.minute_slot||'',group:item.superset_group||'A',sets:sets.length?sets:[newSet()]}
  })
  setSelected(hydrated.map((item,index)=>({...item,repsMode:items[index]?.reps_mode||items[index]?.station_reps_mode||'fixed'})));setNotice('WOD-en er opna for redigering. Endringane blir lagra på same WOD.');setLoading(false)
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
  const exCategory=(x.category||'').toLowerCase();const matchesCategory=category==='Alle'||(category==='Rehab'?rehab:category==='Functional Fitness'?(!rehab&&!['pilates','yoga flow','yoga'].includes(exCategory)):category==='Gymnastikk'?(/pull|push|gymnast|handstand|hang|toes|muscle/.test((x.name||'').toLowerCase())&&!rehab):category==='Yoga Flow'?exCategory==='yoga flow'||exCategory==='yoga':!rehab&&exCategory===category.toLowerCase())
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
 const isTimed=timedFormats.includes(format)
 const isLadder=format==='Ladder'||format==='Death By'
 const isAmrap=format==='AMRAP'
 const isForTime=['For Time','Chipper'].includes(format)
 const isCoupletTriplet=['Couplet','Triplet'].includes(format)
 const isTabata=format==='Tabata'
 const isRowIntervals=format==='Row Intervals'
 const isStationCircuit=format==='Stasjonssirkel'
 const isCustom=format==='Eigen økt'
  const isElapsedFormat=showSets||isLadder||isForTime||(isCoupletTriplet&&combinationMode!=='AMRAP')||isCustom||format==='Complex'
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
  setPrescription('rx');setClassicChoice('');setNotice(preset.name+' er lasta inn. Kontroller øvingar, RX-belastning og skalering før publisering.');setError('')
 }
 function applyImportedWod(parsed){
  const imported=parsed.items.map(row=>{
   const exercise=row.exercise||{id:null,name:row.name,category:'Styrke',body_area:'Fullkropp',equipment:'',description:'Importert øving – kontroller øvingsvalet.'}
   const item=blankItem(exercise)
   item.reps=String(row.reps||'10')
   item.levels={...item.levels,rx:{...item.levels.rx,reps:String(row.reps||'10'),instruction:row.loadKg?'Importert belastning ca. '+row.loadKg.toFixed(1)+' kg. Stadfest korrekt RX/Scaled/Foundation-belastning.':''}}
   item.coachNote=row.loadKg?'Importert belastning ca. '+row.loadKg.toFixed(1)+' kg – stadfest belastning per nivå.':''
   return item
  })
  setName(parsed.name||'Importert WOD');setFormat(parsed.format||'Eigen økt');setMinutes(String(parsed.minutes||20));setTimeCap(parsed.minutes?String(parsed.minutes):'');setRounds(String(parsed.rounds||1));setSelected(imported);setNotes(parsed.notes||'');setStimulus('Importert WOD – kontroller format, øvingar og dosering før lagring.');setLibraryCategory('standard');setPublishToMembers(false);setWizardStep(2);setError('');setNotice('WOD-teksten er tolka og lagd inn i byggjaren. Kontroller alle øvingar, belastningar og doseringsnivå før lagring.')
 }
 function add(ex){if(isInterval&&selected.length>=Number(intervalExerciseCount)){setError(`Du har valt ${intervalExerciseCount} øvingar/drag. Endre talet i oppsettet dersom du vil leggja til fleire.`);return}if(isStationCircuit&&selected.length>=Number(stationCount)){setError(`Du har valt ${stationCount} stasjonar. Fjern ei øving eller auk talet på stasjonar før du legg til fleire.`);return}setError('');const item=blankItem(ex);item.prescription=loadPairFor(ex)||{};setSelected(rows=>[...rows,{...item,...(isStationCircuit?{reps:'',repsMode:'amrap'}:{})}])}
 function addPause(){setError('');setSelected(rows=>[...rows,{...blankItem({id:null,name:'Pause',category:'Pause',body_area:'Heile kroppen',equipment:'Ingen',description:'Planlagd pause mellom øvingar.',is_rest:true}),is_rest:true,pauseSeconds:'30',reps:''}]);setLibraryOpen(false)}
 function suggestUniqueWodName(){const existing=new Set(libraryWods.map(w=>(w.name||'').trim().toLowerCase()));for(let i=0;i<60;i++){const candidate=randomWodName();if(!existing.has(candidate.toLowerCase())&&candidate.toLowerCase()!==name.trim().toLowerCase())return candidate}return randomWodName()+' '+String(Date.now()).slice(-4)}
 function updateItem(key,patch){setSelected(rows=>rows.map(x=>x.key===key?{...x,...patch}:x))}
 function updateLevel(key,level,patch){setSelected(rows=>rows.map(x=>{if(x.key!==key)return x;const levels=x.levels||makeLevels(x.reps,x.prescription_profiles||{});return {...x,levels:{...levels,[level]:{...levels[level],...patch}}}}))}
 function copyRxToLevels(key){setSelected(rows=>rows.map(x=>{if(x.key!==key)return x;const levels=x.levels||makeLevels(x.reps,x.prescription_profiles||{});return {...x,levels:{rx:{...levels.rx},scaled:{...levels.rx},foundation:{...levels.rx}}}}))}
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
  setSelected([]);setIntensity('2');setNotes('');setCustomInstructions('');setCustomUseSets(false);setCombinationMode('For Time');setStimulus('Jamn intensitet · teknisk kvalitet · kontrollert tempo')
  setName(suggestUniqueWodName());setError('');setNotice('Økta er forkasta. Du kan byrja på nytt.')
 }
  function doseForItem(x,level=prescription){
   const base=(x.levels||makeLevels(x.reps,x.prescription_profiles||{}))[level]||{}
   return {...base,reps:base.reps??x.reps??'',sets:base.sets??'',loadMode:base.loadMode||'none'}
  }
  function doseLoadLabel(d){
   if(d.loadMode==='kg')return [d.loadKgMen!==''?'M '+d.loadKgMen+' kg':'',d.loadKgWomen!==''?'K '+d.loadKgWomen+' kg':''].filter(Boolean).join(' / ')
   if(d.loadMode==='percent'&&d.percent1rm)return d.percent1rm+'% 1RM'
   if(d.loadMode==='rir'&&d.rir!=='')return 'RIR '+d.rir
   if(d.loadMode==='bodyweight')return 'Kroppsvekt'
   return ''
  }
  function buildPrescription(x){
   const d=doseForItem(x)
   if(x.is_rest)return 'Pause · '+(Number(x.pauseSeconds)||30)+' sek'
   if(x.is_complex)return x.name+' – '+(d.reps||5)+' komplekssyklusar · '+formatComplexSequence(x.complex_steps)+(doseLoadLabel(d)?' · '+doseLoadLabel(d):'')
   const target=isStationCircuit&&x.repsMode==='amrap'?'AMRAP · så mange som mogleg på '+stationWork+' sek.':isRow(x)?(x.rowValue?x.rowValue+' '+({s:'sek',min:'min',m:'m',cal:'cal'}[x.rowUnit]||'m'):'ikkje dosert'):(d.reps||'–')+' reps'
   const dose=showSets?[(d.sets?d.sets+' sett':''),(d.reps?d.reps+' reps':''),doseLoadLabel(d)].filter(Boolean).join(' · '):target+(doseLoadLabel(d)?' · '+doseLoadLabel(d):'')
   return x.name+' – '+dose+(d.tempo?' · tempo '+d.tempo:'')+(x.coachNote?' · '+x.coachNote:'')
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
  if(isAmrap&&(!Number.isInteger(Number(timeCap))||Number(timeCap)<1||Number(timeCap)>600)){setError('AMRAP krev ei tidsramme på mellom 1 og 600 minutt.');setWizardStep(1);return}
   if((format==='Couplet'&&selected.length!==2)||(format==='Triplet'&&selected.length!==3)){setError(`${format} krev nøyaktig ${format==='Couplet'?2:3} øvingar.`);return}
  
  if(selected.some(x=>x.is_rest&&(!Number(x.pauseSeconds)||Number(x.pauseSeconds)<1||Number(x.pauseSeconds)>3600))){setError('Alle pausar må ha ei varigheit mellom 1 og 3600 sekund.');return}
  if(!name.trim()){setError('Gi WOD-en eit namn.');return}
   if(selected.some(x=>!x.is_rest&&!(isStationCircuit&&x.repsMode==='amrap')&&!(isRow(x)?Number(x.rowValue)>0:(Number(doseForItem(x).reps)>0||/^\d+(?:[-–/]\d+)+$/.test(String(doseForItem(x).reps||'').trim()))))){setError('Alle øvingar må ha gyldig mengd, reps eller distanse i RX-nivået.');setWizardStep(3);return}
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
    const savedFormat=format
   const schema={
    version:6,format:savedFormat,library_category:libraryCategory==='custom'?(customLibraryCategory.trim()||'other'):libraryCategory,intensity:Number(intensity),warmup_plan:libraryCategory==='warmup'?{version:1,sections:[{id:'specific_prep',title:'Felles oppvarming',purpose:'Gradvis førebuing mot hovud-WOD sin stimulus og rørsleform',items:selected.filter(x=>!x.is_rest&&x.warmup_phase!=='movement_rehearsal').map(x=>x.name)},{id:'movement_rehearsal',title:'Fri teknisk innøving',purpose:'Individuell øving på hovudrørsla med lette vekter for å finne rett arbeidsnivå',items:selected.filter(x=>!x.is_rest&&x.warmup_phase==='movement_rehearsal').map(x=>x.name)}],main_stimulus:stimulus,coach_guidance:'Start lett. Auk gradvis belastninga individuelt til planlagt arbeidsvekt for hovud-WOD.'}:null,analysis:analyseWorkout(selected,Number(isAmrap?timeCap:minutes)||0),structure:isStationCircuit?'station_circuit':(showSets||format==='Complex')?'strength':isTimed?'interval_clock':isInterval?'interval':isAmrap||isForTime||isLadder?'metcon':'custom',
    duration_minutes:(isAmrap||isTimed)?(isAmrap?Number(timeCap):Number(minutes))||null:null,time_cap_minutes:isAmrap?(Number(timeCap)||null):((isForTime||isLadder||showSets||(isCoupletTriplet&&combinationMode==='For Time'))&&Number(timeCap)>0?Number(timeCap):null),time_cap_seconds:isAmrap?(Number(timeCap)>0?Number(timeCap)*60:null):((isForTime||isLadder||showSets||(isCoupletTriplet&&combinationMode==='For Time'))&&Number(timeCap)>0?Number(timeCap)*60:null),combination_mode:isCoupletTriplet?combinationMode:null,
    rounds:isStationCircuit?Number(stationRounds):isInterval?Number(rounds):isLadder||isForTime?Number(rounds)||null:null,
     interval_exercise_count:isInterval?Number(intervalExerciseCount):null,
     interval_exercises:isInterval?selected.map((x,i)=>({order:i+1,exercise_name:x.name,is_rest:!!x.is_rest,rest_duration_seconds:x.is_rest?Number(x.pauseSeconds):null})):null,
    station_circuit:isStationCircuit?{rotation:'all_rotate_together',station_count:Number(stationCount),work_seconds:Number(stationWork),transition_seconds:Number(stationTransition),rounds:Number(stationRounds),stations:selected.map((x,i)=>{
       const stationDose=doseForItem(x)
       return {station_number:i+1,exercise_name:x.name,reps_mode:x.repsMode||'fixed',reps:(x.repsMode||'fixed')==='amrap'?null:Number(stationDose.reps)||null,load_mode:stationDose.loadMode,load_kg:stationDose.loadKgMen?Number(stationDose.loadKgMen):(stationDose.loadKgWomen?Number(stationDose.loadKgWomen):null),load_label:doseLoadLabel(stationDose),height_cm:stationDose.heightCm!==''&&stationDose.heightCm!=null?Number(stationDose.heightCm):null,equipment:x.equipment||null,description:x.description||null,coach_note:x.coachNote||null}
     })}:null,
    duration_seconds:isStationCircuit?getFixedSlotTimerState({workSeconds:Number(stationWork),restSeconds:Number(stationTransition),rounds:Number(stationRounds),slotsPerRound:Number(stationCount)}).totalSeconds:isAmrap?(Number(timeCap)||0)*60:isTimed?(Number(minutes)||0)*60:isInterval?getFixedSlotTimerState({workSeconds:Number(workSeconds),restSeconds:Number(restSeconds),rounds:Number(rounds),slotsPerRound:selected.length}).totalSeconds:null,
     interval:{work_seconds:Number(workSeconds)||null,rest_seconds:Number(restSeconds)||0,work_every_minutes:isTimed?timedEvery(format):null},
     ladder:isLadder?{type:format,start:Number(ladderStart),step:Number(ladderStep),direction:ladderDirection}:null,
    stimulus,coach_notes:notes,prescription,custom_instructions:customInstructions,rx_notes:rxNotes,scaled_notes:scaledNotes,
    superset_groups:showSets&&format==='Superset'?Array.from(new Set(selected.map(x=>x.group))):[],
    complex_order:format==='Complex'?selected.map(x=>x.name):[],
    items:addWodSortOrder(selected).map(x=>({
       sort_order:x.sort_order,warmup_phase:libraryCategory==='warmup'?(x.warmup_phase||'specific_prep'):null,exercise_id:x.is_rest||x.is_golf||x.is_complex?null:(x.id||null),exercise_name:x.name,category:x.is_rest?'Pause':x.is_complex?'Complex':isRehabExercise(x)?'Rehab':x.category,body_area:x.body_area,equipment:x.equipment,golf_focus:x.golf_focus||null,is_rest:!!x.is_rest,rest_duration_seconds:x.is_rest?Number(x.pauseSeconds):null,is_complex:!!x.is_complex,complex_family:x.complex_family||null,complex_steps:Array.isArray(x.complex_steps)?x.complex_steps:[],
      sets:showSets?Array.from({length:Math.max(1,Math.min(30,Number(doseForItem(x).sets)||1))},()=>({reps:Number(doseForItem(x).reps)||null,load_mode:doseForItem(x).loadMode,load_kg:doseForItem(x).loadKgMen?Number(doseForItem(x).loadKgMen):(doseForItem(x).loadKgWomen?Number(doseForItem(x).loadKgWomen):null),percent_1rm:doseForItem(x).percent1rm?Number(doseForItem(x).percent1rm):null,rir:doseForItem(x).rir!==''?Number(doseForItem(x).rir):null,rpe:null,rest_seconds:0,tempo:doseForItem(x).tempo||null})):null,
      reps:showSets||x.is_rest?null:(isStationCircuit&&(x.repsMode||'fixed')==='amrap'?null:Number(doseForItem(x).reps)||null),reps_mode:isStationCircuit?(x.repsMode||'fixed'):null,load_mode:showSets?null:doseForItem(x).loadMode,load_kg:doseForItem(x).loadKgMen?Number(doseForItem(x).loadKgMen):(doseForItem(x).loadKgWomen?Number(doseForItem(x).loadKgWomen):null),percent_1rm:doseForItem(x).percent1rm?Number(doseForItem(x).percent1rm):null,rir:doseForItem(x).rir!==''?Number(doseForItem(x).rir):null,rpe:null,
     row_value:isRow(x)?Number(x.rowValue):null,row_unit:isRow(x)?x.rowUnit:null,meters:isRow(x)&&x.rowUnit==='m'?Number(x.rowValue):null,calories:isRow(x)&&x.rowUnit==='cal'?Number(x.rowValue):null,work_seconds:isRow(x)&&x.rowUnit==='s'?Number(x.rowValue):null,
     rest_seconds:showSets?null:Number(x.restSeconds)||null,tempo:x.tempo||null,coach_note:x.coachNote||null,
     minute_slot:x.minuteSlot||null,superset_group:x.group||'A',prescription:x.prescription||null,levels:x.levels||makeLevels(x.reps,x.prescription_profiles||{})
    }))
   }
   const engineConfig=createWodEngineConfig({participation,collaboration,partnerCount:Number(partnerCount),scoreType,scoreFields})
   schema.wod_engine={...engineConfig,blocks:[buildLegacyCompatibleBlock({format:savedFormat,items:schema.items,durationSeconds:schema.duration_seconds,engine:engineConfig,interval:schema.interval})]}
   const movements=selected.map((x,i)=>(i+1)+'. '+(x.is_rest?`Pause · ${Number(x.pauseSeconds)||30} sek`:buildPrescription(x))).join('\n')
   const stationDuration=schema.duration_seconds
   const timer_settings={workout_schema:schema,work_seconds:isStationCircuit?Number(stationWork):Number(workSeconds)||null,rest_seconds:isStationCircuit?Number(stationTransition):Number(restSeconds)||null,rounds:isStationCircuit?Number(stationRounds):Number(rounds)||null,duration_seconds:stationDuration}
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
   setSelected([]);setNotes('');setLibraryCategory('standard');setCustomInstructions('');setRxNotes('');setScaledNotes('');setWizardStep(1);setName(suggestUniqueWodName());setEditingWodId(null);onSaved?.()
  }catch(e){setError(e.message||'Kunne ikkje lagra WOD.')}finally{setBusy(false)}
 }
  function goToStep(next){setError('');if(next===2)setLibraryOpen(false);if(next===3){setEditingSelectedKey(selected[0]?.key||null);setDoseLevelByKey({})}if(next===2&&isAmrap&&(!Number.isInteger(Number(timeCap))||Number(timeCap)<1||Number(timeCap)>600)){setError('AMRAP krev ei tidsramme på mellom 1 og 600 minutt.');return}if(next===2&&isStationCircuit&&selected.length>Number(stationCount))setSelected(rows=>rows.slice(0,Number(stationCount)));if((next===3||next===4)&&!selected.length){setError('Legg minst ei øving til WOD-en før du går vidare.');return}if((next===3||next===4)&&((format==='Couplet'&&selected.length!==2)||(format==='Triplet'&&selected.length!==3))){setError(`${format} krev nøyaktig ${format==='Couplet'?2:3} øvingar.`);return}setWizardStep(next)}
 return <div className={'wod-builder wod-builder-step-'+wizardStep+(libraryOpen?' wod-library-open':'')}>
  <div className="training-heading wod-builder-heading"><div><div className="section-kicker">GARASJEGYM · PROGRAMMERINGSVERKSTAD</div><h3>{editingWodId?'Rediger WOD':'WOD Studio'}</h3><p>Bygg, tilpass og publiser treningsøkter i GarasjeGym.</p></div><div className="wod-builder-heading-actions"><span className="count-pill"><WandSparkles size={14}/> PRO</span>{onCancel&&<button type="button" className="secondary-button" onClick={()=>{if((editingWodId||selected.length>0)&&!window.confirm('Avbryta? Ulagra endringar i WOD-byggaren blir forkasta.'))return;onCancel()}}>Avbryt · WOD-bibliotek</button>}</div></div>
  <div className="wod-wizard-steps" aria-label="Framdrift i WOD-byggjaren">{[{n:1,label:'Format'},{n:2,label:'Øvingsval'},{n:3,label:'Dosering'},{n:4,label:'Gjennomgang'}].map(step=><span key={step.n} className={wizardStep===step.n?'active':wizardStep>step.n?'complete':''}><b>{wizardStep>step.n?'✓':step.n}</b>{step.label}</span>)}</div>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
  {assignedClientId&&<div className="pt-wod-mode-switch"><button type="button" className={builderMode==='library'?'selected':''} onClick={()=>setBuilderMode('library')}>Finn WOD i biblioteket</button><button type="button" className={builderMode==='build'?'selected':''} onClick={()=>setBuilderMode('build')}>Bygg ny WOD</button></div>}
  {assignedClientId&&builderMode==='library'?<section className="pt-wod-library-panel"><div className="engine-section-title"><div><h4>Vel frå WOD-biblioteket</h4><p>Bruk same publiserte WOD på fleire kundar utan å laga kopiar.</p></div><span>{libraryWods.length} WOD-ar</span></div><div className="wod-search"><Search size={16}/><input value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)} placeholder="Søk etter namn eller format …"/></div><div className="pt-wod-library-list">{libraryWods.filter(w=>(w.name+' '+w.format).toLowerCase().includes(librarySearch.toLowerCase())).map(w=><button type="button" key={w.id} className={selectedLibraryWod===w.id?'selected':''} onClick={()=>setSelectedLibraryWod(w.id)}><span><strong>{w.name}</strong><small>{w.format} · {w.duration_minutes||'–'} min · {w.movements?.split('\n').filter(Boolean).length||0} øvingar</small></span><span>{selectedLibraryWod===w.id?'Vald':'Vel'}</span></button>)}</div><button type="button" className="primary-button" disabled={!selectedLibraryWod||busy} onClick={assignLibraryWod}><Plus size={15}/>{busy?'Tildeler …':'Tildel vald WOD til kunden'}</button></section>:<div className="pt-wod-builder-form">
  {wizardStep===1&&<section className="wod-engine-setup">
    <div className="engine-section-title"><div><h4>Gjennomføringsmodell</h4><p>Vel kven som trenar saman og korleis resultatet skal registrerast.</p></div><span>WOD ENGINE 2.0</span></div>
    <div className="wod-engine-fields">
      <label>Utøvaroppsett<select value={participation} onChange={e=>{const value=e.target.value;setParticipation(value);setCollaboration(value==='individual'?'solo':'free_split');setPartnerCount(value==='partner'?'2':'3')}}>{PARTICIPATION_MODES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      {participation!=='individual'&&<label>Samarbeidsform<select value={collaboration} onChange={e=>setCollaboration(e.target.value)}>{COLLABORATION_MODES.filter(x=>x.value!=='solo').map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>}
      {participation==='team'&&<label>Tal utøvarar<input type="number" min="3" max="30" value={partnerCount} onChange={e=>setPartnerCount(e.target.value)}/></label>}
      <label>Primær scoring<select value={scoreType} onChange={e=>{setScoreType(e.target.value);setScoreFields(e.target.value==='multi'?['rounds_reps','distance']:[e.target.value])}}>{SCORE_TYPES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
    </div>
    {scoreType==='multi'&&<fieldset className="wod-engine-score-fields"><legend>Resultatfelt</legend>{SCORE_TYPES.filter(x=>x.value!=='multi').map(x=><label key={x.value}><input type="checkbox" checked={scoreFields.includes(x.value)} onChange={e=>setScoreFields(current=>e.target.checked?[...current,x.value]:current.filter(v=>v!==x.value))}/>{x.label}</label>)}</fieldset>}
    <p className="wod-help">Dette blir lagra som strukturert WOD-data. Individuell gjennomføring er standard. Partner og team får eigne samarbeids- og scoringinnstillingar.</p>
  </section>}
  {wizardStep===1&&<section className="wod-classic-picker"><div className="wod-classic-copy"><span className="wod-classic-kicker">BENCHMARK COLLECTION</span><strong>Klassiske WOD-ar</strong><small>The Girls · Hero WODs · originaloppsett</small></div><div className="wod-classic-controls"><select className="wod-classic-select" value={classicChoice} onChange={e=>setClassicChoice(e.target.value)}><option value="">Vel ei klassisk økt …</option><optgroup label="The Girls">{CLASSIC_WODS.filter(x=>x.group==='The Girls').map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</optgroup><optgroup label="Hero WODs">{CLASSIC_WODS.filter(x=>x.group==='Hero WODs').map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</optgroup></select><button type="button" className="secondary-button" disabled={!classicChoice} onClick={loadClassicWod}>Last inn</button></div></section>}
  {wizardStep===1&&<WodImportPanel exerciseCatalog={exercises} onApply={applyImportedWod}/>}
  {wizardStep===1&&<div className="wod-studio-tools"><button type="button" className="primary-button" onClick={randomWod}><Dices size={17}/> Generer tilfeldig WOD</button><button type="button" className="secondary-button" onClick={reset}><Trash2 size={15}/> Forkast økt</button></div>}
  <div className="wod-builder-layout">
   {wizardStep===2&&<aside className="wod-setup-summary"><div className="wod-setup-summary-kicker">WOD-OPPSETT</div><h4>{name||'Namlaus WOD'}</h4><div className="wod-setup-summary-row"><span>Format</span><strong>{format}</strong></div><div className="wod-setup-summary-row"><span>Tidsramme</span><strong>{isAmrap?(timeCap?timeCap+' min':'Open AMRAP'):isForTime?(timeCap?timeCap+' min':'Fri tid'):isElapsedFormat?'Medgått tid':minutes+' min'}</strong></div><div className="wod-setup-summary-row"><span>Intensitet</span><strong>{intensity==='1'?'Kontrollert':intensity==='3'?'Høg':'Utfordrande'}</strong></div><div className="wod-setup-summary-hint">Oppsettet er klart. Vel øvingar i biblioteket og legg dei til i ønskt rekkjefølgje.</div></aside>}
   {wizardStep===2&&libraryOpen&&createPortal(<section className="engine-section wod-library wod-library-portal"><div className="wod-library-fullscreen-head"><strong>Vel øvingar <span>{selected.length} valde</span></strong></div><div className="engine-section-title"><h4>Øvingsbibliotek</h4><span>{filtered.length} øvingar</span></div>
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
    <div className="wod-pause-insert"><div><strong>Pause</strong><small>Legg inn ein tidsstyrt pause mellom øvingar</small></div><button type="button" className="secondary-button" onClick={addPause}><Plus size={15}/> Legg til pause</button></div>{loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar øvingar …</div>:filtered.length?<div className="wod-exercise-grid">{filtered.map(ex=>{const pickedCount=selected.filter(x=>x.id===ex.id).length;return <article className={"wod-exercise-card wod-category-"+categoryTone(ex.category)+(pickedCount?' is-picked':'')} key={ex.id}><div className="wod-exercise-info"><div className="wod-exercise-card-top"><span className={"wod-stimulus-tag stimulus-"+categoryTone(ex.category)}>{ex.stimulus||ex.category||'Functional Fitness'}</span>{pickedCount>0&&<span className="wod-picked-count">Vald {pickedCount}×</span>}</div><strong>{ex.name}</strong><small>{isRehabExercise(ex)?'Rehab':ex.category} · {ex.body_area||'Heile kroppen'}</small><div className="wod-equipment-icons">{equipmentItems(ex.equipment).map((item,ei)=><span key={ei} title={item}>{equipmentIcon(item)}</span>)}{ex.movement_pattern&&<span>{ex.movement_pattern}</span>}</div>{ex.description&&<p className={isRehabExercise(ex)?'wod-rehab-description':''}>{ex.description}</p>}
          {ex.is_complex&&<small className="wod-complex-sequence">{formatComplexSequence(ex.complex_steps)}</small>}{ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer">Sjå video</a>}</div><button className="wod-add-button" type="button" onClick={()=>add(ex)} aria-label="Legg til øving i WOD" title="Legg til øving i WOD"><Plus size={20}/></button></article>})}</div>:<div className="empty-state">Ingen øvingar treff søket.</div>}
    <div className="wizard-stage-actions wizard-library-actions"><button type="button" className="primary-button" onClick={()=>setLibraryOpen(false)}>Ferdig med øvingsval · tilbake til WOD-bygging ({selected.length})</button></div>
   </section>,document.body)}
   <aside className="engine-section wod-composer">
    <div className="engine-section-title"><h4>{wizardStep===1?"1 · Format og tidsramme":wizardStep===2?"2 · Valde øvingar":wizardStep===3?"3 · Dosering":"4 · Ferdigstilling og publisering"}</h4><span>{isInterval?selected.length+'/'+intervalExerciseCount+' øvingar':selected.length+' øvingar'}</span></div>
    <form className="admin-create-form" onSubmit={save}>
     {wizardStep===1&&<div className="wizard-format-panel"><div className="wod-name-field"><label>WOD-namn<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Gje økta eit namn …"/></label><button type="button" className="secondary-button" onClick={()=>setName(suggestUniqueWodName())}>Nytt namn</button></div>
     
     <div className="wod-setup-format">
      <div className="wod-setup-field-label">Format <span>*</span></div>
      <div className="wod-format-tiles" role="group" aria-label="Vel WOD-format">
        {formats.map(group=><section className="wod-format-group" key={group.group}><strong className="wod-format-group-label">{group.group}</strong><div className="wod-format-group-options">{group.items.map(item=><button key={item} type="button" className={format===item?'selected':''} aria-pressed={format===item} onClick={()=>{setFormat(item);setError('');if(['Strength','Superset','Complex','Eigen økt','Ladder','Death By'].includes(item)){setTimeCap('');setTimeCapSeconds('0')}else if(['For Time','Chipper','Couplet','Triplet'].includes(item)&&!timeCap){setTimeCap('20')}if(item==='Tabata'){setWorkSeconds('20');setRestSeconds('10');setRounds('8');setIntervalExerciseCount('1')}if(item==='Intervall'||item==='Row Intervals'){setWorkSeconds('60');setRestSeconds('10');setRounds('5');setIntervalExerciseCount('1')}if(isEmomFormat(item)){setWorkSeconds('45');setRestSeconds('15')}if(item==='Stasjonssirkel'){setSelected(rows=>rows.map(x=>({...x,reps:'',repsMode:'amrap'})))}}}><span className="wod-format-icon">{formatIcons[item]||'○'}</span><strong>{item==='Complex'?'Kompleksstyrke':item}</strong></button>)}</div></section>)}
      </div>
     </div>
     <label className="wod-category-early">Kategori<select value={libraryCategory} onChange={event=>setLibraryCategory(event.target.value)}><option value="warmup">Oppvarming · 2 delar</option><option value="standard">Standard-WOD</option><option value="benchmark">Benchmark-WOD</option><option value="assessment">Test og evaluering</option><option value="rehab">Rehabilitering / tilpassa</option><option value="recovery">Restitusjon og mobilitet</option><option value="other">Anna / spesialøkt</option></select></label><small className="wod-category-help">Kategori seier kva føremål økta har. Format styrer korleis ho blir gjennomført og skåra. Dagens WOD blir planlagt separat i kalenderen.</small>{libraryCategory==='warmup'&&<aside className="warmup-builder-guide"><strong>Oppvarminga har to delar</strong><p><b>1. Felles oppvarming:</b> bygg gradvis opp mot hovud-WOD sin stimulus og rørsleform.</p><p><b>2. Fri teknisk innøving:</b> kvar deltakar prøver hovudrørsla med lette vekter og finn sitt eige arbeidsnivå.</p></aside>}<div className="engine-fields">{!isTimed&&!isStationCircuit&&!isAmrap&&!isInterval&&!showSets&&!isLadder&&!isForTime&&!(isCoupletTriplet&&combinationMode!=='Open')&&<label>Planlagd tid (minutt)<input type="number" min="1" max="600" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}</div>
     {isStationCircuit&&<div className="wod-advanced-fields station-circuit-settings"><label>Tal stasjonar<select value={stationCount} onChange={e=>{const count=Number(e.target.value);setStationCount(String(count));setSelected(current=>current.slice(0,count))}}>{[2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>Arbeid per stasjon (sek.)<input type="number" min="1" max="600" step="1" value={stationWork} onChange={e=>setStationWork(e.target.value)}/></label><label>Bytetid (sek.)<input type="number" min="0" max="600" step="1" value={stationTransition} onChange={e=>setStationTransition(e.target.value)}/></label><label>Tal rundar<input type="number" min="1" max="20" step="1" value={stationRounds} onChange={e=>setStationRounds(e.target.value)}/></label><p className="wod-help">Vel 2–8 stasjonar og legg inn éi øving per stasjon i rett rekkjefølgje. Alle grupper startar på kvar si stasjon og roterer samtidig. Total tid blir rekna automatisk.</p></div>}
      {isTimed&&<div className="wod-advanced-fields"><label>Øktlengd (minutt)<input type="number" min="1" max="600" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><p className="wod-help">Arbeidet startar {timedLabel(format)}. Reps-feltet i doseringa er målet per arbeidsintervall.</p></div>}
      {isInterval&&<div className="wod-advanced-fields">{format!=='Tabata'&&<label>Tal øvingar / drag<select value={intervalExerciseCount} onChange={e=>{setIntervalExerciseCount(e.target.value);setSelected(rows=>rows.slice(0,Number(e.target.value)))}}>{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} {n===1?'øving/drag':'øvingar/drag'}</option>)}</select></label>}<label>Tal rundar<select value={rounds} onChange={e=>setRounds(e.target.value)}>{[1,2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n} {n===1?'runde':'rundar'}</option>)}</select></label><label>Arbeid (sekund)<input type="number" min="1" max="600" step="1" value={workSeconds} onChange={e=>setWorkSeconds(e.target.value)}/></label><label>Pause (sekund)<input type="number" min="0" max="600" step="1" value={restSeconds} onChange={e=>setRestSeconds(e.target.value)}/></label><p className="wod-help">{format==='Tabata'?'Standard Tabata: 20 sek arbeid / 10 sek pause × 8 rundar.':'Vel arbeidstid, pause, tal rundar og drag. Øvingane blir gjennomførte i vald rekkjefølgje.'}</p></div>}
      {isLadder&&<div className="wod-advanced-fields"><label>Startreps<input type="number" min="1" value={ladderStart} onChange={e=>setLadderStart(e.target.value)}/></label><label>Endring per runde<input type="number" min="1" value={ladderStep} onChange={e=>setLadderStep(e.target.value)}/></label><label>Retning<select value={ladderDirection} onChange={e=>setLadderDirection(e.target.value)}><option value="up">Aukande</option><option value="down">Minkande</option></select></label></div>}
     {isAmrap&&<div className="wod-advanced-fields"><label>Tidsramme (min) · obligatorisk<input type="number" min="1" max="600" required value={timeCap} onChange={e=>setTimeCap(e.target.value)} placeholder="T.d. 16"/></label><p className="wod-help">AMRAP skal alltid ha ei fast tidsramme. Resultatet blir registrert som rundar + ekstra repetisjonar.</p></div>}
      {(isForTime||isLadder||showSets)&&<div className="wod-advanced-fields"><label>Time Cap (valfri, minutt)<input type="number" min="0" max="600" value={timeCap} onChange={e=>{setTimeCap(e.target.value);setTimeCapSeconds('0')}}/></label>{isForTime&&format!=='Chipper'&&<label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(e.target.value)}/></label>}<p className="wod-help">Time Cap er valfri. Når tida går ut, blir økta registrert som fullført på tidsgrensa, med utført arbeid lagra.</p></div>}
      {isCoupletTriplet&&<div className="wod-advanced-fields"><label>Tidsstruktur<select value={combinationMode} onChange={e=>setCombinationMode(e.target.value)}><option value="For Time">For Time</option><option value="AMRAP">AMRAP</option><option value="Open">Open / utan klokke</option></select></label>{combinationMode!=='Open'&&<label>Tidsgrense (min)<input type="number" min="1" max="300" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label>}<p className="wod-help">{format} krev {format==='Couplet'?2:3} øvingar. Tidsstrukturen avgjer korleis dei blir gjennomførte.</p></div>}
      
     {format==='Superset'&&<p className="wod-help">Gruppér øvingar med same bokstav. Utfør gruppa etter kvarandre, kvil etterpå.</p>}
      {format==='Complex'&&<p className="wod-help">Vel komplekse rørslesekvensar frå øvingsbiblioteket. Repetisjonar, syklusar og belastning blir styrte i doseringssteget. Tida blir registrert som medgått tid.</p>}
     
     {isCustom&&<><label className="wod-custom-sets"><input type="checkbox" checked={customUseSets} onChange={e=>setCustomUseSets(e.target.checked)}/> Bruk sett-programmering på øvingane</label><label>Fri struktur / instruksjon<textarea rows="3" value={customInstructions} onChange={e=>setCustomInstructions(e.target.value)} placeholder="Beskriv struktur, sett, rundar, pausar og gjennomføring …"/></label></>}
     </div>}{wizardStep===2&&!libraryOpen&&<div className="wizard-selected-stage">
       <div className="wizard-stage-intro"><strong>Øvingane i WOD-en</strong><span>Vel øvingar, sorter dei og gå vidare til eitt samla doseringssteg.</span></div>
       <button type="button" className="primary-button wod-open-library" onClick={()=>setLibraryOpen(true)}><Plus size={17}/> Legg til øving</button>
       <div className="wod-selected-list">
        {selected.length?selected.map((ex,i)=><article data-order={i+1} className={"wod-selected-card wod-category-"+categoryTone(ex.category)} key={ex.key}>
         <span className={"wod-order wod-order-"+categoryTone(ex.category)}>{i+1}</span>
         <div className="wod-selected-info">
          <div className="wod-selected-title"><strong>{ex.name}</strong><span className={"wod-stimulus-tag stimulus-"+categoryTone(ex.category)}>{ex.is_complex?'COMPLEX':ex.stimulus||ex.category}</span></div>
          <small>{ex.body_area||'Heile kroppen'} · {equipmentItems(ex.equipment).map((item,ei)=><span key={ei} title={item}>{equipmentIcon(item)}{ei<equipmentItems(ex.equipment).length-1?' · ':''}</span>)}</small>
          {libraryCategory==='warmup'&&!ex.is_rest&&<label className="warmup-phase-picker">Del av oppvarming<select value={ex.warmup_phase||'specific_prep'} onChange={event=>setSelected(rows=>rows.map(row=>row.key===ex.key?{...row,warmup_phase:event.target.value}:row))}><option value="specific_prep">1 · Felles oppvarming</option><option value="movement_rehearsal">2 · Fri teknisk innøving</option></select></label>}
          {ex.is_complex&&<small className="wod-complex-sequence">{formatComplexSequence(ex.complex_steps)}</small>}
          {ex.is_rest&&<small className="wod-pause-summary">Pause · {Number(ex.pauseSeconds)||30} sekund · blir justert i doseringssteget</small>}
          {!ex.is_rest&&ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer">Sjå øvingsvideo</a>}
         </div>
         <div className="wod-reorder-controls">
          <button type="button" title="Flytt opp" aria-label={`Flytt ${ex.name} opp`} disabled={!i} onClick={()=>moveByKey(ex.key,-1)}><ArrowUp size={16}/></button>
          <button type="button" title="Flytt ned" aria-label={`Flytt ${ex.name} ned`} disabled={i===selected.length-1} onClick={()=>moveByKey(ex.key,1)}><ArrowDown size={16}/></button>
          <label className="wod-order-picker wod-position-control" title="Vel plassering"><span>Pos.</span><select aria-label={`Flytt ${ex.name} til posisjon`} value={i+1} onChange={event=>{const position=Number(event.target.value);setSelected(rows=>moveWodItemToPosition(rows,ex.key,position));setNotice(ex.name+' er flytta til plass '+position+'.')}}>{selected.map((_,position)=><option key={position+1} value={position+1}>{position+1}</option>)}</select></label>
          <button type="button" title="Fjern øving" aria-label={`Fjern ${ex.name}`} onClick={()=>setSelected(rows=>rows.filter(x=>x.key!==ex.key))}><Trash2 size={16}/></button>
         </div>
        </article>):<div className="empty-state">Vel «Legg til øving» for å byggja WOD-en.</div>}
       </div>
       <p className="wod-order-feedback" role="status" aria-live="polite" aria-atomic="true">Rekkjefølgje: {selected.map((ex,i)=>(i+1)+'. '+ex.name).join(' → ')}</p>
      <div className="wizard-stage-actions wizard-stage-actions-sticky"><button type="button" className="secondary-button" onClick={()=>setWizardStep(1)}>Tilbake</button><button type="button" className="primary-button" disabled={!selected.length||(isInterval&&selected.length!==Number(intervalExerciseCount))} onClick={()=>goToStep(3)}>Vidare · {selected.length} {selected.length===1?"øving":"øvingar"} →</button></div></div>}
     {wizardStep===1&&<div className="wizard-stage-actions"><button type="button" className="primary-button" onClick={()=>goToStep(2)}>Vidare til øvingsval →</button></div>}
     {wizardStep===3&&<div className="wizard-dose-stage">
      <div className="wizard-dose-intro"><div><span className="wod-classic-kicker">STEG 3 AV 4</span><h2>Dosering og nivå</h2><p>Set reps, belastning og tilpass nivå for kvar øving.</p></div><span className="wod-dose-count">{selected.length} øvingar</span></div>
      <div className="wizard-dose-exercises">{selected.map((ex,i)=>{const level=doseLevelByKey[ex.key]||'rx';const dose=(ex.levels||makeLevels(ex.reps,ex.prescription_profiles||{}))[level]||makeLevels(ex.reps,ex.prescription_profiles||{})[level];const update=patch=>updateLevel(ex.key,level,patch);const summary=(key)=>{const d=(ex.levels||makeLevels(ex.reps,ex.prescription_profiles||{}))[key]||{};const load=d.loadMode==='kg'?[d.loadKgMen!==''?'M '+d.loadKgMen+' kg':'',d.loadKgWomen!==''?'K '+d.loadKgWomen+' kg':''].filter(Boolean).join(' / '):d.loadMode==='percent'&&d.percent1rm?d.percent1rm+' % 1RM':d.loadMode==='rir'&&d.rir!==''?'RIR '+d.rir:d.loadMode==='bodyweight'?'Kroppsvekt':'';return [ex.is_rest?'Pause · '+(Number(ex.pauseSeconds)||30)+' sek':ex.is_complex?(d.reps||5)+' komplekssyklusar':isRow(ex)?(ex.rowValue||'–')+' '+ex.rowUnit:d.reps?d.reps+' reps':'Ikkje dosert',d.heightCm?d.heightCm+' cm':'',d.durationSeconds?d.durationSeconds+' sek':'',d.distanceMeters?d.distanceMeters+' m':'',d.calories?d.calories+' cal':'',load,].filter(Boolean).join(' · ')};return <article className="wizard-dose-card" key={ex.key}>
       <button type="button" className="wizard-dose-card-head" onClick={()=>setEditingSelectedKey(current=>current===ex.key?null:ex.key)}><span className="wod-order">{i+1}</span><strong>{ex.name}</strong><span className="wizard-dose-card-summary">{summary('rx')}</span><span>{editingSelectedKey===ex.key?'⌃':'⌄'}</span></button>
       {editingSelectedKey===ex.key&&<div className="wizard-dose-card-body">{ex.is_complex&&<div className="wizard-dose-complex-sequence"><strong>Kompleksrekkjefølgje</strong><ol>{ex.complex_steps.map((step,stepIndex)=><li key={stepIndex}>{step.reps} × {step.name}</li>)}</ol></div>}
         {ex.is_rest?<label className="wizard-dose-pause">Pausevarigheit · sekund<input type="number" min="1" max="3600" value={ex.pauseSeconds||'30'} onChange={e=>updateItem(ex.key,{pauseSeconds:e.target.value})}/></label>:<> <div className="wizard-dose-level-tabs">{[{id:'rx',label:'RX'},{id:'scaled',label:'Scaled'},{id:'foundation',label:'Foundation'}].map(x=><button type="button" key={x.id} className={level===x.id?'active':''} onClick={()=>setDoseLevelByKey(v=>({...v,[ex.key]:x.id}))}>{x.label}</button>)}</div>
        {doseFieldsFor(ex).load&&<div className="wizard-dose-suggestion"><strong>Øvingsprofil · {ex.prescription_profiles?.variant_label||ex.equipment||'Uspesifisert variant'}</strong><span>{dose.loadKgMen!==''||dose.loadKgWomen!==''?'Standardverdiar frå øvingsbiblioteket':'Ingen standardverdiar registrerte for dette nivået.'}</span><small>PT-konfigurerte verdiar per øving og variant – ikkje automatisk skalerte frå RX.</small></div>}
        <div className="wizard-dose-fields">
           {showSets&&<label>Sett<input type="number" min="1" max="30" value={dose.sets??''} onChange={e=>update({sets:e.target.value})} placeholder="T.d. 3"/></label>}
           {!isRow(ex)&&(!doseFieldsFor(ex).distance||ex.is_complex)&&(!isStationCircuit||(ex.repsMode||'fixed')==='fixed')&&<label>{ex.is_complex?'Komplekssyklusar':'Reps / mengd'}<input type="text" inputMode="numeric" pattern="[0-9]+([-/][0-9]+)*" value={dose.reps??''} onChange={e=>update({reps:e.target.value})} placeholder={ex.is_complex?'T.d. 5':'T.d. 10 eller 21-15-9'}/></label>}
           {isRow(ex)&&<><label>Roing · mengd<input type="number" min="1" value={ex.rowValue||''} onChange={e=>updateItem(ex.key,{rowValue:e.target.value})} placeholder="T.d. 500"/></label><label>Eining<select value={ex.rowUnit||'m'} onChange={e=>updateItem(ex.key,{rowUnit:e.target.value})}><option value="m">Meter</option><option value="cal">Kaloriar</option><option value="s">Sekund</option><option value="min">Minutt</option></select></label></>}
          {doseFieldsFor(ex).height&&<label>Bokshøgd / høgd (cm)<input type="number" min="1" value={dose.heightCm||''} onChange={e=>update({heightCm:e.target.value})} placeholder="T.d. 60"/></label>}
          {doseFieldsFor(ex).time&&<label>Varigheit (sek.)<input type="number" min="1" value={dose.durationSeconds||''} onChange={e=>update({durationSeconds:e.target.value})} placeholder="T.d. 30"/></label>}
           {!isRow(ex)&&doseFieldsFor(ex).distance&&<label>Distanse (meter)<input type="number" min="1" value={dose.distanceMeters||''} onChange={e=>update({distanceMeters:e.target.value})} placeholder="T.d. 500"/></label>}
           {!isRow(ex)&&doseFieldsFor(ex).calories&&<label>Kaloriar (cal)<input type="number" min="1" value={dose.calories||''} onChange={e=>update({calories:e.target.value})}/></label>}
           {isStationCircuit&&<label>Doseringstype<select value={ex.repsMode||'fixed'} onChange={e=>updateItem(ex.key,{repsMode:e.target.value})}><option value="fixed">Fast reps</option><option value="amrap">AMRAP · maks reps på stasjonen</option></select></label>}
          {doseFieldsFor(ex).load&&<label>Belastningsmetode<select value={dose.loadMode||'none'} onChange={e=>update({loadMode:e.target.value})}><option value="none">Ikkje oppgitt</option><option value="kg">Fast vekt (kg)</option><option value="percent">% av 1RM</option><option value="rir">RIR – repetisjonar i reserve</option><option value="bodyweight">Kroppsvekt</option></select></label>}
          {dose.loadMode==='kg'&&doseFieldsFor(ex).load&&<><label>Vekt menn (kg)<input type="number" min="0" step="0.5" value={dose.loadKgMen??''} onChange={e=>update({loadKgMen:e.target.value})}/></label><label>Vekt kvinner (kg)<input type="number" min="0" step="0.5" value={dose.loadKgWomen??''} onChange={e=>update({loadKgWomen:e.target.value})}/></label></>}
          {dose.loadMode==='percent'&&doseFieldsFor(ex).load&&<label>Prosent av 1RM (%)<input type="number" min="1" max="150" value={dose.percent1rm||''} onChange={e=>update({percent1rm:e.target.value})}/></label>}
          {dose.loadMode==='rir'&&doseFieldsFor(ex).load&&<label>RIR · repetisjonar i reserve<input type="number" min="0" max="10" step="0.5" value={dose.rir??''} onChange={e=>update({rir:e.target.value})} placeholder="T.d. 2"/></label>}
          
           {isTimed&&<label>Minutt / oppgåve<input value={ex.minuteSlot||''} onChange={e=>updateItem(ex.key,{minuteSlot:e.target.value})} placeholder="T.d. 1, 2 eller 3"/></label>}
          {doseFieldsFor(ex).tempo&&<label>Tempo<input type="text" value={dose.tempo||''} onChange={e=>update({tempo:e.target.value})} placeholder="T.d. 3–1–1–0"/></label>}
           {format==='Superset'&&<label>Supersett-gruppe<input value={ex.group||'A'} onChange={e=>updateItem(ex.key,{group:e.target.value.toUpperCase().slice(0,2)})}/></label>}{(format==='Intervall'||format==='Row Intervals')&&<label>Pause etter øving · sekund<input type="number" min="0" value={ex.restSeconds||''} onChange={e=>updateItem(ex.key,{restSeconds:e.target.value})}/></label>}
          <label>Alternativ øving / variant<input type="text" value={dose.variant||''} onChange={e=>update({variant:e.target.value})} placeholder="Valfri skalering av rørsla"/></label>
          <label className="wizard-dose-instruction">Instruksjon (valfritt)<textarea rows="2" value={dose.instruction||''} onChange={e=>update({instruction:e.target.value})} placeholder="Teknikk, krav og gjennomføring …"/></label>
         </div>
        <div className="wizard-dose-copy"><span>{level==='rx'?'Føreskriven standard':level==='scaled'?'Tilpassa nivå':'Grunnnivå'}</span><span>Verdiane er uavhengige per nivå</span></div>
         </>}
        </div>}
      </article>})}</div>
      <section className="wizard-dose-method"><strong>{libraryCategory==='warmup'?'Hovud-WOD · stimulus og rørsleform':'Felles treningsstimulus'}</strong>{libraryCategory==='warmup'&&<p>Skildre kva hovudøkta krev. Den felles delen skal førebu dette gradvis, og den frie delen skal la kvar deltakar finne rett arbeidsbelastning.</p>}<label>Intensitetsnivå<select value={intensity} onChange={e=>setIntensity(e.target.value)}><option value="1">1 · Kontrollert / teknikk</option><option value="2">2 · Utfordrande</option><option value="3">3 · Høg intensitet</option></select></label><label>{libraryCategory==='warmup'?'Stimulus og rørsleform i hovud-WOD':'Planlagd treningsstimulus'}<textarea rows="2" value={stimulus} onChange={e=>setStimulus(e.target.value)} placeholder={libraryCategory==='warmup'?'T.d. frontbøy og pull-ups · kraft frå hofte · stabil overkropp …':'Jamn intensitet, teknisk kvalitet, kontrollert tempo …'}/></label><label>Coach-notat<textarea rows="2" value={notes} onChange={e=>setNotes(e.target.value)} placeholder={libraryCategory==='warmup'?'Kva skal instruktøren sjå etter? Korleis skal deltakarane auke vekta?':'Tekniske krav og beskjed til PT …'}/></label></section>
       <p className="wizard-dose-summary-note">RX, Scaled og Foundation blir lagra som separate doseringsnivå for kvar øving.</p>
      <div className="wizard-stage-actions"><button type="button" className="secondary-button" onClick={()=>setWizardStep(2)}>Tilbake</button><button type="button" className="primary-button" onClick={()=>goToStep(4)}>Vidare til publisering →</button></div>
     </div>}{wizardStep===4&&<div className="wizard-publish-stage wizard-final-stage"><div className="wizard-stage-intro"><strong>{assignedClientId&&!canPublishWod?'Ferdigstilling og tildeling':'Ferdigstilling og publisering'}</strong><span>{assignedClientId&&!canPublishWod?'WOD-en blir lagra privat og tildelt den valde kunden.':'Kontroller WOD-en før du lagrar eller publiserer han.'}</span></div><section className="wod-final-preview"><div><span className="wod-classic-kicker">WOD-FØREHANDSVISNING</span><h2>{name||'Namlaus WOD'}</h2><p>{format} · {isAmrap?(timeCap?timeCap+' min':'Open AMRAP'):isForTime?(timeCap?timeCap+' min':'Fri tid'):isElapsedFormat?'Medgått tid':minutes+' min'} · {selected.length} øvingar</p></div><ol>{selected.map((ex,i)=><li key={ex.key}><strong>{i+1}. {ex.name}</strong>{ex.is_complex&&<small className="wod-complex-sequence">{formatComplexSequence(ex.complex_steps)}</small>}{ex.is_rest?<span>Pause · {Number(ex.pauseSeconds)||30} sek</span>:isStationCircuit?<span>{ex.repsMode==='amrap'?'AMRAP · maks reps':(ex.reps||'–')+' reps'} · {stationWork}s arbeid{ex.levels?.[doseLevelByKey[ex.key]||'rx']?.heightCm?' · '+ex.levels[doseLevelByKey[ex.key]||'rx'].heightCm+' cm':''}</span>:<div className="wod-final-level-doses">{['rx','scaled','foundation'].map(level=>{const d=ex.levels?.[level]||{};const parts=[d.sets?d.sets+' sett':'',ex.is_complex?(d.reps||5)+' komplekssyklusar':d.reps?d.reps+' reps':'',d.heightCm?d.heightCm+' cm':'',d.durationSeconds?d.durationSeconds+' sek':'',d.distanceMeters?d.distanceMeters+' m':'',d.calories?d.calories+' cal':'',d.loadMode==='kg'?[d.loadKgMen?'M '+d.loadKgMen+' kg':'',d.loadKgWomen?'K '+d.loadKgWomen+' kg':''].filter(Boolean).join(' / '):d.loadMode==='percent'&&d.percent1rm?d.percent1rm+' % 1RM':d.loadMode==='rir'&&d.rir!==''?'RIR '+d.rir:d.loadMode==='bodyweight'?'Kroppsvekt':'',d.tempo?'Tempo '+d.tempo:'',d.variant?'Variant: '+d.variant:'',d.instruction||''].filter(Boolean).join(' · ');return <span key={level}><b>{level.toUpperCase()}</b> · {parts||'Ikkje dosert'}</span>})}</div>}</li>)}</ol><p>{stimulus}</p></section><label>Type i medlemsbiblioteket<select value={libraryCategory} onChange={e=>setLibraryCategory(e.target.value)}><option value="warmup">Oppvarming-WOD</option><option value="standard">Standard-WOD</option><option value="benchmark">Benchmark-WOD</option><option value="assessment">Test og evaluering</option><option value="rehab">Rehabilitering / tilpassa</option><option value="recovery">Restitusjon og mobilitet</option><option value="other">Anna / spesialøkt</option><option value="custom">Eigendefinert kategori …</option></select></label>{libraryCategory==='custom'&&<label>Namnet på kategorien<input value={customLibraryCategory} onChange={e=>setCustomLibraryCategory(e.target.value)} maxLength={40} placeholder="Skriv kategorinamn" required/></label>}{canPublishWod?<label className="wod-publish-toggle"><input type="checkbox" checked={publishToMembers} onChange={e=>setPublishToMembers(e.target.checked)}/> Publiser for medlemmer</label>:<p className="wod-help">PT-WOD blir lagra privat. Når du byggjer for ein kunde, blir WOD-en tildelt kunden utan å bli publisert i medlemsbiblioteket.</p>}<div className="wizard-stage-actions"><button type="button" className="secondary-button" onClick={()=>setWizardStep(3)}>Tilbake til dosering</button><button type="submit" className="primary-button" disabled={busy||!selected.length||!name.trim()}><Save size={16}/>{busy?'Lagrar …':editingWodId?'Lagre endringar':assignedClientId&&canPublishWod&&publishToMembers?'Publiser og tildel WOD':canPublishWod&&publishToMembers?'Publiser WOD':assignedClientId?'Lagre og tildel WOD':'Lagre WOD som utkast'}</button></div></div>}
    </form>
   </aside>
   <aside className="wod-live-preview">
    <div className="wod-live-preview-head"><span className="wod-classic-kicker">LIVE WOD</span><strong>{selected.length} / {isStationCircuit?stationCount:'∞'} øvingar</strong></div>
    <h4>{name||'Namlaus WOD'}</h4>
    <div className="wod-live-meta"><span>{format}</span><span>{isStationCircuit?stationWork+'s arbeid / '+stationTransition+'s byte':isAmrap?(timeCap?timeCap+' min':'Open'):isForTime?(timeCap?timeCap+' min':'Fri tid'):minutes+' min'}</span></div>
    {isStationCircuit&&<div className="wod-live-station-meta">{stationCount} stasjonar · {stationRounds} rundar</div>}
    <ol className="wod-live-exercises">{selected.map((ex,i)=><li key={ex.key}><span className="wod-live-number">{i+1}</span><div><strong>{ex.name}</strong>{ex.is_complex&&<small className="wod-complex-sequence">{formatComplexSequence(ex.complex_steps)}</small>}<small>{ex.is_rest?`Pause · ${Number(ex.pauseSeconds)||30} sek`:isStationCircuit?(ex.repsMode==='amrap'?'AMRAP':(doseForItem(ex).reps||ex.reps||'Reps ikkje sett')+' reps'):showSets?ex.sets.length+' sett':isRow(ex)?(ex.rowValue||'Dosering manglar')+' '+ex.rowUnit:(doseForItem(ex).reps||ex.reps||'Dosering manglar')+' reps'}</small></div></li>)}</ol>
    {!selected.length&&<p className="wod-live-empty">Vel øvingar i biblioteket. Dei kjem opp her i rett rekkjefølgje.</p>}
    <div className="wod-live-footer"><span>Stimulus</span><p>{stimulus}</p></div>
   </aside>
  </div></div>}
 </div>
}
