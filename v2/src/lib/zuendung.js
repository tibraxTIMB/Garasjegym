import {activeRecoveryConfig,qualityRowConfig} from './samspel.js'
const e=(name,reps='',seconds=0,side='',note='')=>({name,reps:String(reps),seconds,side,note})
export const ZUENDUNG_CORE=Object.freeze([
 e('Bird dog',6,0,'both'),e('Dead bug',6,0,'both'),e('ITYW','',30,'','Kontrollerte små rørsler i mageleie.'),e('Rygghev','',15,'','ITYW og rygghev totalt 45 sekund.'),e('Thread the Needle',6,0,'both'),e('Thoracic rotation',6,0,'both')
])
export const ZUENDUNG_PRESETS=Object.freeze([
 {id:'panzerbein',name:'Panzerbein',focus:'Knebøy · lår · sete · anklar',pulse:'rope',format:'EMOM',minutes:4,interval:60,specific:[e('Ankle rocks',8,0,'both'),e('Air Squat',8),e('Walking Lunge',6),e('Goblet squat',6,0,'','Lett vekt')]},
 {id:'eisenkette',name:'Eisenkette',focus:'Markløft · bakside · sete',pulse:'row',format:'Intervall',minutes:4,work:40,rest:20,specific:[e('Glute bridge',8),e('Bird dog',4,0,'both'),e('Romanian Deadlift',5,0,'','Lett vekt'),e('Deadlift',5,0,'','Lett teknikkvekt')]},
 {id:'brustwerk',name:'Brustwerk',focus:'Bryst · triceps · skuldrer',pulse:'rope-step',format:'Eigen økt',minutes:4,specific:[e('Band pull-apart',12),e('Scapular retraction',10),e('Band external rotation',8,0,'both'),e('Push-up',6,0,'','Eventuelt mot benk'),e('Bench Press',5,0,'','Lett teknikkvekt')]},
 {id:'rueckenstahl',name:'Rückenstahl',focus:'Rygg · grep · skulderblad',pulse:'row',format:'Stasjonssirkel',minutes:6,work:30,rest:15,rounds:2,specific:[e('Band pull-apart',10),e('Dumbbell row',5,0,'both','Lett vekt'),e('Ring row',6),e('Farmer Carry','',30,'','Lett vekt')]},
 {id:'himmelstuermer',name:'Himmelstürmer',focus:'Over hovudet · olympiske løft',pulse:'metcon',format:'EMOM',minutes:6,interval:120,specific:[e('Shoulder pass-through',8),e('Band external rotation',8,0,'both'),e('Strict press',5,0,'','Lett vekt'),e('Front Squat',5,0,'','Lett vekt'),e('Power Clean',5,0,'','Lett teknikk; tilpass dagens løft')],slots:['1','1','2','2','3']},
 {id:'drehkraft',name:'Drehkraft',focus:'Kjerne · rotasjon · hofter',pulse:'row-rope',format:'Eigen økt',minutes:5,specific:[e('Pilates Saw',6,0,'both'),e('Pilates Shoulder Bridge',6),e('Thoracic rotation',6,0,'both'),e('Side plank','',20,'both'),e('Dumbbell Reverse Lunge',6,0,'alternating','Utan eller med svært lett vekt')]}
])
const key=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9æøå]+/g,' ')
const pulse={rope:[e('Single Under',30),e('Air Squat',8),e('Walking Lunge',6)],row:[e('Row','',180)],'rope-step':[e('Single Under','',30),e('Box Step-up',8),e('Single Under','',30)],metcon:[e('Single Under',25),e('Air Squat',6),e('Burpee',3,0,'','Steg roleg bakover og fram; ingen hoppkrav')],'row-rope':[e('Row','',45),e('Single Under','',45),e('Row','',45)]}
const cues=new Set(['ityw','rygghev','thread the needle'])
export function buildZuendung(id,mode,catalogue=[],makeId=()=>crypto.randomUUID()){
 const preset=ZUENDUNG_PRESETS.find(p=>p.id===id)
 if(!preset||!['individual','partner'].includes(mode))throw Error('Vel oppvarmingsmal og gjennomføringsmåte.')
 const partner=mode==='partner',rowPartner=partner&&['row','row-rope'].includes(preset.pulse)
 const prefix=makeId(),blocks=[],items=[],unlinked=[]
 const add=(suffix,title,format,minutes,moves,options={})=>{
  const block={id:prefix+'-'+suffix,title,format,minutes,flowPurpose:'prep',flowReporting:'done',scoreMode:'none',transitionMode:'manual',transitionSeconds:0,warmup_group:prefix,warmup_template:id,warmup_mode:mode,participation:mode,participant_count:partner?2:1,collaboration:partner?'parallel':'solo',...options}
  blocks.push(block)
  for(const [i,move] of moves.entries()){
   const matches=catalogue.filter(x=>x.is_active!==false&&key(x.name)===key(move.name))
   if(matches.length>1)throw Error('Fleire katalogtreff for '+move.name+'. Rydd i biblioteket først.')
   if(!matches.length&&!cues.has(key(move.name)))throw Error('Øvinga «'+move.name+'» manglar i øvingsbiblioteket.')
   if(!matches.length)unlinked.push(move.name)
   items.push({exercise:matches[0]||{id:null,name:move.name,category:'Mobilitet',equipment:'Kroppsvekt',body_area:'Fullkropp'},blockId:block.id,phase:suffix==='specific'?'movement_rehearsal':'specific_prep',move:{...move,minuteSlot:options.slots?.[i]||''},unlinked:!matches.length})
  }
 }
 if(rowPartner)add('pulse','Puls · veksle roing','Eigen økt',4,preset.pulse==='row-rope'?[e('Single Under','',30,'','Roleg hoppetau eller marsj; byt med roaren etter 2 min')]:[e('Air Squat',6,0,'','Roleg marsj mellom knebøy; byt med roaren etter 2 min')],{samspel:qualityRowConfig(4)})
 else if(preset.pulse==='row')add('pulse','Puls · roing','Intervall',3,pulse.row,{workSeconds:180,restSeconds:0,rounds:1})
 else if(preset.pulse==='row-rope')add('pulse','Puls · roing og hoppetau','Intervall',3,pulse[preset.pulse],{workSeconds:45,restSeconds:15,rounds:1,includeFinalRest:true})
 else if(preset.pulse==='rope-step')add('pulse','Puls · hoppetau og step-up','EMOM',3,pulse[preset.pulse],{emomIntervalSeconds:60,slots:['1','2','3']})
 else add('pulse','Puls · lett metcon','Eigen økt',4,pulse[preset.pulse],{prep_countdown:true,instructions:'Rolege rundar i 4 min. Ingen konkurranse.'})
 add('core','Felles mobilitet og aktivering','Eigen økt',5,ZUENDUNG_CORE,{prep_countdown:true,...(partner?{samspel:activeRecoveryConfig(5,2)}:{})})
 const opts={...(preset.interval?{emomIntervalSeconds:preset.interval,slots:preset.slots||preset.specific.map((_,i)=>String(i+1))}:{}),...(preset.work?{workSeconds:preset.work,restSeconds:preset.rest,rounds:preset.rounds||1,includeFinalRest:preset.format==='Intervall'}:{}),...(preset.format==='Eigen økt'?{prep_countdown:true}:{}),instructions:partner?'Felles klokke. Del utstyret og byt ved behov; alle vel eiga lett belastning.':'Kontrollert tempo. Vel eiga lett belastning.'}
 add('specific','Muskelspesifikk · '+preset.focus,preset.format,preset.minutes,preset.specific,opts)
 return {preset,blocks,items,unlinked:[...new Set(unlinked)]}
}
export function compositePartLabel(blocks,index){
 const b=blocks[index]
 if(b?.warmup_group)return '0.'+(blocks.slice(0,index).filter(x=>x.warmup_group===b.warmup_group).length+1)
 return String.fromCharCode(65+blocks.slice(0,index).filter(x=>!x.warmup_group).length)
}
