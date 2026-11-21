import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, CheckCircle2, Clock3, Dumbbell, LoaderCircle, Pause, Play, Plus, RotateCcw, Save, Search, Star, Heart, Trash2, Settings2, List, Volume2, VolumeX, Maximize2, Minimize2, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { RELEASE_NAME } from '../lib/release.js'
import HeartRateTrainingPanel from './HeartRateTrainingPanel.jsx'
import { MusicMiniPlayer } from './Music.jsx'
import { readDeviceProfile, useDeviceProfile } from '../lib/deviceLayout.js'
import { getWodSchemaItems, sortWodItems } from '../lib/wodOrdering.js'
import { formatComplexSequence } from '../lib/wodComplexes.js'
import { formatParticipation, normalizeWodEngine, parseIntervalNotation } from '../lib/wodEngine.js'
import PerformanceCenter from './PerformanceCenter.jsx'
import { clampElapsedToTarget, elapsedSecondsFromTimestamp, getFixedSlotTimerState, normalizeEmomIntervalMinutes, splitDuration, summarizeLapSplits } from '../lib/timerClock.js'
import { getExerciseMeasurementFlags } from '../lib/exerciseMeasurements.js'
import { getWodSideLabel } from '../lib/wodSides.js'
import { captureTrainingLaunchContext, emptyTrainingLaunchContext } from '../lib/trainingLaunchContext.js'
import './timer-viewport.css'

const FORMATS = ['Fri trening', 'E1MOM', 'E1.25MOM', 'E2MOM', 'E3MOM', 'E4MOM', 'E5MOM', 'E6MOM', 'E7MOM', 'AMRAP', 'For Time', 'Chipper', 'Couplet', 'Triplet', 'Ladder', 'Death By', 'Tabata', 'Intervall', 'Row Intervals', 'Strength', 'Pyramid', 'Superset', 'Complex', 'Eigen økt', 'Stoppeklokke', 'Nedteljing', 'Tilpassa']
const emptyExercise = () => ({ key: crypto.randomUUID(), exercise_id: '', exercise_name: '', uses_height: false, uses_load: true, equipment:'', rowValue:'', rowUnit:'m', workSeconds:'', sets: [{ reps: '', load_kg: '', time_text: '', time_seconds: '', height_cm: '' }] })
const pad = (n) => String(n).padStart(2, '0')
const clock = (seconds) => `${pad(Math.floor(Math.max(0, seconds) / 60))}:${pad(Math.max(0, seconds) % 60)}`
const doseLabel=(item,level='rx')=>{const d=item?.levels?.[level]||(level==='intermediate'?item?.levels?.rx:null)||{};const parts=[];if(d.sets)parts.push(d.sets+' sett');if(d.reps)parts.push(d.reps+' reps');if(d.heightCm)parts.push(d.heightCm+' cm');if(d.durationSeconds)parts.push(d.durationSeconds+' sek');if(d.distanceMeters)parts.push(d.distanceMeters+' m');if(d.calories)parts.push(d.calories+' cal');if(d.loadMode==='kg'){const loads=[d.loadKgMen!==''&&d.loadKgMen!=null?'M '+d.loadKgMen+' kg':'',d.loadKgWomen!==''&&d.loadKgWomen!=null?'K '+d.loadKgWomen+' kg':''].filter(Boolean);if(loads.length)parts.push(loads.join(' / '))}else if(d.loadMode==='percent'&&d.percent1rm)parts.push(d.percent1rm+' % 1RM');else if(d.loadMode==='rir'&&d.rir!=='')parts.push('RIR '+d.rir);else if(d.loadMode==='bodyweight')parts.push('Kroppsvekt');if(d.tempo)parts.push('Tempo '+d.tempo);if(d.variant)parts.push('Variant: '+d.variant);if(d.instruction)parts.push(d.instruction);return parts.join(' · ')||''};
const isEmomFormat = format => /^E\d+(?:\.\d+)?MOM$/.test(format||'') || ['EMOM','EMOM 1','EMOM 2'].includes(format)
const getEmomIntervalMinutes = (format, timerSettings) => Math.max(0.25,Math.min(60,Number(timerSettings?.workout_schema?.interval?.work_every_minutes)||parseIntervalNotation(format)?.intervalMinutes||(format==='EMOM 2'?2:1)))
const getDefaultWorkSeconds = (format, timerSettings) => {
 const saved=timerSettings?.work_seconds ?? timerSettings?.workout_schema?.station_circuit?.work_seconds ?? timerSettings?.workout_schema?.interval?.work_seconds
 if(saved!=null&&Number(saved)>0)return Number(saved)
 if(format==='Tabata')return 20
 if(isEmomFormat(format))return getEmomIntervalMinutes(format,timerSettings)*60
 return 60
}
const getDefaultRestSeconds = (format, timerSettings) => {
 const saved=timerSettings?.rest_seconds ?? timerSettings?.workout_schema?.station_circuit?.transition_seconds ?? timerSettings?.workout_schema?.interval?.rest_seconds
 if(saved!=null&&Number(saved)>=0)return Number(saved)
 if(format==='Tabata')return 10
 if(isEmomFormat(format))return 0
 return 60
}

const localDateISO = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function TimerPanel({id,title,layout,onMove,onResize,onLock,locked,children,deviceProfile,wide=false,designMode=false}){
 const gridColumn=deviceProfile.device==='mobile'
  ? (deviceProfile.orientation==='landscape'&&id!=='clock'&&id!=='music'?'span 1':'1 / -1')
  : deviceProfile.device==='tablet'&&deviceProfile.orientation==='portrait'
   ? (id==='clock'||id==='music'?'1 / -1':`span ${layout.span>=6?2:1}`)
   : `span ${layout.span}`
 return <section data-timer-panel={id} className={`timer-layout-panel timer-panel-${id} ${locked?'is-locked':''} ${designMode?'is-editable':''}`} style={{'--timer-grid-column':gridColumn,'--timer-panel-height':`${layout.height}px`}} draggable={designMode&&!locked} onDragStart={e=>{if(!designMode||locked)return;e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move'}} onDragOver={e=>{if(designMode&&!locked)e.preventDefault()}} onDrop={e=>{if(!designMode)return;e.preventDefault();const from=e.dataTransfer.getData('text/plain');if(from&&from!==id)onMove(from,id)}}>
  {designMode&&<header className="timer-panel-toolbar">{designMode&&<span className="timer-panel-grip" aria-hidden="true">⠿</span>}<b>{title}</b>{designMode&&<div className="timer-panel-tools">
   <button type="button" title="Flytt panelet opp" aria-label={`Flytt ${title} opp`} disabled={locked} onClick={()=>onMove(id,'up')}>↑</button>
   <button type="button" title="Flytt panelet ned" aria-label={`Flytt ${title} ned`} disabled={locked} onClick={()=>onMove(id,'down')}>↓</button>
   <button type="button" title="Gjer panelet smalare" aria-label="Gjer panelet smalare" disabled={locked||layout.span<=2} onClick={()=>onResize(id,'span',-1)}>−B</button>
   <button type="button" title="Gjer panelet breiare" aria-label="Gjer panelet breiare" disabled={locked||layout.span>=12} onClick={()=>onResize(id,'span',1)}>+B</button>
   <button type="button" title="Gjer panelet lågare" aria-label="Gjer panelet lågare" disabled={locked||layout.height<=120} onClick={()=>onResize(id,'height',-40)}>−H</button>
   <button type="button" title="Gjer panelet høgare" aria-label="Gjer panelet høgare" disabled={locked||layout.height>=900} onClick={()=>onResize(id,'height',40)}>+H</button>
   <button type="button" className={locked?'is-locked':''} onClick={()=>onLock(id)} title={locked?'Lås opp panelet':'Lås panelet'}>{locked?'Låst':'Lås'}</button>
  </div>}</header>}
  <div className="timer-panel-content">{children}</div>
 </section>
}
function Timer({ format, minutes, seconds = 0, activeExercise = '', nextExercise = '', exerciseList = [], prescriptionLevel = 'rx', timerSettings = null, onSnapshot = () => {}, stop = false, onFinish = () => {}, originLabel = 'EIGA ØKT', autoStartToken = 0 }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(1)
  const [workSeconds, setWorkSeconds] = useState(getDefaultWorkSeconds(format,timerSettings))
  const [restSeconds, setRestSeconds] = useState(getDefaultRestSeconds(format,timerSettings))
  const [rounds, setRounds] = useState(timerSettings?.rounds ?? timerSettings?.workout_schema?.station_circuit?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
  const [durationOverride, setDurationOverride] = useState(null)
  const [emomEveryOverride, setEmomEveryOverride] = useState(null)
  // Phone and tablet sessions open with the clock using the whole viewport.
  // Desktop keeps the wider training workspace until the user expands it.
  const [focused, setFocused] = useState(() => readDeviceProfile().device !== 'desktop')
  const timerContainerRef = useRef(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [phase, setPhase] = useState('Klar')
  const [laps, setLaps] = useState([])
  const [soundOn, setSoundOn] = useState(true)
  const [showTimerSettings, setShowTimerSettings] = useState(false)
  const [stagePanel, setStagePanel] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [browserFullscreen, setBrowserFullscreen] = useState(false)
  const deviceProfile = useDeviceProfile()
  const [designMode, setDesignMode] = useState(false)
  const defaultPanelLayout={clock:{span:6,height:520},info:{span:3,height:360},laps:{span:3,height:360},music:{span:12,height:90}}
  const panelKey=(kind,layout=deviceProfile.layout)=>`garasjegym.timer.${kind}.${layout}`
  const [panelLayout,setPanelLayout]=useState(()=>{
    const layout=readDeviceProfile().layout
    try{return {...defaultPanelLayout,...JSON.parse(localStorage.getItem(`garasjegym.timer.panels.${layout}`)||localStorage.getItem('garasjegym.timer.panels')||'{}')}}
    catch{return defaultPanelLayout}
  })
  const [panelOrder,setPanelOrder]=useState(()=>{
    const layout=readDeviceProfile().layout
    try{return JSON.parse(localStorage.getItem(`garasjegym.timer.panelOrder.${layout}`)||localStorage.getItem('garasjegym.timer.panelOrder')||'["clock","info","laps","music"]')}
    catch{return ['clock','info','laps','music']}
  })
  const [lockedPanels,setLockedPanels]=useState(()=>{
    const layout=readDeviceProfile().layout
    try{return JSON.parse(localStorage.getItem(`garasjegym.timer.panelLocks.${layout}`)||localStorage.getItem('garasjegym.timer.panelLocks')||'{}')}
    catch{return {}}
  })
  const lastPanelLayoutKey=useRef(deviceProfile.layout)
  const skipPanelSave=useRef(false)
  useEffect(()=>{
    if(lastPanelLayoutKey.current===deviceProfile.layout)return
    lastPanelLayoutKey.current=deviceProfile.layout
    skipPanelSave.current=true
    try{
      setPanelLayout({...defaultPanelLayout,...JSON.parse(localStorage.getItem(panelKey('panels'))||'{}')})
      setPanelOrder(JSON.parse(localStorage.getItem(panelKey('panelOrder'))||'["clock","info","laps","music"]'))
      setLockedPanels(JSON.parse(localStorage.getItem(panelKey('panelLocks'))||'{}'))
    }catch{
      setPanelLayout(defaultPanelLayout);setPanelOrder(['clock','info','laps','music']);setLockedPanels({})
    }
  },[deviceProfile.layout])
  useEffect(()=>{
    if(skipPanelSave.current){skipPanelSave.current=false;return}
    if(lastPanelLayoutKey.current!==deviceProfile.layout)return
    try{
      localStorage.setItem(panelKey('panels'),JSON.stringify(panelLayout))
      localStorage.setItem(panelKey('panelOrder'),JSON.stringify(panelOrder))
      localStorage.setItem(panelKey('panelLocks'),JSON.stringify(lockedPanels))
    }catch{}
  },[panelLayout,panelOrder,lockedPanels,deviceProfile.layout])
  function movePanel(from,to){setPanelOrder(order=>{const next=[...order],a=next.indexOf(from);if(a<0)return order;const b=to==='up'?Math.max(0,a-1):to==='down'?Math.min(next.length-1,a+1):next.indexOf(to);if(b<0||a===b)return order;next.splice(a,1);next.splice(b,0,from);return next})}
  function resizePanel(id,field,delta){setPanelLayout(layout=>({...layout,[id]:{...layout[id],[field]:field==='span'?Math.max(2,Math.min(12,layout[id].span+delta)):Math.max(120,Math.min(900,layout[id].height+delta))}}))}
  function togglePanelLock(id){setLockedPanels(v=>({...v,[id]:!v[id]}))}
  function resetPanelLayout(){setPanelLayout({clock:{span:6,height:520},info:{span:3,height:360},laps:{span:3,height:360},music:{span:12,height:90}});setPanelOrder(['clock','info','laps','music']);setLockedPanels({})}
  function applyLayoutPreset(preset){
    const presets={
      standard:{order:['clock','info','laps','music'],layout:{clock:{span:8,height:520},info:{span:4,height:360},laps:{span:4,height:300},music:{span:12,height:90}}},
      minimal:{order:['clock'],layout:{clock:{span:12,height:620},info:{span:4,height:300},laps:{span:4,height:260},music:{span:12,height:90}}},
      group:{order:['clock','info','laps','music'],layout:{clock:{span:8,height:600},info:{span:4,height:360},laps:{span:4,height:260},music:{span:12,height:90}}},
      pt:{order:['clock','info','laps'],layout:{clock:{span:7,height:520},info:{span:5,height:420},laps:{span:5,height:260},music:{span:12,height:90}}}
    }
    const selected=presets[preset]||presets.standard
    setPanelOrder(selected.order)
    setPanelLayout({...defaultPanelLayout,...selected.layout})
    setLockedPanels({})
    setDesignMode(false)
  }

  const [appearance, setAppearance] = useState(() => {
    try { return { clockSize: 112, accent: '#f0a33a', ...(JSON.parse(localStorage.getItem('garasjegym.timer.appearance') || '{}')) } }
    catch { return { clockSize: 112, accent: '#f0a33a' } }
  })
  useEffect(() => { try { localStorage.setItem('garasjegym.timer.appearance', JSON.stringify(appearance)) } catch { /* Optional local preference. */ } }, [appearance])
  const schema = timerSettings?.workout_schema
  const savedDuration = Number(schema?.duration_seconds) || 0
  const capDuration = Number(schema?.time_cap_seconds) || (Number(schema?.time_cap_minutes) || 0) * 60
  const isEMOM = /^E\d+(?:\.\d+)?MOM$/.test(format) || ['EMOM', 'EMOM 1', 'EMOM 2'].includes(format)
  const emomEvery = normalizeEmomIntervalMinutes(emomEveryOverride, getEmomIntervalMinutes(format,timerSettings))
  const emomCycle = emomEvery * 60
  const effectiveEmomWorkSeconds = Math.max(1,Math.min(emomCycle,Number(workSeconds)||emomCycle))
  const effectiveEmomRestSeconds = Math.max(0,Math.min(emomCycle-effectiveEmomWorkSeconds,Number(restSeconds)||0))
  const emomPhaseElapsed = elapsed % emomCycle
  const isEmomWorkPhase = emomPhaseElapsed < effectiveEmomWorkSeconds
  const emomPhaseAfterWork = Math.max(0,emomPhaseElapsed-effectiveEmomWorkSeconds)
  const isEmomRestPhase = !isEmomWorkPhase && emomPhaseAfterWork < effectiveEmomRestSeconds
  const emomPhaseRemaining = isEmomWorkPhase ? effectiveEmomWorkSeconds-emomPhaseElapsed : isEmomRestPhase ? effectiveEmomRestSeconds-emomPhaseAfterWork : emomCycle-emomPhaseElapsed
  const isTimedInterval = ['Tabata', 'Intervall', 'Tilpassa', 'Row Intervals'].includes(format)
  const isStationCircuit = format === 'Stasjonssirkel' || schema?.structure === 'station_circuit'
  const stationPlan = schema?.station_circuit || {}
  const stationList = Array.isArray(stationPlan.stations) && stationPlan.stations.length ? stationPlan.stations : (schema?.items || []).map((item,index)=>({...item,station_number:index+1}))
  const stationCount = Math.max(1, Number(stationPlan.station_count) || stationList.length || 1)
  const isCountdown = ['AMRAP', 'Nedteljing'].includes(format) || (['Couplet', 'Triplet'].includes(format) && schema?.combination_mode === 'AMRAP')
  const isForTime = ['For Time', 'Chipper'].includes(format) || (['Couplet', 'Triplet'].includes(format) && schema?.combination_mode === 'For Time')
  const isDeathBy = format === 'Death By'
  const isLadder = format === 'Ladder'
  const hasTimeCap = capDuration > 0 && !isCountdown && !isEMOM && !isTimedInterval && !isStationCircuit
  const fallbackDuration = Math.max(1, (Number(minutes) || 10) * 60 + (Number(seconds) || 0))
  const defaultTarget = Math.max(1, isCountdown && capDuration ? capDuration : hasTimeCap ? capDuration : savedDuration || fallbackDuration)
  const target = Math.max(1, Number(durationOverride) || defaultTarget)
  const effectiveWorkSeconds = Math.max(1, Number(workSeconds) || 1)
  const effectiveRestSeconds = Math.max(0, Number(restSeconds) || 0)
  const cycle = effectiveWorkSeconds + effectiveRestSeconds
  const intervalExerciseCount = Math.max(1, exerciseList.length || Number(schema?.interval_exercise_count) || 1)
   // Intervals and station circuits share one finite-slot calculation. It removes
  // the final transition, clamps the finished phase to zero, and counts completed rounds.
  const fixedSlotState = getFixedSlotTimerState({
    elapsed,
    workSeconds: effectiveWorkSeconds,
    restSeconds: effectiveRestSeconds,
    rounds,
    slotsPerRound: isStationCircuit ? stationCount : intervalExerciseCount,
    transitionLabel: isStationCircuit ? 'BYTE STASJON' : 'KVILE',
  })
  const intervalTotal = fixedSlotState.totalSeconds
  const intervalExerciseIndex = fixedSlotState.currentSlotIndex % intervalExerciseCount
  const currentIntervalExercise = exerciseList[intervalExerciseIndex]?.exercise_name || exerciseList[intervalExerciseIndex]?.name || activeExercise
  const currentEmomRound = Math.floor(elapsed/emomCycle)+1
  const hasExplicitEmomSlots = exerciseList.some(item=>String(item.minute_slot??item.minuteSlot??'').trim()!=='')
  const currentEmomExercises = exerciseList.filter(item=>String(item.minute_slot??item.minuteSlot??'').split(/[,\s;\/]+/).some(slot=>Number(slot)===currentEmomRound))
  const currentEmomExercise = currentEmomExercises.length
    ? currentEmomExercises.map(item=>item.is_rest?'Pause':item.exercise_name||item.name||'Øving').join(' + ')
    : hasExplicitEmomSlots ? 'Ingen øving for denne runden'
    : exerciseList.length>1 ? (exerciseList[(currentEmomRound-1)%exerciseList.length]?.exercise_name||exerciseList[(currentEmomRound-1)%exerciseList.length]?.name||activeExercise)
    : activeExercise
  const stationTotal = fixedSlotState.totalSeconds
  const timerLimitReached = (
    (isCountdown || isEMOM || isStationCircuit || hasTimeCap) && elapsed >= (isStationCircuit ? stationTotal : target)
  ) || (isTimedInterval && elapsed >= intervalTotal)
  const totalTarget = isStationCircuit ? stationTotal : isTimedInterval ? intervalTotal : target
  const remainingTotal = Math.max(0, totalTarget - elapsed)
  const inWorkPhase = !fixedSlotState.isTransition && !fixedSlotState.isComplete
  const phaseRemaining = fixedSlotState.phaseRemaining
  const currentRound = (isStationCircuit || isTimedInterval)
    ? fixedSlotState.currentRound
    : isEMOM ? Math.floor(elapsed / emomCycle) + 1
    : (isDeathBy || isLadder) ? Math.floor(elapsed / 60) + 1
    : Math.floor(elapsed / 60) + 1
  const currentPhase = isStationCircuit || isTimedInterval
    ? fixedSlotState.phase
    : isEMOM ? (isEmomWorkPhase ? 'ARBEID' : isEmomRestPhase ? 'KVILE' : 'VENTAR')
    : (isDeathBy || isLadder) ? 'NY RUNDE' : 'PÅGÅR'
  const primaryTime = isCountdown ? remainingTotal
    : (isTimedInterval || isStationCircuit) ? phaseRemaining
    : isEMOM ? (timerLimitReached ? 0 : emomPhaseRemaining)
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
    timerRunStartedAt.current = null
    timerRunBaseElapsed.current = 0
    elapsedRef.current = 0
    setElapsed(0); setRunning(false); setRound(1); setPhase('Klar'); setLaps([])
    setWorkSeconds(getDefaultWorkSeconds(format,timerSettings))
    setRestSeconds(getDefaultRestSeconds(format,timerSettings))
    setRounds(timerSettings?.rounds ?? timerSettings?.workout_schema?.station_circuit?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
    setDurationOverride(null); setEmomEveryOverride(null)
  }, [format, minutes, seconds, timerSettings?.work_seconds, timerSettings?.workout_schema?.station_circuit?.work_seconds, timerSettings?.workout_schema?.station_circuit?.transition_seconds, timerSettings?.rest_seconds, timerSettings?.rounds, timerSettings?.workout_schema?.duration_seconds, timerSettings?.workout_schema?.time_cap_seconds, timerSettings?.workout_schema?.interval?.work_seconds, timerSettings?.workout_schema?.interval?.work_every_minutes, timerSettings?.workout_schema?.interval?.rest_seconds, timerSettings?.workout_schema?.rounds, timerSettings?.workout_schema?.station_circuit?.rounds])

  // Starting a WOD from the library or a PT assignment launches the timer
  // immediately. The token also retriggers this when the Timer component stays mounted.
  useEffect(() => {
    if (!autoStartToken) return
    timerRunBaseElapsed.current = 0
    elapsedRef.current = 0
    timerRunStartedAt.current = Date.now()
    setElapsed(0)
    setRound(1)
    setLaps([])
    setDurationOverride(null); setEmomEveryOverride(null)
    setWorkSeconds(getDefaultWorkSeconds(format,timerSettings))
    setRestSeconds(getDefaultRestSeconds(format,timerSettings))
    setRounds(timerSettings?.rounds ?? timerSettings?.workout_schema?.station_circuit?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
    setHasStarted(true)
    setPhase('PÅGÅR')
    setRunning(true)
  }, [autoStartToken])

  useEffect(() => {
    if (!stop) return
    setRunning(false)
    if (document.fullscreenElement === timerContainerRef.current) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [stop])
  useEffect(() => {
    const sync = () => setBrowserFullscreen(document.fullscreenElement === timerContainerRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const stageVisible = focused && !stop
  useEffect(() => {
    if (!stageVisible) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [stageVisible])

  // Derive elapsed time from wall-clock timestamps. Interval callbacks only refresh
  // the display; they never accumulate time, so background throttling cannot create drift.
  const timerRunStartedAt = useRef(null)
  const timerRunBaseElapsed = useRef(0)
  const elapsedRef = useRef(elapsed)
  useEffect(() => { elapsedRef.current = elapsed }, [elapsed])
  useEffect(() => {
    if (running) {
      timerRunBaseElapsed.current = elapsedRef.current
      timerRunStartedAt.current = Date.now()
      const refresh = () => {
        if (timerRunStartedAt.current == null) return
        const nextElapsed = elapsedSecondsFromTimestamp(timerRunStartedAt.current, timerRunBaseElapsed.current)
        setElapsed(current => current === nextElapsed ? current : nextElapsed)
      }
      refresh()
      const id = window.setInterval(refresh, 200)
      return () => window.clearInterval(id)
    }
    if (timerRunStartedAt.current != null) {
      const finalElapsed = elapsedSecondsFromTimestamp(timerRunStartedAt.current, timerRunBaseElapsed.current)
      timerRunStartedAt.current = null
      setElapsed(current => Math.max(current, finalElapsed))
    }
    return undefined
  }, [running])

  useEffect(() => { onSnapshot({ elapsed, laps, roundsCompleted: isStationCircuit ? fixedSlotState.roundsCompleted : isAmrap ? laps.length : round, phase, running, remaining:remainingTotal, displayTime:primaryTime, countdown:isCountdown||isEMOM||isTimedInterval||isStationCircuit||hasTimeCap, currentRound }) }, [elapsed, laps, round, phase, running, isCountdown, onSnapshot, isStationCircuit, cycle, stationCount, stationPlan.rounds, schema?.rounds, rounds, remainingTotal, currentRound])

  useEffect(() => {
    if (!running) return
    if (timerLimitReached) {
      const finishAt = isStationCircuit ? stationTotal : isTimedInterval ? intervalTotal : target
      setElapsed(clampElapsedToTarget(elapsed, finishAt))
      timerRunStartedAt.current = null
      setRunning(false)
      setPhase(hasTimeCap ? 'TIDSGRENSE' : 'FERDIG')
      cue(520, 0.5)
      return
    }
    if (((isTimedInterval || isStationCircuit) && (elapsed % cycle === 0 || elapsed % cycle === effectiveWorkSeconds)) ||
      (isEMOM && elapsed > 0 && (elapsed % emomCycle === 0 || elapsed % emomCycle === effectiveEmomWorkSeconds || elapsed % emomCycle === effectiveEmomWorkSeconds+effectiveEmomRestSeconds)) ||
      (isDeathBy && elapsed > 0 && elapsed % 60 === 0)) cue(1040, 0.12)
  }, [elapsed, running, timerLimitReached, target, capDuration, hasTimeCap, isCountdown, isEMOM, isDeathBy, isTimedInterval, isStationCircuit, intervalTotal, stationTotal, cycle, emomCycle, effectiveWorkSeconds, effectiveEmomWorkSeconds, effectiveEmomRestSeconds])

  useEffect(() => {
    // Do not let the ordinary phase refresh overwrite FERDIG / TIDSGRENSE.
    if (running && !timerLimitReached) setPhase(currentPhase)
  }, [elapsed, running, currentPhase, timerLimitReached])

  async function toggleFocus() {
    if (!focused) {
      setFocused(true)
    } else {
      try { if (document.fullscreenElement === timerContainerRef.current) await document.exitFullscreen?.() } catch { /* Ignorer. */ }
      setStagePanel(null)
      setFocused(false)
    }
  }

  async function toggleBrowserFullscreen() {
    try {
      if (document.fullscreenElement === timerContainerRef.current) await document.exitFullscreen?.()
      else await timerContainerRef.current?.requestFullscreen?.()
    } catch { /* CSS-flata fungerer òg når nettlesaren nektar ekte fullskjerm. */ }
  }

  const isAmrap = format === 'AMRAP' || (['Couplet','Triplet'].includes(format) && schema?.combination_mode === 'AMRAP')
  const isStopwatch = ['Stoppeklokke', 'Fri trening', 'Strength', 'Pyramid', 'Superset', 'Complex', 'Eigen økt'].includes(format) ||
    (['Couplet', 'Triplet'].includes(format) && schema?.combination_mode === 'Open')
  const showTimeCap = hasTimeCap
  const roundsShown = isTimedInterval ? Math.min(currentRound, Number(rounds)) : currentRound
  const completedRounds = isAmrap ? laps.length : round
  const lapAction = () => { if(!running)return; setLaps(value => [...value, splitDuration(elapsed, value)]); setRound(value => value + 1); cue(1200, 0.1) }
  const splitAction = () => { if(!running)return; setLaps(value => [...value, splitDuration(elapsed, value)]); cue(1200, 0.1) }
  const toggleRunning = () => { if (running) { setRunning(false); setPhase('PAUSE'); return } if (phase === 'FERDIG' || phase === 'TIDSGRENSE') return; setHasStarted(true); setPhase('PÅGÅR'); setRunning(true) }
  const visibleStationIndex = Math.min(stationCount - 1, fixedSlotState.currentSlotIndex % stationCount)
  const currentStationName = stationList[visibleStationIndex]?.exercise_name || stationList[visibleStationIndex]?.name || `Stasjon ${visibleStationIndex + 1}`
  const stageExerciseName = isStationCircuit ? currentStationName : isTimedInterval ? currentIntervalExercise : isEMOM ? currentEmomExercise : activeExercise || exerciseList[0]?.exercise_name || exerciseList[0]?.name || ''
  const stageNextExercise = isStationCircuit ? stationList[(visibleStationIndex + 1) % stationCount]?.exercise_name : isTimedInterval ? exerciseList[(intervalExerciseIndex + 1) % intervalExerciseCount]?.exercise_name : nextExercise
  const stageTimeLabel = isCountdown ? 'TID ATT' : isStationCircuit ? (inWorkPhase ? 'ARBEID ATT' : 'BYTE ATT') : isTimedInterval ? (inWorkPhase ? 'ARBEID ATT' : 'KVILE ATT') : isEMOM ? (isEmomWorkPhase ? 'ARBEID ATT' : isEmomRestPhase ? 'KVILE ATT' : 'NESTE START') : 'MEDGÅTT TID'
  const stageIsComplete = phase === 'FERDIG' || phase === 'TIDSGRENSE'
  const stageLapLabel = isAmrap ? 'RUNDETIDER' : 'MELLOMTIDER'
  const stageLapHistory = useMemo(()=>summarizeLapSplits(laps),[laps])
  // Keep the complete WOD visible, including repeated exercises and pauses.
  // The selected level also carries side instructions such as Høgre/Venstre.
  const stageRows = (isStationCircuit ? stationList : exerciseList).map(item => {
    const savedLevel=item.prescription_levels?.[prescriptionLevel] || item.levels?.[prescriptionLevel] || item.prescription_levels?.rx || item.levels?.rx
    const setReps=(item.sets||[]).map(set=>String(set.reps??'').trim()).filter(Boolean)
    const uniqueReps=[...new Set(setReps)]
    const reps=savedLevel?.reps != null ? String(savedLevel.reps).trim() : uniqueReps.join(' / ') || String(item.reps??'').trim()
    const side=getWodSideLabel(item,prescriptionLevel)
    const details=item.is_rest?[`${Number(item.rest_duration_seconds)||30} sek`]:[
      reps ? `${reps} reps${side==='per side'?' per side':''}` : '',
      savedLevel?.heightCm ? `${savedLevel.heightCm} cm` : '',
      savedLevel?.durationSeconds ? `${savedLevel.durationSeconds} sek` : '',
      savedLevel?.distanceMeters ? `${savedLevel.distanceMeters} m` : '',
      savedLevel?.calories ? `${savedLevel.calories} cal` : '',
      side && side!=='per side' ? side : '',
    ]
    return {id:item.key||item.exercise_id||item.station_number||item.exercise_name,name:item.is_rest?'Pause':item.exercise_name||item.name||'Øving',dose:details.filter(Boolean).join(' · ')||item.prescription_label||''}
  })
  const resetTimer = () => { timerRunStartedAt.current = null; timerRunBaseElapsed.current = 0; elapsedRef.current = 0; setRunning(false); setElapsed(0); setRound(1); setLaps([]); setPhase('Klar'); setHasStarted(false); setConfirmReset(false); setStagePanel(null) }
  return <div ref={timerContainerRef} className={stageVisible ? 'engine-timer timer-focused timer-customized' : 'engine-timer timer-customized'} style={{ '--timer-clock-size': `${appearance.clockSize}px`, '--timer-accent': appearance.accent }}>
    {stageVisible ? <section className="gg-live-timer" aria-label="Fullskjermsklokke for treningsøkt">
      <header className="gg-live-timer__header">
        <div className="gg-live-timer__identity"><span className="gg-live-timer__brand">GARASJEGYM</span><strong>{format}</strong><span className="gg-live-timer__origin">{originLabel}</span></div>
        <div className="gg-live-timer__tools">
          <button type="button" className={stagePanel==='wod'?'is-selected':''} onClick={()=>setStagePanel(value=>value==='wod'?null:'wod')} aria-label="Vis WOD og øvingar" title="Vis WOD og øvingar" aria-expanded={stagePanel==='wod'}><List size={21}/></button>
          <button type="button" onClick={()=>setSoundOn(value=>!value)} aria-label={soundOn?'Slå av lyd':'Slå på lyd'} title={soundOn?'Lyd på':'Lyd av'}>{soundOn?<Volume2 size={21}/>:<VolumeX size={21}/>}</button>
          <button type="button" onClick={toggleBrowserFullscreen} aria-label={browserFullscreen?'Vis nettlesarfelt':'Skjul nettlesarfelt – ekte fullskjerm'} title="Fullskjerm">{browserFullscreen?<Minimize2 size={21}/>:<Maximize2 size={21}/>}</button>
          <button type="button" className={stagePanel==='settings'?'is-selected':''} onClick={()=>setStagePanel(value=>value==='settings'?null:'settings')} aria-label="Tilpass klokka" title="Tilpass klokka" aria-expanded={stagePanel==='settings'}><Settings2 size={21}/></button>
          <button type="button" onClick={toggleFocus} aria-label="Minimer klokka" title="Minimer klokka"><X size={21}/></button>
        </div>
      </header>
      <div className={laps.length?'gg-live-timer__body gg-live-timer__body--with-laps':'gg-live-timer__body'}>
        <div className="gg-live-timer__clock-area">
          <div className="gg-live-timer__phase"><span className={running?'gg-live-timer__dot is-running':'gg-live-timer__dot'}/>{stageIsComplete?'FERDIG':!hasStarted?'KLAR':!running?'PAUSE':(isEMOM||isTimedInterval||isStationCircuit)?currentPhase:'PÅGÅR'}</div>
          <div className="gg-live-timer__time" style={{'--gg-time-scale': Math.max(.78,Math.min(1.16,appearance.clockSize/112))}} role="timer" aria-label={`${stageTimeLabel}: ${clock(primaryTime)}`}>{clock(primaryTime)}</div>
          <div className="gg-live-timer__time-label">{stageTimeLabel}</div>
          {(isCountdown||isEMOM||isTimedInterval||isStationCircuit||hasTimeCap)&&<div className="gg-live-timer__time-secondary"><span>{isCountdown?'Medgått':isEMOM?'Økta att':isTimedInterval||isStationCircuit?'Økta att':'Tid att'}</span><b>{clock(isCountdown?elapsed:remainingTotal)}</b></div>}
        </div>
        <div className="gg-live-timer__context">
          {isAmrap&&<div className="gg-live-timer__rounds"><span>FULLFØRTE RUNDER</span><strong>{laps.length}</strong></div>}
          {(isTimedInterval||isStationCircuit||isEMOM)&&<div className="gg-live-timer__rounds"><span>{isStationCircuit?'STASJON · RUNDE':isEMOM?'MINUTT':'RUNDE'}</span><strong>{isStationCircuit?`${visibleStationIndex+1}/${stationCount} · ${Math.min(currentRound,Number(rounds)||1)}/${rounds}`:isEMOM?currentEmomRound:`${roundsShown}/${rounds}`}</strong></div>}
          <div className="gg-live-timer__music" aria-label="Musikkstyring"><MusicMiniPlayer liveCompact/></div>
          {stageLapHistory.length>0&&<div className="gg-live-timer__laps" aria-label={stageLapLabel}>
            <div className="gg-live-timer__laps-heading"><span>{stageLapLabel}</span><button type="button" onClick={()=>setStagePanel('laps')}>Vis alle ({laps.length})</button></div>
            <ol className="gg-live-timer__lap-preview">{stageLapHistory.slice(-3).map(lap=><li key={lap.round}><span>{isAmrap?'R':'M'}{lap.round}</span><b>{clock(lap.duration)}</b></li>)}</ol>
          </div>}
          <div className="gg-live-timer__exercise"><span>{isAmrap?'WOD-ØVINGAR':isStationCircuit?'NO · STASJON':isEMOM?'DENNE RUNDA':'AKTUELL ØVING'}</span>
            {isAmrap?<ol>{stageRows.map((item,index)=><li key={`${item.id}-${index}`}><span>{index+1}. {item.name}</span>{item.dose&&<small>{item.dose}</small>}</li>)}</ol>:<strong>{stageExerciseName||'Sjå øvingslista'}</strong>}
            {!isAmrap&&stageNextExercise&&stageNextExercise!==stageExerciseName&&<small className="gg-live-timer__next">Neste: {stageNextExercise}</small>}
          </div>
        </div>
      </div>
      <footer className="gg-live-timer__footer">
        <button type="button" className="gg-live-timer__pause" onClick={toggleRunning} disabled={stageIsComplete}>{running?<><Pause size={21}/> Pause</>:phase==='PAUSE'?<><Play size={21}/> Hald fram</>:<><Play size={21}/> Start</>}</button>
        {isAmrap&&<button type="button" className="gg-live-timer__round-button" onClick={lapAction} disabled={!running}><Plus size={21}/> Runde</button>}
        {(isStopwatch||isForTime)&&<button type="button" className="gg-live-timer__split" onClick={splitAction} disabled={!running}>Mellomtid</button>}
        <button type="button" className="gg-live-timer__finish" onClick={onFinish} disabled={!hasStarted}><CheckCircle2 size={20}/> Fullfør</button>
      </footer>
      {stagePanel&&<div className="gg-live-timer__scrim" onClick={()=>setStagePanel(null)} role="presentation"/>}
      {stagePanel==='wod'&&<aside className="gg-live-timer__drawer" aria-label="Øvingar i WOD-en"><header><strong>Øvingar · {stageRows.length}</strong><button type="button" onClick={()=>setStagePanel(null)} aria-label="Lukk øvingslista"><X size={20}/></button></header><ol className="gg-live-timer__all-exercises">{stageRows.map((item,index)=><li key={`${item.id}-${index}`}><span>{index+1}. {item.name}</span><small>{item.dose}</small></li>)}</ol>{!stageRows.length&&<p>Ingen øvingar er lagde til.</p>}</aside>}
      {stagePanel==='laps'&&<aside className="gg-live-timer__drawer" aria-label={stageLapLabel}><header><strong>{stageLapLabel} · {laps.length}</strong><button type="button" onClick={()=>setStagePanel(null)} aria-label="Lukk rundetider"><X size={20}/></button></header><ol className="gg-live-timer__all-laps">{stageLapHistory.map(lap=><li key={lap.round}><span>{isAmrap?'Runde':'Mellomtid'} {lap.round}<small>Ved {clock(lap.at)}</small></span><b>{clock(lap.duration)}</b></li>)}</ol></aside>}
      {stagePanel==='settings'&&<aside className="gg-live-timer__drawer" aria-label="Tilpass klokka"><header><strong>Tilpass klokka</strong><button type="button" onClick={()=>setStagePanel(null)} aria-label="Lukk innstillingane"><X size={20}/></button></header>
        <label className="gg-live-timer__setting">Storleik på klokka <input type="range" min="88" max="130" step="7" value={Math.max(88,Math.min(130,appearance.clockSize))} onChange={e=>setAppearance(value=>({...value,clockSize:Number(e.target.value)}))}/></label>
        <label className="gg-live-timer__setting">Klokkefarge <input type="color" value={appearance.accent} onChange={e=>setAppearance(value=>({...value,accent:e.target.value}))}/></label>
        {(isCountdown||isEMOM||hasTimeCap)&&<div className="gg-live-timer__setting"><span>Øktlengd</span><div className="gg-live-timer__inline-inputs"><label>Min<input type="number" min="0" max="240" value={Math.floor(target/60)} onChange={e=>setDurationOverride(Math.max(1,Math.max(0,Number(e.target.value)||0)*60+(target%60)))}/></label><label>Sek<input type="number" min="0" max="59" value={target%60} onChange={e=>setDurationOverride(Math.max(1,Math.floor(target/60)*60+Math.max(0,Math.min(59,Number(e.target.value)||0))))}/></label></div></div>}
        {(isTimedInterval||isStationCircuit||isEMOM)&&<div className="gg-live-timer__setting"><span>Intervall</span><div className="gg-live-timer__inline-inputs"><label>Arbeid (sek)<input type="number" min="1" max="600" value={workSeconds} onChange={e=>setWorkSeconds(Math.max(1,Math.min(600,Number(e.target.value)||1)))}/></label><label>Pause (sek)<input type="number" min="0" max="600" value={restSeconds} onChange={e=>setRestSeconds(Math.max(0,Math.min(600,Number(e.target.value)||0)))}/></label>{!isEMOM&&<label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(Math.max(1,Math.min(100,Number(e.target.value)||1)))}/></label>}</div></div>}
        <button type="button" className="gg-live-timer__fullscreen-button" onClick={toggleBrowserFullscreen}>{browserFullscreen?'Vis nettlesarfelt':'Skjul nettlesarfelt'}</button>
        {!confirmReset?<button type="button" className="gg-live-timer__reset" onClick={()=>setConfirmReset(true)}><RotateCcw size={17}/> Nullstill økta</button>:<div className="gg-live-timer__reset-confirm"><strong>Nullstille tid og rundar?</strong><button type="button" onClick={resetTimer}>Ja, nullstill</button><button type="button" onClick={()=>setConfirmReset(false)}>Avbryt</button></div>}
      </aside>}
    </section> : <>
    <div className="timer-topline">
      <div className="timer-context"><span className="timer-origin-chip">{originLabel}</span><span className="timer-format-chip">{format.toUpperCase()}</span></div>
      <button type="button" className="timer-customize-trigger" onClick={() => setShowTimerSettings(value => !value)} aria-expanded={showTimerSettings}>{showTimerSettings ? 'Lukk oppsett' : 'Timeroppsett'}</button>
    </div>
    {showTimerSettings && <section className="timer-customize-panel timer-setup-drawer" aria-label="Timeroppsett">
      <div className="timer-customize-title"><strong>Tilpass denne økta</strong><span>Endringane gjeld berre denne gjennomføringa.</span></div>
      {(isTimedInterval || isStationCircuit || isEMOM) && <div className="timer-setup-section">
        <strong>{isStationCircuit ? 'Stasjonssirkel' : isEMOM ? 'EMOM' : format==='Tabata' ? 'Tabata-intervall' : 'Intervall'}</strong>
        <div className={`timer-settings-inline ${isEMOM?"timer-settings-emom":""}`}>
          <label>Arbeid · sek<input type="number" min="1" max="600" value={workSeconds} onChange={e=>setWorkSeconds(Math.max(1,Number(e.target.value)||1))}/></label>
          <label>{isStationCircuit?'Stasjonsbyte · sek':'Pause · sek'}<input type="number" min="0" max="600" value={restSeconds} onChange={e=>setRestSeconds(Math.max(0,Number(e.target.value)||0))}/></label>
          {!isEMOM&&<label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(Math.max(1,Number(e.target.value)||1))}/></label>}
        </div>
        <div className="timer-setup-presets"><span>Snøggval:</span><button type="button" onClick={()=>{setWorkSeconds(20);setRestSeconds(10);setRounds(8)}}>20 / 10 · Tabata</button><button type="button" onClick={()=>{setWorkSeconds(40);setRestSeconds(20);setRounds(8)}}>40 / 20</button><button type="button" onClick={()=>{setWorkSeconds(45);setRestSeconds(15);setRounds(6)}}>45 / 15</button><button type="button" onClick={()=>{setWorkSeconds(60);setRestSeconds(30);setRounds(5)}}>60 / 30</button></div>
      </div>}
      {(isCountdown || isEMOM || hasTimeCap) && <div className="timer-setup-section">
        <strong>Varigheit</strong><div className="timer-setup-duration">
          <label>Minutt<input type="number" min="0" max="240" value={Math.floor((durationOverride??target)/60)} onChange={e=>setDurationOverride(Math.max(1,(Math.max(0,Number(e.target.value)||0)*60)+((durationOverride??target)%60)))}/></label>
          <label>Sekund<input type="number" min="0" max="59" value={(durationOverride??target)%60} onChange={e=>setDurationOverride(Math.max(1,Math.floor((durationOverride??target)/60)*60+Math.max(0,Math.min(59,Number(e.target.value)||0))))}/></label>
        </div>
      </div>}
      {isEMOM && <div className="timer-setup-section"><strong>EMOM-intervall</strong><label className="timer-setup-select">Start arbeid kvart <select value={emomEvery} onChange={e=>setEmomEveryOverride(Number(e.target.value))}>{[0.25,0.5,0.75,1,1.25,1.5,1.75,2,3,4,5,6,7].map(value=>{const seconds=Math.round(value*60);const label=seconds<60?seconds+' sekund':seconds%60===0?(seconds/60)+' minutt':Math.floor(seconds/60)+' minutt og '+(seconds%60)+' sekund';return <option key={value} value={value}>{label}</option>})}</select></label></div>}
      <div className="timer-setup-section"><strong>Skjermoppsett</strong><div className="timer-layout-presets">
        <button type="button" onClick={()=>applyLayoutPreset('standard')}>Standard</button><button type="button" onClick={()=>applyLayoutPreset('minimal')}>Minimal</button><button type="button" onClick={()=>applyLayoutPreset('group')}>Gruppetime</button><button type="button" onClick={()=>applyLayoutPreset('pt')}>PT</button>
      </div></div>
      <div className="timer-setup-section"><strong>Klokkevising</strong>
        <label>Storleik på klokketal <b>{appearance.clockSize}px</b><input type="range" min="64" max="220" step="4" value={appearance.clockSize} onChange={e => setAppearance(value => ({ ...value, clockSize: Number(e.target.value) }))}/></label>
        <label>Farge på klokke og markeringar <input type="color" value={appearance.accent} onChange={e => setAppearance(value => ({ ...value, accent: e.target.value }))}/></label>
        <button type="button" className="text-button" onClick={() => setAppearance({ clockSize:112, accent:'#f0a33a' })}>Tilbakestill klokkevising</button>
      </div>
      <div className="timer-setup-actions"><button type="button" className="secondary-button" onClick={()=>setDesignMode(value=>!value)}>{designMode?'Avslutt avansert redigering':'Avansert skjermredigering'}</button><button type="button" className="primary-button" onClick={()=>{setDesignMode(false);setShowTimerSettings(false)}}>Ferdig</button></div>
    </section>}
    <div className="timer-caption"><Clock3 size={15}/> {format.toUpperCase()}</div>
    <div className={`timer-dashboard timer-dashboard-reflow ${designMode ? "is-designing" : ""}`}>
      {designMode&&<div className="timer-layout-toolbar"><strong>Avansert skjermredigering</strong><span>Flytt, endra breidde og høgd, eller lås panel. Oppsettet blir lagra på denne eininga.</span><button type="button" className="secondary-button" onClick={()=>setDesignMode(false)}>Ferdig</button><button type="button" className="text-button" onClick={resetPanelLayout}>Tilbakestill</button></div>}
      <div className="timer-panel-canvas">
       {panelOrder.map(id=>id==='clock'?<TimerPanel key={id} id="clock" title="HOVUDKLOKKE OG WOD" layout={panelLayout.clock} deviceProfile={deviceProfile} locked={Boolean(lockedPanels.clock)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock} designMode={designMode}><section className="timer-center">
        <div className="timer-phase">{phase}</div>
        <strong className="timer-main-clock">{clock(primaryTime)}</strong>
        <div className="timer-round-label">{isStationCircuit ? 'ARBEID / STASJONSBYTE' : isCountdown ? 'GJENSTÅANDE TID' : isEMOM ? (isEmomWorkPhase?'ARBEID ATT':isEmomRestPhase?'PAUSE ATT':'NESTE START OM') : isTimedInterval ? 'TID I INTERVALLFASEN' : 'MEDGÅTT TID'}</div>
        {isStationCircuit ? <div className="timer-station-plan"><div className="timer-station-plan-heading"><span>STASJONANE I SIRKELEN</span><b>{rounds} rundar</b></div><div className="timer-station-grid">{stationList.map((station,index)=><article className="timer-station-card" key={station.station_number||index}><span>STASJON {station.station_number||index+1}</span><strong>{station.exercise_name||station.name||'Øving'}</strong><small>{station.reps_mode==='amrap'?'AMRAP · så mange som mogleg':station.reps!=null&&station.reps!==''?`${station.reps} reps`:'Vel sjølv tal reps'}{station.height_cm?' · '+station.height_cm+' cm':''}{station.load_label?' · '+station.load_label:''}</small>{station.description&&<p>{station.description}</p>}{station.coach_note&&<p>{station.coach_note}</p>}</article>)}</div></div> : isAmrap ? <div className="timer-amrap-exercise-list"><span>ØVINGAR I WOD-EN</span>{exerciseList.length ? <ol>{exerciseList.map((exercise,index)=>{const setReps=(exercise.sets||[]).map(set=>String(set.reps??'').trim()).filter(Boolean);const uniqueReps=[...new Set(setReps)];const repsLabel=uniqueReps.length===1?(setReps.length>1?`${setReps.length} × ${uniqueReps[0]}`:uniqueReps[0]):uniqueReps.length>1?uniqueReps.join(' / '):String(exercise.reps??'').trim();return <li key={exercise.key||index} className={exercise.is_rest?'timer-rest-item':''}><b>{index+1}.</b><span>{exercise.is_rest?<><strong>PAUSE</strong><small> {clock(Number(exercise.rest_duration_seconds)||30)}</small></>:<>{repsLabel&&<strong className="timer-amrap-reps">{repsLabel} × </strong>}{exercise.exercise_name||'Øving utan namn'}</>}</span></li>})}</ol> : <p>Ingen øvingar er lagde til.</p>}</div> : <><div className="timer-active-under-clock"><span>{isTimedInterval ? `DRAG ${intervalExerciseIndex+1} / ${intervalExerciseCount}` : isEMOM ? (isEmomWorkPhase?`ARBEIDSOPPGÅVE · RUNDE ${currentEmomRound}`:'NESTE ARBEIDSOPPGÅVE') : activeExercise ? 'GJELDANDE ØVING' : 'WOD-OVERSIKT'}</span><b>{isTimedInterval ? currentIntervalExercise : isEMOM ? currentEmomExercise || 'Sjå øvingsrekkjefølgja' : activeExercise || 'Sjå øvingsrekkjefølgja'}</b></div><div className="timer-amrap-exercise-list"><span>ØVINGAR I WOD-EN · {exerciseList.length}</span>{exerciseList.length ? <ol>{exerciseList.map((exercise,index)=>{const dose=(exercise.sets||[]).map(set=>[set.reps?set.reps+' reps':'',set.load_kg?set.load_kg+' kg':'',set.time_text||''].filter(Boolean).join(' · ')).filter(Boolean).join(' / ');return <li key={exercise.key||index} className={exercise.is_rest?'timer-rest-item':''}><b>{index+1}.</b><span><strong>{exercise.is_rest?'PAUSE':exercise.exercise_name||'Øving utan namn'}</strong>{dose&&<small>{dose}</small>}{exercise.prescription_label&&<small>{exercise.prescription_label}</small>}</span></li>})}</ol> : <p>Ingen øvingar er lagde til.</p>}</div></>}
        {isAmrap && <div className="timer-round-total"><span>RUNDER FULLFØRT</span><b>{completedRounds}</b></div>}
        {!isStationCircuit && !isAmrap && (isTimedInterval ? (exerciseList[intervalExerciseIndex + 1]?.exercise_name || exerciseList[0]?.exercise_name) : nextExercise) && <div className="timer-next-exercise"><span>NESTE ØVING</span><b>{isTimedInterval ? (exerciseList[intervalExerciseIndex + 1]?.exercise_name || exerciseList[0]?.exercise_name) : nextExercise}</b></div>}
        <div className="timer-actions">
          <button type="button" className="secondary-button" onClick={toggleRunning} disabled={phase === 'FERDIG' || phase === 'TIDSGRENSE'}>{running ? <><Pause size={14}/> Pause</> : phase==='PAUSE' ? <><Play size={14}/> Gjenoppta</> : <><Play size={14}/> Start</>}</button>
          {isAmrap && <button type="button" className="timer-lap-button" onClick={lapAction} disabled={!running}>+ REGISTRER RUNDE</button>}
          <button type="button" className="secondary-button" onClick={() => { timerRunStartedAt.current = null; timerRunBaseElapsed.current = 0; elapsedRef.current = 0; setRunning(false); setElapsed(0); setRound(1); setLaps([]); setPhase('Klar'); setHasStarted(false) }}><RotateCcw size={14}/> Nullstill</button>
          {(isStopwatch || isForTime) && <button type="button" className="secondary-button" onClick={splitAction} disabled={!running}>Mellomtid</button>}
          <button type="button" className="secondary-button" onClick={() => setSoundOn(value => !value)}>{soundOn ? 'Lyd på' : 'Lyd av'}</button>
          <button type="button" className="secondary-button" onClick={toggleFocus}>{focused ? 'Avslutt stor klokke' : 'Stor klokke'}</button>
        </div>
        <div className="timer-finish-row">
          <button type="button" className="timer-finish-button" onClick={onFinish} disabled={!hasStarted}>
            <CheckCircle2 size={18}/><span>Fullfør økta</span>
          </button>
          <small>{hasStarted ? 'Registrer resultat og lagre treningsøkta' : 'Start timeren før du fullfører økta'}</small>
        </div>
      </section></TimerPanel>:id==='info'?<TimerPanel key={id} id="info" title="ØKTINFORMASJON" layout={panelLayout.info} deviceProfile={deviceProfile} locked={Boolean(lockedPanels.info)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock} designMode={designMode}><aside className="timer-side timer-side-left">
        <div className="timer-bottom-heading">ØKTINFORMASJON</div>
        <div className="timer-side-stat"><span>MEDGÅTT TID</span><b>{clock(elapsed)}</b></div>
        {(isCountdown || isStationCircuit) && <div className="timer-side-stat"><span>GJENVERANDE TID</span><b>{clock(remainingTotal)}</b></div>}
        {isEMOM && <><div className="timer-side-stat"><span>GJENSTÅANDE ØKTTID</span><b>{clock(remainingTotal)}</b></div><div className="timer-side-stat"><span>{isEmomWorkPhase?'ARBEID ATT':isEmomRestPhase?'PAUSE ATT':'NESTE START OM'}</span><b>{clock(emomPhaseRemaining)}</b></div></>}
        {isStationCircuit && <><div className="timer-side-stat"><span>RUNDE</span><b>{Math.min(currentRound,Number(rounds)||1)}/{rounds}</b></div><div className="timer-side-stat"><span>ARBEID / BYTE</span><b>{effectiveWorkSeconds}s / {effectiveRestSeconds}s</b></div></>}
        {isTimedInterval && <><div className="timer-side-stat"><span>ØKTA ATT</span><b>{clock(remainingTotal)}</b></div><div className="timer-side-stat"><span>RUNDE</span><b>{roundsShown}/{rounds}</b></div></>}
        {isForTime && showTimeCap && <div className="timer-side-stat"><span>TIDSGRENSE</span><b>{clock(Math.max(0,target-elapsed))}</b></div>}
        {(isDeathBy || isLadder) && <><div className="timer-side-stat"><span>{isDeathBy?'TID TIL NESTE MINUTT':'LADDER-RUNDE'}</span><b>{isDeathBy?clock(elapsed===0?60:60-(elapsed%60||0)):currentRound}</b></div>{schema?.ladder&&<div className="timer-side-stat"><span>REPS I RUNDA</span><b>{Math.max(0,Number(schema.ladder.start||2)+(currentRound-1)*Number(schema.ladder.step||2)*(schema.ladder.direction==='down'?-1:1))}</b></div>}</>}

      </aside></TimerPanel>:id==='laps'?<TimerPanel key={id} id="laps" title="RUNDETIDER" layout={panelLayout.laps} deviceProfile={deviceProfile} locked={Boolean(lockedPanels.laps)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock} designMode={designMode}><aside className="timer-side timer-side-right">
        <div className="timer-lap-heading">RUNDETIDER <b>{laps.length}</b></div>
        {laps.length ? <ol className="timer-lap-list">{laps.map((lap,index)=><li key={index}><span>Runde {index+1}</span><b>{clock(lap)}</b></li>)}</ol> : <p className="timer-no-laps">Registrer kvar fullførte runde her.</p>}
      </aside></TimerPanel>:<TimerPanel key={id} id="music" title="MUSIKK" layout={panelLayout.music} deviceProfile={deviceProfile} locked={Boolean(lockedPanels.music)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock} designMode={designMode}><MusicMiniPlayer /></TimerPanel>)}
      </div>

    <small>{isStationCircuit ? 'Stasjonssirkel · roterande stasjonar · fast tal rundar' : isTimedInterval ? 'Arbeid / kvile · samla økttid og tid att' : isCountdown ? 'AMRAP · registrer kvar fullførte runde' : isEMOM ? `${emomEvery>1?`E${emomEvery}MOM`:'E1MOM'} · ${effectiveEmomWorkSeconds}s arbeid / ${effectiveEmomRestSeconds}s pause` : isDeathBy ? 'Aukande arbeid for kvar minutt' : isForTime ? 'Stoppeklokke med eventuell tidsgrense' : 'Stoppeklokke – tel medgått tid'}</small>
  </div>
  </>}
  </div>
}

export default function Training({ launchWodId = null, launchClassSessionId = null, launchAssignmentId = null, launchProgramSessionId = null, launchProgramSessionTitle = '', onLaunchConsumed, onTimerSnapshot, simpleMode = false, quickStart = false, onQuickStartConsumed, quickManualEntry = false, onQuickManualEntryConsumed, onSaved, onDiscard }) {
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
  const [manualEntry,setManualEntry]=useState(false)
  const [source, setSource] = useState(null)
  const [wodLevel,setWodLevel]=useState('rx')
  const [classSessionId, setClassSessionId] = useState(null)
  const [launchLinkContext,setLaunchLinkContext]=useState(emptyTrainingLaunchContext)
  const [title, setTitle] = useState('')
  const [workoutDate,setWorkoutDate]=useState(()=>localDateISO())
  const [manualWodIds,setManualWodIds]=useState([])
  const [manualWodSelect,setManualWodSelect]=useState('')
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
  const [timerLaunchId, setTimerLaunchId] = useState(0)
  const loadSequence = useRef(0)
  useEffect(()=>{onTimerSnapshot?.({...timerSnapshot,title,format})},[timerSnapshot,title,format,onTimerSnapshot])
  useEffect(()=>()=>onTimerSnapshot?.({
    elapsed:0,laps:[],roundsCompleted:0,phase:'Klar',running:false,
    remaining:0,displayTime:0,countdown:false,currentRound:1,title:'',format:''
  }),[onTimerSnapshot])

  function clearTimerSnapshot(){
    onTimerSnapshot?.({
      elapsed:0,laps:[],roundsCompleted:0,phase:'Klar',running:false,
      remaining:0,displayTime:0,countdown:false,currentRound:1,title:'',format:''
    })
  }

  async function loadAll(silent=false) {
    const requestId=++loadSequence.current
    if (!silent) setLoading(true)
    setError('')
    try {
      let w = await supabase.from('wods')
        .select('id,name,format,duration_minutes,movements,notes,audience,is_published,is_archived,created_at,timer_settings,category')
        .order('created_at', { ascending: false })
      if (w.error && /timer_settings|column .* does not exist/i.test(w.error.message || '')) {
        w = await supabase.from('wods')
          .select('id,name,format,duration_minutes,movements,notes,audience,is_published,is_archived,created_at,category')
          .order('created_at', { ascending: false })
      }
      if(requestId!==loadSequence.current)return

      const [e,h,pr,auth] = await Promise.all([
        supabase.from('exercises').select('id,name,category,equipment,description,video_url').eq('is_active', true).order('name'),
        supabase.from('workout_logs').select('id,title,workout_date,format,rounds,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,result_data,note,created_at,workout_exercises(id,exercise_name,sort_order,workout_sets(id,set_number,reps,load_kg,time_text,time_seconds,height_cm))').order('workout_date', { ascending: false }).limit(500),
        supabase.from('personal_records').select('id,exercise_name,result,unit,note,record_date').order('record_date', { ascending: false }).limit(500),
        supabase.auth.getUser()
      ])
      if(requestId!==loadSequence.current)return

      const failures=[]
      if(w.error)failures.push('WOD-bibliotek: '+w.error.message)
      else setWods(w.data||[])
      if(e.error)failures.push('Øvingsbibliotek: '+e.error.message)
      else setExercises(e.data||[])
      if(h.error)failures.push('Treningslogg: '+h.error.message)
      else setHistory(h.data||[])
      if(pr.error)failures.push('Personlege rekordar: '+pr.error.message)
      else setRecords(pr.data||[])
      if(auth.error)failures.push('Innlogging: '+auth.error.message)

      const user=auth.data?.user
      if(user){
        const [daily,fav,wodFav]=await Promise.all([
          supabase.from('wod_daily_schedules').select('wod_id').eq('scheduled_date',localDateISO()).is('target_class_id',null).eq('is_published',true).maybeSingle(),
          supabase.from('exercise_favorites').select('exercise_name').eq('user_id',user.id),
          supabase.from('wod_favorites').select('wod_id').eq('user_id',user.id)
        ])
        if(requestId!==loadSequence.current)return
        if(daily.error)failures.push('Dagens WOD: '+daily.error.message)
        else setDailyWodId(daily.data?.wod_id||null)
        if(fav.error)failures.push('Favorittøvingar: '+fav.error.message)
        else setFavoriteNames((fav.data||[]).map(x=>x.exercise_name))
        if(wodFav.error)failures.push('WOD-favorittar: '+wodFav.error.message)
        else setFavoriteWodIds((wodFav.data||[]).map(x=>x.wod_id))
      }else{
        setFavoriteNames([])
        setFavoriteWodIds([])
        setDailyWodId(null)
      }
      if(requestId===loadSequence.current)setError(failures.join(' · '))
    } catch(err) {
      if(requestId===loadSequence.current)setError('Kunne ikkje oppdatera treningsdata: '+(err?.message||'Ukjend feil'))
    } finally {
      if(requestId===loadSequence.current)setLoading(false)
    }
  }
  useEffect(() => {
    loadAll()
    const refresh=setInterval(()=>loadAll(true),60000)
    return()=>{clearInterval(refresh);loadSequence.current++}
  }, [])
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
    if (wod) { startWorkout(wod); setClassSessionId(launchClassSessionId || null); setLaunchLinkContext(captureTrainingLaunchContext({launchAssignmentId,launchProgramSessionId})); onLaunchConsumed?.() }
  }, [launchWodId, loading, wods, launchClassSessionId, launchAssignmentId, launchProgramSessionId])

  useEffect(() => {
    if (!launchProgramSessionId || launchWodId || loading) return
    startWorkout()
    setTitle(launchProgramSessionTitle || 'Eigen PT-økt')
    setLaunchLinkContext(captureTrainingLaunchContext({launchProgramSessionId}))
    onLaunchConsumed?.()
  }, [launchProgramSessionId, launchWodId, loading])

  useEffect(() => {
    if (!quickStart || !simpleMode || loading || mode !== 'home') return
    startWorkout(null, { autoStart: true })
    onQuickStartConsumed?.()
  }, [quickStart, simpleMode, loading, mode])

  useEffect(() => {
    if (!quickManualEntry || !simpleMode || loading || mode !== 'home') return
    startManualWorkout()
    onQuickManualEntryConsumed?.()
  }, [quickManualEntry, simpleMode, loading, mode])

  const activeWodEngine=normalizeWodEngine(source?.timer_settings?.workout_schema||{},{format:source?.format||format})
  const availableWods=wods.filter(wod=>wod.is_published&&!wod.is_archived)
  const manualWodOptions=wods.filter(wod=>!wod.is_archived)

  const filteredExercises = useMemo(() => exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || (e.category || '').toLowerCase().includes(query.toLowerCase())), [exercises, query])

  function leaveWorkout() {
    if (!window.confirm('Forkasta økta? Ho blir sletta utan å bli lagra i treningsloggen.')) return
    setFinishOpen(false); setMode('home'); setSource(null); setClassSessionId(null); setItems([])
    setTimerSnapshot({ elapsed: 0, laps: [], roundsCompleted: 0, phase: 'Klar', running: false })
    clearTimerSnapshot()
    onDiscard?.()
  }

  function startWorkout(wod = null, { autoStart = Boolean(wod) } = {}) {
    setManualEntry(false)
    // A free session opens with the timer ready at zero; a selected WOD starts directly.
    setTimerLaunchId(autoStart ? value => value + 1 : 0)
    setClassSessionId(null)
    setLaunchLinkContext(emptyTrainingLaunchContext())
    setSaveToken(crypto.randomUUID())
    setSource(wod)
    setWodLevel(wod?.timer_settings?.workout_schema?.prescription||'rx')
    setTitle(wod?.name || (simpleMode ? 'Eiga trening' : ''))
    setManualWodIds(wod?.id?[wod.id]:[]);setManualWodSelect('')
    setWorkoutDate(localDateISO())
    setFormat(wod?.format || 'Fri trening')
    setDuration(String(wod?.timer_settings?.workout_schema?.duration_seconds ? Math.floor(wod.timer_settings.workout_schema.duration_seconds / 60) : (wod?.duration_minutes || 10)))
    setDurationSeconds(String(wod?.timer_settings?.workout_schema?.duration_seconds ? wod.timer_settings.workout_schema.duration_seconds % 60 : 0))
    setNote(wod?.notes || '')
    setItems([])
    setActiveExerciseIndex(0)
    setTimerSnapshot({ elapsed: 0, laps: [], roundsCompleted: 0, phase: 'Klar', running: false })
    setScoreRounds(''); setScoreReps(''); setScoreTime('')
    const schema = wod?.timer_settings?.workout_schema
    const orderedSchemaItems = sortWodItems(getWodSchemaItems(schema))
    if(schema?.library_category==='warmup')orderedSchemaItems.sort((a,b)=>({specific_prep:0,movement_rehearsal:1}[a.warmup_phase||'specific_prep']??0)-({specific_prep:0,movement_rehearsal:1}[b.warmup_phase||'specific_prep']??0))
    if (orderedSchemaItems.length) {
      setItems(orderedSchemaItems.map(item => ({
        ...emptyExercise(),
        exercise_id: item.exercise_id || '',
        exercise_name: item.exercise_name || '',
        minute_slot: item.minute_slot ?? '',
        warmup_phase: item.warmup_phase || 'specific_prep',
        is_rest: !!item.is_rest,
        is_complex: !!item.is_complex,
        complex_family: item.complex_family || null,
        complex_steps: Array.isArray(item.complex_steps) ? item.complex_steps : [],
        rest_duration_seconds: item.rest_duration_seconds == null ? null : Number(item.rest_duration_seconds),
        reps_mode: item.reps_mode || 'fixed',
        prescription_levels: item.levels || null,
        side_mode: item.side_mode || null,
        prescription_label: doseLabel(item,'rx'),
        rowValue:'',rowUnit:item.row_unit||'m',workSeconds:'',
        equipment: item.equipment || exercises.find(exercise => exercise.id === item.exercise_id)?.equipment || '',
        uses_height: getExerciseMeasurementFlags({
          ...item,
          name: item.exercise_name || item.name || '',
          equipment: item.equipment || exercises.find(exercise => exercise.id === item.exercise_id)?.equipment || '',
          levels: item.levels || {},
          sets: item.sets || [],
        }).usesHeight,
        uses_load: getExerciseMeasurementFlags({
          ...item,
          name: item.exercise_name || item.name || '',
          equipment: item.equipment || exercises.find(exercise => exercise.id === item.exercise_id)?.equipment || '',
          levels: item.levels || {},
          sets: item.sets || [],
        }).usesLoad,
        sets: Array.isArray(item.sets) && item.sets.length ? item.sets.map(set => ({
          reps: set.reps == null ? '' : String(set.reps),
          load_kg: set.load_kg == null ? '' : String(set.load_kg),
          time_text: set.tempo || '',
          time_seconds: '',
          height_cm: set.height_cm == null ? String(item.levels?.[wodLevel]?.heightCm ?? item.levels?.rx?.heightCm ?? Object.values(item.levels||{}).find(level=>level?.heightCm!=null)?.heightCm ?? item.height_cm ?? '') : String(set.height_cm),
        })) : [{
          reps: item.reps == null ? '' : String(item.reps),
          load_kg: item.load_kg == null ? '' : String(item.load_kg),
          time_text: '',
          time_seconds: '',
          height_cm: String(item.height_cm ?? item.levels?.[wodLevel]?.heightCm ?? item.levels?.rx?.heightCm ?? Object.values(item.levels||{}).find(level=>level?.heightCm!=null)?.heightCm ?? ''),
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

  function startManualWorkout(){
    setManualEntry(true)
    setTimerLaunchId(0);setClassSessionId(null);setLaunchLinkContext(emptyTrainingLaunchContext());setSaveToken(crypto.randomUUID());setSource(null);setWodLevel('rx')
    setTitle('Manuell trening');setFormat('Fri trening');setDuration('0');setDurationSeconds('0');setWorkoutDate(localDateISO())
    setNote('');setItems([]);setQuery('');setActiveExerciseIndex(0);setManualWodIds([]);setManualWodSelect('')
    setTimerSnapshot({elapsed:0,laps:[],roundsCompleted:0,phase:'Klar',running:false})
    setFinishOpen(false);setReviewOpen(true);setMode('active');setError('');setNotice('Legg til øvingar og resultat frå økta du allereie har gjennomført.')
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
    const measurementFlags=getExerciseMeasurementFlags(exercise)
    setItems(current => [...current, { ...emptyExercise(), exercise_id: exercise.id, exercise_name: exercise.name, equipment:exercise.equipment||'', uses_height:measurementFlags.usesHeight, uses_load:measurementFlags.usesLoad }])
    setQuery('')
  }
  function addManualWod(){
    const wod=manualWodOptions.find(item=>item.id===manualWodSelect)
    if(!wod)return
    if(manualWodIds.includes(wod.id)){setNotice('Denne WOD-en er allereie lagt til.');return}
    const schemaItems=sortWodItems(getWodSchemaItems(wod.timer_settings?.workout_schema||{}))
    const additions=schemaItems.length?schemaItems.map(item=>{
      const catalogExercise=exercises.find(exercise=>exercise.id===item.exercise_id)
      const equipment=item.equipment||catalogExercise?.equipment||''
      const measurementFlags=getExerciseMeasurementFlags({...item,name:item.exercise_name||item.name||catalogExercise?.name||'',equipment,levels:item.levels||{},sets:item.sets||[]})
      return {...emptyExercise(),manual_wod_id:wod.id,exercise_id:item.exercise_id||'',exercise_name:item.exercise_name||item.name||'',equipment,uses_height:measurementFlags.usesHeight,uses_load:measurementFlags.usesLoad,is_rest:!!item.is_rest,is_complex:!!item.is_complex,complex_family:item.complex_family||null,complex_steps:Array.isArray(item.complex_steps)?item.complex_steps:[],rest_duration_seconds:item.rest_duration_seconds??null,prescription_levels:item.levels||null,prescription_label:doseLabel(item,wodLevel),rowUnit:item.row_unit||'m'}
    }):(wod.movements||'').split(/\n|,/).map(name=>name.trim()).filter(Boolean).map(name=>{const flags=getExerciseMeasurementFlags({name});return {...emptyExercise(),manual_wod_id:wod.id,exercise_name:name,uses_height:flags.usesHeight,uses_load:flags.usesLoad}})
    if(!additions.length){setError('WOD-en har ingen registrerte øvingar å leggje til.');return}
    setItems(rows=>[...rows,...additions]);setManualWodIds(ids=>[...ids,wod.id]);setManualWodSelect('');setNotice(wod.name+' er lagt til i den manuelle økta.')
  }

  function updateExercise(key, patch) {
    setItems(current => current.map(item => item.key === key ? { ...item, ...patch } : item))
  }
  function updateSet(key, index, patch) {
    setItems(current => current.map(item => item.key === key ? { ...item, sets: item.sets.map((s, i) => i === index ? { ...s, ...patch } : s) } : item))
  }
  function addSet(key) {
    setItems(current => current.map(item => item.key === key ? { ...item, sets: [...item.sets, { reps: '', load_kg: '', time_text: '', time_seconds: '', height_cm: '' }] } : item))
  }

  async function saveWorkout(event) {
    event.preventDefault()
    if (saving) return
    if (!title.trim()) { setError('Gi økta eit namn før du lagrar.'); return }
    if (!items.length || items.some(item => !item.exercise_name.trim())) {
      setError('Alle øvingane må ha namn.'); return
    }
    if (items.some(item => !Array.isArray(item.sets) || item.sets.length === 0)) {
      setError('Legg til minst eitt sett på kvar øving før du lagrar.'); return
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
      const parsedTime = scoreTime.trim() ? (()=>{
        const raw=scoreTime.trim()
        if(!/^\\d{1,3}:\\d{1,2}(?::\\d{1,2})?$/.test(raw))return NaN
        const parts=raw.split(':').map(Number)
        if(parts.some(value=>!Number.isInteger(value)||value<0)||parts.slice(1).some(value=>value>59))return NaN
        return parts.length===2?parts[0]*60+parts[1]:parts[0]*3600+parts[1]*60+parts[2]
      })() : (isForTimeScore&&elapsedSeconds>0?elapsedSeconds:null)
      if(scoreTime.trim()&&!Number.isFinite(parsedTime))throw new Error('Tid må skrivast som mm:ss eller tt:mm:ss, med sekund og minutt mellom 00 og 59.')
      const numericFields=[['rundar',scoreRounds],['repetisjonar',scoreReps],['belastning',scoreLoad],['kaloriar',scoreCalories],['distanse',scoreDistance]]
      for(const [label,value] of numericFields){
        if(String(value??'').trim()==='')continue
        const number=Number(value)
        if(!Number.isFinite(number)||number<0)throw new Error(label+' må vera eit gyldig tal på null eller meir.')
        if(['rundar','repetisjonar'].includes(label)&&!Number.isInteger(number))throw new Error(label+' må vera eit heiltal.')
      }
      for(const item of items){
        if(String(item.rowValue??'').trim()!==''&&(!Number.isFinite(Number(item.rowValue))||Number(item.rowValue)<0))throw new Error('Distanse eller varigheit for «'+item.exercise_name+'» må vera null eller eit positivt tal.')
        for(const set of item.sets||[]){
          for(const [label,value] of [['reps',set.reps],['belastning',set.load_kg],['høgd',set.height_cm],['tid',set.time_seconds]]){
            if(String(value??'').trim()==='')continue
            if(!Number.isFinite(Number(value))||Number(value)<0)throw new Error(label+' for «'+item.exercise_name+'» må vera null eller eit positivt tal.')
          }
          if(String(set.height_cm??'').trim()!==''&&(!Number.isFinite(Number(set.height_cm))||Number(set.height_cm)<=0))throw new Error('Høgd for «'+item.exercise_name+'» må vera større enn null centimeter.')
          if(String(set.reps??'').trim()!==''&&!Number.isInteger(Number(set.reps)))throw new Error('Repetisjonar for «'+item.exercise_name+'» må vera eit heiltal.')
        }
      }
      const hasRecordedScore=[scoreRounds,scoreReps,scoreTime,scoreLoad,scoreCalories,scoreDistance].some(value=>String(value??'').trim()!=='')||parsedTime!==null||items.some(item=>Number(item.rowValue)>0||item.sets?.some(set=>[set.reps,set.load_kg,set.height_cm,set.time_text,set.time_seconds].some(value=>String(value??'').trim()!=='')))
      if(manualEntry&&!hasRecordedScore)throw new Error('Registrer minst eitt faktisk resultat – til dømes reps, kg, høgd, tid, distanse eller kaloriar – før du lagrar etterregistreringa.')
      if(classSessionId&&source?.category!=='warmup'&&!hasRecordedScore)throw new Error('Hovud-WOD må ha minst eitt registrert resultat før du kan lagra.')
      const resultData = {
        version:3,format,manual_entry:manualEntry,prescription_level:wodLevel,wod_engine:source?.timer_settings?.workout_schema?.wod_engine||null,wod_ids:source?.id?[source.id]:manualWodIds,wod_names:(source?.id?[source.id]:manualWodIds).map(id=>wods.find(w=>w.id===id)?.name).filter(Boolean),elapsed_seconds:elapsedSeconds,timer_phase:timerSnapshot.phase,completion_status:timerSnapshot.phase==='TIDSGRENSE'?'time_cap':'completed',completed:true,time_cap_reached:timerSnapshot.phase==='TIDSGRENSE',time_cap_seconds:timerSnapshot.phase==='TIDSGRENSE'?elapsedSeconds:null,
        completed_rounds:isAmrapScore?(scoreRounds===''?Number(timerSnapshot.roundsCompleted)||0:Number(scoreRounds)):null,
        extra_reps:isAmrapScore?(scoreReps===''?0:Number(scoreReps)):null,
        split_seconds:Array.isArray(timerSnapshot.laps)?timerSnapshot.laps:[],
        score_time_seconds:parsedTime,
        load_kg:scoreLoad===''?null:Number(scoreLoad),
        calories:scoreCalories===''?null:Number(scoreCalories),
        distance:scoreDistance===''?null:Number(scoreDistance),distance_unit:scoreUnit,
        exercise_results:items.map(item=>({exercise_name:item.exercise_name,is_complex:!!item.is_complex,complex_family:item.complex_family||null,complex_steps:Array.isArray(item.complex_steps)?item.complex_steps.map(step=>({name:step.name,reps:Number(step.reps)||1})):[],row_value:item.rowValue===''?null:Number(item.rowValue),row_unit:item.rowUnit||null,meters:item.rowUnit==='m'?Number(item.rowValue)||null:item.rowUnit==='km'?(Number(item.rowValue)||0)*1000||null:null,calories:item.rowUnit==='cal'?Number(item.rowValue)||null:null,work_seconds:item.rowUnit==='s'?Number(item.rowValue)||null:item.rowUnit==='min'?(Number(item.rowValue)||0)*60||null:null,sets:item.sets.map(s=>({reps:s.reps===''?null:Number(s.reps),load_kg:s.load_kg===''?null:Number(s.load_kg),time_seconds:s.time_seconds===''?null:Number(s.time_seconds),time_text:s.time_text||null,height_cm:s.height_cm===''?null:Number(s.height_cm)}))}))
      }
      const payload = {
        member_id:user.id,save_token:saveToken,title:title.trim(),source_wod_id:source?.id||manualWodIds[0]||null,
        class_live_session_id:classSessionId||null,workout_date:workoutDate||localDateISO(),format,
        rounds:isAmrapScore?(scoreRounds===''?Number(timerSnapshot.roundsCompleted)||0:Number(scoreRounds)):Math.max(1,Number(scoreRounds)||1),
        score_rounds:isAmrapScore?(scoreRounds===''?Number(timerSnapshot.roundsCompleted)||0:Number(scoreRounds)):scoreRounds===''?null:Number(scoreRounds),
        score_reps:scoreReps===''?(isAmrapScore?0:null):Number(scoreReps),
        score_time_seconds:parsedTime,score_load_kg:scoreLoad===''?null:Number(scoreLoad),
        score_calories:scoreCalories===''?null:Number(scoreCalories),
        score_distance:scoreDistance===''?null:Number(scoreDistance),score_unit:scoreDistance===''?null:scoreUnit,
        result_data:resultData,
        note:[note.trim(),scoreTime?'Tid: '+scoreTime:'',manualEntry?'Manuelt etterregistrert':'',!manualEntry?`Timer: ${format} · ${clock(elapsedSeconds)} · ${timerSnapshot.phase}`:'',!manualEntry&&timerSnapshot.laps.length?'Mellomtider: '+timerSnapshot.laps.map((lap,i)=>`${i+1}: ${clock(lap)}`).join(', '):''].filter(Boolean).join('\\n')
      }
      payload.exercises=items.map((item,index)=>({
        exercise_id:item.exercise_id||null,exercise_name:item.exercise_name.trim(),sort_order:index+1,row_value:item.rowValue===''?null:Number(item.rowValue),row_unit:item.rowUnit||null,meters:item.rowUnit==='m'?Number(item.rowValue)||null:item.rowUnit==='km'?(Number(item.rowValue)||0)*1000||null:null,calories:item.rowUnit==='cal'?Number(item.rowValue)||null:null,work_seconds:item.rowUnit==='s'?Number(item.rowValue)||null:item.rowUnit==='min'?(Number(item.rowValue)||0)*60||null:null,
        sets:item.sets.map(s=>({reps:s.reps===''?null:Number(s.reps),load_kg:s.load_kg===''?null:Number(s.load_kg),time_text:s.time_text.trim()||null,time_seconds:s.time_seconds===''?null:Number(s.time_seconds),height_cm:s.height_cm===''?null:Number(s.height_cm)}))
      }))
      const {data:workoutId,error:saveError}=await supabase.rpc('save_workout_with_pt_links',{
        p_workout:payload,
        p_assignment_id:launchLinkContext.assignmentId,
        p_program_session_id:launchLinkContext.programSessionId
      })
      if(saveError)throw saveError
      if(!workoutId)throw new Error('Databasen returnerte ikkje ID for den lagra økta.')
      const programSyncMessage = ''
      // Derive automatic PRs from actual logged sets and the workout result, separated by RX/Scaled/Foundation.
      let prMessage = programSyncMessage
      try {
        const { data: existingPRs, error: prReadError } = await supabase.from('personal_records')
          .select('exercise_name,result,unit,note').eq('member_id', user.id).in('unit', ['kg','cm','reps','sek','meter','cal'])
        if (prReadError) throw prReadError
        const levelKey=String(wodLevel||'rx').toLowerCase()
        const bestByNameUnit = new Map()
        ;(existingPRs || []).forEach(record => {
          const value = Number(String(record.result).replace(',', '.'))
          const recordLevel=(String(record.note||'').match(/^(RX|SCALED|FOUNDATION)\s*[·:-]/i)?.[1]||'RX').toLowerCase()
          const key = record.exercise_name.toLowerCase() + '|' + record.unit + '|' + recordLevel
          if (Number.isFinite(value)) {
            const current=bestByNameUnit.get(key)
            bestByNameUnit.set(key,record.unit==='sek'?(current==null?value:Math.min(current,value)):(current==null?value:Math.max(current,value)))
          }
        })
        const newPRs = []
        const addCandidate=(exercise,unit,values,direction='max')=>{
          const numbers=values.map(Number).filter(value=>Number.isFinite(value)&&value>0)
          if(!numbers.length)return
          const candidate=direction==='min'?Math.min(...numbers):Math.max(...numbers)
          const key=exercise.exercise_name.toLowerCase()+'|'+unit+'|'+levelKey
          const current=bestByNameUnit.get(key)
          const improved=direction==='min'?(current==null||candidate<current):(current==null||candidate>current)
          if(!improved)return
          newPRs.push({member_id:user.id,workout_log_id:workoutId,exercise_name:exercise.exercise_name,result:String(candidate),unit,record_date:payload.workout_date,note:levelKey.toUpperCase()+' · Automatisk PR frå økta «'+payload.title+'»'})
          bestByNameUnit.set(key,candidate)
        }
        payload.exercises.forEach(exercise => {
          addCandidate(exercise,'kg',exercise.sets.map(set=>set.load_kg))
          addCandidate(exercise,'cm',exercise.sets.map(set=>set.height_cm))
          addCandidate(exercise,'reps',exercise.sets.map(set=>set.reps))
          addCandidate(exercise,'sek',exercise.sets.map(set=>set.time_seconds),'min')
          if(exercise.row_unit==='m'||exercise.row_unit==='km')addCandidate(exercise,'meter',[exercise.row_unit==='km'?Number(exercise.row_value)*1000:exercise.row_value])
          if(exercise.row_unit==='cal')addCandidate(exercise,'cal',[exercise.row_value])
          if(exercise.row_unit==='s')addCandidate(exercise,'sek',[exercise.row_value],'min')
          if(exercise.row_unit==='min')addCandidate(exercise,'sek',[Number(exercise.row_value)*60],'min')
          if(payload.exercises.length===1){
            addCandidate(exercise,'kg',[payload.score_load_kg])
            addCandidate(exercise,'reps',[payload.score_reps])
            addCandidate(exercise,'sek',[payload.score_time_seconds],'min')
            addCandidate(exercise,'cal',[payload.score_calories])
            const distance=Number(payload.score_distance)
            if(distance>0){if(payload.score_unit==='cal')addCandidate(exercise,'cal',[distance]);else addCandidate(exercise,'meter',[payload.score_unit==='km'?distance*1000:distance])}
          }
        })
        if(newPRs.length){
          const {data:recordedPRs,error:prWriteError}=await supabase.rpc('record_workout_prs',{
            p_workout_id:workoutId,
            p_records:newPRs
          })
          if(prWriteError)throw prWriteError
          prMessage=recordedPRs?.length
            ?' Nye PR-ar registrerte ('+levelKey.toUpperCase()+'): '+recordedPRs.map(pr=>pr.exercise_name+' '+pr.result+' '+pr.unit).join(', ')
            :' PR-kontrollen er fullført. Ingen nye rekordar over det beste resultatet vart registrerte.'
        }
      } catch(prError) {
        prMessage=' Automatisk PR-kontroll kunne ikkje fullførast: '+(prError.message||'ukjend feil')
      }
      setNotice('Økta er lagra i treningsloggen.' + prMessage)
      setFinishOpen(false); setMode('home'); setReviewOpen(false)
      clearTimerSnapshot()
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
    if (prSaving) return
    if (!prName.trim() || !prResult.trim()) return
    const normalizedResult=Number(prResult.trim().replace(',','.'))
    if(!Number.isFinite(normalizedResult)||normalizedResult<=0){setError('Ein personleg rekord må vera eit gyldig tal større enn null.');return}
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

  return <div className={simpleMode && mode === "home" ? "training-module simple-mode" : "training-module"}>
    {error && <div className="auth-error" role="alert">{error}</div>}
    {notice && <div className="auth-message" role="status"><CheckCircle2 size={16}/> {notice}</div>}
    {mode === 'active' ? <form className="engine-form gg-training-session" onSubmit={saveWorkout}>
      <div className="training-heading"><div><div className="section-kicker">TRENING · AKTIV ØKT</div><h3>{source?.name||'Bygg økta di'}</h3></div><span className="count-pill">{items.length} øvingar</span></div>
      {source&&activeWodEngine.participation!=='individual'&&<section className="wod-execution-partner"><div><strong>{formatParticipation(activeWodEngine)}</strong><span>{({free_split:'Del arbeidet fritt',you_go_i_go:'You go – I go',alternate:'Annankvar / vekselvis',synchronized:'Synkroniserte repetisjonar',parallel:'Parallelt arbeid'})[activeWodEngine.collaboration]||'Felles gjennomføring'}</span></div><small>Resultat blir lagra med partner-/teamoppsettet frå WOD-kortet. Scoring: {(activeWodEngine.scoring?.fields||[]).join(' + ')}</small></section>}
      {source?.timer_settings?.workout_schema?.items?.some(item=>item.levels)&&<section className="wod-execution-level"><strong>Vel doseringsnivå</strong><div className="hub-tabs" role="group" aria-label="Doseringsnivå">{[{id:'rx',label:'RX'},...(source.timer_settings.workout_schema.items.some(item=>item.levels?.intermediate)?[{id:'intermediate',label:'Intermediate'}]:[]),{id:'scaled',label:'Scaled'},{id:'foundation',label:'Foundation'}].map(level=><button type="button" key={level.id} className={wodLevel===level.id?'selected':''} aria-pressed={wodLevel===level.id} onClick={()=>setWodLevel(level.id)}>{level.label}</button>)}</div></section>}
      <div className="engine-fields">
        <label>Namn på økta<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Til dømes Styrke A" required/></label>
        <label>Treningsformat<select value={format} onChange={e => setFormat(e.target.value)}>{FORMATS.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Treningsdato<input type="date" value={workoutDate} max={localDateISO()} disabled={Boolean(classSessionId)} onChange={e=>setWorkoutDate(e.target.value)}/></label>
        {['AMRAP','Nedteljing','E1MOM','E2MOM','E3MOM','E4MOM','E5MOM','E6MOM','E7MOM'].includes(format) && <label>Øktlengd (minutt)<input type="number" min="1" max="600" value={duration} onChange={e => setDuration(e.target.value)}/></label>}
      </div>
      {source?.timer_settings?.workout_schema?.library_category==='warmup'&&<section className="warmup-execution-guide" aria-label="Oppvarming i to delar"><header><span className="section-kicker">OPPVARMING · TO DELAR</span><strong>Førebu kroppen og finn arbeidsnivået</strong></header><div className="warmup-execution-columns"><article><span>1</span><div><strong>Felles oppvarming</strong><p>Gradvis spissing mot hovud-WOD sin stimulus og rørsleform.</p><ul>{items.filter(item=>item.warmup_phase!=='movement_rehearsal'&&!item.is_rest).map(item=><li key={item.key}>{item.exercise_name}</li>)}</ul></div></article><article><span>2</span><div><strong>Fri teknisk innøving</strong><p>Prøv hovudrørsla med lette vekter. Auk gradvis og finn ditt eige arbeidsnivå for WOD-en.</p><ul>{items.filter(item=>item.warmup_phase==='movement_rehearsal'&&!item.is_rest).map(item=><li key={item.key}>{item.exercise_name}</li>)}</ul></div></article></div></section>}
       {manualEntry ? <section className="manual-entry-intro" aria-label="Manuell treningsregistrering"><div><span className="section-kicker">ETTERREGISTRERING</span><strong>Registrer ei økt du allereie har gjennomført</strong><p>Legg inn øvingar, sett, reps, vekt, høgd, tid eller distanse. Ingen timer blir starta.</p></div><button type="button" className="primary-button" onClick={()=>setFinishOpen(true)}>Kontroller og lagre</button></section> : <><Timer autoStartToken={timerLaunchId} format={format} minutes={duration} seconds={durationSeconds} activeExercise={items[activeExerciseIndex]?.exercise_name || ''} nextExercise={items[activeExerciseIndex + 1]?.exercise_name || ''} exerciseList={items} prescriptionLevel={wodLevel} timerSettings={source?.timer_settings || null} onSnapshot={setTimerSnapshot} stop={finishOpen} onFinish={() => setFinishOpen(true)} originLabel={classSessionId ? 'GRUPPETIME' : launchAssignmentId ? 'TILDELT FRÅ PT' : source ? 'EIGEN WOD' : 'EIGA ØKT'}/><HeartRateTrainingPanel /><div className="workout-finish-actions"><button type="button" className="primary-button" onClick={()=>setFinishOpen(true)}>Gå til resultat og lagre økt</button></div></>}
      {items.length > 0 && format!=='Stasjonssirkel' && <section className="engine-section">
        <div className="engine-section-title"><h4>{format==='Stasjonssirkel'?'Stasjonane i økta':'WOD / øvingsrekkjefølgje'}</h4><span>{format==='Stasjonssirkel'?'Alle stasjonar – roter etter eiga startplassering':'Vel øvinga du arbeider med'}</span></div>
        <div className={format==='Stasjonssirkel'?'timer-station-grid':'wod-list'}>{items.map((item, index) => format==='Stasjonssirkel' ? <article className="timer-station-card" key={item.key}><span>STASJON {index+1}</span><strong>{item.exercise_name||'Øving'}</strong><small>{item.reps_mode==='amrap'?'AMRAP · maks reps':item.reps?item.reps+' reps':'Valfritt tal reps'}</small></article> : <button type="button" key={item.key} className={index === activeExerciseIndex ? 'secondary-button active' : 'secondary-button'} onClick={() => setActiveExerciseIndex(index)}>{index + 1}. {item.is_rest?'⏸ Pause · '+clock(Number(item.rest_duration_seconds)||30):item.exercise_name || 'Ny øving'}</button>)}</div>
      </section>}
      {!source&&<section className="engine-section manual-wod-picker"><div className="engine-section-title"><h4>Legg til WOD i økta</h4><span>Du kan kombinere fleire WOD-ar og enkeltøvingar</span></div><div className="manual-wod-picker-row"><select value={manualWodSelect} onChange={e=>setManualWodSelect(e.target.value)}><option value="">Vel WOD frå biblioteket …</option>{manualWodOptions.map(wod=><option key={wod.id} value={wod.id}>{wod.name} · {wod.format}</option>)}</select><button type="button" className="secondary-button" disabled={!manualWodSelect} onClick={addManualWod}><Plus size={15}/> Legg til WOD</button></div>{manualWodIds.length>0&&<div className="manual-wod-chips">{manualWodIds.map(id=>{const wod=manualWodOptions.find(item=>item.id===id);return <span key={id}>{wod?.name||'WOD'}<button type="button" aria-label={'Fjern '+(wod?.name||'WOD')} onClick={()=>{setManualWodIds(rows=>rows.filter(value=>value!==id));setItems(rows=>rows.filter(item=>item.manual_wod_id!==id))}}>×</button></span>})}</div>}</section>}
      <section className="engine-section">
        <div className="engine-section-title"><h4>Øvingar og sett</h4><span>Legg inn resultat per sett</span></div>
        <div className="exercise-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Søk i øvingsbiblioteket …"/></div>
        {query && <div className="exercise-pick-list">{filteredExercises.slice(0,8).map(ex => <button type="button" key={ex.id} onClick={() => addExercise(ex)}><Plus size={14}/><span>{ex.name}</span><small>{ex.category}</small></button>)}</div>}
        {items.map((item, index) => <article className="engine-exercise" key={item.key}>
          <div className="engine-exercise-head"><strong>{index + 1}. {item.exercise_name || 'Ny øving'}</strong>{item.is_complex&&<span className="training-complex-tag">COMPLEX</span>}<button type="button" className="danger-icon" aria-label="Fjern øving" onClick={() => setItems(current => current.filter(x => x.key !== item.key))}><Trash2 size={16}/></button></div>
          {item.is_complex&&Array.isArray(item.complex_steps)&&<div className="training-complex-sequence"><strong>Rørslesekvens</strong><ol>{item.complex_steps.map((step,stepIndex)=><li key={stepIndex}><span>{step.name}</span><b>{step.reps} ×</b></li>)}</ol></div>}
          {!item.exercise_id && <input aria-label="Namn på øving" value={item.exercise_name} onChange={e => updateExercise(item.key,{exercise_name:e.target.value})} placeholder="Namn på øving"/>}
          {item.prescription_levels&&<div className="wod-prescription-target"><strong>Planlagt dosering · {wodLevel.toUpperCase()}</strong><span>{doseLabel({levels:item.prescription_levels},wodLevel)||'Ikkje dosert på dette nivået'}</span></div>}{item.sets.map((set, i) => <div className={item.uses_height&&item.uses_load?"set-grid height-load-set-grid":item.uses_height?"set-grid height-set-grid":"set-grid"} key={i}>
            <span>{item.is_complex?`Syklus ${i+1}`:`Sett ${i+1}`}</span><input type="number" min="0" step="1" value={set.reps} onChange={e => updateSet(item.key,i,{reps:e.target.value})} placeholder={item.is_complex?"Syklusar":"Reps"}/>
            {item.uses_height&&<input type="number" min="1" step="1" value={set.height_cm||''} onChange={e=>updateSet(item.key,i,{height_cm:e.target.value})} placeholder="Høgd (cm)" aria-label={`Høgd i centimeter, sett ${i+1}`}/>}
            {item.uses_load&&<input type="number" min="0" step="0.5" value={set.load_kg} onChange={e => updateSet(item.key,i,{load_kg:e.target.value})} placeholder="Kg" aria-label={`Belastning i kilo, sett ${i+1}`}/>}
            {!item.uses_height&&<input value={set.time_text} onChange={e => updateSet(item.key,i,{time_text:e.target.value})} placeholder="Tid" aria-label={`Tid, sett ${i+1}`}/>}
          </div>)}
          <details className="exercise-extra-result"><summary>Registrer distanse, kaloriar eller tid</summary><div className="exercise-extra-result-grid"><label>Resultat<input type="number" min="0" step="0.1" value={item.rowValue??''} onChange={e=>updateExercise(item.key,{rowValue:e.target.value})} placeholder="T.d. 500"/></label><label>Eining<select value={item.rowUnit||'m'} onChange={e=>updateExercise(item.key,{rowUnit:e.target.value})}><option value="m">Meter</option><option value="km">Kilometer</option><option value="cal">Kaloriar</option><option value="s">Sekund</option><option value="min">Minutt</option></select></label></div></details>
          <button type="button" className="text-button add-set" onClick={() => addSet(item.key)}><Plus size={14}/> Legg til sett</button>
        </article>)}
        <button type="button" className="secondary-button" onClick={() => setItems(current => [...current, emptyExercise()])}><Plus size={15}/> Legg til eiga øving</button>
      </section>
      {finishOpen&&<div className="workout-finish-backdrop" role="presentation">
        <section className="workout-finish-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-workout-title">
          <div className="workout-finish-head"><div><span className="section-kicker">ØKTA ER FERDIG</span><h3 id="finish-workout-title">{title||'Treningsøkt'}</h3></div><button type="button" className="danger-icon" aria-label="Lukk" onClick={()=>setFinishOpen(false)}>×</button></div>
          <div className="workout-finish-summary">
            <div><span>FORMAT</span><strong>{format}</strong></div>
            <div><span>{manualEntry?'REGISTRERING':'TID'}</span><strong>{manualEntry?'Manuell':clock(timerSnapshot.elapsed)}</strong></div>
            <div><span>ØVINGAR</span><strong>{items.length}</strong></div>
            {timerSnapshot.roundsCompleted>0&&<div><span>RUNDER</span><strong>{timerSnapshot.roundsCompleted}</strong></div>}
          </div>
          {items.length>0&&<section className="workout-result-entry">
            <div className="workout-result-tabs" role="tablist" aria-label="Vel øving for resultat">
              {items.map((item,index)=><button type="button" key={item.key} role="tab" aria-selected={activeExerciseIndex===index} className={activeExerciseIndex===index?'selected':''} onClick={()=>setActiveExerciseIndex(index)}>{item.exercise_name||'Øving '+(index+1)}</button>)}
            </div>
            {items[activeExerciseIndex]&&<div className="workout-result-exercise">
              <header><div><span className="section-kicker">RESULTAT · ØVING {activeExerciseIndex+1} AV {items.length}</span><h4>{items[activeExerciseIndex].exercise_name}</h4>{items[activeExerciseIndex].prescription_label&&<small>{items[activeExerciseIndex].prescription_label}</small>}</div><span className="count-pill">{items[activeExerciseIndex].sets?.length||0} sett</span></header>
              <div className="workout-result-set-head"><span>Sett</span><span>Reps</span><span>Målingar</span><span></span></div>
              {(items[activeExerciseIndex].sets||[]).map((set,setIndex)=><div className="workout-result-set" key={setIndex}>
                <strong>{setIndex+1}</strong>
                <input aria-label={'Sett '+(setIndex+1)+' repetisjonar'} type="number" min="0" step="1" value={set.reps} onChange={e=>updateSet(items[activeExerciseIndex].key,setIndex,{reps:e.target.value})} placeholder="–"/>
                <div className="workout-result-measurements">
                  {items[activeExerciseIndex].uses_height&&<label className="workout-result-measure"><input aria-label={'Sett '+(setIndex+1)+' høgd i centimeter'} type="number" min="1" step="1" value={set.height_cm} onChange={e=>updateSet(items[activeExerciseIndex].key,setIndex,{height_cm:e.target.value})} placeholder="cm"/><span>cm</span></label>}
                  {items[activeExerciseIndex].uses_load&&<label className="workout-result-measure"><input aria-label={'Sett '+(setIndex+1)+' vekt i kilo'} type="number" min="0" step="0.5" value={set.load_kg} onChange={e=>updateSet(items[activeExerciseIndex].key,setIndex,{load_kg:e.target.value})} placeholder="kg"/><span>kg</span></label>}
                </div>
                <CheckCircle2 size={22} aria-label="Sett registrert" className={(set.reps!==''||set.load_kg!==''||set.height_cm!==''||set.time_text)?'is-recorded':''}/>
              </div>)}
              <div className="workout-result-actions"><button type="button" className="secondary-button" onClick={()=>addSet(items[activeExerciseIndex].key)}><Plus size={16}/> Legg til sett</button><span>{items[activeExerciseIndex].sets?.filter(set=>set.reps!==''||set.load_kg!==''||set.height_cm!==''||set.time_text).length||0} av {items[activeExerciseIndex].sets?.length||0} registrert</span></div>
            </div>}
          </section>}
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
      <div className="training-heading"><div><div className="section-kicker">{simpleMode ? "SUPERENKEL MODUS · TRENING" : "TRENING · MOTOR"}</div><h3>{simpleMode ? "Kva vil du gjera i dag?" : "Vel øktform"}</h3>{simpleMode&&<p>Vel ei ferdig økt eller start di eiga. Resultatet blir lagra på profilen din.</p>}</div>{!simpleMode&&<span className="count-pill">{RELEASE_NAME}</span>}</div>
      <div className={simpleMode ? "engine-entry-grid simple-entry-grid" : "engine-entry-grid"}>
        <button type="button" onClick={() => startWorkout()}><Dumbbell size={20}/><strong>{simpleMode ? "Start trening" : "Fri trening"}</strong><small>{simpleMode ? "Start klokka og tren" : "Bygg økta frå botnen"}</small></button>
        <button type="button" onClick={() => setMode('wods')}><Activity size={20}/><strong>{simpleMode ? "Følg eit opplegg" : "Start ein WOD"}</strong><small>{simpleMode ? "Vel ei økt som er laga for deg" : "Vel ei publisert økt"}</small></button>
        <button type="button" onClick={startManualWorkout}><Activity size={20}/><strong>Registrer manuell trening</strong><small>Legg inn ei økt du alt har gjennomført</small></button>
      </div>
      {mode === 'wods' && <section className="engine-section wod-library-screen">
        <div className="engine-section-title"><div><h4>WOD-bibliotek</h4><span>{wods.length} publiserte økter</span></div><button className="text-button" onClick={() => setMode('home')}>Lukk</button></div>
        <label className="wod-library-search"><Search size={16}/><input value={wodSearch} onChange={e=>setWodSearch(e.target.value)} placeholder="Søk etter WOD, format eller øving …"/></label>
        <div className="wod-library-toolbar"><button type="button" className={wodFavoritesOnly?'secondary-button favorite-filter active':'secondary-button favorite-filter'} onClick={()=>setWodFavoritesOnly(v=>!v)}><Star size={14} fill={wodFavoritesOnly?'currentColor':'none'}/>{wodFavoritesOnly?'Vis alle publiserte WOD-ar':'Favoritt-WODs'}</button><span>{availableWods.filter(wod=>(!wodFavoritesOnly||favoriteWodIds.includes(wod.id))&&(!wodSearch.trim()||[wod.name,wod.format,wod.movements,wod.notes].some(value=>(value||'').toLowerCase().includes(wodSearch.trim().toLowerCase())))).length} treff</span></div>
        {availableWods.filter(wod=>(!wodFavoritesOnly||favoriteWodIds.includes(wod.id))&&(!wodSearch.trim()||[wod.name,wod.format,wod.movements,wod.notes].some(value=>(value||'').toLowerCase().includes(wodSearch.trim().toLowerCase())))).length ? <div className="wod-list">{availableWods.filter(wod=>(!wodFavoritesOnly||favoriteWodIds.includes(wod.id))&&(!wodSearch.trim()||[wod.name,wod.format,wod.movements,wod.notes].some(value=>(value||'').toLowerCase().includes(wodSearch.trim().toLowerCase())))).sort((a,b)=>(a.id===dailyWodId?-1:0)-(b.id===dailyWodId?-1:0)).map(wod => {
          const schema=wod.timer_settings?.workout_schema||{}
          const engine=normalizeWodEngine(schema,{format:wod.format})
          const wodItems=sortWodItems(getWodSchemaItems(schema))
          const isExpanded=expandedWodId===wod.id
          return <article className={isExpanded?'wod-card wod-card-expanded':'wod-card'} key={wod.id}>
            <div className="wod-top"><span>{wod.id===dailyWodId?'DAGENS WOD · ':''}{wod.timer_settings?.workout_schema?.library_category==='warmup'?'OPPVARMING':wod.timer_settings?.workout_schema?.library_category==='standard'?'STANDARD':'WOD'} · {wod.format||'WOD'}</span><span>{schema.duration_seconds?clock(schema.duration_seconds):wod.duration_minutes?wod.duration_minutes+' MIN':''}</span></div>
            <h4>{wod.name}</h4>
            {engine.participation!=='individual'&&<div className="wod-engine-card-meta"><strong>{formatParticipation(engine)}</strong><span>{({free_split:'Del arbeidet fritt',you_go_i_go:'You go – I go',alternate:'Annankvar / vekselvis',synchronized:'Synkroniserte reps',parallel:'Parallelt arbeid'})[engine.collaboration]||'Samarbeidsøkt'}</span></div>}
            <div className="wod-card-summary">{wodItems.length?String(wodItems.length)+' øvingar':wod.movements?'Øvingar og instruksjon':'Opna for detaljar'}{schema.stimulus?' · '+schema.stimulus:''}</div>
            <div className="wod-card-actions">
              <button type="button" className="secondary-button" onClick={()=>setExpandedWodId(isExpanded?null:wod.id)}>{isExpanded?'Skjul detaljar':'Sjå detaljar'}</button>
              <button type="button" className="primary-button" onClick={()=>startWorkout(wod)}>Utfør WOD</button>
              <button type="button" className={favoriteWodIds.includes(wod.id)?'favorite-star selected':'favorite-star'} onClick={()=>toggleWodFavorite(wod)} aria-label={favoriteWodIds.includes(wod.id)?'Fjern WOD-favoritt':'Merk WOD som favoritt'}><Star size={17} fill={favoriteWodIds.includes(wod.id)?'currentColor':'none'}/></button>
            </div>
            {isExpanded&&<div className="wod-detail-panel">
              {engine.participation!=='individual'&&<div className="wod-level-note"><strong>{formatParticipation(engine)}</strong><p>{({free_split:'Paret/laget fordeler arbeidet fritt.',you_go_i_go:'Ein utøvar jobbar medan den andre kviler.',alternate:'Utøvarane byter på arbeidet.',synchronized:'Repetisjonane skal utførast synkront.',parallel:'Utøvarane arbeider parallelt.'})[engine.collaboration]||'Felles gjennomføring.'}</p><small>Scoring: {(engine.scoring?.fields||[]).join(' + ')}</small></div>}
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
        {history.length ? <div className="history-list">{history.map(log => <article className="history-card" key={log.id}><div className="history-card-top"><strong>{log.title}</strong><span>{log.workout_date}</span></div><small>{log.format} · {log.workout_exercises?.length || 0} øvingar</small>{log.workout_exercises?.sort((a,b)=>a.sort_order-b.sort_order).map((ex,index) => {const result=log.result_data?.exercise_results?.[index];return <div className="history-exercise" key={ex.id}><b>{ex.exercise_name}</b><span>{[result?.row_value!=null?[result.row_value,({m:'m',km:'km',cal:'cal',s:'sek',min:'min'})[result.row_unit]||result.row_unit].filter(Boolean).join(' '):'',(ex.workout_sets || []).map(s => [s.reps ? (result?.is_complex?'syklusar ':'')+s.reps+(result?.is_complex?'':' reps') : '', s.height_cm ? s.height_cm+' cm' : '', s.load_kg ? s.load_kg+' kg' : '', s.time_text || ''].filter(Boolean).join(' · ')).filter(Boolean).join(' / ')].filter(Boolean).join(' · ') || 'Ingen resultat registrert'}</span>{result?.is_complex&&Array.isArray(result.complex_steps)&&<small className="training-complex-sequence"><strong>Komplekssekvens</strong><ol>{result.complex_steps.map((step,stepIndex)=><li key={stepIndex}>{step.reps} × {step.name}</li>)}</ol></small>}</div>})}{log.note && <p>{log.note}</p>}</article>)}</div> : <div className="empty-state">Du har ikkje lagra økter enno.</div>}
      </section>
      <section className={simpleMode ? "engine-section simple-hidden-section" : "engine-section"}>
        <PerformanceCenter history={history} records={records}/>
        <div className="engine-section pr-manual-entry">
          <div className="training-heading"><div><div className="section-kicker">MANUELL REGISTRERING</div><h3>Legg inn ein PR</h3></div></div>
          <form className="pr-form" onSubmit={savePersonalRecord}>
            <input value={prName} onChange={e => setPrName(e.target.value)} placeholder="Øving, t.d. Markløft" required/>
            <input value={prResult} onChange={e => setPrResult(e.target.value)} placeholder="Resultat, t.d. 120" required/>
            <select value={prUnit} onChange={e => setPrUnit(e.target.value)}><option value="kg">kg</option><option value="cm">cm</option><option value="reps">reps</option><option value="sek">sek</option><option value="min">min</option><option value="meter">meter</option><option value="watt">watt</option></select>
            <input value={prNote} onChange={e => setPrNote(e.target.value)} placeholder="Notat (valfritt)"/>
            <button className="secondary-button" type="submit" disabled={prSaving}>{prSaving ? 'Lagrar …' : 'Registrer PR'}</button>
          </form>
        </div>
      </section>
      <section className={simpleMode ? "engine-section simple-hidden-section" : "engine-section"}>
        <div className="training-heading"><div><div className="section-kicker">BIBLIOTEK</div><h3>Øvingsbibliotek</h3></div><span className="count-pill">{exercises.length} øvingar</span></div>
        {exercises.length ? <><div className="exercise-library-toolbar"><label className="exercise-library-search"><Search size={15}/><input value={libraryQuery} onChange={e => setLibraryQuery(e.target.value)} placeholder="Søk etter øving eller kategori …"/></label><button type="button" className={favoritesOnly ? 'secondary-button favorite-filter active' : 'secondary-button favorite-filter'} onClick={() => setFavoritesOnly(v => !v)}><Star size={14}/>{favoritesOnly ? 'Vis alle øvingar' : 'Favorittar'}</button></div>{(()=>{const q=libraryQuery.trim().toLowerCase();const filtered=exercises.filter(ex=>(!favoritesOnly||favoriteNames.includes(ex.name))&&(!q||[ex.name,ex.category,ex.equipment].some(v=>(v||'').toLowerCase().includes(q))));const categories=[...new Set(filtered.map(ex=>ex.category||'Anna'))].sort((a,b)=>a.localeCompare(b,'nn'));return <div className="exercise-library-groups">{categories.length?categories.map((category,index)=>{const group=filtered.filter(ex=>(ex.category||'Anna')===category);return <details className="exercise-library-group" key={category} open={!!q||index===0}><summary><strong>{category}</strong><span>{group.length} øvingar</span></summary><div className="exercise-list">{group.map(ex=><div className="exercise-row" key={ex.id}><Dumbbell size={16}/><div><strong>{ex.name}</strong><span>{[ex.category,ex.equipment].filter(Boolean).join(' · ')}</span></div><button type="button" className={favoriteNames.includes(ex.name)?'favorite-star selected':'favorite-star'} onClick={()=>toggleFavorite(ex)} aria-label={favoriteNames.includes(ex.name)?'Fjern favoritt':'Legg til favoritt'}><Star size={17} fill={favoriteNames.includes(ex.name)?'currentColor':'none'}/></button></div>)}</div></details>}) : <div className="empty-state">{favoritesOnly?'Du har ikkje merkt nokon øvingar som favoritt.':'Ingen øvingar passar søket.'}</div>}</div>})()}</> : <div className="empty-state">Øvingsbiblioteket er tomt. Øvingar kan leggjast inn av admin/manager.</div>}
      </section>
    </>}
  </div>
}
