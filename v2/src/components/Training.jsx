import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clock3, Dumbbell, LoaderCircle, Pause, Play, Plus, RotateCcw, Save, Search, Star, Heart, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { MusicMiniPlayer } from './Music.jsx'

const FORMATS = ['Fri trening', 'E1MOM', 'E2MOM', 'E3MOM', 'E4MOM', 'E5MOM', 'E6MOM', 'E7MOM', 'AMRAP', 'For Time', 'Chipper', 'Couplet', 'Triplet', 'Ladder', 'Death By', 'Tabata', 'Intervall', 'Row Intervals', 'Strength', 'Pyramid', 'Superset', 'Complex', 'Eigen økt', 'Stoppeklokke', 'Nedteljing', 'Tilpassa']
const emptyExercise = () => ({ key: crypto.randomUUID(), exercise_id: '', exercise_name: '', sets: [{ reps: '', load_kg: '', time_text: '', time_seconds: '' }] })
const pad = (n) => String(n).padStart(2, '0')
const clock = (seconds) => `${pad(Math.floor(Math.max(0, seconds) / 60))}:${pad(Math.max(0, seconds) % 60)}`
const doseLabel=(item,level='rx')=>{const d=item?.levels?.[level]||{};const parts=[];if(d.sets)parts.push(d.sets+' sett');if(d.reps)parts.push(d.reps+' reps');if(d.heightCm)parts.push(d.heightCm+' cm');if(d.durationSeconds)parts.push(d.durationSeconds+' sek');if(d.distanceMeters)parts.push(d.distanceMeters+' m');if(d.calories)parts.push(d.calories+' cal');if(d.loadMode==='kg'){const loads=[d.loadKgMen!==''&&d.loadKgMen!=null?'M '+d.loadKgMen+' kg':'',d.loadKgWomen!==''&&d.loadKgWomen!=null?'K '+d.loadKgWomen+' kg':''].filter(Boolean);if(loads.length)parts.push(loads.join(' / '))}else if(d.loadMode==='percent'&&d.percent1rm)parts.push(d.percent1rm+' % 1RM');else if(d.loadMode==='rir'&&d.rir!=='')parts.push('RIR '+d.rir);else if(d.loadMode==='bodyweight')parts.push('Kroppsvekt');if(d.tempo)parts.push('Tempo '+d.tempo);if(d.variant)parts.push('Variant: '+d.variant);if(d.instruction)parts.push(d.instruction);return parts.join(' · ')||''};
const localDateISO = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function TimerPanel({id,title,layout,onMove,onResize,onLock,locked,children,wide=false}){
 return <section className={`timer-layout-panel timer-panel-${id} ${locked?'is-locked':''}`} style={{gridColumn:`span ${layout.span}`,minHeight:layout.height}} draggable={!locked} onDragStart={e=>{e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move'}} onDragOver={e=>{if(!locked)e.preventDefault()}} onDrop={e=>{e.preventDefault();const from=e.dataTransfer.getData('text/plain');if(from&&from!==id)onMove(from,id)}}>
  <header className="timer-panel-toolbar"><span className="timer-panel-grip" aria-hidden="true">⠿</span><b>{title}</b><div className="timer-panel-tools">
   <button type="button" title="Gjer panelet smalare" aria-label="Gjer panelet smalare" disabled={locked||layout.span<=2} onClick={()=>onResize(id,'span',-1)}>−B</button>
   <button type="button" title="Gjer panelet breiare" aria-label="Gjer panelet breiare" disabled={locked||layout.span>=12} onClick={()=>onResize(id,'span',1)}>+B</button>
   <button type="button" title="Gjer panelet lågare" aria-label="Gjer panelet lågare" disabled={locked||layout.height<=120} onClick={()=>onResize(id,'height',-40)}>−H</button>
   <button type="button" title="Gjer panelet høgare" aria-label="Gjer panelet høgare" disabled={locked||layout.height>=900} onClick={()=>onResize(id,'height',40)}>+H</button>
   <button type="button" className={locked?'is-locked':''} onClick={()=>onLock(id)} title={locked?'Lås opp panelet':'Lås panelet'}>{locked?'Låst':'Lås'}</button>
  </div></header>
  <div className="timer-panel-content">{children}</div>
 </section>
}
function Timer({ format, minutes, seconds = 0, activeExercise = '', nextExercise = '', exerciseList = [], timerSettings = null, onSnapshot = () => {}, stop = false, onFinish = () => {}, originLabel = 'EIGA ØKT' }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(1)
  const [workSeconds, setWorkSeconds] = useState(timerSettings?.work_seconds ?? timerSettings?.workout_schema?.interval?.work_seconds ?? (format === 'Tabata' ? 20 : 60))
  const [restSeconds, setRestSeconds] = useState(timerSettings?.rest_seconds ?? timerSettings?.workout_schema?.interval?.rest_seconds ?? (format === 'Tabata' ? 10 : 60))
  const [rounds, setRounds] = useState(timerSettings?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
  const [focused, setFocused] = useState(Boolean(document.fullscreenElement))
  const [hasStarted, setHasStarted] = useState(false)
  const [phase, setPhase] = useState('Klar')
  const [laps, setLaps] = useState([])
  const [soundOn, setSoundOn] = useState(true)
  const [showTimerSettings, setShowTimerSettings] = useState(false)
  const [panelLayout,setPanelLayout]=useState(()=>{
    const defaults={clock:{span:6,height:520},info:{span:3,height:360},laps:{span:3,height:360},music:{span:12,height:90}}
    try{return {...defaults,...JSON.parse(localStorage.getItem('garasjegym.timer.panels')||'{}')}}
    catch{return defaults}
  })
  const [panelOrder,setPanelOrder]=useState(()=>{try{return JSON.parse(localStorage.getItem('garasjegym.timer.panelOrder')||'["clock","info","laps","music"]')}catch{return ['clock','info','laps','music']}})
  const [lockedPanels,setLockedPanels]=useState(()=>{try{return JSON.parse(localStorage.getItem('garasjegym.timer.panelLocks')||'{}')}catch{return {}}})
  useEffect(()=>{try{localStorage.setItem('garasjegym.timer.panels',JSON.stringify(panelLayout));localStorage.setItem('garasjegym.timer.panelOrder',JSON.stringify(panelOrder));localStorage.setItem('garasjegym.timer.panelLocks',JSON.stringify(lockedPanels))}catch{}},[panelLayout,panelOrder,lockedPanels])
  function movePanel(from,to){setPanelOrder(order=>{const next=[...order],a=next.indexOf(from),b=next.indexOf(to);if(a<0||b<0)return order;next.splice(a,1);next.splice(b,0,from);return next})}
  function resizePanel(id,field,delta){setPanelLayout(layout=>({...layout,[id]:{...layout[id],[field]:field==='span'?Math.max(2,Math.min(12,layout[id].span+delta)):Math.max(120,Math.min(900,layout[id].height+delta))}}))}
  function togglePanelLock(id){setLockedPanels(v=>({...v,[id]:!v[id]}))}
  function resetPanelLayout(){setPanelLayout({clock:{span:6,height:520},info:{span:3,height:360},laps:{span:3,height:360},music:{span:12,height:90}});setPanelOrder(['clock','info','laps','music']);setLockedPanels({})}

  const [appearance, setAppearance] = useState(() => {
    try { return { clockSize: 112, accent: '#f0a33a', ...(JSON.parse(localStorage.getItem('garasjegym.timer.appearance') || '{}')) } }
    catch { return { clockSize: 112, accent: '#f0a33a' } }
  })
  useEffect(() => { try { localStorage.setItem('garasjegym.timer.appearance', JSON.stringify(appearance)) } catch { /* Optional local preference. */ } }, [appearance])
  const schema = timerSettings?.workout_schema
  const savedDuration = Number(schema?.duration_seconds) || 0
  const capDuration = Number(schema?.time_cap_seconds) || (Number(schema?.time_cap_minutes) || 0) * 60
  const isEMOM = /^E[1-7]MOM$/.test(format) || ['EMOM', 'EMOM 1', 'EMOM 2'].includes(format)
  const emomEvery = Math.max(1, Math.min(7, Number(schema?.interval?.work_every_minutes) || Number(format.match(/^E([1-7])MOM$/)?.[1]) || (format === 'EMOM 2' ? 2 : 1)))
  const emomCycle = emomEvery * 60
  const isTimedInterval = ['Tabata', 'Intervall', 'Tilpassa', 'Row Intervals'].includes(format)
  const isStationCircuit = format === 'Stasjonssirkel' || schema?.structure === 'station_circuit'
  const stationPlan = schema?.station_circuit || {}
  const stationList = Array.isArray(stationPlan.stations) && stationPlan.stations.length ? stationPlan.stations : (schema?.items || []).map((item,index)=>({...item,station_number:index+1}))
  const stationCount = Math.max(1, Number(stationPlan.station_count) || stationList.length || 1)
  const stationSlots = Math.max(1, Number(stationPlan.rounds ?? schema?.rounds ?? rounds) || 1) * stationCount
  const isCountdown = ['AMRAP', 'Nedteljing'].includes(format) || (['Couplet', 'Triplet'].includes(format) && schema?.combination_mode === 'AMRAP')
  const isForTime = ['For Time', 'Chipper'].includes(format) || (['Couplet', 'Triplet'].includes(format) && schema?.combination_mode === 'For Time')
  const isDeathBy = format === 'Death By'
  const isLadder = format === 'Ladder'
  const hasTimeCap = capDuration > 0 && !isCountdown && !isEMOM && !isTimedInterval && !isStationCircuit
  const fallbackDuration = Math.max(1, (Number(minutes) || 10) * 60 + (Number(seconds) || 0))
  const target = Math.max(1, isCountdown && capDuration ? capDuration : hasTimeCap ? capDuration : savedDuration || fallbackDuration)
  const effectiveWorkSeconds = isStationCircuit ? Math.max(1, Number(stationPlan.work_seconds ?? workSeconds)) : Math.max(1, Number(workSeconds))
  const effectiveRestSeconds = isStationCircuit ? Math.max(0, Number(stationPlan.transition_seconds ?? restSeconds)) : Math.max(0, Number(restSeconds))
  const cycle = effectiveWorkSeconds + effectiveRestSeconds
  const intervalExerciseCount = Math.max(1, exerciseList.length || Number(schema?.interval_exercise_count) || 1)
   const intervalTotal = cycle * Math.max(1, Number(rounds) || 1) * intervalExerciseCount
   const intervalExerciseIndex = Math.floor(elapsed / cycle) % intervalExerciseCount
   const currentIntervalExercise = exerciseList[intervalExerciseIndex]?.exercise_name || exerciseList[intervalExerciseIndex]?.name || activeExercise
  const stationTotal = effectiveWorkSeconds * stationSlots + Math.max(0, stationSlots - 1) * effectiveRestSeconds
  const totalTarget = isStationCircuit ? stationTotal : isTimedInterval ? intervalTotal : target
  const remainingTotal = Math.max(0, totalTarget - elapsed)
  const phaseElapsed = (isTimedInterval || isStationCircuit) ? elapsed % cycle : elapsed % emomCycle
  const inWorkPhase = phaseElapsed < effectiveWorkSeconds
  const phaseRemaining = (isTimedInterval || isStationCircuit)
    ? Math.max(0, (inWorkPhase ? effectiveWorkSeconds : cycle) - phaseElapsed)
    : Math.max(0, emomCycle - (elapsed % emomCycle || 0))
  const emomNextStart = elapsed % emomCycle === 0 ? 0 : emomCycle - (elapsed % emomCycle)
  const currentRound = isStationCircuit
    ? Math.min(Math.floor(elapsed / (cycle * stationCount)) + 1, Math.max(1, Number(stationPlan.rounds ?? schema?.rounds ?? rounds) || 1))
    : isTimedInterval
    ? Math.min(Math.floor(elapsed / (cycle * intervalExerciseCount)) + 1, Math.max(1, Number(rounds) || 1))
    : isEMOM ? Math.floor(elapsed / emomCycle) + 1
    : (isDeathBy || isLadder) ? Math.floor(elapsed / 60) + 1
    : Math.floor(elapsed / 60) + 1
  const currentPhase = isStationCircuit
    ? (inWorkPhase ? 'ARBEID' : 'BYTE STASJON')
    : isTimedInterval
    ? (inWorkPhase ? 'ARBEID' : 'KVILE')
    : isEMOM ? (elapsed === 0 || elapsed % emomCycle === 0 ? 'ARBEID' : 'TIL NESTE START')
    : (isDeathBy || isLadder) ? 'NY RUNDE' : 'PÅGÅR'
  const primaryTime = isCountdown ? remainingTotal
    : (isTimedInterval || isStationCircuit) ? phaseRemaining
    : isEMOM ? emomNextStart
    : elapsed

  function cue(frequency = 880, duration = 0.16) {
    if (!soundOn) return
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
      oscillator.connect(gain); gain.connect(context.destination)
      oscillator.start(); oscillator.stop(context.currentTime + duration)
      oscillator.onended = () => context.close()
    } catch { /* Lyd er valfri og avhengig av nettlesaren. */ }
  }

  useEffect(() => {
    setElapsed(0); setRunning(false); setRound(1); setPhase('Klar'); setLaps([])
    setWorkSeconds(timerSettings?.work_seconds ?? timerSettings?.workout_schema?.station_circuit?.work_seconds ?? timerSettings?.workout_schema?.interval?.work_seconds ?? (format === 'Tabata' ? 20 : 60))
    setRestSeconds(timerSettings?.rest_seconds ?? timerSettings?.workout_schema?.station_circuit?.transition_seconds ?? timerSettings?.workout_schema?.interval?.rest_seconds ?? (format === 'Tabata' ? 10 : 60))
    setRounds(timerSettings?.rounds ?? timerSettings?.workout_schema?.station_circuit?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
  }, [format, minutes, seconds, timerSettings?.work_seconds, timerSettings?.rest_seconds, timerSettings?.rounds, timerSettings?.workout_schema?.duration_seconds, timerSettings?.workout_schema?.time_cap_seconds, timerSettings?.workout_schema?.station_circuit?.work_seconds, timerSettings?.workout_schema?.station_circuit?.transition_seconds, timerSettings?.workout_schema?.station_circuit?.rounds])

  useEffect(() => { if (stop) setRunning(false) }, [stop])
  useEffect(() => { const sync = () => setFocused(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', sync); return () => document.removeEventListener('fullscreenchange', sync) }, [])

  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => setElapsed(value => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => { onSnapshot({ elapsed, laps, roundsCompleted: isStationCircuit ? Math.min(Math.floor(elapsed / (cycle * stationCount)), Number(stationPlan.rounds ?? schema?.rounds ?? rounds)) : isAmrap ? laps.length : round, phase, running, remaining:remainingTotal, currentRound }) }, [elapsed, laps, round, phase, running, isCountdown, onSnapshot, isStationCircuit, cycle, stationCount, stationPlan.rounds, schema?.rounds, rounds, remainingTotal, currentRound])

  useEffect(() => {
    if (!running) return
    if ((isCountdown || isEMOM || isStationCircuit) && elapsed >= (isStationCircuit ? stationTotal : target)) {
      setRunning(false); setPhase('FERDIG'); cue(520, 0.5); return
    }
    if (hasTimeCap && elapsed >= capDuration) {
      setRunning(false); setPhase('TIDSGRENSE'); cue(520, 0.5); return
    }
    if (isTimedInterval && elapsed >= intervalTotal) {
      setRunning(false); setPhase('FERDIG'); cue(520, 0.5); return
    }
    if (((isTimedInterval || isStationCircuit) && (elapsed % cycle === 0 || elapsed % cycle === effectiveWorkSeconds)) ||
      (isEMOM && elapsed > 0 && elapsed % emomCycle === 0) ||
      (isDeathBy && elapsed > 0 && elapsed % 60 === 0)) cue(1040, 0.12)
  }, [elapsed, running, target, capDuration, hasTimeCap, isCountdown, isEMOM, isDeathBy, isTimedInterval, isStationCircuit, intervalTotal, stationTotal, cycle, emomCycle, effectiveWorkSeconds])

  useEffect(() => {
    if (running) setPhase(currentPhase)
  }, [elapsed, running, currentPhase])

  async function toggleFocus() {
    if (!focused) {
      try { await document.documentElement.requestFullscreen?.() } catch { /* Fullscreen er valfri. */ }
      setFocused(true)
    } else {
      try { if (document.fullscreenElement) await document.exitFullscreen?.() } catch { /* Ignorer. */ }
      setFocused(false)
    }
  }

  const isAmrap = format === 'AMRAP' || (['Couplet','Triplet'].includes(format) && schema?.combination_mode === 'AMRAP')
  const isStopwatch = ['Stoppeklokke', 'Fri trening', 'Strength', 'Pyramid', 'Superset', 'Complex', 'Eigen økt'].includes(format) ||
    (['Couplet', 'Triplet'].includes(format) && schema?.combination_mode === 'Open')
  const showTimeCap = hasTimeCap
  const roundsShown = isTimedInterval ? Math.min(currentRound, Number(rounds)) : currentRound
  const completedRounds = isAmrap ? laps.length : round
  const lapAction = () => { if(!running)return; setLaps(value => [...value, Math.max(0, elapsed - value.reduce((sum, lap) => sum + lap, 0))]); setRound(value => value + 1); cue(1200, 0.1) }
  return <div className={focused ? 'engine-timer timer-focused timer-customized' : 'engine-timer timer-customized'} style={{ '--timer-clock-size': `${appearance.clockSize}px`, '--timer-accent': appearance.accent }}>
    <div className="timer-topline">
      <div className="timer-context"><span className="timer-origin-chip">{originLabel}</span><span className="timer-format-chip">{format.toUpperCase()}</span></div>
      <button type="button" className="timer-customize-trigger" onClick={() => setShowTimerSettings(value => !value)} aria-expanded={showTimerSettings}>Tilpass klokke</button>
    </div>
    {showTimerSettings && <section className="timer-customize-panel" aria-label="Tilpass timer">
      <div className="timer-customize-title"><strong>Klokkeuttrykk</strong><span>Lagra på denne eininga</span></div>
      <label>Storleik på klokketal <b>{appearance.clockSize}px</b><input type="range" min="64" max="220" step="4" value={appearance.clockSize} onChange={e => setAppearance(value => ({ ...value, clockSize: Number(e.target.value) }))}/></label>
      <label>Farge på klokke og markeringar <input type="color" value={appearance.accent} onChange={e => setAppearance(value => ({ ...value, accent: e.target.value }))}/></label>
      <button type="button" className="text-button" onClick={() => setAppearance({ clockSize:112, accent:'#f0a33a' })}>Tilbakestill utsjånad</button>
    </section>}
    <div className="timer-caption"><Clock3 size={15}/> {format.toUpperCase()}</div>
    <div className="timer-dashboard timer-dashboard-reflow">
      <div className="timer-layout-toolbar"><strong>Tilpass oppsett</strong><span>Dra panela etter handtaket · endra breidd/høgd · lås dei når du er nøgd</span><button type="button" className="text-button" onClick={resetPanelLayout}>Tilbakestill panel</button></div>
      <div className="timer-panel-canvas">
       {panelOrder.map(id=>id==='clock'?<TimerPanel key={id} id="clock" title="HOVUDKLOKKE OG WOD" layout={panelLayout.clock} locked={Boolean(lockedPanels.clock)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock}><section className="timer-center">
        <div className="timer-phase">{phase}</div>
        <strong className="timer-main-clock">{clock(primaryTime)}</strong>
        <div className="timer-round-label">{isStationCircuit ? 'ARBEID / STASJONSBYTE' : isCountdown ? 'GJENSTÅANDE TID' : isEMOM ? 'TIL NESTE ARBEIDSSTART' : isTimedInterval ? 'TID I INTERVALLFASEN' : 'MEDGÅTT TID'}</div>
        {isStationCircuit ? <div className="timer-station-plan"><div className="timer-station-plan-heading"><span>STASJONANE I SIRKELEN</span><b>{stationPlan.rounds ?? schema?.rounds ?? rounds} rundar</b></div><div className="timer-station-grid">{stationList.map((station,index)=><article className="timer-station-card" key={station.station_number||index}><span>STASJON {station.station_number||index+1}</span><strong>{station.exercise_name||station.name||'Øving'}</strong><small>{station.reps_mode==='amrap'?'AMRAP · så mange som mogleg':station.reps!=null&&station.reps!==''?`${station.reps} reps`:'Vel sjølv tal reps'}{station.load_label?' · '+station.load_label:''}</small>{station.description&&<p>{station.description}</p>}{station.coach_note&&<p>{station.coach_note}</p>}</article>)}</div></div> : isAmrap ? <div className="timer-amrap-exercise-list"><span>ØVINGAR I WOD-EN</span>{exerciseList.length ? <ol>{exerciseList.map((exercise,index)=>{const setReps=(exercise.sets||[]).map(set=>String(set.reps??'').trim()).filter(Boolean);const uniqueReps=[...new Set(setReps)];const repsLabel=uniqueReps.length===1?(setReps.length>1?`${setReps.length} × ${uniqueReps[0]}`:uniqueReps[0]):uniqueReps.length>1?uniqueReps.join(' / '):String(exercise.reps??'').trim();return <li key={exercise.key||index} className={exercise.is_rest?'timer-rest-item':''}><b>{index+1}.</b><span>{exercise.is_rest?<><strong>PAUSE</strong><small> {clock(Number(exercise.rest_duration_seconds)||30)}</small></>:<>{repsLabel&&<strong className="timer-amrap-reps">{repsLabel} × </strong>}{exercise.exercise_name||'Øving utan namn'}</>}</span></li>})}</ol> : <p>Ingen øvingar er lagde til.</p>}</div> : <><div className="timer-active-under-clock"><span>{isTimedInterval ? `DRAG ${intervalExerciseIndex+1} / ${intervalExerciseCount}` : activeExercise ? 'GJELDANDE ØVING' : 'WOD-OVERSIKT'}</span><b>{isTimedInterval ? currentIntervalExercise : activeExercise || 'Sjå øvingsrekkjefølgja'}</b></div><div className="timer-amrap-exercise-list"><span>ØVINGAR I WOD-EN · {exerciseList.length}</span>{exerciseList.length ? <ol>{exerciseList.map((exercise,index)=>{const dose=(exercise.sets||[]).map(set=>[set.reps?set.reps+' reps':'',set.load_kg?set.load_kg+' kg':'',set.time_text||''].filter(Boolean).join(' · ')).filter(Boolean).join(' / ');return <li key={exercise.key||index} className={exercise.is_rest?'timer-rest-item':''}><b>{index+1}.</b><span><strong>{exercise.is_rest?'PAUSE':exercise.exercise_name||'Øving utan namn'}</strong>{dose&&<small>{dose}</small>}{exercise.prescription_label&&<small>{exercise.prescription_label}</small>}</span></li>})}</ol> : <p>Ingen øvingar er lagde til.</p>}</div></>}
        {isAmrap && <div className="timer-round-total"><span>RUNDER FULLFØRT</span><b>{completedRounds}</b></div>}
        {!isStationCircuit && !isAmrap && (isTimedInterval ? (exerciseList[intervalExerciseIndex + 1]?.exercise_name || exerciseList[0]?.exercise_name) : nextExercise) && <div className="timer-next-exercise"><span>NESTE ØVING</span><b>{isTimedInterval ? (exerciseList[intervalExerciseIndex + 1]?.exercise_name || exerciseList[0]?.exercise_name) : nextExercise}</b></div>}
        <div className="timer-actions">
          <button type="button" className="secondary-button" onClick={() => { if (!running && phase === 'FERDIG') return; if (!running) { setPhase('PÅGÅR'); setHasStarted(true) } setRunning(value => !value) }} disabled={phase === 'FERDIG' || phase === 'TIDSGRENSE'}>{running ? <><Pause size={14}/> Pause</> : <><Play size={14}/> Start</>}</button>
          {isAmrap && <button type="button" className="timer-lap-button" onClick={lapAction} disabled={!running}>+ REGISTRER RUNDE</button>}
          <button type="button" className="secondary-button" onClick={() => { setRunning(false); setElapsed(0); setRound(1); setLaps([]); setPhase('Klar'); setHasStarted(false) }}><RotateCcw size={14}/> Nullstill</button>
          {(isStopwatch || isForTime) && <button type="button" className="secondary-button" onClick={() => setLaps(value => [...value, elapsed])}>Mellomtid</button>}
          <button type="button" className="secondary-button" onClick={() => setSoundOn(value => !value)}>{soundOn ? 'Lyd på' : 'Lyd av'}</button>
          <button type="button" className="secondary-button" onClick={toggleFocus}>{focused ? 'Avslutt stor klokke' : 'Stor klokke'}</button>
        </div>
        <div className="timer-finish-row">
          <button type="button" className="timer-finish-button" onClick={onFinish} disabled={!hasStarted}>
            <CheckCircle2 size={18}/><span>Fullfør økta</span>
          </button>
          <small>{hasStarted ? 'Registrer resultat og lagre treningsøkta' : 'Start timeren før du fullfører økta'}</small>
        </div>
      </section></TimerPanel>:id==='info'?<TimerPanel key={id} id="info" title="ØKTINFORMASJON" layout={panelLayout.info} locked={Boolean(lockedPanels.info)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock}><aside className="timer-side timer-side-left">
        <div className="timer-bottom-heading">ØKTINFORMASJON</div>
        <div className="timer-side-stat"><span>MEDGÅTT TID</span><b>{clock(elapsed)}</b></div>
        {(isCountdown || isStationCircuit) && <div className="timer-side-stat"><span>GJENVERANDE TID</span><b>{clock(remainingTotal)}</b></div>}
        {isEMOM && <><div className="timer-side-stat"><span>GJENSTÅANDE ØKTTID</span><b>{clock(remainingTotal)}</b></div><div className="timer-side-stat"><span>NESTE ARBEIDSSTART</span><b>{clock(emomNextStart)}</b></div></>}
        {isStationCircuit && <><div className="timer-side-stat"><span>RUNDE</span><b>{Math.min(currentRound,Number(stationPlan.rounds ?? schema?.rounds ?? rounds))}/{stationPlan.rounds ?? schema?.rounds ?? rounds}</b></div><div className="timer-side-stat"><span>ARBEID / BYTE</span><b>{stationPlan.work_seconds ?? workSeconds}s / {stationPlan.transition_seconds ?? restSeconds}s</b></div></>}
        {isTimedInterval && <><div className="timer-side-stat"><span>ØKTA ATT</span><b>{clock(remainingTotal)}</b></div><div className="timer-side-stat"><span>RUNDE</span><b>{roundsShown}/{rounds}</b></div></>}
        {isForTime && showTimeCap && <div className="timer-side-stat"><span>TIDSGRENSE</span><b>{clock(Math.max(0,target-elapsed))}</b></div>}
        {(isDeathBy || isLadder) && <><div className="timer-side-stat"><span>{isDeathBy?'TID TIL NESTE MINUTT':'LADDER-RUNDE'}</span><b>{isDeathBy?clock(elapsed===0?60:60-(elapsed%60||0)):currentRound}</b></div>{schema?.ladder&&<div className="timer-side-stat"><span>REPS I RUNDA</span><b>{Math.max(0,Number(schema.ladder.start||2)+(currentRound-1)*Number(schema.ladder.step||2)*(schema.ladder.direction==='down'?-1:1))}</b></div>}</>}
        {isTimedInterval && !running && elapsed===0 && <div className="timer-settings-inline">
          <label>Arbeid sek.<input type="number" min="1" max="600" value={workSeconds} onChange={e=>setWorkSeconds(Math.max(1,Number(e.target.value)||1))}/></label>
          <label>Kvile sek.<input type="number" min="0" max="600" value={restSeconds} onChange={e=>setRestSeconds(Math.max(0,Number(e.target.value)||0))}/></label>
          <label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(Math.max(1,Number(e.target.value)||1))}/></label>
        </div>}
      </aside></TimerPanel>:id==='laps'?<TimerPanel key={id} id="laps" title="RUNDETIDER" layout={panelLayout.laps} locked={Boolean(lockedPanels.laps)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock}><aside className="timer-side timer-side-right">
        <div className="timer-lap-heading">RUNDETIDER <b>{laps.length}</b></div>
        {laps.length ? <ol className="timer-lap-list">{laps.map((lap,index)=><li key={index}><span>Runde {index+1}</span><b>{clock(lap)}</b></li>)}</ol> : <p className="timer-no-laps">Registrer kvar fullførte runde her.</p>}
      </aside>
    </div></TimerPanel>:<TimerPanel key={id} id="music" title="MUSIKK" layout={panelLayout.music} locked={Boolean(lockedPanels.music)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock}><MusicMiniPlayer /></TimerPanel>)}
      </div>

    <small>{isStationCircuit ? 'Stasjonssirkel · roterande stasjonar · fast tal rundar' : isTimedInterval ? 'Arbeid / kvile · samla økttid og tid att' : isCountdown ? 'AMRAP · registrer kvar fullførte runde' : isEMOM ? (emomEvery > 1 ? `E${emomEvery}MOM · arbeid kvart ${emomEvery}. minutt` : 'E1MOM · arbeid kvart minutt') : isDeathBy ? 'Aukande arbeid for kvar minutt' : isForTime ? 'Stoppeklokke med eventuell tidsgrense' : 'Stoppeklokke – tel medgått tid'}</small>
  </div>
}

export default function Training({ launchWodId = null, launchClassSessionId = null, launchAssignmentId = null, onLaunchConsumed, simpleMode = false, quickStart = false, onQuickStartConsumed, onSaved, onDiscard }) {
  const [wods, setWods] = useState([])
  const [dailyWodId,setDailyWodId]=useState(null)
  const [exercises, setExercises] = useState([])
  const [favoriteNames, setFavoriteNames] = useState([])
  const [favoriteWodIds, setFavoriteWodIds] = useState([])
  const [wodFavoritesOnly, setWodFavoritesOnly] = useState(false)
  const [wodSearch, setWodSearch] = useState('')
  const [expandedWodId, setExpandedWodId] = useState(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [libraryQuery,setLibraryQuery]=useState('')
  const [history, setHistory] = useState([])
  const [records, setRecords] = useState([])
  const [prName, setPrName] = useState('')
  const [prResult, setPrResult] = useState('')
  const [prUnit, setPrUnit] = useState('kg')
  const [prNote, setPrNote] = useState('')
  const [prSaving, setPrSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveToken, setSaveToken] = useState(() => crypto.randomUUID())
  const [mode, setMode] = useState('home')
  const [reviewOpen,setReviewOpen]=useState(false)
  const [finishOpen,setFinishOpen]=useState(false)
  const [source, setSource] = useState(null)
  const [wodLevel,setWodLevel]=useState('rx')
  const [classSessionId, setClassSessionId] = useState(null)
  const [title, setTitle] = useState('')
  const [format, setFormat] = useState('Fri trening')
  const [duration, setDuration] = useState('10')
  const [durationSeconds, setDurationSeconds] = useState('0')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [scoreRounds, setScoreRounds] = useState('')
  const [scoreReps, setScoreReps] = useState('')
  const [scoreTime, setScoreTime] = useState('')
  const [scoreLoad, setScoreLoad] = useState('')
  const [scoreCalories, setScoreCalories] = useState('')
  const [scoreDistance, setScoreDistance] = useState('')
  const [scoreUnit, setScoreUnit] = useState('m')
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0)
  const [timerSnapshot, setTimerSnapshot] = useState({ elapsed: 0, laps: [], roundsCompleted: 0, phase: 'Klar', running: false })

  async function loadAll(silent=false) {
    if (!silent) setLoading(true); setError('')
    let w = await supabase.from('wods')
      .select('id,name,format,duration_minutes,movements,notes,audience,is_published,created_at,timer_settings,category')
      .order('created_at', { ascending: false })
    // Keep the WOD library usable while the optional timer-settings migration is staged.
    if (w.error && /timer_settings|column .* does not exist/i.test(w.error.message || '')) {
      w = await supabase.from('wods')
        .select('id,name,format,duration_minutes,movements,notes,audience,is_published,created_at,category')
        .eq('is_published', true).order('created_at', { ascending: false })
    }
    const [e, h, pr] = await Promise.all([
      supabase.from('exercises').select('id,name,category,equipment,description,video_url').eq('is_active', true).order('name'),
      supabase.from('workout_logs').select('id,title,workout_date,format,rounds,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,result_data,note,created_at,workout_exercises(id,exercise_name,sort_order,workout_sets(id,set_number,reps,load_kg,time_text,time_seconds))').order('workout_date', { ascending: false }).limit(30),
      supabase.from('personal_records').select('id,exercise_name,result,unit,note,record_date').order('record_date', { ascending: false }).limit(50),
    ])
    if (w.error) setError(w.error.message); else setWods(w.data || [])
    const daily=await supabase.from('daily_wod').select('wod_id').eq('id',true).maybeSingle()
    if(!daily.error)setDailyWodId(daily.data?.wod_id||null)
    if (e.error && !w.error) setError('Øvingsbibliotek: ' + e.error.message); else setExercises(e.data || [])
    if (h.error && !w.error && !e.error) setError('Treningslogg: ' + h.error.message); else setHistory(h.data || [])
    if (pr.error && !w.error && !e.error && !h.error) setError('Personlege rekordar: ' + pr.error.message); else setRecords(pr.data || [])
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const [fav, wodFav] = await Promise.all([
        supabase.from('exercise_favorites').select('exercise_name').eq('user_id', user.id),
        supabase.from('wod_favorites').select('wod_id').eq('user_id', user.id)
      ])
      if (!fav.error) setFavoriteNames((fav.data || []).map(x => x.exercise_name))
      if (!wodFav.error) setFavoriteWodIds((wodFav.data || []).map(x => x.wod_id))
    }
    setLoading(false)
  }
  useEffect(() => { loadAll(); const refresh=setInterval(()=>loadAll(true),60000); return()=>clearInterval(refresh) }, [])
  async function toggleWodFavorite(wod){
    const {data:{user}}=await supabase.auth.getUser()
    if(!user)return
    const exists=favoriteWodIds.includes(wod.id)
    const result=exists?await supabase.from('wod_favorites').delete().eq('user_id',user.id).eq('wod_id',wod.id):await supabase.from('wod_favorites').insert({user_id:user.id,wod_id:wod.id})
    if(result.error){setError(result.error.message);return}
    setFavoriteWodIds(ids=>exists?ids.filter(id=>id!==wod.id):[...ids,wod.id])
  }

  useEffect(() => {
    if (format === 'AMRAP' || (['Couplet','Triplet'].includes(format) && source?.timer_settings?.workout_schema?.combination_mode === 'AMRAP')) {
      setScoreRounds(String(timerSnapshot.roundsCompleted || 0))
    }
  }, [timerSnapshot.roundsCompleted, format, source])

  useEffect(() => {
    if (!launchWodId || loading) return
    const wod = wods.find(item => item.id === launchWodId)
    if (wod) { startWorkout(wod); setClassSessionId(launchClassSessionId || null); onLaunchConsumed?.() }
  }, [launchWodId, loading, wods])

  useEffect(() => {
    if (!quickStart || !simpleMode || loading || mode !== 'home') return
    startWorkout()
    onQuickStartConsumed?.()
  }, [quickStart, simpleMode, loading, mode])

  const availableWods=wods.filter(wod=>wod.is_published&&!wod.is_archived)

  const filteredExercises = useMemo(() => exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || (e.category || '').toLowerCase().includes(query.toLowerCase())), [exercises, query])

  function leaveWorkout() {
    if (!window.confirm('Forkasta økta? Ho blir sletta utan å bli lagra i treningsloggen.')) return
    setFinishOpen(false); setMode('home'); setSource(null); setClassSessionId(null); setItems([])
    setTimerSnapshot({ elapsed: 0, laps: [], roundsCompleted: 0, phase: 'Klar', running: false })
    onDiscard?.()
  }

  function startWorkout(wod = null) {
    try { document.documentElement.requestFullscreen?.().catch(() => {}) } catch { /* Fullscreen er valfri på eininga. */ }
    setClassSessionId(null)
    setSaveToken(crypto.randomUUID())
    setSource(wod)
    setWodLevel(wod?.timer_settings?.workout_schema?.prescription||'rx')
    setTitle(wod?.name || (simpleMode ? 'Eiga trening' : ''))
    setFormat(wod?.format || 'Fri trening')
    setDuration(String(wod?.timer_settings?.workout_schema?.duration_seconds ? Math.floor(wod.timer_settings.workout_schema.duration_seconds / 60) : (wod?.duration_minutes || 10)))
    setDurationSeconds(String(wod?.timer_settings?.workout_schema?.duration_seconds ? wod.timer_settings.workout_schema.duration_seconds % 60 : 0))
    setNote(wod?.notes || '')
    setItems([])
    setActiveExerciseIndex(0)
    setTimerSnapshot({ elapsed: 0, laps: [], roundsCompleted: 0, phase: 'Klar', running: false })
    setScoreRounds(''); setScoreReps(''); setScoreTime('')
    const schema = wod?.timer_settings?.workout_schema
    if (Array.isArray(schema?.items) && schema.items.length) {
      setItems(schema.items.map(item => ({
        ...emptyExercise(),
        exercise_id: item.exercise_id || '',
        exercise_name: item.exercise_name || '',
        is_rest: !!item.is_rest,
        rest_duration_seconds: item.rest_duration_seconds == null ? null : Number(item.rest_duration_seconds),
        reps_mode: item.reps_mode || 'fixed',
        prescription_levels: item.levels || null,
        prescription_label: doseLabel(item,'rx'),
        sets: Array.isArray(item.sets) && item.sets.length ? item.sets.map(set => ({
          reps: set.reps == null ? '' : String(set.reps),
          load_kg: set.load_kg == null ? '' : String(set.load_kg),
          time_text: set.tempo || '',
          time_seconds: '',
        })) : [{
          reps: item.reps == null ? '' : String(item.reps),
          load_kg: item.load_kg == null ? '' : String(item.load_kg),
          time_text: item.row_value != null ? String(item.row_value)+' '+(item.row_unit||'') : '',
          time_seconds: item.work_seconds == null ? '' : String(item.work_seconds),
        }],
      })))
    } else if (wod?.movements) {
      const names = wod.movements.split(/\n|,/).map(x => x.trim()).filter(Boolean)
      setItems(names.map(name => ({ ...emptyExercise(), exercise_name: name })))
    }
    setReviewOpen(false)
    setMode('active')
    setError(''); setNotice('')
  }

  async function toggleFavorite(exercise) {
    const exists = favoriteNames.includes(exercise.name)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Logg inn på nytt.')
      if (exists) {
        const { error: e } = await supabase.from('exercise_favorites').delete().eq('user_id', user.id).eq('exercise_name', exercise.name)
        if (e) throw e
        setFavoriteNames(current => current.filter(name => name !== exercise.name))
      } else {
        const { error: e } = await supabase.from('exercise_favorites').upsert({ user_id: user.id, exercise_name: exercise.name }, { onConflict: 'user_id,exercise_name' })
        if (e) throw e
        setFavoriteNames(current => [...current, exercise.name])
      }
    } catch (err) { setError(err.message || 'Favoritten kunne ikkje lagrast. Køyr favorittmigreringa først.') }
  }

  function addExercise(exercise) {
    setItems(current => [...current, { ...emptyExercise(), exercise_id: exercise.id, exercise_name: exercise.name }])
    setQuery('')
  }
  function updateExercise(key, patch) {
    setItems(current => current.map(item => item.key === key ? { ...item, ...patch } : item))
  }
  function updateSet(key, index, patch) {
    setItems(current => current.map(item => item.key === key ? { ...item, sets: item.sets.map((s, i) => i === index ? { ...s, ...patch } : s) } : item))
  }
  function addSet(key) {
    setItems(current => current.map(item => item.key === key ? { ...item, sets: [...item.sets, { reps: '', load_kg: '', time_text: '', time_seconds: '' }] } : item))
  }

  async function saveWorkout(event) {
    event.preventDefault()
    if (!title.trim()) { setError('Gi økta eit namn før du lagrar.'); return }
    if (!items.length || items.some(item => !item.exercise_name.trim())) {
      setError('Alle øvingane må ha namn.'); return
    }
    setSaving(true); setError(''); setNotice('')
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Innlogginga er utgått. Logg inn på nytt.')
      const normalizedFormat = format.toLowerCase()
      const combinationMode = source?.timer_settings?.workout_schema?.combination_mode
      const isAmrapScore = normalizedFormat === 'amrap' || (['couplet','triplet'].includes(normalizedFormat) && combinationMode === 'AMRAP')
      const isForTimeScore = ['for time','chipper'].includes(normalizedFormat) || (['couplet','triplet'].includes(normalizedFormat) && combinationMode === 'For Time')
      const elapsedSeconds = Number(timerSnapshot.elapsed)||0
      const parsedTime = scoreTime.trim() ? (()=>{const parts=scoreTime.trim().split(':').map(Number);return parts.length===2?parts[0]*60+parts[1]:parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:NaN})() : (isForTimeScore&&elapsedSeconds>0?elapsedSeconds:null)
      if(scoreTime.trim()&&!Number.isFinite(parsedTime))throw new Error('Tid må skrivast som mm:ss eller tt:mm:ss.')
      const hasRecordedScore=[scoreRounds,scoreReps,scoreTime,scoreLoad,scoreCalories,scoreDistance].some(value=>String(value??'').trim()!=='')||parsedTime!==null
      if(classSessionId&&source?.category!=='warmup'&&!hasRecordedScore)throw new Error('Hovud-WOD må ha minst eitt registrert resultat før du kan lagra.')
      const resultData = {
        version:2,format,elapsed_seconds:elapsedSeconds,timer_phase:timerSnapshot.phase,completion_status:timerSnapshot.phase==='TIDSGRENSE'?'time_cap':'completed',completed:true,time_cap_reached:timerSnapshot.phase==='TIDSGRENSE',time_cap_seconds:timerSnapshot.phase==='TIDSGRENSE'?elapsedSeconds:null,
        completed_rounds:isAmrapScore?(scoreRounds===''?Number(timerSnapshot.roundsCompleted)||0:Number(scoreRounds)):null,
        extra_reps:isAmrapScore?(scoreReps===''?0:Number(scoreReps)):null,
        split_seconds:Array.isArray(timerSnapshot.laps)?timerSnapshot.laps:[],
        score_time_seconds:parsedTime,
        load_kg:scoreLoad===''?null:Number(scoreLoad),
        calories:scoreCalories===''?null:Number(scoreCalories),
        distance:scoreDistance===''?null:Number(scoreDistance),distance_unit:scoreUnit,
        exercise_results:items.map(item=>({exercise_name:item.exercise_name,sets:item.sets.map(s=>({reps:s.reps===''?null:Number(s.reps),load_kg:s.load_kg===''?null:Number(s.load_kg),time_seconds:s.time_seconds===''?null:Number(s.time_seconds),time_text:s.time_text||null}))}))
      }
      const payload = {
        member_id:user.id,save_token:saveToken,title:title.trim(),source_wod_id:source?.id||null,
        class_live_session_id:classSessionId||null,workout_date:localDateISO(),format,
        rounds:isAmrapScore?(scoreRounds===''?Number(timerSnapshot.roundsCompleted)||0:Number(scoreRounds)):Math.max(1,Number(scoreRounds)||1),
        score_rounds:isAmrapScore?(scoreRounds===''?Number(timerSnapshot.roundsCompleted)||0:Number(scoreRounds)):scoreRounds===''?null:Number(scoreRounds),
        score_reps:scoreReps===''?(isAmrapScore?0:null):Number(scoreReps),
        score_time_seconds:parsedTime,score_load_kg:scoreLoad===''?null:Number(scoreLoad),
        score_calories:scoreCalories===''?null:Number(scoreCalories),
        score_distance:scoreDistance===''?null:Number(scoreDistance),score_unit:scoreDistance===''?null:scoreUnit,
        result_data:resultData,
        note:[note.trim(),scoreTime?'Tid: '+scoreTime:'',`Timer: ${format} · ${clock(elapsedSeconds)} · ${timerSnapshot.phase}`,timerSnapshot.laps.length?'Mellomtider: '+timerSnapshot.laps.map((lap,i)=>`${i+1}: ${clock(lap)}`).join(', '):''].filter(Boolean).join('\\n')
      }
      payload.exercises=items.map((item,index)=>({
        exercise_id:item.exercise_id||null,exercise_name:item.exercise_name.trim(),sort_order:index+1,
        sets:item.sets.map(s=>({reps:s.reps===''?null:Number(s.reps),load_kg:s.load_kg===''?null:Number(s.load_kg),time_text:s.time_text.trim()||null,time_seconds:s.time_seconds===''?null:Number(s.time_seconds)}))
      }))
      const {data:workoutId,error:saveError}=await supabase.rpc('save_workout_atomic',{p_workout:payload})
      if(saveError)throw saveError
      if(!workoutId)throw new Error('Databasen returnerte ikkje ID for den lagra økta.')
      if(launchAssignmentId){
        const {error:assignmentError}=await supabase.from('pt_wod_assignments').update({status:'completed',completed_at:new Date().toISOString(),workout_log_id:workoutId}).eq('id',launchAssignmentId).eq('member_id',user.id)
        if(assignmentError)throw assignmentError
      }
      // Automatically detect new heaviest logged loads and store them as PRs.
      let prMessage = ''
      try {
        const { data: existingPRs, error: prReadError } = await supabase.from('personal_records')
          .select('exercise_name,result,unit').eq('member_id', user.id).eq('unit', 'kg')
        if (prReadError) throw prReadError
        const bestByName = new Map()
        ;(existingPRs || []).forEach(record => {
          const value = Number(String(record.result).replace(',', '.'))
          if (Number.isFinite(value)) bestByName.set(record.exercise_name.toLowerCase(), Math.max(bestByName.get(record.exercise_name.toLowerCase()) || 0, value))
        })
        const sourceWorkoutId = workoutId
        const newPRs = []
        payload.exercises.forEach((exercise,index) => {
          const loads = exercise.sets.map(set => set.load_kg).filter(value => Number.isFinite(value) && value > 0)
          if (payload.exercises.length === 1 && Number.isFinite(payload.score_load_kg) && payload.score_load_kg > 0) loads.push(payload.score_load_kg)
          if (!loads.length) return
          const best = Math.max(...loads)
          const key = exercise.exercise_name.toLowerCase()
          if (best > (bestByName.get(key) || 0)) {
            newPRs.push({ member_id: user.id, workout_log_id: sourceWorkoutId, exercise_name: exercise.exercise_name, result: String(best), unit: 'kg', record_date: payload.workout_date, note: 'Automatisk PR frå økta «' + payload.title + '»' })
            bestByName.set(key, best)
          }
        })
        if (newPRs.length) {
          const { error: prWriteError } = await supabase.from('personal_records').insert(newPRs)
          if (prWriteError) throw prWriteError
          prMessage = ' Ny PR registrert: ' + newPRs.map(pr => pr.exercise_name + ' ' + pr.result + ' kg').join(', ')
        }
      } catch (prError) {
        prMessage = ' Automatisk PR-kontroll kunne ikkje fullførast: ' + (prError.message || 'ukjend feil')
      }
      setNotice('Økta er lagra i treningsloggen.' + prMessage)
      setFinishOpen(false); setMode('home'); setReviewOpen(false)
      setSaveToken(crypto.randomUUID())
      await loadAll()
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Kunne ikkje lagra økta.')
    } finally {
      setSaving(false)
    }
  }
  async function savePersonalRecord(event) {
    event.preventDefault()
    if (!prName.trim() || !prResult.trim()) return
    setPrSaving(true); setError(''); setNotice('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Logg inn på nytt før du lagrar.')
      const { error: insertError } = await supabase.from('personal_records').insert({
        member_id: user.id, exercise_name: prName.trim(), result: prResult.trim(),
        unit: prUnit, note: prNote.trim() || null,
      })
      if (insertError) throw insertError
      setPrName(''); setPrResult(''); setPrNote('')
      setNotice('Personleg rekord er lagra.')
      await loadAll()
    } catch (err) { setError(err.message || 'Kunne ikkje lagra rekorden.') }
    finally { setPrSaving(false) }
  }


  if (loading) return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar treningsdata …</div>

  return <div className={simpleMode ? "training-module simple-mode" : "training-module"}>
    {error && <div className="auth-error" role="alert">{error}</div>}
    {notice && <div className="auth-message" role="status"><CheckCircle2 size={16}/> {notice}</div>}
    {mode === 'active' ? <form className={simpleMode ? `engine-form simple-quick-form${reviewOpen?" review-open":""}` : "engine-form"} onSubmit={saveWorkout}>
      <div className="training-heading"><div><div className="section-kicker">TRENING · AKTIV ØKT</div><h3>{source?.name||'Bygg økta di'}</h3></div><span className="count-pill">{items.length} øvingar</span></div>
      {source?.timer_settings?.workout_schema?.items?.some(item=>item.levels)&&<section className="wod-execution-level"><strong>Vel doseringsnivå</strong><div className="hub-tabs" role="group" aria-label="Doseringsnivå">{[{id:'rx',label:'RX'},{id:'scaled',label:'Scaled'},{id:'foundation',label:'Foundation'}].map(level=><button type="button" key={level.id} className={wodLevel===level.id?'selected':''} aria-pressed={wodLevel===level.id} onClick={()=>setWodLevel(level.id)}>{level.label}</button>)}</div></section>}
      <div className="engine-fields">
        <label>Namn på økta<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Til dømes Styrke A" required/></label>
        <label>Treningsformat<select value={format} onChange={e => setFormat(e.target.value)}>{FORMATS.map(x => <option key={x}>{x}</option>)}</select></label>
        {['AMRAP','Nedteljing','E1MOM','E2MOM','E3MOM','E4MOM','E5MOM','E6MOM','E7MOM'].includes(format) && <label>Øktlengd (minutt)<input type="number" min="1" max="600" value={duration} onChange={e => setDuration(e.target.value)}/></label>}
      </div>
      <Timer format={format} minutes={duration} seconds={durationSeconds} activeExercise={items[activeExerciseIndex]?.exercise_name || ''} nextExercise={items[activeExerciseIndex + 1]?.exercise_name || ''} exerciseList={items} timerSettings={source?.timer_settings || null} onSnapshot={setTimerSnapshot} stop={finishOpen} onFinish={() => setFinishOpen(true)} originLabel={classSessionId ? 'GRUPPETIME' : launchAssignmentId ? 'TILDELT FRÅ PT' : source ? 'EIGEN WOD' : 'EIGA ØKT'}/>
      {items.length > 0 && format!=='Stasjonssirkel' && <section className="engine-section">
        <div className="engine-section-title"><h4>{format==='Stasjonssirkel'?'Stasjonane i økta':'WOD / øvingsrekkjefølgje'}</h4><span>{format==='Stasjonssirkel'?'Alle stasjonar – roter etter eiga startplassering':'Vel øvinga du arbeider med'}</span></div>
        <div className={format==='Stasjonssirkel'?'timer-station-grid':'wod-list'}>{items.map((item, index) => format==='Stasjonssirkel' ? <article className="timer-station-card" key={item.key}><span>STASJON {index+1}</span><strong>{item.exercise_name||'Øving'}</strong><small>{item.reps_mode==='amrap'?'AMRAP · maks reps':item.reps?item.reps+' reps':'Valfritt tal reps'}</small></article> : <button type="button" key={item.key} className={index === activeExerciseIndex ? 'secondary-button active' : 'secondary-button'} onClick={() => setActiveExerciseIndex(index)}>{index + 1}. {item.is_rest?'⏸ Pause · '+clock(Number(item.rest_duration_seconds)||30):item.exercise_name || 'Ny øving'}</button>)}</div>
      </section>}
      <section className="engine-section">
        <div className="engine-section-title"><h4>Øvingar og sett</h4><span>Legg inn resultat per sett</span></div>
        <div className="exercise-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Søk i øvingsbiblioteket …"/></div>
        {query && <div className="exercise-pick-list">{filteredExercises.slice(0,8).map(ex => <button type="button" key={ex.id} onClick={() => addExercise(ex)}><Plus size={14}/><span>{ex.name}</span><small>{ex.category}</small></button>)}</div>}
        {items.map((item, index) => <article className="engine-exercise" key={item.key}>
          <div className="engine-exercise-head"><strong>{index + 1}. {item.exercise_name || 'Ny øving'}</strong><button type="button" className="danger-icon" aria-label="Fjern øving" onClick={() => setItems(current => current.filter(x => x.key !== item.key))}><Trash2 size={16}/></button></div>
          {!item.exercise_id && <input aria-label="Namn på øving" value={item.exercise_name} onChange={e => updateExercise(item.key,{exercise_name:e.target.value})} placeholder="Namn på øving"/>}
          {item.prescription_levels&&<div className="wod-prescription-target"><strong>Planlagt dosering · {wodLevel.toUpperCase()}</strong><span>{doseLabel({levels:item.prescription_levels},wodLevel)||'Ikkje dosert på dette nivået'}</span></div>}{item.sets.map((set, i) => <div className="set-grid" key={i}>
            <span>Sett {i + 1}</span><input type="number" min="0" step="1" value={set.reps} onChange={e => updateSet(item.key,i,{reps:e.target.value})} placeholder="Reps"/>
            <input type="number" min="0" step="0.5" value={set.load_kg} onChange={e => updateSet(item.key,i,{load_kg:e.target.value})} placeholder="Kg"/>
            <input value={set.time_text} onChange={e => updateSet(item.key,i,{time_text:e.target.value})} placeholder="Tid"/>
          </div>)}
          <button type="button" className="text-button add-set" onClick={() => addSet(item.key)}><Plus size={14}/> Legg til sett</button>
        </article>)}
        <button type="button" className="secondary-button" onClick={() => setItems(current => [...current, emptyExercise()])}><Plus size={15}/> Legg til eiga øving</button>
      </section>
      {simpleMode&&<button type="button" className="secondary-button simple-review-toggle" onClick={()=>setReviewOpen(v=>!v)}>{reviewOpen?"Skjul redigering":"Revider øvingar og resultat"}</button>}
      {finishOpen&&<div className="workout-finish-backdrop" role="presentation">
        <section className="workout-finish-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-workout-title">
          <div className="workout-finish-head"><div><span className="section-kicker">ØKTA ER FERDIG</span><h3 id="finish-workout-title">{title||'Treningsøkt'}</h3></div><button type="button" className="danger-icon" aria-label="Lukk" onClick={()=>setFinishOpen(false)}>×</button></div>
          <div className="workout-finish-summary">
            <div><span>FORMAT</span><strong>{format}</strong></div>
            <div><span>TID</span><strong>{clock(timerSnapshot.elapsed)}</strong></div>
            <div><span>ØVINGAR</span><strong>{items.length}</strong></div>
            {timerSnapshot.roundsCompleted>0&&<div><span>RUNDER</span><strong>{timerSnapshot.roundsCompleted}</strong></div>}
          </div>
          {items.length>0&&<div className="workout-finish-exercises"><strong>Øvingar i økta</strong><ol>{items.map((item,index)=><li key={item.key}>{item.exercise_name||'Øving utan namn'}{item.sets?.some(set=>set.reps||set.load_kg||set.time_text)?<small>{item.sets.map(set=>[set.reps?set.reps+' reps':'',set.load_kg?set.load_kg+' kg':'',set.time_text||''].filter(Boolean).join(' · ')).filter(Boolean).join(' / ')}</small>:null}</li>)}</ol></div>}
          <section className="workout-finish-results"><h4>Registrer resultat</h4><p>Fel ta utgangspunkt i øktforma{source?.name?' og WOD-oppsettet':''}. Fyll berre inn det som manglar.</p>
            <div className="engine-fields three">
              {(format==='AMRAP'||(['Couplet','Triplet'].includes(format)&&source?.timer_settings?.workout_schema?.combination_mode==='AMRAP'))&&<><label>Fullførte rundar<input type="number" min="0" value={scoreRounds} onChange={e=>setScoreRounds(e.target.value)} placeholder={String(timerSnapshot.roundsCompleted||0)}/></label><label>Ekstra reps<input type="number" min="0" value={scoreReps} onChange={e=>setScoreReps(e.target.value)} placeholder="0"/></label></>}
              {(['For Time','Chipper'].includes(format)||(['Couplet','Triplet'].includes(format)&&source?.timer_settings?.workout_schema?.combination_mode==='For Time'))&&<label>Sluttid<input value={scoreTime} onChange={e=>setScoreTime(e.target.value)} placeholder={timerSnapshot.elapsed?clock(timerSnapshot.elapsed):'mm:ss'}/></label>}
              {['Strength','Pyramid','Superset','Complex'].includes(format)&&<label>Tungaste løft (kg)<input type="number" min="0" step="0.5" value={scoreLoad} onChange={e=>setScoreLoad(e.target.value)} placeholder="Valfritt"/></label>}
              {['Row Intervals','Intervall','Tabata'].includes(format)&&<><label>Kaloriar<input type="number" min="0" step="0.1" value={scoreCalories} onChange={e=>setScoreCalories(e.target.value)} placeholder="Totalt"/></label><label>Avstand<input type="number" min="0" step="1" value={scoreDistance} onChange={e=>setScoreDistance(e.target.value)} placeholder="Total distanse"/></label><label>Eining<select value={scoreUnit} onChange={e=>setScoreUnit(e.target.value)}><option value="m">Meter</option><option value="km">Kilometer</option><option value="cal">Kaloriar</option></select></label></>}
              {!['AMRAP','For Time','Chipper','Couplet','Triplet','Strength','Pyramid','Superset','Complex','Row Intervals','Intervall','Tabata'].includes(format)&&<><label>Rundar<input type="number" min="0" value={scoreRounds} onChange={e=>setScoreRounds(e.target.value)} placeholder="–"/></label><label>Reps<input type="number" min="0" value={scoreReps} onChange={e=>setScoreReps(e.target.value)} placeholder="–"/></label><label>Tid / sluttid<input value={scoreTime} onChange={e=>setScoreTime(e.target.value)} placeholder="mm:ss"/></label></>}
            </div>
            <label className="engine-note">Notat<textarea value={note} onChange={e=>setNote(e.target.value)} rows="2" placeholder="Kommentar eller dagsform …"/></label>
          </section>
          <div className="workout-finish-actions">
            <button type="button" className="danger-button" onClick={leaveWorkout}><Trash2 size={17}/> Forkast økta</button>
            <button type="submit" className="primary-button" disabled={saving}><Save size={17}/>{saving?'Lagrar …':'Lagre økt'}</button>
          </div>
        </section>
      </div>}
    </form> : <>
      <div className="training-heading"><div><div className="section-kicker">{simpleMode ? "SUPERENKEL MODUS · TRENING" : "TRENING · MOTOR"}</div><h3>{simpleMode ? "Kva vil du gjera i dag?" : "Vel øktform"}</h3>{simpleMode&&<p>Vel ei ferdig økt eller start di eiga. Resultatet blir lagra på profilen din.</p>}</div>{!simpleMode&&<span className="count-pill">STURMKOPF</span>}</div>
      <div className={simpleMode ? "engine-entry-grid simple-entry-grid" : "engine-entry-grid"}>
        <button onClick={() => startWorkout()}><Dumbbell size={20}/><strong>{simpleMode ? "Start trening" : "Fri trening"}</strong><small>{simpleMode ? "Start klokka og tren" : "Bygg økta frå botnen"}</small></button>
        <button onClick={() => setMode('wods')}><Activity size={20}/><strong>{simpleMode ? "Følg eit opplegg" : "Start ein WOD"}</strong><small>{simpleMode ? "Vel ei økt som er laga for deg" : "Vel ei publisert økt"}</small></button>
      </div>
      {mode === 'wods' && <section className="engine-section wod-library-screen">
        <div className="engine-section-title"><div><h4>WOD-bibliotek</h4><span>{wods.length} publiserte økter</span></div><button className="text-button" onClick={() => setMode('home')}>Lukk</button></div>
        <label className="wod-library-search"><Search size={16}/><input value={wodSearch} onChange={e=>setWodSearch(e.target.value)} placeholder="Søk etter WOD, format eller øving …"/></label>
        <div className="wod-library-toolbar"><button type="button" className={wodFavoritesOnly?'secondary-button favorite-filter active':'secondary-button favorite-filter'} onClick={()=>setWodFavoritesOnly(v=>!v)}><Star size={14} fill={wodFavoritesOnly?'currentColor':'none'}/>{wodFavoritesOnly?'Vis alle publiserte WOD-ar':'Favoritt-WODs'}</button><span>{availableWods.filter(wod=>(!wodFavoritesOnly||favoriteWodIds.includes(wod.id))&&(!wodSearch.trim()||[wod.name,wod.format,wod.movements,wod.notes].some(value=>(value||'').toLowerCase().includes(wodSearch.trim().toLowerCase())))).length} treff</span></div>
        {availableWods.filter(wod=>(!wodFavoritesOnly||favoriteWodIds.includes(wod.id))&&(!wodSearch.trim()||[wod.name,wod.format,wod.movements,wod.notes].some(value=>(value||'').toLowerCase().includes(wodSearch.trim().toLowerCase())))).length ? <div className="wod-list">{availableWods.filter(wod=>(!wodFavoritesOnly||favoriteWodIds.includes(wod.id))&&(!wodSearch.trim()||[wod.name,wod.format,wod.movements,wod.notes].some(value=>(value||'').toLowerCase().includes(wodSearch.trim().toLowerCase())))).sort((a,b)=>(a.id===dailyWodId?-1:0)-(b.id===dailyWodId?-1:0)).map(wod => {
          const schema=wod.timer_settings?.workout_schema||{}
          const wodItems=Array.isArray(schema.items)?schema.items:[]
          const isExpanded=expandedWodId===wod.id
          return <article className={isExpanded?'wod-card wod-card-expanded':'wod-card'} key={wod.id}>
            <div className="wod-top"><span>{wod.id===dailyWodId?'DAGENS WOD · ':''}{wod.timer_settings?.workout_schema?.library_category==='warmup'?'OPPVARMING':wod.timer_settings?.workout_schema?.library_category==='standard'?'STANDARD':'WOD'} · {wod.format||'WOD'}</span><span>{schema.duration_seconds?clock(schema.duration_seconds):wod.duration_minutes?wod.duration_minutes+' MIN':''}</span></div>
            <h4>{wod.name}</h4>
            <div className="wod-card-summary">{wodItems.length?String(wodItems.length)+' øvingar':wod.movements?'Øvingar og instruksjon':'Opna for detaljar'}{schema.stimulus?' · '+schema.stimulus:''}</div>
            <div className="wod-card-actions">
              <button type="button" className="secondary-button" onClick={()=>setExpandedWodId(isExpanded?null:wod.id)}>{isExpanded?'Skjul detaljar':'Sjå detaljar'}</button>
              <button type="button" className="primary-button" onClick={()=>startWorkout(wod)}>Utfør WOD</button>
              <button type="button" className={favoriteWodIds.includes(wod.id)?'favorite-star selected':'favorite-star'} onClick={()=>toggleWodFavorite(wod)} aria-label={favoriteWodIds.includes(wod.id)?'Fjern WOD-favoritt':'Merk WOD som favoritt'}><Star size={17} fill={favoriteWodIds.includes(wod.id)?'currentColor':'none'}/></button>
            </div>
            {isExpanded&&<div className="wod-detail-panel">
              {wodItems.length?<div className="wod-detail-exercises"><strong>Øvingar og dosering</strong><ol>{wodItems.map((item,index)=><li key={item.exercise_id||item.exercise_name||index}><span>{item.exercise_name||'Øving '+(index+1)}</span><b>{item.levels?['rx','scaled','foundation'].map(level=>{const value=doseLabel(item,level);return value?<span key={level}>{level.toUpperCase()}: {value} </span>:null}):item.reps_mode==='amrap'?'AMRAP':item.reps!=null&&item.reps!==''?item.reps+' reps':(item.sets||[]).map(set=>set.reps+' reps').filter(Boolean).join(' / ')||'Etter plan'}</b>{item.load_label&&<small>{item.load_label}</small>}{item.coach_note&&<small>{item.coach_note}</small>}</li>)}</ol></div>:wod.movements&&<div className="wod-detail-exercises"><strong>Øvingar</strong><p>{wod.movements}</p></div>}
              {schema.rx_notes&&<div className="wod-level-note"><strong>RX</strong><p>{schema.rx_notes}</p></div>}
              {schema.scaled_notes&&<div className="wod-level-note"><strong>Scaled</strong><p>{schema.scaled_notes}</p></div>}
              {schema.coach_notes&&<div className="wod-level-note"><strong>Coach-notat</strong><p>{schema.coach_notes}</p></div>}
              {!schema.rx_notes&&!schema.scaled_notes&&!schema.coach_notes&&wod.notes&&<div className="wod-level-note"><strong>Instruksjon</strong><p>{wod.notes}</p></div>}
            </div>}
          </article>
        })}</div> : <div className="empty-state">{wodFavoritesOnly?'Du har ikkje merkt nokon WOD-ar som favoritt.':wodSearch?'Ingen WOD-ar passar søket.':'Ingen publiserte WOD-ar enno.'}</div>}
      </section>}
      <section className={simpleMode ? "engine-section simple-hidden-section" : "engine-section"}>
        <div className="training-heading"><div><div className="section-kicker">HISTORIKK</div><h3>Siste økter</h3></div><span className="count-pill">{history.length} økter</span></div>
        {history.length ? <div className="history-list">{history.map(log => <article className="history-card" key={log.id}><div className="history-card-top"><strong>{log.title}</strong><span>{log.workout_date}</span></div><small>{log.format} · {log.workout_exercises?.length || 0} øvingar</small>{log.workout_exercises?.sort((a,b)=>a.sort_order-b.sort_order).map(ex => <div className="history-exercise" key={ex.id}><b>{ex.exercise_name}</b><span>{(ex.workout_sets || []).map(s => [s.reps ? s.reps+' reps' : '', s.load_kg ? s.load_kg+' kg' : '', s.time_text || ''].filter(Boolean).join(' · ')).filter(Boolean).join(' / ') || 'Ingen sett registrert'}</span></div>)}{log.note && <p>{log.note}</p>}</article>)}</div> : <div className="empty-state">Du har ikkje lagra økter enno.</div>}
      </section>
      <section className={simpleMode ? "engine-section simple-hidden-section" : "engine-section"}>
        <div className="training-heading"><div><div className="section-kicker">PROGRESJON</div><h3>Personlege rekordar</h3></div><span className="count-pill">{records.length} PR</span></div>
        <form className="pr-form" onSubmit={savePersonalRecord}>
          <input value={prName} onChange={e => setPrName(e.target.value)} placeholder="Øving, t.d. Markløft" required/>
          <input value={prResult} onChange={e => setPrResult(e.target.value)} placeholder="Resultat, t.d. 120" required/>
          <select value={prUnit} onChange={e => setPrUnit(e.target.value)}><option value="kg">kg</option><option value="reps">reps</option><option value="sek">sek</option><option value="min">min</option><option value="meter">meter</option><option value="watt">watt</option></select>
          <input value={prNote} onChange={e => setPrNote(e.target.value)} placeholder="Notat (valfritt)"/>
          <button className="secondary-button" type="submit" disabled={prSaving}>{prSaving ? 'Lagrar …' : 'Registrer PR'}</button>
        </form>
        {records.length ? <div className="history-list">{records.map(record => <article className="history-card" key={record.id}><div className="history-card-top"><strong>{record.exercise_name}</strong><span>{record.record_date}</span></div><div className="pr-result">{record.result} {record.unit}</div>{record.note && <small>{record.note}</small>}</article>)}</div> : <div className="empty-state">Ingen personlege rekordar registrerte enno.</div>}
      </section>
      <section className={simpleMode ? "engine-section simple-hidden-section" : "engine-section"}>
        <div className="training-heading"><div><div className="section-kicker">BIBLIOTEK</div><h3>Øvingsbibliotek</h3></div><span className="count-pill">{exercises.length} øvingar</span></div>
        {exercises.length ? <><div className="exercise-library-toolbar"><label className="exercise-library-search"><Search size={15}/><input value={libraryQuery} onChange={e => setLibraryQuery(e.target.value)} placeholder="Søk etter øving eller kategori …"/></label><button type="button" className={favoritesOnly ? 'secondary-button favorite-filter active' : 'secondary-button favorite-filter'} onClick={() => setFavoritesOnly(v => !v)}><Star size={14}/>{favoritesOnly ? 'Vis alle øvingar' : 'Favorittar'}</button></div>{(()=>{const q=libraryQuery.trim().toLowerCase();const filtered=exercises.filter(ex=>(!favoritesOnly||favoriteNames.includes(ex.name))&&(!q||[ex.name,ex.category,ex.equipment].some(v=>(v||'').toLowerCase().includes(q))));const categories=[...new Set(filtered.map(ex=>ex.category||'Anna'))].sort((a,b)=>a.localeCompare(b,'nn'));return <div className="exercise-library-groups">{categories.length?categories.map((category,index)=>{const group=filtered.filter(ex=>(ex.category||'Anna')===category);return <details className="exercise-library-group" key={category} open={!!q||index===0}><summary><strong>{category}</strong><span>{group.length} øvingar</span></summary><div className="exercise-list">{group.map(ex=><div className="exercise-row" key={ex.id}><Dumbbell size={16}/><div><strong>{ex.name}</strong><span>{[ex.category,ex.equipment].filter(Boolean).join(' · ')}</span></div><button type="button" className={favoriteNames.includes(ex.name)?'favorite-star selected':'favorite-star'} onClick={()=>toggleFavorite(ex)} aria-label={favoriteNames.includes(ex.name)?'Fjern favoritt':'Legg til favoritt'}><Star size={17} fill={favoriteNames.includes(ex.name)?'currentColor':'none'}/></button></div>)}</div></details>}) : <div className="empty-state">{favoritesOnly?'Du har ikkje merkt nokon øvingar som favoritt.':'Ingen øvingar passar søket.'}</div>}</div>})()}</> : <div className="empty-state">Øvingsbiblioteket er tomt. Øvingar kan leggjast inn av admin/manager.</div>}
      </section>
    </>}
  </div>
}
