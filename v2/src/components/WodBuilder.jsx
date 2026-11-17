import {useEffect,useMemo,useState} from 'react'
import {Plus,Search,Trash2,ArrowUp,ArrowDown,Save,LoaderCircle,WandSparkles,Dices,Info,Footprints,Copy} from 'lucide-react'
import {supabase} from '../lib/supabase.js'

const categories=['Alle','Styrke','Mobilitet','Kondisjon','Kjerne','Golf','Rehab']
const areas=['Alle område','Fullkropp','Bein','Mage','Rygg','Overkropp']
const formats=[
 {group:'Metcon',items:['AMRAP','For Time','Chipper','Couplet','Triplet','Ladder','Death By']},
 {group:'Gruppetime',items:['Stasjonssirkel']},
 {group:'Tidsstyrt',items:['E1MOM','E2MOM','E3MOM']},
 {group:'Intervall',items:['Intervall','Tabata','Row Intervals']},
 {group:'Styrke',items:['Strength','Pyramid','Superset','Complex']},
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
const nameAdjectives=['Brutale','Wilde','Geile','Scharfe','Eiserne','Explosive','Böse','Dreckige','Donnernde','Panzerstarke','Stählerne','Brachiale','Knallharte','Furchtlose','Massive','Giftige','Hungrige','Brennende','Wuchtige','Legendäre','Gnadenlose','Kraftvolle','Kompromisslose']
const nameNouns=['Panzer','Granate','Berserker','Keule','Kampfsau','Eber','Bär','Wolf','Gorilla','Mammut','Kobra','Hammer','Amboss','Donnerfaust','Stahlkoloss','Kraftpaket','Schlachtschiff','Sprengkopf','Dampfwalze','Kommandant','Knochenbrecher','Rammbock','Stahlfaust','Kampfhamster','Muskelmonster']
const nameNumbers=['1942','1939','69']
const randomWodName=()=>{
 const base=nameAdjectives[Math.floor(Math.random()*nameAdjectives.length)]+' '+nameNouns[Math.floor(Math.random()*nameNouns.length)]
 if(Math.random()>=0.22)return base
 const n=nameNumbers[Math.floor(Math.random()*nameNumbers.length)]
 return Math.random()<0.5?n+' '+base:base+' '+n
}
const shuffle=items=>[...items].sort(()=>Math.random()-.5)
const newSet=()=>({reps:'8',loadMode:'none',loadKg:'',percent1rm:'',rir:'',rpe:'',restSeconds:'120',tempo:''})
const blankItem=ex=>({key:crypto.randomUUID(),...ex,reps:ex.equipment==='Romaskin'?'':'10',rowValue:ex.equipment==='Romaskin'?'500':'',rowUnit:'m',loadMode:'none',loadKg:'',percent1rm:'',rir:'',rpe:'',meters:ex.equipment==='Romaskin'?'500':'',calories:'',workSeconds:'',restSeconds:'',tempo:'',coachNote:'',sets:[newSet()],minuteSlot:'',group:'A'})
const fmtLoad=x=>x.loadMode==='kg'&&x.loadKg?x.loadKg+' kg':x.loadMode==='percent'&&x.percent1rm?x.percent1rm+' % 1RM':x.loadMode==='rir'&&x.rir!==''?'RIR '+x.rir:x.loadMode==='rpe'&&x.rpe!==''?'RPE '+x.rpe:x.loadMode==='bodyweight'?'Kroppsvekt / assistanse':''
const strengthFormats=['Strength','Pyramid','Superset','Complex']
const strengthLike=f=>strengthFormats.includes(f)
const intervalFormats=['Intervall','Tabata','Row Intervals']
const timedFormats=['EMOM','E1MOM','E2MOM','E3MOM']
const timedEvery=f=>f==='E2MOM'?2:f==='E3MOM'?3:1
const timedLabel=f=>timedEvery(f)===1?'kvart minutt':`kvart ${timedEvery(f)}. minutt`
const isRow=x=>x.equipment==='Romaskin'
const categoryTone=value=>{const v=(value||'').toLowerCase();return v.includes('kond')||v.includes('cardio')?'conditioning':v.includes('kjern')||v.includes('core')?'core':v.includes('styr')||v.includes('strength')?'strength':v.includes('mobil')?'mobility':v.includes('golf')?'golf':v.includes('rehab')||v.includes('fysio')?'rehab':'other'}

export default function WodBuilder({assignedClientId=null,onAssigned}){
 const [exercises,setExercises]=useState([]),[search,setSearch]=useState(''),[category,setCategory]=useState('Alle'),[area,setArea]=useState('Alle område')
 const rehabBodyAreas=['hofte','skulder','kne','nakke']
 const isRehabExercise=x=>!!(x.is_rehab||x.category==='Rehab / fysio'||rehabBodyAreas.includes((x.body_area||'').toLowerCase()))
 const [selected,setSelected]=useState([]),[name,setName]=useState(()=>randomWodName()),[format,setFormat]=useState('AMRAP'),[libraryWods,setLibraryWods]=useState([]),[builderMode,setBuilderMode]=useState(assignedClientId?'library':'build'),[librarySearch,setLibrarySearch]=useState(''),[selectedLibraryWod,setSelectedLibraryWod]=useState(''),[classicChoice,setClassicChoice]=useState(''),[publishToMembers,setPublishToMembers]=useState(false)
 const [minutes,setMinutes]=useState('20'),[durationSeconds,setDurationSeconds]=useState('0'),[notes,setNotes]=useState(''),[stimulus,setStimulus]=useState('Jamn intensitet · teknisk kvalitet · kontrollert tempo')
 const [rounds,setRounds]=useState('5'),[workSeconds,setWorkSeconds]=useState('60'),[restSeconds,setRestSeconds]=useState('10'),[timeCap,setTimeCap]=useState('20'),[timeCapSeconds,setTimeCapSeconds]=useState('0'),[stationCount,setStationCount]=useState('8'),[stationWork,setStationWork]=useState('45'),[stationTransition,setStationTransition]=useState('15'),[stationRounds,setStationRounds]=useState('3')
 const [ladderStart,setLadderStart]=useState('2'),[ladderStep,setLadderStep]=useState('2'),[ladderDirection,setLadderDirection]=useState('up')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [prescription,setPrescription]=useState('rx'),[customInstructions,setCustomInstructions]=useState(''),[customUseSets,setCustomUseSets]=useState(false),[combinationMode,setCombinationMode]=useState('For Time')

 useEffect(()=>{load();loadWods()},[])
 async function loadWods(){const {data,error:e}=await supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,timer_settings,created_at,is_published').order('created_at',{ascending:false});if(e)setError(e.message);else setLibraryWods(data||[])}
 async function load(){
  setLoading(true)
  const {data,error:e}=await supabase.from('exercises').select('id,name,category,equipment,video_url,body_area,description,is_rehab').eq('is_active',true).order('name')
  if(e)setError(e.message);else setExercises(data||[])
  setLoading(false)
 }
 const filtered=useMemo(()=>[...exercises,...GOLF_EXERCISES,...REHAB_EXERCISES].filter(x=>{
  const rehab=isRehabExercise(x)
   const matchesCategory=category==='Alle'||(category==='Rehab'?rehab:!rehab&&x.category===category)
  const searchable=[x.name,x.category,x.equipment,x.body_area,x.description].filter(Boolean).join(' ').toLowerCase()
  const matchesSearch=!search||searchable.includes(search.toLowerCase())
  const tags=(x.body_area||'').toLowerCase(),needle=area==='Mage'?'kjerne':area.toLowerCase()
  return matchesCategory&&matchesSearch&&(category==='Rehab'||area==='Alle område'||tags.includes(needle))
 }),[exercises,category,area,search])
 const showSets=strengthLike(format)||(format==='Eigen økt'&&customUseSets)
 const isInterval=intervalFormats.includes(format)
 const isTimed=timedFormats.includes(format)
 const isLadder=['Ladder','Death By'].includes(format)
 const isAmrap=format==='AMRAP'
 const isForTime=['For Time','Chipper'].includes(format)
 const isCoupletTriplet=['Couplet','Triplet'].includes(format)
 const isTabata=format==='Tabata'
 const isRowIntervals=format==='Row Intervals'
 const isStationCircuit=format==='Stasjonssirkel'
 const isCustom=format==='Eigen økt'
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
  setSelected(rows);setName(preset.name);setFormat(preset.format==='EMOM'?'E1MOM':preset.format);setMinutes(String(preset.minutes));setDurationSeconds('0');setTimeCap(String(preset.minutes));setTimeCapSeconds('0');setRounds(String(preset.rounds||1));setNotes(preset.notes);setStimulus('Klassisk benchmark WOD · registrer resultat og samanlikn ved seinare gjennomføring.')
  setPrescription('rx');setClassicChoice('');setNotice(preset.name+' er lasta inn. Kontroller øvingar, RX-belastning og skalering før publisering.');setError('')
 }
 function add(ex){if(isStationCircuit&&selected.length>=Number(stationCount)){setError(`Du har valt ${stationCount} stasjonar. Fjern ei øving eller auk talet på stasjonar før du legg til fleire.`);return}setError('');setSelected(rows=>[...rows,blankItem(ex)])}
 function updateItem(key,patch){setSelected(rows=>rows.map(x=>x.key===key?{...x,...patch}:x))}
 function updateSet(key,index,patch){setSelected(rows=>rows.map(x=>x.key===key?{...x,sets:x.sets.map((s,i)=>i===index?{...s,...patch}:s)}:x))}
 function move(i,dir){setSelected(rows=>{const next=[...rows],j=i+dir;if(j<0||j>=next.length)return rows;[next[i],next[j]]=[next[j],next[i]];return next})}
 function generateRowingIntervals(){
  const row=exercises.find(x=>x.equipment==='Romaskin')
  if(!row){setError('Romaskinøvinga manglar i biblioteket.');return}
  const item={...blankItem(row),rowValue:'500',rowUnit:'m',reps:'',restSeconds:'60'}
  setSelected([item]);setFormat('Row Intervals');setName('Romaskinintervall');setMinutes('20');setDurationSeconds('0');setWorkSeconds('60');setRestSeconds('60');setRounds('6');setTimeCap('20');setNotice('Romaskinintervall er klart. Tilpass drag, pause og tal rundar.');setError('')
 }
 function randomWod(){
  const pool=exercises.filter(x=>!x.is_rehab&&x.category!=='Rehab / fysio')
  if(!pool.length)return
  const chosen=shuffle(pool).slice(0,3+Math.floor(Math.random()*4))
  setSelected(chosen.map(blankItem));setFormat(['AMRAP','E1MOM','For Time','Chipper','Intervall'][Math.floor(Math.random()*5)])
  setMinutes(String([10,12,15,18,20][Math.floor(Math.random()*5)]));setDurationSeconds('0');setTimeCap('20');setRounds('5')
  setName(randomWodName());setNotes('');setStimulus('Jamn intensitet · god teknikk · hald att litt kapasitet')
  setNotice('Ny WOD er generert. Kontroller dosering og stimulus før publisering.');setError('')
 }
 function reset(){
  setSelected([]);setNotes('');setCustomInstructions('');setCustomUseSets(false);setCombinationMode('For Time');setStimulus('Jamn intensitet · teknisk kvalitet · kontrollert tempo')
  setName(randomWodName());setError('');setNotice('Økta er forkasta. Du kan byrja på nytt.')
 }
 function buildPrescription(x){
  const load=fmtLoad(x)
  const target=isRow(x)?(x.rowValue?x.rowValue+' '+({s:'sek',min:'min',m:'m',cal:'cal'}[x.rowUnit]||'m'):'ikkje dosert'):x.reps+' reps'
  const loadText=load?' · '+load:''
  const dose=showSets?x.sets.map((s,i)=>(i+1)+': '+s.reps+' reps'+(s.loadMode==='kg'&&s.loadKg?' @ '+s.loadKg+' kg':s.loadMode==='percent'&&s.percent1rm?' @ '+s.percent1rm+'% 1RM':s.loadMode==='rir'&&s.rir!==''?' · RIR '+s.rir:s.loadMode==='rpe'&&s.rpe!==''?' · RPE '+s.rpe:'')+(s.restSeconds?' · pause '+s.restSeconds+'s':'')).join(' | '):target+loadText
  return x.name+' – '+dose+(x.tempo?' · tempo '+x.tempo:'')+(x.coachNote?' · '+x.coachNote:'')
 }
 async function assignLibraryWod(){
  const wod=libraryWods.find(x=>x.id===selectedLibraryWod)
  if(!wod||!assignedClientId)return
  setBusy(true);setError('');setNotice('')
  try{
   const {data:{user}}=await supabase.auth.getUser()
   if(!user)throw new Error('Logg inn på nytt.')
   const {error:e}=await supabase.from('pt_wod_assignments').insert({member_id:assignedClientId,wod_id:wod.id,assigned_by:user.id,location:'Valfritt',coach_note:'Tildelt frå PT Studio'})
   if(e)throw e
   setNotice('Eksisterande WOD er tildelt kunden. Biblioteket er ikkje kopiert eller endra.')
   onAssigned?.()
  }catch(e){setError(e.message||'Kunne ikkje tildela WOD.')}finally{setBusy(false)}
 }
 async function save(event){
  event.preventDefault();setError('');setNotice('')
  if(!selected.length){setError('Legg minst ei øving til WOD-en.');return}
  if(format==='Couplet'&&selected.length!==2){setError('Couplet skal ha nøyaktig to øvingar.');return}
  if(format==='Triplet'&&selected.length!==3){setError('Triplet skal ha nøyaktig tre øvingar.');return}
  if(!name.trim()){setError('Gi WOD-en eit namn.');return}
  if(showSets&&selected.some(x=>!x.sets.length||x.sets.some(s=>!s.reps||Number(s.reps)<1))){setError('Alle styrkesett må ha minst éi repetisjon.');return}
  if(!showSets&&selected.some(x=>isRow(x)?(!x.rowValue||Number(x.rowValue)<=0):!x.reps)){setError('Alle øvingar må ha reps, distanse, kalorier eller arbeidstid.');return}
  if(isStationCircuit&&(Number(stationCount)<2||Number(stationCount)>8||selected.length!==Number(stationCount))){setError(`Stasjonssirkel krev ${stationCount} øvingar – éi per stasjon. Vel mellom 2 og 8 stasjonar.`);return}
  if(isStationCircuit&&(!Number(stationWork)||Number(stationWork)<1||Number(stationTransition)<0||!Number(stationRounds))){setError('Kontroller arbeidstid, bytettid og tal rundar.');return}
  if(isInterval&&(!Number(rounds)||!Number(workSeconds))){setError('Intervall krev arbeidstid og tal drag.');return}
  if(isTabata&&Number(workSeconds)+Number(restSeconds)<=0){setError('Kontroller arbeid og pause i Tabata.');return}
  setBusy(true)
  try{
   const {data:{user}}=await supabase.auth.getUser()
   if(!user)throw new Error('Du må vera innlogga for å publisera WOD.')
   const schema={
    version:3,format,structure:isStationCircuit?'station_circuit':showSets?'strength':isTimed?'interval_clock':isInterval?'interval':isAmrap||isForTime||isLadder?'metcon':'custom',
    duration_minutes:Math.ceil(((Number(minutes)||0)*60+(Number(durationSeconds)||0))/60)||null,time_cap_minutes:isAmrap||isForTime||(isCoupletTriplet&&combinationMode!=='Open')?Number(timeCap)||null:null,time_cap_seconds:isAmrap||isForTime||(isCoupletTriplet&&combinationMode!=='Open')?(Number(timeCap)||0)*60+(Number(timeCapSeconds)||0):null,combination_mode:isCoupletTriplet?combinationMode:null,
    rounds:isStationCircuit?Number(stationRounds):isInterval||isLadder||isForTime?Number(rounds)||null:null,
    station_circuit:isStationCircuit?{rotation:'all_rotate_together',station_count:Number(stationCount),work_seconds:Number(stationWork),transition_seconds:Number(stationTransition),rounds:Number(stationRounds),stations:selected.map((x,i)=>({station_number:i+1,exercise_name:x.name,reps:x.reps,load_mode:x.loadMode,load_kg:x.loadKg?Number(x.loadKg):null,load_label:fmtLoad(x),equipment:x.equipment||null,description:x.description||null,coach_note:x.coachNote||null}))}:null,
    duration_seconds:(Number(minutes)||0)*60+(Number(durationSeconds)||0),
    interval:{work_seconds:Number(workSeconds)||null,rest_seconds:Number(restSeconds)||0,work_every_minutes:isTimed?timedEvery(format):null},
    ladder:isLadder?{start:Number(ladderStart),step:Number(ladderStep),direction:ladderDirection}:null,
    stimulus,coach_notes:notes,prescription,
    superset_groups:showSets&&format==='Superset'?Array.from(new Set(selected.map(x=>x.group))):[],
    complex_order:showSets&&format==='Complex'?selected.map(x=>x.name):[],
    items:selected.map((x,i)=>({
     sort_order:i+1,exercise_id:x.is_golf?null:(x.id||null),exercise_name:x.name,category:isRehabExercise(x)?'Rehab':x.category,body_area:x.body_area,equipment:x.equipment,golf_focus:x.golf_focus||null,
     sets:showSets?x.sets.map(s=>({reps:Number(s.reps),load_mode:s.loadMode,load_kg:s.loadKg?Number(s.loadKg):null,percent_1rm:s.percent1rm?Number(s.percent1rm):null,rir:s.rir!==''?Number(s.rir):null,rpe:s.rpe!==''?Number(s.rpe):null,rest_seconds:Number(s.restSeconds)||0,tempo:s.tempo||null})):null,
     reps:showSets?null:x.reps,load_mode:showSets?null:x.loadMode,load_kg:x.loadKg?Number(x.loadKg):null,percent_1rm:x.percent1rm?Number(x.percent1rm):null,rir:x.rir!==''?Number(x.rir):null,rpe:x.rpe!==''?Number(x.rpe):null,
     row_value:isRow(x)?Number(x.rowValue):null,row_unit:isRow(x)?x.rowUnit:null,meters:isRow(x)&&x.rowUnit==='m'?Number(x.rowValue):null,calories:isRow(x)&&x.rowUnit==='cal'?Number(x.rowValue):null,work_seconds:isRow(x)&&x.rowUnit==='s'?Number(x.rowValue):null,
     rest_seconds:showSets?null:Number(x.restSeconds)||null,tempo:x.tempo||null,coach_note:x.coachNote||null,
     minute_slot:x.minuteSlot||null,superset_group:x.group||'A'
    }))
   }
   const movements=selected.map((x,i)=>(i+1)+'. '+buildPrescription(x)).join('\n')
   const stationSlots=Number(stationRounds)*Number(stationCount)
   const stationDuration=isStationCircuit?(stationSlots*Number(stationWork)+(stationSlots-1)*Number(stationTransition)):schema.duration_seconds
   schema.duration_seconds=stationDuration\n   const timer_settings={workout_schema:schema,work_seconds:isStationCircuit?Number(stationWork):Number(workSeconds)||null,rest_seconds:isStationCircuit?Number(stationTransition):Number(restSeconds)||null,rounds:isStationCircuit?Number(stationRounds):Number(rounds)||null,duration_seconds:stationDuration}
   const {data:savedWod,error:e}=await supabase.from('wods').insert({name:name.trim(),format,duration_minutes:Math.ceil(stationDuration/60)||null,movements,notes:[stimulus,notes,customInstructions].filter(Boolean).join('\n\n'),is_published:publishToMembers,created_by:user.id,timer_settings}).select('id').single()
   if(e)throw e
   if(assignedClientId){const {error:linkError}=await supabase.from('pt_wod_assignments').insert({member_id:assignedClientId,wod_id:savedWod.id,assigned_by:user.id,location:'Valfritt',coach_note:'Tildelt frå PT Studio'});if(linkError)throw new Error('WOD-en vart lagra, men kunne ikkje knytast til kunden: '+linkError.message);onAssigned?.()}
   setNotice(publishToMembers?'WOD lagra i biblioteket og publisert for medlemmene.':'WOD lagra i det interne PT-biblioteket.')
   setSelected([]);setNotes('');setCustomInstructions('');setName(randomWodName())
  }catch(e){setError(e.message||'Kunne ikkje lagra WOD.')}finally{setBusy(false)}
 }
 return <div className="wod-builder">
  <div className="training-heading"><div><div className="section-kicker">GARASJEGYM · PROGRAMMERINGSVERKSTAD</div><h3>WOD-studio PRO</h3><p>Programmer styrke, metcon og intervall med formattilpassa dosering.</p></div><span className="count-pill"><WandSparkles size={14}/> PRO</span></div>
  {error&&<div className="auth-error">{error}</div>}{notice&&<div className="auth-message">{notice}</div>}
  {assignedClientId&&<div className="pt-wod-mode-switch"><button type="button" className={builderMode==='library'?'selected':''} onClick={()=>setBuilderMode('library')}>Finn WOD i biblioteket</button><button type="button" className={builderMode==='build'?'selected':''} onClick={()=>setBuilderMode('build')}>Bygg ny WOD</button></div>}
  {assignedClientId&&builderMode==='library'?<section className="pt-wod-library-panel"><div className="engine-section-title"><div><h4>Vel frå WOD-biblioteket</h4><p>Bruk same publiserte WOD på fleire kundar utan å laga kopiar.</p></div><span>{libraryWods.length} WOD-ar</span></div><div className="wod-search"><Search size={16}/><input value={librarySearch} onChange={e=>setLibrarySearch(e.target.value)} placeholder="Søk etter namn eller format …"/></div><div className="pt-wod-library-list">{libraryWods.filter(w=>(w.name+' '+w.format).toLowerCase().includes(librarySearch.toLowerCase())).map(w=><button type="button" key={w.id} className={selectedLibraryWod===w.id?'selected':''} onClick={()=>setSelectedLibraryWod(w.id)}><span><strong>{w.name}</strong><small>{w.format} · {w.duration_minutes||'–'} min · {w.movements?.split('\n').filter(Boolean).length||0} øvingar</small></span><span>{selectedLibraryWod===w.id?'Vald':'Vel'}</span></button>)}</div><button type="button" className="primary-button" disabled={!selectedLibraryWod||busy} onClick={assignLibraryWod}><Plus size={15}/>{busy?'Tildeler …':'Tildel vald WOD til kunden'}</button></section>:<div className="pt-wod-builder-form">
  <section className="wod-classic-picker"><div className="wod-classic-copy"><span className="wod-classic-kicker">BENCHMARK COLLECTION</span><strong>Klassiske WOD-ar</strong><small>The Girls · Hero WODs · originaloppsett</small></div><div className="wod-classic-controls"><select className="wod-classic-select" value={classicChoice} onChange={e=>setClassicChoice(e.target.value)}><option value="">Vel ei klassisk økt …</option><optgroup label="The Girls">{CLASSIC_WODS.filter(x=>x.group==='The Girls').map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</optgroup><optgroup label="Hero WODs">{CLASSIC_WODS.filter(x=>x.group==='Hero WODs').map(x=><option key={x.name} value={x.name}>{x.name}</option>)}</optgroup></select><button type="button" className="secondary-button" disabled={!classicChoice} onClick={loadClassicWod}>Last inn</button></div></section>
  <div className="wod-studio-tools"><button type="button" className="primary-button" onClick={randomWod}><Dices size={17}/> Generer tilfeldig WOD</button><button type="button" className="secondary-button" onClick={generateRowingIntervals}><Footprints size={16}/> Generer romaskinintervall</button><button type="button" className="secondary-button" onClick={reset}><Trash2 size={15}/> Forkast økt</button></div>
  <div className="wod-builder-layout">
   <section className="engine-section wod-library"><div className="engine-section-title"><h4>Øvingsbibliotek</h4><span>{filtered.length} av {exercises.length}</span></div>
    <div className="wod-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Søk øving, kroppsdel eller utstyr …"/></div>
    <div className="wod-category-filter">{categories.map(x=><button type="button" key={x} className={category===x?'selected':''} onClick={()=>{setCategory(x);if(x==='Rehab')setArea('Alle område')}}>{x}</button>)}</div>
    {category!=='Rehab'&&<div className="wod-area-filter"><span>KROPPSOMRÅDE</span>{areas.map(x=><button type="button" key={x} className={area===x?'selected':''} onClick={()=>setArea(x)}>{x}</button>)}</div>}
    {loading?<div className="training-state"><LoaderCircle className="spin"/> Hentar øvingar …</div>:filtered.length?<div className="wod-exercise-grid">{filtered.map(ex=><article className={"wod-exercise-card wod-category-"+categoryTone(ex.category)} key={ex.id}><div className="wod-exercise-info"><strong>{ex.name}</strong>{ex.video_url?<a href={ex.video_url} target="_blank" rel="noreferrer">Sjå video</a>:<small className="no-video">Video kjem</small>}<small>{isRehabExercise(ex)?'Rehab':ex.category}{ex.golf_focus?' · '+ex.golf_focus:''} · {ex.body_area||'Fullkropp'}{ex.equipment?' · '+ex.equipment:''}</small>{ex.description&&<p className={isRehabExercise(ex)?'wod-rehab-description':''}>{ex.description}</p>}{isRehabExercise(ex)&&<em><Info size={12}/> Tilpass etter toleranse – ved skade eller vedvarande smerte, få råd frå fysioterapeut</em>}</div><button className="wod-add-button" type="button" onClick={()=>add(ex)}><Plus size={16}/> Legg til</button></article>)}</div>:<div className="empty-state">Ingen øvingar treff søket.</div>}
   </section>
   <aside className="engine-section wod-composer">
    <div className="engine-section-title"><h4>Programmer økta</h4><span>{selected.length} øvingar</span></div>
    <form className="admin-create-form" onSubmit={save}>
     <div className="wod-name-field"><label>WOD-namn<input value={name} onChange={e=>setName(e.target.value)} required/></label><button type="button" className="secondary-button" onClick={()=>setName(randomWodName())}>Nytt namn</button></div><label className="wod-publish-toggle"><input type="checkbox" checked={publishToMembers} onChange={e=>setPublishToMembers(e.target.checked)}/> Publiser for medlemmer</label>
     <label>Programmeringsnivå<select value={prescription} onChange={e=>setPrescription(e.target.value)}><option value="rx">RX · Føreskriven</option><option value="scaled">Skalert</option><option value="beginner">Nybegynnar</option><option value="custom">Individuelt tilpassa</option></select></label>
     <div className="engine-fields"><label>Format<select value={format} onChange={e=>{const next=e.target.value;setFormat(next);if(next==='Tabata'){setWorkSeconds('20');setRestSeconds('10');setRounds('8')}else if(format==='Tabata'){setWorkSeconds('60');setRestSeconds('10');setRounds('5')}}}>{formats.map(group=><optgroup key={group.group} label={group.group}>{group.items.map(x=><option key={x} value={x}>{x}</option>)}</optgroup>)}</select></label>{!isTimed&&<><label>Varigheit (min)<input type="number" min="1" max="600" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><label>Ekstra sekund<input type="number" min="0" max="59" value={durationSeconds} onChange={e=>setDurationSeconds(e.target.value)}/></label></>}</div>
     {isStationCircuit&&<div className="wod-advanced-fields station-circuit-settings"><label>Tal stasjonar<select value={stationCount} onChange={e=>{const count=Number(e.target.value);setStationCount(String(count));setSelected(current=>current.slice(0,count))}}>{[2,3,4,5,6,7,8].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>Arbeid per stasjon (sek.)<input type="number" min="1" value={stationWork} onChange={e=>setStationWork(e.target.value)}/></label><label>Bytetid (sek.)<input type="number" min="0" value={stationTransition} onChange={e=>setStationTransition(e.target.value)}/></label><label>Tal rundar<input type="number" min="1" max="20" value={stationRounds} onChange={e=>setStationRounds(e.target.value)}/></label><p className="wod-help">Vel 2–8 stasjonar og legg inn éi øving per stasjon i rett rekkjefølgje. Alle grupper startar på kvar si stasjon og roterer samtidig. Total tid blir rekna automatisk.</p></div>}\n     {isTimed&&<div className="wod-advanced-fields"><label>Varigheit (min)<input type="number" min="1" max="600" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><label>Ekstra sekund<input type="number" min="0" max="59" value={durationSeconds} onChange={e=>setDurationSeconds(e.target.value)}/></label><p className="wod-help">Arbeidet startar {timedLabel(format)}. Reps-feltet på kvar øving er målet per arbeidsintervall.</p></div>}
     {isInterval&&<div className="wod-advanced-fields"><label>Arbeid (sek.)<input type="number" min="1" value={workSeconds} onChange={e=>setWorkSeconds(e.target.value)}/></label><label>Pause (sek.)<input type="number" min="0" value={restSeconds} onChange={e=>setRestSeconds(e.target.value)}/></label><label>Tal drag<input type="number" min="1" value={rounds} onChange={e=>setRounds(e.target.value)}/></label></div>}
     {isLadder&&<div className="wod-advanced-fields"><label>Startreps<input type="number" min="1" value={ladderStart} onChange={e=>setLadderStart(e.target.value)}/></label><label>Endring per runde<input type="number" min="1" value={ladderStep} onChange={e=>setLadderStep(e.target.value)}/></label><label>Retning<select value={ladderDirection} onChange={e=>setLadderDirection(e.target.value)}><option value="up">Aukande</option><option value="down">Minkande</option></select></label></div>}
     {isAmrap&&<div className="wod-advanced-fields"><label>Tidsgrense (min)<input type="number" min="1" max="600" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label><label>Ekstra sekund<input type="number" min="0" max="59" value={timeCapSeconds} onChange={e=>setTimeCapSeconds(e.target.value)}/></label><p className="wod-help">Resultatet blir rundar + ekstra repetisjonar.</p></div>}
     {isForTime&&<div className="wod-advanced-fields"><label>{format==='Chipper'?'Tidsgrense (valfri, min)':'Maks tid (min)'}<input type="number" min="1" max="600" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label><label>Ekstra sekund<input type="number" min="0" max="59" value={timeCapSeconds} onChange={e=>setTimeCapSeconds(e.target.value)}/></label>{format!=='Chipper'&&<label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(e.target.value)}/></label>}</div>}
     {isCoupletTriplet&&<div className="wod-advanced-fields"><label>Tidsstruktur<select value={combinationMode} onChange={e=>setCombinationMode(e.target.value)}><option value="For Time">For Time</option><option value="AMRAP">AMRAP</option><option value="Open">Open / utan klokke</option></select></label>{combinationMode!=='Open'&&<label>Tidsgrense (min)<input type="number" min="1" max="300" value={timeCap} onChange={e=>setTimeCap(e.target.value)}/></label>}<p className="wod-help">Couplet krev to øvingar, Triplet krev tre. Tidsstrukturen bestemmer korleis dei skal gjennomførast.</p></div>}
     {isTabata&&<p className="wod-help">Standard Tabata er 20 sek arbeid / 10 sek pause × 8 rundar. Arbeid, pause og tal drag kan tilpassast.</p>}
     {format==='Superset'&&<p className="wod-help">Gruppér øvingar med same bokstav. Utfør gruppa etter kvarandre, kvil etterpå.</p>}
     {format==='Complex'&&<p className="wod-help">Utfør øvingane i oppgitt rekkjefølgje som eitt kompleks, normalt utan å setja frå deg vekta.</p>}
     {format==='Pyramid'&&<p className="wod-help">Programmer kvart sett individuelt for stigande eller fallande reps/belastning.</p>}
     {isCustom&&<><label className="wod-custom-sets"><input type="checkbox" checked={customUseSets} onChange={e=>setCustomUseSets(e.target.checked)}/> Bruk sett-programmering på øvingane</label><label>Fri struktur / instruksjon<textarea rows="3" value={customInstructions} onChange={e=>setCustomInstructions(e.target.value)} placeholder="Beskriv struktur, sett, rundar, pausar og gjennomføring …"/></label></>}
     <div className="wod-selected-list">{selected.length?selected.map((ex,i)=><article className={"wod-selected-card wod-category-"+categoryTone(ex.category)} key={ex.key}><span className={"wod-order wod-order-"+categoryTone(ex.category)}>{i+1}</span><div className="wod-selected-info"><strong>{ex.name}</strong><small>{ex.category} · {ex.body_area||'Fullkropp'}{ex.equipment?' · '+ex.equipment:''}</small>{ex.video_url&&<a href={ex.video_url} target="_blank" rel="noreferrer">Video</a>}
      {showSets?<div className="wod-set-editor"><strong>Settprogram</strong>{ex.sets.map((s,si)=><div className="wod-set-row" key={si}><span>Sett {si+1}</span><label>Reps<input type="number" min="1" value={s.reps} onChange={e=>updateSet(ex.key,si,{reps:e.target.value})}/></label><label>Belastning<select value={s.loadMode} onChange={e=>updateSet(ex.key,si,{loadMode:e.target.value})}><option value="none">Ikkje oppgitt</option><option value="kg">Kg</option><option value="percent">% 1RM</option><option value="rir">RIR</option><option value="rpe">RPE</option></select></label>{s.loadMode==='kg'&&<label>Kg<input type="number" step="0.5" value={s.loadKg} onChange={e=>updateSet(ex.key,si,{loadKg:e.target.value})}/></label>}{s.loadMode==='percent'&&<label>% 1RM<input type="number" value={s.percent1rm} onChange={e=>updateSet(ex.key,si,{percent1rm:e.target.value})}/></label>}{s.loadMode==='rir'&&<label>RIR<input type="number" min="0" max="10" value={s.rir} onChange={e=>updateSet(ex.key,si,{rir:e.target.value})}/></label>}{s.loadMode==='rpe'&&<label>RPE<input type="number" min="1" max="10" step="0.5" value={s.rpe} onChange={e=>updateSet(ex.key,si,{rpe:e.target.value})}/></label>}<label>Pause (sek.)<input type="number" min="0" value={s.restSeconds} onChange={e=>updateSet(ex.key,si,{restSeconds:e.target.value})}/></label><button type="button" className="wod-mini-action" onClick={()=>updateItem(ex.key,{sets:ex.sets.filter((_,j)=>j!==si)})} disabled={ex.sets.length===1}>×</button></div>)}<button type="button" className="secondary-button wod-add-set" onClick={()=>updateItem(ex.key,{sets:[...ex.sets,newSet()]})}><Plus size={13}/> Legg til sett</button></div>:<div className="wod-dose-grid"><label>{isRow(ex)?'Dosering':'Reps'}<input type="number" min="1" value={isRow(ex)?ex.rowValue:ex.reps} onChange={e=>updateItem(ex.key,isRow(ex)?{rowValue:e.target.value}:{reps:e.target.value})} placeholder={isRow(ex)?'T.d. 500':'T.d. 10'}/></label><label>Belastning<select value={ex.loadMode} onChange={e=>updateItem(ex.key,{loadMode:e.target.value})}><option value="none">Ikkje oppgitt</option><option value="kg">Fast kg</option><option value="percent">% 1RM</option><option value="bodyweight">Kroppsvekt / assistanse</option></select></label>{ex.loadMode==='kg'&&<label>Kg<input type="number" step="0.5" value={ex.loadKg} onChange={e=>updateItem(ex.key,{loadKg:e.target.value})}/></label>}{ex.loadMode==='percent'&&<label>% av 1RM<input type="number" value={ex.percent1rm} onChange={e=>updateItem(ex.key,{percent1rm:e.target.value})}/></label>}{isTimed&&<label>Minutt / oppgåve<input value={ex.minuteSlot} onChange={e=>updateItem(ex.key,{minuteSlot:e.target.value})} placeholder="T.d. 1, 2 eller 3"/></label>}{format==='Superset'&&<label>Supersett-gruppe<input value={ex.group} onChange={e=>updateItem(ex.key,{group:e.target.value.toUpperCase().slice(0,2)})}/></label>}{isRow(ex)&&<label>Einheit<select value={ex.rowUnit} onChange={e=>updateItem(ex.key,{rowUnit:e.target.value})}><option value="s">Sekund</option><option value="min">Minutt</option><option value="m">Meter</option><option value="cal">Cal</option></select></label>}{isInterval&&!isRow(ex)&&<><label>Meter<input type="number" min="1" value={ex.meters} onChange={e=>updateItem(ex.key,{meters:e.target.value})}/></label><label>Kalorier<input type="number" min="1" value={ex.calories} onChange={e=>updateItem(ex.key,{calories:e.target.value})}/></label><label>Arbeidstid (sek.)<input type="number" min="1" value={ex.workSeconds} onChange={e=>updateItem(ex.key,{workSeconds:e.target.value})}/></label></>}{(format==='Intervall'||format==='Row Intervals')&&<label>Pause etter øving (sek.)<input type="number" min="0" value={ex.restSeconds} onChange={e=>updateItem(ex.key,{restSeconds:e.target.value})}/></label>}</div>}
      <label className="wod-coach-note">Instruksjon for øving<input value={ex.coachNote} onChange={e=>updateItem(ex.key,{coachNote:e.target.value})} placeholder="Teknikk, skalering, mål …"/></label>
      <small className="wod-load-summary">{showSets?ex.sets.length+' sett · '+ex.sets.map(s=>s.reps).join(' / ')+' reps':isRow(ex)?(ex.rowValue||'—')+' '+({s:'sek',min:'min',m:'m',cal:'cal'}[ex.rowUnit]||'m'):ex.reps+(isTimed?' reps '+(ex.minuteSlot?'· minutt '+ex.minuteSlot:'per '+(format==='E2MOM'?'2.':format==='E3MOM'?'3.':'')+' minutt'):' reps')}{fmtLoad(ex)?' · '+fmtLoad(ex):''}</small>
     </div><div className="wod-selected-actions"><button type="button" title="Flytt opp" disabled={!i} onClick={()=>move(i,-1)}><ArrowUp size={14}/></button><button type="button" title="Flytt ned" disabled={i===selected.length-1} onClick={()=>move(i,1)}><ArrowDown size={14}/></button><button type="button" title="Fjern" onClick={()=>setSelected(rows=>rows.filter(x=>x.key!==ex.key))}><Trash2 size={14}/></button></div></article>):<div className="empty-state">Legg til øvingar frå biblioteket.</div>}</div>
     <div className="wod-programming-note"><label>Planlagd treningsstimulus<textarea rows="2" value={stimulus} onChange={e=>setStimulus(e.target.value)}/></label><small>Beskriv kva kunden skal oppleva og kva som er målet med økta.</small></div>
     <label>Coach-notat / skalering<textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="RX, skalering, tekniske krav, oppvarming …"/></label>
     <button className="primary-button" disabled={busy||!selected.length||!name.trim()}><Save size={16}/>{busy?'Lagrar …':'Publiser WOD'}</button>
    </form>
   </aside>
  </div></div>}
 </div>
}
