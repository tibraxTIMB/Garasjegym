// Reviewed planning drafts; no direct database insert. Common routine from the
// intro course: 3–5 minutes general work, controlled core/upper-back activation,
// then rehearsal of the main movement. New variants, not a verbatim course copy.
const reps=(name,n,side='',note='')=>({name,reps:n,side,note})
const time=(name,n,note='')=>({name,quantity:{value:n,unit:'s'},note})
const common=[
 reps('Bird dog',6,'both','Rolig, stabilt bekken.'),
 reps('Dead bug',6,'both','Kontrollert korsrygg.'),
 time('ITYW + rygghev',45,'Små kontrollerte rørsler; ikkje jag høgd.'),
 reps('Thread the needle',6,'both','Rolig rotasjon i brystryggen.'),
 reps('Thoracic rotation',5,'both','Lett rotasjon/strekk.')
]
const variants=[
 {name:'Panzer Mobility',target:'Overhead og skulderkontroll',general:'Row',generalFormat:'Row Intervals',specificFormat:'EMOM',specific:[time('Shoulder pass-through',30,'Lett pinne.'),reps('Overhead Squat',6,'','Kosteskaft eller tom stong berre dersom kontrollert.'),reps('Wall slides',8)]},
 {name:'Eisen Knie',target:'Knebøy og bein',general:'Jump rope',generalFormat:'Intervall',specificFormat:'Eigen økt',specific:[reps('Ankle rocks',8,'both'),reps('Air squat',8),reps('Glute bridge',8)]},
 {name:'Stahl Hüfte',target:'Hoftehinge og bakside',general:'Row',generalFormat:'Row Intervals',specificFormat:'EMOM',specific:[reps('Glute bridge',8),reps('Romanian deadlift',6,'','Tom stong / svært lett belastning, kontrollert hinge.'),reps('Air squat',6)]},
 {name:'Liebe Schulter',target:'Press og skulderstabilitet',general:'Jump rope',generalFormat:'Intervall',specificFormat:'Intervall',specific:[reps('Scapular push-ups',8),reps('Push-up',6,'','Skaler til vegg eller benk.'),reps('Strict press',6,'','Lett pinne eller svært lett vekt.')]},
 {name:'Nord Zug',target:'Trekk og grep',general:'Row',generalFormat:'Row Intervals',specificFormat:'Eigen økt',specific:[time('Dead Hang',15,'Assistert ved behov.'),reps('Scapular pull-ups',6),reps('TRX Row',8,'','Lett vinkel.')]},
 {name:'Blitz Herz',target:'Metcon og samspel',general:'Jump rope',generalFormat:'Intervall',specificFormat:'Stasjonssirkel',specific:[time('Row',30,'Rolig roing, byt på maskina.'),reps('Air squat',8),reps('Walking lunge',6,'both','Kontrollert tempo.')]}
]
export const WARMUP_PRESETS=Object.freeze(variants.map(v=>({name:v.name,target:v.target})))
const key=s=>String(s??'').trim().normalize('NFC').toLowerCase()
export function warmupDraft(name,catalog){
 const v=variants.find(v=>v.name===name);if(!v)throw Error('Ukjend oppvarming.')
 const general=v.general==='Row'?time('Row',180,'Rolig, gradvis oppvarming.'):time('Jump rope',30,'Lett tauhopping, gå på staden ved behov.')
 const groups=[['a',[general]],['b',common],['c',v.specific]]
 const items=groups.flatMap(([id,rows])=>rows.map((r,i)=>{
  const hits=catalog.filter(e=>e.is_active===true&&key(e.name)===key(r.name))
  if(hits.length!==1)throw Error('Oppvarming krev eintydig aktiv øving: '+r.name)
  return {exercise:hits[0],block_id:id,warmup_phase:id==='c'?'movement_rehearsal':'specific_prep',reps:r.reps??'',quantity:r.quantity,sideMode:r.side,coachNote:r.note,minuteSlot:id==='c'&&v.specificFormat==='EMOM'?String(i+1):''}
 }))
 const prep={id:'a',title:'Felles oppvarming · temperatur',format:v.generalFormat,minutes:4,rounds:v.general==='Row'?1:6,workSeconds:v.general==='Row'?180:30,restSeconds:v.general==='Row'?0:15,transitionMode:'manual',transitionSeconds:0,flowPurpose:'prep',flowReporting:'done',scoreMode:'none'}
 const core={id:'b',title:'Felles oppvarming · aktivering',format:'Eigen økt',minutes:5,rounds:1,transitionMode:'manual',transitionSeconds:0,flowPurpose:'prep',flowReporting:'done',scoreMode:'none'}
 const skill={id:'c',title:'Fri teknisk innøving · '+v.target,format:v.specificFormat,minutes:3,emomIntervalSeconds:60,rounds:1,workSeconds:30,restSeconds:15,transitionMode:'manual',transitionSeconds:0,flowPurpose:'build',flowReporting:'done',scoreMode:'none'}
 return {warmupPreset:true,name:v.name,format:'Samansett økt',minutes:12,blocks:[prep,core,skill],items,stimulus:v.target+' · låg intensitet, kontrollert teknikk',notes:'Fellesdelen: 1–2 rolege rundar etter temperaturdelen. Ved samspel: del utstyr og byt på romaskina, ingen konkurranse om fart. Kvar deltakar vel lett variant. Teknisk del: auk gradvis berre ved god kontroll. Berre utført; inga personleg rekord.'}
}
