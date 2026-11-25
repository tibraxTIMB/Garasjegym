import {collectResultIssues,resultIssueLabel} from '../lib/resultValidation.js'
import {flowItemGroup,flowBlockForItem,clearFlowItem,emptyFlowSet,flowCompletionRows,flowReporting,hasMeasuredFlowSet} from '../lib/workoutFlow.js'
import {blockScoreDefinition,explicitBlockResults} from '../lib/compositeWod.js'
import {retrospectiveBlocks,retrospectiveScoreKind,retrospectiveBlockResults,hasManualEntryChanges} from '../lib/retrospectiveWod.js'
import {complexResultSummary,plannedComplexCycles,confirmWeightedComplexSets} from '../lib/wodComplexes.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, CalendarDays, CheckCircle2, ChevronDown, Clock3, Dumbbell, History, House, LoaderCircle, Pause, Play, Plus, RotateCcw, Save, Search, Star, Heart, Trash2, Settings2, Settings, ChevronRight, Trophy, Monitor, Timer as TimerIcon, Music2, HeartPulse, Undo2, Hand, List, Volume2, VolumeX, Maximize2, Minimize2, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { RELEASE_NAME } from '../lib/release.js'
import HeartRateTrainingPanel from './HeartRateTrainingPanel.jsx'
import { Music, MusicMiniPlayer } from './Music.jsx'
import { readDeviceProfile, useDeviceProfile } from '../lib/deviceLayout.js'
import { getWodSchemaItems, sortWodItems } from '../lib/wodOrdering.js'
import { formatComplexSequence } from '../lib/wodComplexes.js'
import { formatParticipation, normalizeWodEngine, isEmomFormat, emomIntervalSeconds, emomDisplayLabel, emomPrescribedSetCount } from '../lib/wodEngine.js'
import { clampElapsedToTarget, elapsedSecondsFromTimestamp, getFixedSlotTimerState, splitDuration, summarizeLapSplits, nextManualActionDeadline } from '../lib/timerClock.js'
import { getExerciseMeasurementFlags, isErgExercise } from '../lib/exerciseMeasurements.js'
import {checkPRVictories,hasVictoryCandidate,readPRVictoryAudio,isPRVictorySoundEnabled,setPRVictorySoundEnabled} from '../lib/prVictory.js'
import {exerciseResultReview} from '../lib/resultReview.js'
import {COMPOSITE_FORMAT, compositeBlockForTimer, compositeTimerConfig, compositeTransitionSeconds, compositeScoredBlocks, plannedFixedEmomSets} from '../lib/compositeWod.js'
import { exerciseRecordType } from '../lib/prMetrics.js'
import { deathByTimerState } from '../lib/deathBy.js'
import { equivalentLibraryWodSource } from '../lib/compositeLibrary.js'
import { ladderStatus } from '../lib/ladder.js'
import { getWodSideLabel, isSideSelectableExercise, WOD_SIDE_OPTIONS } from '../lib/wodSides.js'
import { captureTrainingLaunchContext, emptyTrainingLaunchContext } from '../lib/trainingLaunchContext.js'
import { readOfflineLibrary, writeOfflineLibrary, isOffline } from '../lib/offlineTraining.js'
import { previousExerciseResult } from '../lib/previousResult.js'
import MuscleMap from './MuscleMap.jsx'
import {muscleProfile} from '../lib/muscleProfile.js'
import { canLeavePreparedWod } from '../lib/prestartExit.js'
import { exerciseBrowseCategory } from '../lib/exerciseCategories.js'
import { restoreWorkoutDraft, saveWorkoutDraft, clearWorkoutDraft, resumedElapsedSeconds, workoutSaveFingerprint, isRetryableWorkoutError } from '../lib/workoutDraft.js'
import { canSaveDurationOnlyWorkout } from '../lib/freeSession.js'
import { countdownSignal, secondsToTimerBoundary, runningTimerSignal, TRAINING_AUDIO_PROFILES } from '../lib/timerCues.js'
import { preloadSoundPack, unlockSoundPack, playPackSignal, playDirectPackSignal, stopDirectAudio, stopPackAudio, SOUND_PACK_NAMES, SOUND_PACK_VERSION, readAudioPack, setAudioPack } from '../lib/trainingAudio.js'
import GarageSelect from './GarageSelect.jsx'
import {FlowEntryProvider,FlowNumberInput,FlowKeypad,useFlowConfirm,FlowConfirmDialog} from './FlowEntry.jsx'
import './timer-viewport.css'
import PRVictoryOverlay from './PRVictoryOverlay.jsx'

const FORMATS = [COMPOSITE_FORMAT,'Fri trening', 'EMOM', 'AMRAP', 'For Time', 'Chipper', 'Couplet', 'Triplet', 'Ladder', 'Death By', 'Tabata', 'Intervall', 'Row Intervals', 'Strength', 'Pyramid', 'Superset', 'Complex', 'Eigen økt', 'Stoppeklokke', 'Nedteljing', 'Tilpassa']
const RESULT_UNITS = [{value:'m',label:'Meter (m)'},{value:'km',label:'Kilometer (km)'},{value:'cal',label:'Kaloriar (cal)'},{value:'s',label:'Sekund (s)'},{value:'min',label:'Minutt (min)'}]
const emptyExercise = () => ({ key: crypto.randomUUID(), exercise_id: '', exercise_name: '', uses_height: false, uses_load: true, equipment:'', rowValue:'', rowUnit:'m', workSeconds:'', sets: [{ reps: '', load_kg: '', time_text: '', time_seconds: '', height_cm: '' }] })
const pad = (n) => String(n).padStart(2, '0')
const clock = (seconds) => `${pad(Math.floor(Math.max(0, seconds) / 60))}:${pad(Math.max(0, seconds) % 60)}`
const doseLabel=(item,level='rx')=>{const d=item?.levels?.[level]||(level==='intermediate'?item?.levels?.rx:null)||{};const parts=[];if(d.sets)parts.push(d.sets+' sett');if(d.reps)parts.push(d.reps+' reps');if(d.heightCm)parts.push(d.heightCm+' cm');if(d.durationSeconds)parts.push(d.durationSeconds+' sek');if(d.distanceMeters)parts.push(d.distanceMeters+' m');if(d.calories)parts.push(d.calories+' cal');if(d.loadMode==='kg'){const loads=[d.loadKgMen!==''&&d.loadKgMen!=null?'M '+d.loadKgMen+' kg':'',d.loadKgWomen!==''&&d.loadKgWomen!=null?'K '+d.loadKgWomen+' kg':''].filter(Boolean);if(loads.length)parts.push(loads.join(' / '))}else if(d.loadMode==='percent'&&d.percent1rm)parts.push(d.percent1rm+' % 1RM');else if(d.loadMode==='rir'&&(d.rirRange||d.rir!==''))parts.push('RIR '+(d.rirRange||d.rir));else if(d.loadMode==='bodyweight')parts.push('Kroppsvekt');if(d.tempo)parts.push('Tempo '+d.tempo);if(d.variant)parts.push('Variant: '+d.variant);if(d.instruction)parts.push(d.instruction);return parts.join(' · ')||''};
const wodRowUnit=(item,level='rx')=>{
  const prescribed=item?.levels?.[level]||item?.levels?.rx||{}
  if(prescribed.calories!=null&&prescribed.calories!=='')return 'cal'
  if(prescribed.distanceMeters!=null&&prescribed.distanceMeters!=='')return 'm'
  if(prescribed.durationSeconds!=null&&prescribed.durationSeconds!=='')return 's'
  return item?.row_unit||'m'
}
const getEmomIntervalMinutes = (format, timerSettings) => emomIntervalSeconds(format,timerSettings?.workout_schema?.interval)/60
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
// Keep the unlocked audio context through automatic composite WOD transitions.
let sharedTrainingAudioContext=null
function Timer({ format, minutes, seconds = 0, activeExercise = '', nextExercise = '', exerciseList = [], previousLogs = [], prescriptionLevel = 'rx', timerSettings = null, onSnapshot = () => {}, stop = false, onFinish = () => {}, finishLabel = 'Avslutt', onBackground = () => {}, onCancelBeforeStart = null, onEditWorkout = null, visible = true, originLabel = 'EIGA ØKT', wodName = '', autoStartToken = 0, autoStartOnMount = false, resumeState = null, offline=false, draftProtected=true }) {
  const timerConfigKey = JSON.stringify({format,minutes,seconds,timerSettings})
  const lastTimerConfigKey = useRef(timerConfigKey)
  const [elapsed, setElapsed] = useState(() => resumedElapsedSeconds(resumeState))
  const [running, setRunning] = useState(() => Boolean(resumeState?.running))
  const [round, setRound] = useState(() => Number(resumeState?.currentRound) || 1)
  const [deathByConfirmedRounds,setDeathByCompletedRounds] = useState(() => Math.max(0,Number(resumeState?.death_by_completed_rounds)||0))
  const [ladderCompletedRounds,setLadderCompletedRounds] = useState(() => Math.max(0,Number(resumeState?.ladder_completed_rounds)||0))
  const [workSeconds, setWorkSeconds] = useState(getDefaultWorkSeconds(format,timerSettings))
  const [restSeconds, setRestSeconds] = useState(getDefaultRestSeconds(format,timerSettings))
  const [rounds, setRounds] = useState(timerSettings?.rounds ?? timerSettings?.workout_schema?.station_circuit?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
  const [durationOverride, setDurationOverride] = useState(null)
  const [emomEveryOverride, setEmomEveryOverride] = useState(null)
  // Phone and tablet sessions open with the clock using the whole viewport.
  // Desktop keeps the wider training workspace until the user expands it.
  const [focused, setFocused] = useState(() => readDeviceProfile().device !== 'desktop')
  const timerContainerRef = useRef(null)
  const [hasStarted, setHasStarted] = useState(() => Boolean(resumeState?.hasStarted))
  const [countdownDeadline, setCountdownDeadline] = useState(() => resumeState?.countdownDeadline || null)
  const [countdownRemaining, setCountdownRemaining] = useState(() => resumeState?.countdownDeadline ? Math.max(0, Math.ceil((resumeState.countdownDeadline - Date.now()) / 1000)) : 0)
  const scheduledStartedAt = useRef(null)
  const [phase, setPhase] = useState(() => resumeState?.phase || 'Klar')
  const [laps, setLaps] = useState(() => Array.isArray(resumeState?.laps) ? resumeState.laps : [])
  const [soundOn, setSoundOn] = useState(()=>{try{return localStorage.getItem('garasjegym.timer.audio_profile')!=='silent'&&localStorage.getItem('garasjegym.timer.sound_enabled')!=='off'}catch{return true}})
  useEffect(()=>{try{localStorage.setItem('garasjegym.timer.sound_enabled',soundOn?'on':'off')}catch{}},[soundOn])
  const [roundGuardSeconds,setRoundGuardSeconds]=useState(()=>{try{const n=Number(localStorage.getItem('garasjegym.timer.round_guard'));return [1,2,3,5,10].includes(n)?n:5}catch{return 5}})
  const [buttonSize,setButtonSize]=useState(()=>{try{return localStorage.getItem('garasjegym.timer.action_size')==='xl'?'xl':'large'}catch{return 'large'}})
  const [roundHaptic,setRoundHaptic]=useState(()=>{try{return localStorage.getItem('garasjegym.timer.round_haptic')!=='off'}catch{return true}})
  const [showPulse,setShowPulse]=useState(()=>{try{return localStorage.getItem('garasjegym.timer.show_pulse')!=='off'}catch{return true}})
  const [showMusic,setShowMusic]=useState(()=>{try{return localStorage.getItem('garasjegym.timer.show_music')!=='off'}catch{return true}})
  useEffect(()=>{try{localStorage.setItem('garasjegym.timer.round_guard',String(roundGuardSeconds));localStorage.setItem('garasjegym.timer.action_size',buttonSize);localStorage.setItem('garasjegym.timer.round_haptic',roundHaptic?'on':'off');localStorage.setItem('garasjegym.timer.show_pulse',showPulse?'on':'off');localStorage.setItem('garasjegym.timer.show_music',showMusic?'on':'off')}catch{}},[roundGuardSeconds,buttonSize,roundHaptic,showPulse,showMusic])
  const manualActionDeadline=useRef(0)
  const [manualLockUntil,setManualLockUntil]=useState(0)
  const [manualLockSeconds,setManualLockSeconds]=useState(0)
  const [canUndoManual,setCanUndoManual]=useState(false)
  const lastManualAction=useRef(null)
  const [finishConfirm,setFinishConfirm]=useState(false)
  useEffect(()=>{
    if(!manualLockUntil)return
    const refresh=()=>{const left=Math.max(0,Math.ceil((manualLockUntil-Date.now())/1000));setManualLockSeconds(left);if(!left)setManualLockUntil(0)}
    refresh()
    const id=window.setInterval(refresh,100)
    return()=>window.clearInterval(id)
  },[manualLockUntil])
  function clearManualAction(){lastRunningCueSecondRef.current=-1;manualActionDeadline.current=0;setManualLockUntil(0);setManualLockSeconds(0);lastManualAction.current=null;setCanUndoManual(false);setFinishConfirm(false)}
  function claimManualAction(kind){
    const next=nextManualActionDeadline(Date.now(),manualActionDeadline.current,roundGuardSeconds)
    if(next===null)return false
    manualActionDeadline.current=next;setManualLockUntil(next);setManualLockSeconds(roundGuardSeconds)
    lastManualAction.current=kind;setCanUndoManual(kind==='round'||kind==='split')
    if(roundHaptic){try{navigator.vibrate?.(80)}catch{}}
    return true
  }
  const [audioProfile,setAudioProfile]=useState(()=>{
    try{const value=localStorage.getItem('garasjegym.timer.audio_profile');return TRAINING_AUDIO_PROFILES.includes(value)&&value!=='silent'?value:'personal'}catch{return 'personal'}
  })
  const [prVictoryAudio,setPRVictoryAudio]=useState(()=>isPRVictorySoundEnabled())
  useEffect(()=>{const sync=()=>setPRVictoryAudio(isPRVictorySoundEnabled());window.addEventListener('gg-pr-victory-audio-change',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('gg-pr-victory-audio-change',sync);window.removeEventListener('storage',sync)}},[])
  const [countdownAudio,setCountdownAudio]=useState(()=>{try{return localStorage.getItem('garasjegym.timer.countdown_audio')!=='off'}catch{return true}})
  const [vibration,setVibration]=useState(()=>{try{return localStorage.getItem('garasjegym.timer.vibration')==='on'}catch{return false}})
  const [audioPack,chooseAudioPack]=useState(()=>readAudioPack())
  const [testCue,setTestCue]=useState('start')
  const [audioDiagnostic,setAudioDiagnostic]=useState('Lydpakke '+SOUND_PACK_VERSION)
  useEffect(()=>{let live=true;preloadSoundPack(audioProfile).then(()=>{if(live)setAudioDiagnostic('Lydfiler klare · '+SOUND_PACK_NAMES[audioProfile]+' · '+(audioPack==='generative'?'KI lyd':'standard'))}).catch(e=>{if(live)setAudioDiagnostic('Lydfeil: '+e.message)});return()=>{live=false}},[audioProfile,audioPack])
  const audioPrefs=useRef({audioProfile,countdownAudio,vibration})
  audioPrefs.current={audioProfile,countdownAudio,vibration}
  useEffect(()=>{try{localStorage.setItem('garasjegym.timer.audio_profile',audioProfile);localStorage.setItem('garasjegym.timer.countdown_audio',countdownAudio?'on':'off');localStorage.setItem('garasjegym.timer.vibration',vibration?'on':'off')}catch{/* Valfritt */}},[audioProfile,countdownAudio,vibration])
  const [soundVolume,setSoundVolume]=useState(()=>{
    try{const raw=localStorage.getItem('garasjegym.timer.sound_volume');const saved=Number(raw);return raw!=null&&Number.isFinite(saved)&&saved>=0&&saved<=100?saved:100}catch{return 100}
  })
  const volumeRef=useRef(soundVolume)
  volumeRef.current=soundVolume
  useEffect(()=>{try{localStorage.setItem('garasjegym.timer.sound_volume',String(soundVolume))}catch{/* Valfritt */}},[soundVolume])
  const soundOnRef = useRef(soundOn)
  soundOnRef.current = soundOn
  useEffect(()=>{if(!soundOn){stopPackAudio(sharedTrainingAudioContext);stopDirectAudio()}},[soundOn])
  const lastCountdownCueRef = useRef({deadline:null,second:null})
  const lastRunningCueSecondRef = useRef(-1)
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
  const isEMOM = isEmomFormat(format)
  const emomCycle = Math.max(5,Math.min(3600,Math.round(Number(emomEveryOverride)>0?Number(emomEveryOverride)*60:emomIntervalSeconds(format,schema?.interval))))
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
  const plannedForTimeRounds=isForTime&&Number.isInteger(Number(schema?.rounds))&&Number(schema.rounds)>0?Number(schema.rounds):0
  const isDeathBy = format === 'Death By'
  const isLadder = format === 'Ladder'
    const ladderProgress=ladderStatus(ladderCompletedRounds,schema?.ladder,schema?.rounds??timerSettings?.rounds)
  const hasTimeCap = capDuration > 0 && !isCountdown && !isEMOM && !isTimedInterval && !isStationCircuit
  const fallbackDuration = Math.max(1, (Number(minutes) || 10) * 60 + (Number(seconds) || 0))
  const defaultTarget = Math.max(1, isCountdown && capDuration ? capDuration : hasTimeCap ? capDuration : savedDuration || fallbackDuration)
  const target = Math.max(1, Number(durationOverride) || defaultTarget)
   const deathByStatus=deathByTimerState(hasTimeCap?Math.min(elapsed,target):elapsed,deathByConfirmedRounds,schema?.ladder,{autoAdvance:true})
   const deathByCompletedRounds=deathByStatus.completedRounds
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
    includeFinalRest: isTimedInterval && schema?.include_final_rest===true,
  })
  const intervalTotal = fixedSlotState.totalSeconds
  const intervalExerciseIndex = fixedSlotState.currentSlotIndex % intervalExerciseCount
  const currentIntervalExercise = exerciseList[intervalExerciseIndex]?.exercise_name || exerciseList[intervalExerciseIndex]?.name || activeExercise
  const currentEmomRound = Math.min(Math.max(1,Math.ceil(target/emomCycle)),Math.floor(elapsed/emomCycle)+1)
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
  ) || (isTimedInterval && elapsed >= intervalTotal) || (isDeathBy && deathByStatus.failed)
  const totalTarget = isStationCircuit ? stationTotal : isTimedInterval ? intervalTotal : target
  const remainingTotal = Math.max(0, totalTarget - elapsed)
  const inWorkPhase = !fixedSlotState.isTransition && !fixedSlotState.isComplete
  const phaseRemaining = fixedSlotState.phaseRemaining
  const currentRound = (isStationCircuit || isTimedInterval)
    ? fixedSlotState.currentRound
    : isEMOM ? Math.floor(elapsed / emomCycle) + 1
    : isDeathBy ? deathByStatus.round
    : isLadder ? ladderProgress.currentRound
    : Math.floor(elapsed / 60) + 1
  const currentPhase = isStationCircuit || isTimedInterval
    ? fixedSlotState.phase
    : isEMOM ? (isEmomWorkPhase ? 'ARBEID' : isEmomRestPhase ? 'KVILE' : 'VENTAR')
    : isDeathBy ? (deathByStatus.roundConfirmed?'VENTAR PÅ NESTE RUNDE':'ARBEID')
    : isLadder ? 'ARBEID' : 'PÅGÅR'
  const primaryTime = isCountdown ? remainingTotal
    : (isTimedInterval || isStationCircuit) ? phaseRemaining
    : isEMOM ? (timerLimitReached ? 0 : emomPhaseRemaining)
    : isDeathBy ? (timerLimitReached ? 0 : deathByStatus.secondsLeft)
    : elapsed

  function ensureAudioContext() {
    if (!soundOnRef.current || audioPrefs.current.audioProfile==='silent') return null
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return null
      if (!sharedTrainingAudioContext || sharedTrainingAudioContext.state === 'closed') sharedTrainingAudioContext = new AudioContextClass()
      const context = sharedTrainingAudioContext
      if (context.state === 'suspended') context.resume()?.catch(()=>{})
      return context
    } catch { return null }
  }
  function playSignal(signal,{test=false}={}) {
    const prefs=audioPrefs.current
    if (!test && signal.startsWith('tick-')&&!prefs.countdownAudio) return
    if (prefs.vibration && !signal.startsWith('tick-')) {try{navigator.vibrate?.(signal==='finish'?[140,80,140]:100)}catch{}}
    if(!soundOnRef.current||volumeRef.current===0||prefs.audioProfile==='silent')return
    const context=ensureAudioContext()
    stopDirectAudio()
    playPackSignal(context,signal,volumeRef.current,prefs.audioProfile,{preview:test,format}).then(ok=>{if(ok&&test)setAudioDiagnostic('Web Audio spelar · '+SOUND_PACK_NAMES[prefs.audioProfile]+' · '+signal)}).catch(e=>setAudioDiagnostic('Lydfeil: '+e.message))
  }
  function directAudioTest(){
    const prefs=audioPrefs.current
    stopPackAudio(sharedTrainingAudioContext)
    playDirectPackSignal(prefs.audioProfile,testCue,volumeRef.current,format).then(()=>setAudioDiagnostic('Vanleg lydavspeling · '+SOUND_PACK_NAMES[prefs.audioProfile]+' · '+testCue)).catch(e=>setAudioDiagnostic('Lydfeil: '+e.message))
  }

  useEffect(() => {
    // Never erase an in-progress clock on the initial mount/StrictMode replay.
    if (lastTimerConfigKey.current === timerConfigKey) return
    lastTimerConfigKey.current = timerConfigKey
    timerRunStartedAt.current = null
    timerRunBaseElapsed.current = 0
    elapsedRef.current = 0
    clearManualAction(); setElapsed(0); setRunning(false); setRound(1); setDeathByCompletedRounds(0); setLadderCompletedRounds(0); setPhase('Klar'); setLaps([])
    setHasStarted(false); setCountdownDeadline(null); setCountdownRemaining(0); scheduledStartedAt.current = null
    setWorkSeconds(getDefaultWorkSeconds(format,timerSettings))
    setRestSeconds(getDefaultRestSeconds(format,timerSettings))
    setRounds(timerSettings?.rounds ?? timerSettings?.workout_schema?.station_circuit?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
    setDurationOverride(null); setEmomEveryOverride(null)
  }, [timerConfigKey])

  // Opening a WOD prepares the clock. The athlete chooses a 10-second countdown
  // or an immediate start from the full-screen clock itself.
  useEffect(() => {
    if (!autoStartToken) return
    timerRunBaseElapsed.current = 0
    elapsedRef.current = 0
    timerRunStartedAt.current = null
    clearManualAction(); setElapsed(0)
    setRound(1)
    setDeathByCompletedRounds(0)
    setLadderCompletedRounds(0)
    setLaps([])
    setDurationOverride(null); setEmomEveryOverride(null)
    setWorkSeconds(getDefaultWorkSeconds(format,timerSettings))
    setRestSeconds(getDefaultRestSeconds(format,timerSettings))
    setRounds(timerSettings?.rounds ?? timerSettings?.workout_schema?.station_circuit?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
    scheduledStartedAt.current = null
    setCountdownDeadline(null); setCountdownRemaining(0)
    setHasStarted(false)
    setPhase('Klar')
    setRunning(false)
  }, [autoStartToken])

  useEffect(() => {
    if (countdownDeadline === null) return undefined
    const refresh = () => {
      const secondsLeft = Math.max(0, Math.ceil((countdownDeadline - Date.now()) / 1000))
      setCountdownRemaining(secondsLeft)
      if (secondsLeft > 0) return
      // The original deadline is retained so a sleeping browser catches up.
      scheduledStartedAt.current = countdownDeadline
      setCountdownDeadline(null)
      setHasStarted(true)
      setPhase('PÅGÅR')
      setRunning(true)
      playSignal('start')
    }
    refresh()
    const id = window.setInterval(refresh, 150)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', refresh) }
  }, [countdownDeadline])

  useEffect(() => {
    if (countdownDeadline === null) { lastCountdownCueRef.current = {deadline:null,second:null}; return }
    const last = lastCountdownCueRef.current
    if (last.deadline !== countdownDeadline) lastCountdownCueRef.current = {deadline:countdownDeadline,second:null}
    const signal = countdownSignal(countdownRemaining)
    if (signal && signal !== 'start' && lastCountdownCueRef.current.second !== countdownRemaining) {
      lastCountdownCueRef.current.second = countdownRemaining
      playSignal(signal)
    }
  }, [countdownDeadline, countdownRemaining])

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
  const stageVisible = focused && !stop && visible
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
      timerRunStartedAt.current = scheduledStartedAt.current ?? Date.now()
      scheduledStartedAt.current = null
      const refresh = () => {
        if (timerRunStartedAt.current == null) return
        const nextElapsed = elapsedSecondsFromTimestamp(timerRunStartedAt.current, timerRunBaseElapsed.current)
        setElapsed(current => current === nextElapsed ? current : nextElapsed)
      }
      refresh()
      const id = window.setInterval(refresh, 200)
      document.addEventListener('visibilitychange', refresh)
      return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', refresh) }
    }
    if (timerRunStartedAt.current != null) {
      const finalElapsed = elapsedSecondsFromTimestamp(timerRunStartedAt.current, timerRunBaseElapsed.current)
      timerRunStartedAt.current = null
      setElapsed(current => Math.max(current, finalElapsed))
    }
    return undefined
  }, [running])

  useEffect(() => { onSnapshot({ elapsed, laps, roundsCompleted: isDeathBy ? deathByCompletedRounds : isLadder ? ladderCompletedRounds : (isStationCircuit||isTimedInterval) ? fixedSlotState.roundsCompleted : isEMOM ? Math.min(Math.floor(target/emomCycle),Math.floor(elapsed/emomCycle)) : (isAmrap||plannedForTimeRounds) ? laps.length : round, death_by_completed_rounds:isDeathBy?deathByCompletedRounds:null, death_by_failed_round:isDeathBy?deathByStatus.failedRound:null, death_by_interval_seconds:isDeathBy?deathByStatus.intervalSeconds:null, ladder_completed_rounds:isLadder?ladderCompletedRounds:null, ladder_finished:isLadder?ladderProgress.finished:null, phase, running, remaining:remainingTotal, displayTime:primaryTime, countdown:isCountdown||isEMOM||isDeathBy||isTimedInterval||isStationCircuit||hasTimeCap, currentRound, hasStarted, countdownDeadline, savedAt:Date.now() }) }, [elapsed, laps, round, deathByCompletedRounds, ladderCompletedRounds, phase, running, isCountdown, isDeathBy, onSnapshot, isStationCircuit, cycle, stationCount, stationPlan.rounds, schema?.rounds, rounds, remainingTotal, primaryTime, currentRound, hasStarted, countdownDeadline])

  useEffect(() => {
    if (!running) return
    if (lastRunningCueSecondRef.current === elapsed) return
    lastRunningCueSecondRef.current = elapsed
    if (timerLimitReached) {
      const finishAt = isDeathBy&&deathByStatus.failed ? deathByStatus.failureAt : isStationCircuit ? stationTotal : isTimedInterval ? intervalTotal : target
      setElapsed(clampElapsedToTarget(elapsed, finishAt))
      timerRunStartedAt.current = null
      setRunning(false)
      setPhase(isDeathBy&&deathByStatus.failed ? 'FERDIG' : hasTimeCap ? 'TIDSGRENSE' : 'FERDIG')
      playSignal('finish')
      return
    }
    const phaseChanged = elapsed > 0 && (((isTimedInterval || isStationCircuit) && (elapsed % cycle === 0 || elapsed % cycle === effectiveWorkSeconds)) ||
      (isEMOM && elapsed > 0 && (elapsed % emomCycle === 0 || elapsed % emomCycle === effectiveEmomWorkSeconds || elapsed % emomCycle === effectiveEmomWorkSeconds+effectiveEmomRestSeconds)) ||
      (isDeathBy && elapsed > 0 && elapsed % deathByStatus.intervalSeconds === 0))
    const secondsToBoundary = secondsToTimerBoundary({format,elapsed,remainingTotal,phaseRemaining,emomPhaseRemaining,isTimedInterval,isStationCircuit,isEMOM,isCountdown,hasTimeCap,isDeathBy,deathByIntervalSeconds:deathByStatus.intervalSeconds})
    const signal = runningTimerSignal({secondsToBoundary,phaseChanged})
    if (signal) playSignal(signal === 'transition' ? (isDeathBy || (isEMOM && isEmomWorkPhase) || ((isTimedInterval || isStationCircuit) && inWorkPhase) ? 'round' : isStationCircuit || (isEMOM&&!isEmomRestPhase) ? 'station' : 'rest') : signal)
  }, [elapsed, running, timerLimitReached, target, capDuration, hasTimeCap, isCountdown, isEMOM, isDeathBy, deathByStatus.failed, deathByStatus.failureAt, deathByStatus.intervalSeconds, isTimedInterval, isStationCircuit, intervalTotal, stationTotal, cycle, emomCycle, effectiveWorkSeconds, effectiveEmomWorkSeconds, effectiveEmomRestSeconds])

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

  async function returnToApp() {
    try { if (document.fullscreenElement === timerContainerRef.current) await document.exitFullscreen?.() } catch { /* CSS-biletet kan lukkast utan Fullscreen API. */ }
    setStagePanel(null)
    onBackground()
  }

  const isAmrap = format === 'AMRAP' || (['Couplet','Triplet'].includes(format) && schema?.combination_mode === 'AMRAP')
  const isStopwatch = ['Stoppeklokke', 'Fri trening', 'Strength', 'Pyramid', 'Superset', 'Complex', 'Eigen økt'].includes(format) ||
    (['Couplet', 'Triplet'].includes(format) && schema?.combination_mode === 'Open')
  const showTimeCap = hasTimeCap
  const roundsShown = isTimedInterval ? Math.min(currentRound, Number(rounds)) : currentRound
  const completedRounds = (isAmrap||plannedForTimeRounds) ? laps.length : isLadder ? ladderCompletedRounds : isEMOM ? Math.min(Math.floor(target/emomCycle),Math.floor(elapsed/emomCycle)) : (isStationCircuit||isTimedInterval) ? fixedSlotState.roundsCompleted : round
  const lapAction = () => { if(!running||timerLimitReached||!claimManualAction('round'))return; setLaps(value => [...value, splitDuration(elapsed, value)]); setRound(value => value + 1); if(plannedForTimeRounds&&laps.length+1>=plannedForTimeRounds){setRunning(false);setPhase('FERDIG');playSignal('finish')}else playSignal('registered') }
  const splitAction = () => { if(!running||timerLimitReached||!claimManualAction('split'))return; setLaps(value => [...value, splitDuration(elapsed, value)]); playSignal('registered') }
  const undoManualAction=()=>{
    const kind=lastManualAction.current
    if(!['round','split'].includes(kind)||!laps.length)return
    lastManualAction.current=null;setCanUndoManual(false)
    setLaps(value=>value.slice(0,-1))
    if(kind==='round')setRound(value=>Math.max(1,value-1))
  }
  const beginWorkout = (withCountdown = false) => {
    if (hasStarted || running || countdownDeadline !== null) return
    const audioContext=ensureAudioContext() // Unlock and prepare the actual WAV samples from the user gesture.
    if(audioContext)unlockSoundPack(audioContext,audioPrefs.current.audioProfile).catch(e=>setAudioDiagnostic('Lydfeil: '+e.message))
    if (withCountdown) {
      setCountdownRemaining(10)
      setCountdownDeadline(Date.now() + 10000)
      setPhase('NEDTELJING')
      return
    }
    setHasStarted(true); setPhase('PÅGÅR'); setRunning(true); playSignal('start')
  }
  const autoLaunchRef = useRef(false)
  useEffect(()=>{if(autoStartOnMount&&!autoLaunchRef.current){autoLaunchRef.current=true;beginWorkout(false)}},[autoStartOnMount])
  const finishCurrent=()=>{onFinish({elapsed,laps:[...laps],roundsCompleted:isDeathBy?deathByCompletedRounds:isLadder?ladderCompletedRounds:(isAmrap||plannedForTimeRounds)?laps.length:(isStationCircuit||isTimedInterval)?fixedSlotState.roundsCompleted:isEMOM?Math.min(Math.floor(target/emomCycle),Math.floor(elapsed/emomCycle)):round,death_by_completed_rounds:isDeathBy?deathByCompletedRounds:null,death_by_failed_round:isDeathBy?deathByStatus.failedRound:null,ladder_completed_rounds:isLadder?ladderCompletedRounds:null,ladder_finished:isLadder?ladderProgress.finished:null,phase:phase==='TIDSGRENSE'?'TIDSGRENSE':isDeathBy&&deathByStatus.failed?'FERDIG':'FULLFØRT',hasStarted,running:false,savedAt:Date.now()})}
  const completeDeathByRound=()=>{if(!isDeathBy||!running||!deathByStatus.canConfirm||timerLimitReached||!claimManualAction('death'))return;setDeathByCompletedRounds(deathByStatus.round);playSignal('registered')}
  const completeLadderRound=()=>{if(!isLadder||!running||ladderProgress.finished||timerLimitReached||!claimManualAction('ladder'))return;const count=ladderCompletedRounds+1;const next=ladderStatus(count,schema?.ladder,schema?.rounds??timerSettings?.rounds);setLadderCompletedRounds(count);setLaps(value=>[...value,splitDuration(elapsed,value)]);if(next.finished){setRunning(false);setPhase('FERDIG');playSignal('finish')}else playSignal('registered')}
  const toggleRunning = () => { if (countdownDeadline !== null) { stopPackAudio(sharedTrainingAudioContext);setCountdownDeadline(null);setCountdownRemaining(0);setPhase('Klar');return } if (!hasStarted) { beginWorkout(false); return } if (running) { stopPackAudio(sharedTrainingAudioContext);setRunning(false); setPhase('PAUSE'); return } if (phase === 'FERDIG' || phase === 'TIDSGRENSE') return; setPhase('PÅGÅR'); setRunning(true) }
  const visibleStationIndex = Math.min(stationCount - 1, fixedSlotState.currentSlotIndex % stationCount)
  const currentStationName = stationList[visibleStationIndex]?.exercise_name || stationList[visibleStationIndex]?.name || `Stasjon ${visibleStationIndex + 1}`
  const stageExerciseName = isStationCircuit ? currentStationName : isTimedInterval ? currentIntervalExercise : isEMOM ? currentEmomExercise : activeExercise || exerciseList[0]?.exercise_name || exerciseList[0]?.name || ''
  const stageNextExercise = isStationCircuit ? stationList[(visibleStationIndex + 1) % stationCount]?.exercise_name : isTimedInterval ? exerciseList[(intervalExerciseIndex + 1) % intervalExerciseCount]?.exercise_name : nextExercise
  const stageTimeLabel = isDeathBy ? 'INTERVALL ATT' : isCountdown ? 'TID ATT' : isStationCircuit ? (inWorkPhase ? 'ARBEID ATT' : 'BYTE ATT') : isTimedInterval ? (inWorkPhase ? 'ARBEID ATT' : 'KVILE ATT') : isEMOM ? (isEmomWorkPhase ? 'ARBEID ATT' : isEmomRestPhase ? 'KVILE ATT' : 'NESTE START') : 'MEDGÅTT TID'
  const stageIsComplete = phase === 'FERDIG' || phase === 'TIDSGRENSE'
  const stageLapLabel = (isAmrap||isLadder||plannedForTimeRounds) ? 'RUNDETIDER' : 'MELLOMTIDER'
  const stageLapHistory = useMemo(()=>summarizeLapSplits(laps),[laps])
  const portraitLapsRef = useRef(null)
  const landscapeLapsRef = useRef(null)
  useEffect(()=>{
    for(const rail of [portraitLapsRef.current,landscapeLapsRef.current]){
      if(!rail)continue
      rail.scrollLeft=rail.scrollWidth
      rail.scrollTop=rail.scrollHeight
    }
  },[laps.length])
  // Keep the complete WOD visible, including repeated exercises and pauses.
  // The selected level also carries side instructions such as Høgre/Venstre.
  const stageRows = (isStationCircuit ? stationList : exerciseList).map(item => {
    const savedLevel=item.prescription_levels?.[prescriptionLevel] || item.levels?.[prescriptionLevel] || item.prescription_levels?.rx || item.levels?.rx
    const setReps=(item.sets||[]).map(set=>String(set.reps??'').trim()).filter(Boolean)
    const uniqueReps=[...new Set(setReps)]
    const reps=isDeathBy ? String(deathByStatus.targetReps) : isLadder ? String(ladderProgress.targetReps||'') : savedLevel?.reps != null ? String(savedLevel.reps).trim() : uniqueReps.join(' / ') || String(item.reps??'').trim()
    const side=getWodSideLabel(item,prescriptionLevel)
    const details=item.is_rest?[`${Number(item.rest_duration_seconds)||30} sek`]:[
      reps ? `${reps} reps${side==='per side'?' per side':''}` : '',
      savedLevel?.heightCm ? `${savedLevel.heightCm} cm` : '',
      savedLevel?.durationSeconds ? `${savedLevel.durationSeconds} sek` : '',
      savedLevel?.distanceMeters ? `${savedLevel.distanceMeters} m` : '',
      savedLevel?.calories ? `${savedLevel.calories} cal` : '',
      side && side!=='per side' ? side : '',
    ]
    return {
      id:item.key||item.exercise_id||item.station_number||item.exercise_name,
      name:item.is_rest?'Pause':item.exercise_name||item.name||'Øving',
      dose:details.filter(Boolean).join(' · ')||item.prescription_label||'',
      description:item.description||item.instructions||item.notes||'',
      equipment:item.equipment||'',
      previous:previousExerciseResult(previousLogs,item),
      muscleItem:item,
      steps:Array.isArray(item.complex_steps)?item.complex_steps:[],
    }
  })
  const canExitBeforeStart=Boolean(onCancelBeforeStart)&&!hasStarted&&!running&&elapsed===0&&!laps.length
  const cancelBeforeStart=()=>{
    if(!canExitBeforeStart||(countdownDeadline!==null&&countdownDeadline<=Date.now()))return
    stopPackAudio(sharedTrainingAudioContext);stopDirectAudio()
    setCountdownDeadline(null);setCountdownRemaining(0);setStagePanel(null)
    if(document.fullscreenElement===timerContainerRef.current)document.exitFullscreen?.().catch(()=>{})
    onCancelBeforeStart()
  }
  const requestFinish=()=>{if(!hasStarted)return;if(running&&!stageIsComplete){setFinishConfirm(true);setStagePanel('finish')}else finishCurrent()}
  const manualButtonVisible=hasStarted&&(isAmrap||isLadder||isDeathBy||isStopwatch||isForTime)
  const manualButtonDisabled=!running||timerLimitReached||manualLockSeconds>0||(isLadder&&ladderProgress.finished)||(isDeathBy&&!deathByStatus.canConfirm)
  const manualButtonText=(isAmrap||plannedForTimeRounds)?'RUNDE FULLFØRT':isLadder?`TRINN FULLFØRT · ${ladderProgress.targetReps} REPS`:isDeathBy?`FULLFØRT ${deathByStatus.targetReps} REPS`:'MELLOMTID'
  const manualButton=<button type="button" className={'gg-manual-action'+(manualLockSeconds>0?' is-registered':'')+(buttonSize==='xl'?' is-xl':'')} onClick={(isAmrap||plannedForTimeRounds)?lapAction:isLadder?completeLadderRound:isDeathBy?completeDeathByRound:splitAction} disabled={manualButtonDisabled} aria-label={manualLockSeconds>0?'Registrert – sperra mot dobbelttrykk':manualButtonText}>
    {manualLockSeconds>0?<CheckCircle2 size={27}/>:<Plus size={27}/>}<span><b>{manualLockSeconds>0?(canUndoManual?'REGISTRERT':'STADFESTA'):manualButtonText}</b>{manualLockSeconds>0&&<small>Vent {manualLockSeconds} sek</small>}</span>
  </button>
  const undoButton=manualButtonVisible&&(isAmrap||isStopwatch||isForTime)&&<button type="button" className="gg-manual-undo" disabled={!canUndoManual} onClick={undoManualAction} aria-label="Angre siste registrering"><Undo2 size={17}/> Angre</button>
  const actionControls=<div className="gg-timer-audio-controls">
    <label>Trefflate<select value={buttonSize} onChange={e=>setButtonSize(e.target.value)}><option value="large">Stor (standard)</option><option value="xl">Ekstra stor</option></select></label>
    <label>Sperre mot dobbelttrykk<select value={roundGuardSeconds} onChange={e=>setRoundGuardSeconds(Number(e.target.value))}>{[1,2,3,5,10].map(s=><option key={s} value={s}>{s} sekund</option>)}</select></label>
    <label className="gg-timer-check"><input type="checkbox" checked={roundHaptic} onChange={e=>setRoundHaptic(e.target.checked)}/> Vibrasjon ved registrering</label>
    <small>Automatiske rundeskifte blir ikkje påverka. Angre siste AMRAP-runde eller mellomtid utan å stoppa klokka.</small>
  </div>
  const audioControls=<div className="gg-timer-audio-controls">
    <div className="gg-sound-pack-list" role="group" aria-label="Vel lydprofil">
      {[{id:'pt',name:'EISEN',desc:'Classic Fight Club · klokke og metall'},{id:'personal',name:'DISKOPANZER',desc:'Eurodance Kampfparty · synth og klubbslag'},{id:'group',name:'BALKAN BERSERK',desc:'Metal Brass Assault · trompet, gitar og tromme'}].map(p=><button type="button" key={p.id} aria-pressed={audioProfile===p.id} className={audioProfile===p.id?'is-selected':''} onClick={()=>{setAudioProfile(p.id);soundOnRef.current=true;setSoundOn(true)}}><strong>{p.name}</strong><small>{p.desc}</small></button>)}
    </div>
    <label>Lydpakke<select value={audioPack} onChange={e=>{stopPackAudio(sharedTrainingAudioContext);stopDirectAudio();setAudioPack(e.target.value);chooseAudioPack(e.target.value)}}><option value="standard">Standard · eksisterande</option><option value="generative">KI lyd · generativ prototype</option></select></label>
    <label className="gg-timer-check"><input type="checkbox" checked={soundOn} onChange={e=>setSoundOn(e.target.checked)}/> Lydsignal på</label>
    <label>Timerlyd · {soundVolume}%<input type="range" min="0" max="100" step="5" value={soundVolume} onChange={e=>setSoundVolume(Number(e.target.value))}/></label>
    <label className="gg-timer-check"><input type="checkbox" checked={countdownAudio} onChange={e=>setCountdownAudio(e.target.checked)}/> Nedtelling 3–2–1</label>
    <label className="gg-timer-check"><input type="checkbox" checked={prVictoryAudio} onChange={e=>{setPRVictoryAudio(e.target.checked);setPRVictorySoundEnabled(e.target.checked)}}/> Du hast Rekord! · lyd av/på (skjermfeiring alltid på)</label>
    <label className="gg-timer-check"><input type="checkbox" checked={vibration} onChange={e=>setVibration(e.target.checked)}/> Vibrasjon ved skifte (støtta mobil)</label>
    <label>Test signal<select value={testCue} onChange={e=>setTestCue(e.target.value)}><option value="start">Start</option><option value="tick-1">Nedtelling</option><option value="round">Ny runde</option><option value="rest">Pause</option><option value="station">Stasjonsbyte</option><option value="finish">Ferdig</option><option value="registered">Runde registrert</option><option value="pr">Du hast Rekord!</option></select></label>
    <button type="button" className="secondary-button" disabled={audioProfile==='silent'||!soundOn||soundVolume===0} onClick={()=>playSignal(testCue,{test:true})}><Volume2 size={17}/> Test lydsignal</button>
    <details className="gg-sound-diagnostics"><summary>Lyddiagnostikk · samanlikn same lydfil</summary>
      <p role="status">{audioDiagnostic}</p>
      <button type="button" className="secondary-button" disabled={!soundOn||soundVolume===0} onClick={()=>playSignal(testCue,{test:true})}>A · Web Audio</button>
      <button type="button" className="secondary-button" disabled={!soundOn||soundVolume===0} onClick={directAudioTest}>B · Vanleg lydavspeling</button>
      <small>Bruk same signal, profil og volum. Sjekk Android-medievolum og eventuell Bluetooth-utgang. Appen kan ikkje auka systemvolumet eller endra Spotify-volum.</small>
      <a href={(import.meta.env.BASE_URL||'/')+'audio/'+SOUND_PACK_VERSION+'/credits.txt'} target="_blank" rel="noreferrer">Lydkjelder og lisens</a>
    </details>
  </div>
  const resetTimer = () => { stopPackAudio(sharedTrainingAudioContext);stopDirectAudio();clearManualAction(); timerRunStartedAt.current = null; timerRunBaseElapsed.current = 0; elapsedRef.current = 0; scheduledStartedAt.current=null; setCountdownDeadline(null);setCountdownRemaining(0); setRunning(false); setElapsed(0); setRound(1); setDeathByCompletedRounds(0); setLadderCompletedRounds(0); setLaps([]); setPhase('Klar'); setHasStarted(false); setConfirmReset(false); setStagePanel(null) }
  return <div ref={timerContainerRef} className={stageVisible ? 'engine-timer timer-focused timer-customized' : 'engine-timer timer-customized'} style={{ '--timer-clock-size': `${appearance.clockSize}px`, '--timer-accent': appearance.accent }}>
    {stageVisible ? <section className={'gg-live-timer'+(stageLapHistory.length?' gg-live-timer--with-laps':'')+(manualButtonVisible?' gg-live-timer--manual':'')+(buttonSize==='xl'?' gg-live-timer--xl':'')+(!showMusic?' gg-live-timer--no-music':'')} aria-label="Fullskjermsklokke for treningsøkt">
      <header className="gg-live-timer__header">
        <div className="gg-live-timer__identity"><span className="gg-live-timer__brand">GARASJEGYM</span><strong>{format}</strong><span className="gg-live-timer__origin">{originLabel}</span></div>
        <div className="gg-live-timer__tools">
          {onEditWorkout&&<button type="button" onClick={onEditWorkout} aria-label="Legg til øving eller WOD" title="Legg til øving eller WOD"><Plus size={21}/></button>}
          <button type="button" className={stagePanel==='wod'?'is-selected':''} onClick={()=>setStagePanel(value=>value==='wod'?null:'wod')} aria-label="Vis WOD og øvingar" title="Vis WOD og øvingar" aria-expanded={stagePanel==='wod'}><List size={21}/></button>
          <button type="button" onClick={()=>setSoundOn(value=>!value)} aria-label={soundOn?'Slå av lydsignal frå timeren':'Slå på lydsignal frå timeren'} title={soundOn?'Timerlyd på':'Timerlyd av'}>{soundOn?<Volume2 size={21}/>:<VolumeX size={21}/>}</button>
          <button type="button" onClick={toggleBrowserFullscreen} aria-label={browserFullscreen?'Vis nettlesarfelt':'Skjul nettlesarfelt – ekte fullskjerm'} title="Fullskjerm">{browserFullscreen?<Minimize2 size={21}/>:<Maximize2 size={21}/>}</button>
          <button type="button" className={['settings','audio','display','timing','reset','music','pulse','actions'].includes(stagePanel)?'is-selected':''} onClick={()=>setStagePanel(value=>['settings','audio','display','timing','reset','music','pulse','actions'].includes(value)?null:'settings')} aria-label="Timerinnstillingar" title="Timerinnstillingar" aria-expanded={['settings','audio','display','timing','reset','music','pulse','actions'].includes(stagePanel)}><Settings size={19}/></button>
          <button type="button" onClick={returnToApp} aria-label="Til oversikt – økta held fram" title="Til oversikt – økta held fram"><House size={20}/></button>
        </div>
      </header>
      <div className={laps.length?'gg-live-timer__body gg-live-timer__body--with-laps':'gg-live-timer__body'}>
        <div className="gg-live-timer__clock-area">
          <div className="gg-live-timer__status">{wodName&&<span className="gg-live-timer__wod-name" title={wodName}>{wodName}</span>}<div className="gg-live-timer__phase"><span className={running?'gg-live-timer__dot is-running':'gg-live-timer__dot'}/>{countdownDeadline!==null?'GJER DEG KLAR':stageIsComplete?(isDeathBy&&deathByStatus.failed?'STOPPA':'FERDIG'):!hasStarted?'KLAR':!running?'PAUSE':(isEMOM||isDeathBy||isTimedInterval||isStationCircuit)?currentPhase:'PÅGÅR'}{(offline||!draftProtected)&&<span className="gg-live-timer__network" role="status" title={!draftProtected?'Lokal sikring feila. Hald appen open.':'Nettet er borte. Timeren held fram.'}>{!draftProtected?'LAGRINGSFEIL':'UTAN NETT'}</span>}</div></div>
          <div className="gg-clock-digit-slot"><div className="gg-live-timer__time" style={{'--gg-time-scale': Math.max(.78,Math.min(1.16,appearance.clockSize/112))}} role="timer" aria-label={countdownDeadline!==null?`Startar om ${countdownRemaining} sekund`:`${stageTimeLabel}: ${clock(primaryTime)}`}>{countdownDeadline!==null?countdownRemaining:clock(primaryTime)}</div></div>
          <div className="gg-live-timer__time-label">{countdownDeadline!==null?'STARTAR OM':stageTimeLabel}</div>
          {(isCountdown||isEMOM||isTimedInterval||isStationCircuit||hasTimeCap)&&!isDeathBy&&<div className="gg-live-timer__time-secondary"><span>{isCountdown?'Medgått':isEMOM?'Økta att':isTimedInterval||isStationCircuit?'Økta att':'Tid att'}</span><b>{clock(isCountdown?elapsed:remainingTotal)}</b></div>}
          {stageLapHistory.length>0&&<div className="gg-live-timer__clock-laps" aria-label={stageLapLabel}>
            <ol ref={landscapeLapsRef} className="gg-live-timer__lap-preview" aria-label="Sveip for å sjå tidlegare rundar">{stageLapHistory.map(lap=><li key={lap.round}><span>{isAmrap?'R':'M'}{lap.round}</span><b>{clock(lap.duration)}</b></li>)}</ol>
            <button type="button" className="gg-live-timer__lap-all" onClick={()=>setStagePanel('laps')} aria-label={`Vis alle ${laps.length} rundetider`}>Alle</button>
          </div>}
        </div>
        <div className="gg-live-timer__context">
          {(isAmrap||plannedForTimeRounds>0)&&<div className="gg-live-timer__rounds"><span>FULLFØRTE RUNDER</span><strong>{laps.length}{plannedForTimeRounds?` / ${plannedForTimeRounds}`:''}</strong></div>}
          {isLadder&&<div className="gg-live-timer__rounds"><span>{ladderProgress.finished?'LADDER FULLFØRT':`TRINN ${ladderProgress.currentRound} AV ${ladderProgress.maxRounds}`}</span><strong>{ladderProgress.finished?`${ladderCompletedRounds} trinn`: `${ladderProgress.targetReps} reps`}</strong><small>{ladderCompletedRounds} trinn fullførte</small></div>}
          {isDeathBy&&<div className="gg-live-timer__rounds"><span>{deathByStatus.failed?`STOPPA I RUNDE ${deathByStatus.failedRound}`:`RUNDE ${deathByStatus.round} · ${deathByStatus.intervalSeconds} SEKUND`}</span><strong>{deathByStatus.targetReps} reps</strong><small>{deathByCompletedRounds} rundar (førebels){deathByStatus.roundConfirmed?' · Klar for neste intervall':' · Neste runde startar automatisk'}</small></div>}
          {(isTimedInterval||isStationCircuit||isEMOM)&&<div className="gg-live-timer__rounds"><span>{isStationCircuit?'STASJON · RUNDE':isEMOM?'INTERVALL':'RUNDE'}</span><strong>{isStationCircuit?`${visibleStationIndex+1}/${stationCount} · ${Math.min(currentRound,Number(rounds)||1)}/${rounds}`:isEMOM?currentEmomRound:`${roundsShown}/${rounds}`}</strong></div>}
          {showPulse&&<HeartRateTrainingPanel compact/>}
          <div className="gg-live-timer__exercise"><div className="gg-live-timer__exercise-title"><span>{!stageRows.length&&onEditWorkout?'FRI TRENING':isAmrap?'WOD-ØVINGAR':isStationCircuit?'STASJONAR':isEMOM||isDeathBy?'DENNE RUNDA':'AKTUELL ØVING'}</span><button type="button" onClick={()=>setStagePanel('wod')}>Alle øvingar ({stageRows.length})</button></div>
            {!stageRows.length&&onEditWorkout?<button type="button" className="gg-live-timer__empty-add" onClick={onEditWorkout}><Plus size={17}/> Legg til øvingar eller WOD</button>:isAmrap?<ol>{stageRows.map((item,index)=><li key={`${item.id}-${index}`}><span>{index+1}. {item.name}</span>{item.dose&&<small>{item.dose}</small>}</li>)}</ol>:<strong>{stageExerciseName||'Sjå øvingslista'}</strong>}
            {!isAmrap&&stageNextExercise&&stageNextExercise!==stageExerciseName&&<small className="gg-live-timer__next">Neste: {stageNextExercise}</small>}
          </div>
        </div>
      </div>
      <div className="gg-live-timer__music-dock" aria-label="Musikkstyring">{showMusic&&<><MusicMiniPlayer liveCompact/><button type="button" className="gg-music-expand" aria-label="Opna stor musikkspelar" onClick={()=>setStagePanel('music')}><Maximize2 size={16}/></button></>}</div>
      {stageLapHistory.length>0&&<div className="gg-live-timer__laps-portrait" aria-label={stageLapLabel}>
        <ol ref={portraitLapsRef} className="gg-live-timer__lap-preview" aria-label="Sveip sidelengs for å sjå tidlegare rundar">{stageLapHistory.map(lap=><li key={lap.round}><span>{isAmrap?'R':'M'}{lap.round}</span><b>{clock(lap.duration)}</b></li>)}</ol>
        <button type="button" className="gg-live-timer__lap-all" onClick={()=>setStagePanel('laps')} aria-label={`Vis alle ${laps.length} rundetider`}>Alle</button>
      </div>}
      <footer className="gg-live-timer__footer">
        {manualButtonVisible&&manualButton}
        <div className="gg-timer-secondary-actions">
        <button type="button" className="gg-live-timer__pause" onClick={toggleRunning} disabled={stageIsComplete}>{countdownDeadline!==null?<><X size={21}/> Avbryt</>:running?<><Pause size={21}/> Pause</>:phase==='PAUSE'?<><Play size={21}/> Hald fram</>:<><Play size={21}/> Start no</>}</button>
        {!hasStarted&&countdownDeadline===null&&<button type="button" className="gg-live-timer__round-button" onClick={()=>beginWorkout(true)}><Play size={21}/> Start · 10 sek</button>}
        {hasStarted&&(finishLabel==='Avslutt'?<button type="button" className="gg-live-timer__finish" onClick={requestFinish}><CheckCircle2 size={20}/> Avslutt</button>:<button type="button" className="gg-live-timer__finish" onClick={requestFinish}><CheckCircle2 size={20}/> Neste del</button>)}
        {canExitBeforeStart&&<button type="button" className="gg-live-timer__finish" onClick={cancelBeforeStart} aria-label="Tilbake utan å starta WOD"><X size={18}/> Tilbake</button>}
        {undoButton}
        </div>
      </footer>
      {stagePanel&&<div className="gg-live-timer__scrim" onClick={()=>setStagePanel(null)} role="presentation"/>}
      {stagePanel==='finish'&&finishConfirm&&<aside className="gg-live-timer__drawer gg-timer-finish-confirm" role="dialog" aria-modal="true" aria-label="Stadfest avslutning"><header><strong>{finishLabel==='Avslutt'?'Avslutta økta?':'Fullføra denne delen?'}</strong><button type="button" onClick={()=>{setFinishConfirm(false);setStagePanel(null)}} aria-label="Avbryt"><X size={20}/></button></header><small>{wodName||format}</small><p>{finishLabel==='Avslutt'?'Gå til resultatregistrering no?':'Avslutt denne delen tidleg og gå vidare etter WOD-planen?'}</p><small>Klokka held fram dersom du avbryt.</small><button type="button" className="primary-button" onClick={()=>{setFinishConfirm(false);setStagePanel(null);finishCurrent()}}>{finishLabel==='Avslutt'?'Avslutt · resultat':'Fullfør del · vidare'}</button><button type="button" className="secondary-button" onClick={()=>{setFinishConfirm(false);setStagePanel(null)}}>Avbryt · tilbake til klokka</button></aside>}
      {stagePanel==='wod'&&<aside className="gg-live-timer__drawer" aria-label="Øvingar i WOD-en"><header><strong>Øvingar · {stageRows.length}</strong><button type="button" onClick={()=>setStagePanel(null)} aria-label="Lukk øvingslista"><X size={20}/></button></header><ol className="gg-live-timer__all-exercises">{stageRows.map((item,index)=><li key={`${item.id}-${index}`}>
        {item.steps.length||item.description||item.equipment||item.previous||muscleProfile([item.muscleItem]).known>0?<details className="gg-live-timer__exercise-detail"><summary><span>{index+1}. {item.name}</span><small>{item.dose}</small><ChevronDown size={15}/></summary><div className="gg-live-timer__exercise-more">{item.steps.length>0&&<><strong>Rørslesekvens</strong><ol>{item.steps.map((step,stepIndex)=><li key={stepIndex}>{step.reps?`${step.reps} × `:''}{step.name||step.exercise_name||'Rørsle'}</li>)}</ol></>}{item.description&&<p>{item.description}</p>}{item.equipment&&<p><b>Utstyr:</b> {item.equipment}</p>}{item.previous&&<small className="gg-previous-result">Ditt sist lagra · {item.previous.date}: {item.previous.summary}</small>}<MuscleMap items={[item.muscleItem]}/></div></details>:<div className="gg-live-timer__exercise-simple"><span>{index+1}. {item.name}</span><small>{item.dose}</small></div>}
      </li>)}</ol>{!stageRows.length&&<p>Ingen øvingar er lagde til.</p>}</aside>}
      {stagePanel==='laps'&&<aside className="gg-live-timer__drawer" aria-label={stageLapLabel}><header><strong>{stageLapLabel} · {laps.length}</strong><button type="button" onClick={()=>setStagePanel(null)} aria-label="Lukk rundetider"><X size={20}/></button></header><ol className="gg-live-timer__all-laps">{stageLapHistory.map((lap,index)=>{
        const previous=stageLapHistory[index-1]
        const delta=previous?lap.duration-previous.duration:null
        return <li key={lap.round}><span>{isAmrap?'Runde':'Mellomtid'} {lap.round}<small>Ved {clock(lap.at)}{delta!==null?' · '+(delta<0?`${Math.abs(delta)} sek raskare`:delta>0?`${delta} sek seinare`:'same tid som førre'):''}</small></span><b>{clock(lap.duration)}</b></li>
      })}</ol></aside>}
      {['settings','audio','display','timing','reset','music','pulse','actions'].includes(stagePanel)&&<aside className={'gg-live-timer__drawer gg-timer-settings-menu'+(stagePanel==='music'?' gg-timer-music-drawer':'')} aria-label="Timerinnstillingar">
        <header><strong>{({settings:'Timerinnstillingar',audio:'Lyd og signal',display:'Klokke og visning',timing:'Øktoppsett',reset:'Nullstill økta',music:'Musikkstudio',pulse:'Puls og intensitet',actions:'Betening under trening'})[stagePanel]}</strong><button type="button" onClick={()=>setStagePanel(null)} aria-label="Lukk innstillingane"><X size={20}/></button></header>
        {stagePanel!=='settings'&&<button type="button" className="gg-timer-menu-back" onClick={()=>setStagePanel('settings')}>‹ Alle innstillingar</button>}
        {stagePanel==='settings'&&<nav className="gg-timer-menu-list" aria-label="Vel innstilling">
          <button type="button" onClick={()=>setStagePanel('audio')}><Volume2 size={20}/><span><b>Lyd og signal</b><small>{soundVolume}% · {SOUND_PACK_NAMES[audioProfile]||'DISKOPANZER'}</small></span><ChevronRight size={17}/></button>
          <button type="button" onClick={()=>setStagePanel('music')}><Music2 size={20}/><span><b>Musikkstudio</b><small>Stor Spotify-spelar</small></span><ChevronRight size={17}/></button>
          <button type="button" onClick={()=>setStagePanel('pulse')}><HeartPulse size={20}/><span><b>Puls og intensitet</b><small>Sensor og live-visning</small></span><ChevronRight size={17}/></button>
          <button type="button" onClick={()=>setStagePanel('actions')}><Hand size={20}/><span><b>Betening under trening</b><small>Store knappar · {roundGuardSeconds} sek sperre</small></span><ChevronRight size={17}/></button>
          <button type="button" onClick={()=>setStagePanel('display')}><Monitor size={20}/><span><b>Klokke og visning</b><small>Storleik, farge, fullskjerm</small></span><ChevronRight size={17}/></button>
          <button type="button" onClick={()=>setStagePanel('timing')}><TimerIcon size={20}/><span><b>Øktoppsett</b><small>Varigheit, arbeid og pause</small></span><ChevronRight size={17}/></button>
          <button type="button" onClick={()=>setStagePanel('reset')}><RotateCcw size={20}/><span><b>Nullstill økta</b><small>Med stadfesting</small></span><ChevronRight size={17}/></button>
        </nav>}
        {stagePanel==='audio'&&audioControls}
        {stagePanel==='actions'&&actionControls}
        {stagePanel==='music'&&<><label className="gg-timer-check"><input type="checkbox" checked={showMusic} onChange={e=>setShowMusic(e.target.checked)}/> Vis minispelar</label><Music/></>}
        {stagePanel==='pulse'&&<><label className="gg-timer-check"><input type="checkbox" checked={showPulse} onChange={e=>setShowPulse(e.target.checked)}/> Vis eigen puls på klokka</label><HeartRateTrainingPanel settings/></>}
        {stagePanel==='display'&&<>
        <label className="gg-live-timer__setting">Storleik på klokka <input type="range" min="88" max="130" step="7" value={Math.max(88,Math.min(130,appearance.clockSize))} onChange={e=>setAppearance(value=>({...value,clockSize:Number(e.target.value)}))}/></label>
        <label className="gg-live-timer__setting">Klokkefarge <input type="color" value={appearance.accent} onChange={e=>setAppearance(value=>({...value,accent:e.target.value}))}/></label>
        <button type="button" className="gg-live-timer__fullscreen-button" onClick={toggleBrowserFullscreen}>{browserFullscreen?'Vis nettlesarfelt':'Skjul nettlesarfelt'}</button>
        </>}
        {stagePanel==='timing'&&(hasStarted||countdownDeadline!==null?<small>Øktoppsettet er låst etter start. Klokka held fram.</small>:<>
        {(isCountdown||isEMOM||hasTimeCap)&&<div className="gg-live-timer__setting"><span>Øktlengd</span><div className="gg-live-timer__inline-inputs"><label>Min<input type="number" min="0" max="240" value={Math.floor(target/60)} onChange={e=>setDurationOverride(Math.max(1,Math.max(0,Number(e.target.value)||0)*60+(target%60)))}/></label><label>Sek<input type="number" min="0" max="59" value={target%60} onChange={e=>setDurationOverride(Math.max(1,Math.floor(target/60)*60+Math.max(0,Math.min(59,Number(e.target.value)||0))))}/></label></div></div>}
        {(isTimedInterval||isStationCircuit||isEMOM)&&<div className="gg-live-timer__setting"><span>Intervall</span><div className="gg-live-timer__inline-inputs"><label>Arbeid (sek)<input type="number" min="1" max="600" value={workSeconds} onChange={e=>setWorkSeconds(Math.max(1,Math.min(600,Number(e.target.value)||1)))}/></label><label>Pause (sek)<input type="number" min="0" max="600" value={restSeconds} onChange={e=>setRestSeconds(Math.max(0,Math.min(600,Number(e.target.value)||0)))}/></label>{!isEMOM&&<label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(Math.max(1,Math.min(100,Number(e.target.value)||1)))}/></label>}</div></div>}
          {!(isCountdown||isEMOM||hasTimeCap||isTimedInterval||isStationCircuit)&&<small>Dette formatet har ikkje tidsinnstillingar.</small>}
        </>)}
        {stagePanel==='reset'&&<>
        {!confirmReset?<button type="button" className="gg-live-timer__reset" onClick={()=>setConfirmReset(true)}><RotateCcw size={17}/> Nullstill økta</button>:<div className="gg-live-timer__reset-confirm"><strong>Nullstille tid og rundar?</strong><button type="button" onClick={resetTimer}>Ja, nullstill</button><button type="button" onClick={()=>setConfirmReset(false)}>Avbryt</button></div>}
        </>}
      </aside>}
    </section> : <>
    <div className="timer-topline">
      <div className="timer-context"><span className="timer-origin-chip">{originLabel}</span><span className="timer-format-chip">{format.toUpperCase()}</span></div>
      {onEditWorkout&&<button type="button" className="timer-customize-trigger" onClick={onEditWorkout}><Plus size={15}/> Øvingar / WOD</button>}
      <button type="button" className="timer-customize-trigger" onClick={() => setShowTimerSettings(value => !value)} aria-expanded={showTimerSettings}>{showTimerSettings ? 'Lukk oppsett' : 'Timeroppsett'}</button>
    </div>
    {showTimerSettings && <section className="timer-customize-panel timer-setup-drawer" aria-label="Timeroppsett">
        <details className="timer-setup-section"><summary>Lyd og signal</summary>{audioControls}</details>
        <details className="timer-setup-section"><summary>Betening under trening</summary>{actionControls}</details>
        <details className="timer-setup-section"><summary>Puls og intensitet</summary><HeartRateTrainingPanel settings/></details>
        <details className="timer-setup-section"><summary>Musikkstudio</summary><Music/></details>
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
      {isEMOM && <div className="timer-setup-section"><strong>EMOM-intervall</strong><div className="timer-setup-duration"><label>Minutt<input type="number" min="0" max="60" value={Math.floor(emomCycle/60)} onChange={e=>setEmomEveryOverride(Math.max(5,Math.min(3600,Math.max(0,Number(e.target.value)||0)*60+emomCycle%60))/60)}/></label><label>Sekund<input type="number" min="0" max="59" value={emomCycle%60} onChange={e=>setEmomEveryOverride(Math.max(5,Math.min(3600,Math.floor(emomCycle/60)*60+Math.max(0,Math.min(59,Number(e.target.value)||0))))/60)}/></label></div><small>Arbeidet startar på nytt kvart intervall. Kvila er tida som står att når reps er fullførte.</small></div>}
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
        <div className="timer-round-label">{isStationCircuit ? 'ARBEID / STASJONSBYTE' : isDeathBy?'INTERVALL ATT':isCountdown ? 'GJENSTÅANDE TID' : isEMOM ? (isEmomWorkPhase?'ARBEID ATT':isEmomRestPhase?'PAUSE ATT':'NESTE START OM') : isTimedInterval ? 'TID I INTERVALLFASEN' : 'MEDGÅTT TID'}</div>
        {isStationCircuit ? <div className="timer-station-plan"><div className="timer-station-plan-heading"><span>STASJONANE I SIRKELEN</span><b>{rounds} rundar</b></div><div className="timer-station-grid">{stationList.map((station,index)=><article className="timer-station-card" key={station.station_number||index}><span>STASJON {station.station_number||index+1}</span><strong>{station.exercise_name||station.name||'Øving'}</strong><small>{station.reps_mode==='amrap'?'AMRAP · så mange som mogleg':station.reps!=null&&station.reps!==''?`${station.reps} reps`:'Vel sjølv tal reps'}{station.height_cm?' · '+station.height_cm+' cm':''}{station.load_label?' · '+station.load_label:''}</small>{station.description&&<p>{station.description}</p>}{station.coach_note&&<p>{station.coach_note}</p>}</article>)}</div></div> : isAmrap ? <div className="timer-amrap-exercise-list"><span>ØVINGAR I WOD-EN</span>{exerciseList.length ? <ol>{exerciseList.map((exercise,index)=>{const setReps=(exercise.sets||[]).map(set=>String(set.reps??'').trim()).filter(Boolean);const uniqueReps=[...new Set(setReps)];const repsLabel=uniqueReps.length===1?(setReps.length>1?`${setReps.length} × ${uniqueReps[0]}`:uniqueReps[0]):uniqueReps.length>1?uniqueReps.join(' / '):String(exercise.reps??'').trim();return <li key={exercise.key||index} className={exercise.is_rest?'timer-rest-item':''}><b>{index+1}.</b><span>{exercise.is_rest?<><strong>PAUSE</strong><small> {clock(Number(exercise.rest_duration_seconds)||30)}</small></>:<>{repsLabel&&<strong className="timer-amrap-reps">{repsLabel} × </strong>}{exercise.exercise_name||'Øving utan namn'}</>}</span></li>})}</ol> : <p>Ingen øvingar er lagde til.</p>}</div> : <><div className="timer-active-under-clock"><span>{isTimedInterval ? `DRAG ${intervalExerciseIndex+1} / ${intervalExerciseCount}` : isEMOM ? (isEmomWorkPhase?`ARBEIDSOPPGÅVE · RUNDE ${currentEmomRound}`:'NESTE ARBEIDSOPPGÅVE') : activeExercise ? 'GJELDANDE ØVING' : 'WOD-OVERSIKT'}</span><b>{isTimedInterval ? currentIntervalExercise : isEMOM ? currentEmomExercise || 'Sjå øvingsrekkjefølgja' : activeExercise || 'Sjå øvingsrekkjefølgja'}</b></div><div className="timer-amrap-exercise-list"><span>ØVINGAR I WOD-EN · {exerciseList.length}</span>{exerciseList.length ? <ol>{exerciseList.map((exercise,index)=>{const dose=(exercise.sets||[]).map(set=>[set.reps?set.reps+' reps':'',set.load_kg?set.load_kg+' kg':'',set.time_text||''].filter(Boolean).join(' · ')).filter(Boolean).join(' / ');return <li key={exercise.key||index} className={exercise.is_rest?'timer-rest-item':''}><b>{index+1}.</b><span><strong>{exercise.is_rest?'PAUSE':exercise.exercise_name||'Øving utan namn'}</strong>{dose&&<small>{dose}</small>}{exercise.prescription_label&&<small>{exercise.prescription_label}</small>}</span></li>})}</ol> : <p>Ingen øvingar er lagde til.</p>}</div></>}
        {isAmrap && <div className="timer-round-total"><span>RUNDER FULLFØRT</span><b>{completedRounds}</b></div>}
        {isLadder && <div className="timer-round-total"><span>{ladderProgress.finished?'LADDER FERDIG':`TRINN ${ladderProgress.currentRound} AV ${ladderProgress.maxRounds}`}</span><b>{ladderProgress.finished?`${ladderCompletedRounds} trinn`:`${ladderProgress.targetReps} reps`}</b></div>}
        {isDeathBy && <div className="timer-round-total"><span>{deathByStatus.failed?`STOPPA I RUNDE ${deathByStatus.failedRound}`:`RUNDE ${deathByStatus.round} · MÅL`}</span><b>{deathByStatus.targetReps} reps</b><small>Førebels: {deathByCompletedRounds} rundar</small></div>}
        {!isStationCircuit && !isAmrap && (isTimedInterval ? (exerciseList[intervalExerciseIndex + 1]?.exercise_name || exerciseList[0]?.exercise_name) : nextExercise) && <div className="timer-next-exercise"><span>NESTE ØVING</span><b>{isTimedInterval ? (exerciseList[intervalExerciseIndex + 1]?.exercise_name || exerciseList[0]?.exercise_name) : nextExercise}</b></div>}
        {manualButtonVisible&&<div className="gg-manual-desktop">{manualButton}{undoButton}</div>}
        <div className="timer-actions">
          <button type="button" className="secondary-button" onClick={toggleRunning} disabled={phase === 'FERDIG' || phase === 'TIDSGRENSE'}>{running ? <><Pause size={14}/> Pause</> : phase==='PAUSE' ? <><Play size={14}/> Gjenoppta</> : <><Play size={14}/> Start</>}</button>
          <button type="button" className="secondary-button" onClick={()=>{if(window.confirm('Nullstille tid og rundar?'))resetTimer()}}><RotateCcw size={14}/> Nullstill</button>
          <button type="button" className="secondary-button" onClick={() => setSoundOn(value => !value)}>{soundOn ? 'Lyd på' : 'Lyd av'}</button>
          <button type="button" className="secondary-button" onClick={toggleFocus}>{focused ? 'Avslutt stor klokke' : 'Stor klokke'}</button>
        </div>
        <div className="timer-finish-row">
          {canExitBeforeStart?<button type="button" className="timer-finish-button" onClick={cancelBeforeStart}><X size={18}/><span>Tilbake utan å starta</span></button>:<button type="button" className="timer-finish-button" onClick={()=>{if(!running||stageIsComplete||window.confirm(finishLabel==='Avslutt'?'Avslutta økta og gå til resultat?':'Fullføra denne delen og gå vidare?'))finishCurrent()}} disabled={!hasStarted}>
            <CheckCircle2 size={18}/><span>{finishLabel==='Avslutt'?'Avslutt økta':finishLabel}</span>
          </button>}
          <small>{canExitBeforeStart?'Ingen økt eller resultat blir lagra.':hasStarted ? finishLabel==='Avslutt'?'Kontroller resultat og lagre økta etterpå':'Neste del følgjer overgangsplanen' : 'Start timeren før du avsluttar økta'}</small>
        </div>
      </section></TimerPanel>:id==='info'?<TimerPanel key={id} id="info" title="ØKTINFORMASJON" layout={panelLayout.info} deviceProfile={deviceProfile} locked={Boolean(lockedPanels.info)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock} designMode={designMode}><aside className="timer-side timer-side-left">
        <div className="timer-bottom-heading">ØKTINFORMASJON</div>
        <div className="timer-side-stat"><span>MEDGÅTT TID</span><b>{clock(elapsed)}</b></div>
        {(isCountdown || isStationCircuit) && <div className="timer-side-stat"><span>GJENVERANDE TID</span><b>{clock(remainingTotal)}</b></div>}
        {isEMOM && <><div className="timer-side-stat"><span>GJENSTÅANDE ØKTTID</span><b>{clock(remainingTotal)}</b></div><div className="timer-side-stat"><span>{isEmomWorkPhase?'ARBEID ATT':isEmomRestPhase?'PAUSE ATT':'NESTE START OM'}</span><b>{clock(emomPhaseRemaining)}</b></div></>}
        {isStationCircuit && <><div className="timer-side-stat"><span>RUNDE</span><b>{Math.min(currentRound,Number(rounds)||1)}/{rounds}</b></div><div className="timer-side-stat"><span>ARBEID / BYTE</span><b>{effectiveWorkSeconds}s / {effectiveRestSeconds}s</b></div></>}
        {isTimedInterval && <><div className="timer-side-stat"><span>ØKTA ATT</span><b>{clock(remainingTotal)}</b></div><div className="timer-side-stat"><span>RUNDE</span><b>{roundsShown}/{rounds}</b></div></>}
        {isForTime && showTimeCap && <div className="timer-side-stat"><span>TIDSGRENSE</span><b>{clock(Math.max(0,target-elapsed))}</b></div>}
        {isDeathBy&&<><div className="timer-side-stat"><span>INTERVALL ATT</span><b>{clock(deathByStatus.secondsLeft)}</b></div><div className="timer-side-stat"><span>{deathByStatus.failed?'STOPPA I RUNDE':'RUNDE / REPS'}</span><b>{deathByStatus.round} / {deathByStatus.targetReps}</b></div><div className="timer-side-stat"><span>FULLFØRTE RUNDER</span><b>{deathByCompletedRounds}</b></div></>}
        {isLadder&&<><div className="timer-side-stat"><span>FULLFØRTE TRINN</span><b>{ladderCompletedRounds} / {ladderProgress.maxRounds}</b></div><div className="timer-side-stat"><span>REPS I TRINNET</span><b>{ladderProgress.targetReps}</b></div></>}

      </aside></TimerPanel>:id==='laps'?<TimerPanel key={id} id="laps" title="RUNDETIDER" layout={panelLayout.laps} deviceProfile={deviceProfile} locked={Boolean(lockedPanels.laps)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock} designMode={designMode}><aside className="timer-side timer-side-right">
        <div className="timer-lap-heading">RUNDETIDER <b>{laps.length}</b></div>
        {laps.length ? <ol className="timer-lap-list">{laps.map((lap,index)=><li key={index}><span>Runde {index+1}</span><b>{clock(lap)}</b></li>)}</ol> : <p className="timer-no-laps">Registrer kvar fullførte runde her.</p>}
      </aside></TimerPanel>:<TimerPanel key={id} id="music" title="MUSIKK" layout={panelLayout.music} deviceProfile={deviceProfile} locked={Boolean(lockedPanels.music)} onMove={movePanel} onResize={resizePanel} onLock={togglePanelLock} designMode={designMode}><MusicMiniPlayer /></TimerPanel>)}
      </div>

    <small>{isStationCircuit ? 'Stasjonssirkel · roterande stasjonar · fast tal rundar' : isTimedInterval ? 'Arbeid / kvile · samla økttid og tid att' : isCountdown ? 'AMRAP · registrer kvar fullførte runde' : isEMOM ? `${emomDisplayLabel(emomCycle)} · ${Math.ceil(target/emomCycle)} intervall` : isDeathBy ? `Death By · ${deathByStatus.targetReps} reps på ${deathByStatus.intervalSeconds} sekund · ${deathByCompletedRounds} rundar fullførte` : isLadder ? `Ladder · ${ladderCompletedRounds} av ${ladderProgress.maxRounds} trinn · ${ladderProgress.targetReps} reps neste trinn` : isForTime ? 'Stoppeklokke med eventuell tidsgrense' : 'Stoppeklokke – tel medgått tid'}</small>
  </div>
  </>}
  </div>
}


/**
 * Composite WOD uses the same timer for every block, remounted with a
 * block-scoped format, time cap and exercise list. Nothing runs unattended
 * between blocks: the athlete explicitly starts the next timer.
 */
function CompositeTimer({schema,exerciseList=[],previousLogs=[],prescriptionLevel='rx',wodName='',originLabel='',onSnapshot,onFinish,onBackground,onCancelBeforeStart=null,visible=true,stop=false,resumeState=null,offline=false,draftProtected=true}) {
 const blocks=Array.isArray(schema?.wod_engine?.blocks)?schema.wod_engine.blocks:[]
 const [active,setActive]=useState(()=>Math.min(Math.max(0,Number(resumeState?.active_block_index)||0),Math.max(0,blocks.length-1)))
 const [results,setResults]=useState(()=>resumeState?.block_results||{})
 const [interlude,setInterlude]=useState(()=>resumeState?.composite_transition||null)
 const [remaining,setRemaining]=useState(()=>Math.max(0,Math.ceil(((Number(resumeState?.composite_transition?.deadline)||0)-Date.now())/1000)))
 const [autoStartIndex,setAutoStartIndex]=useState(null)
 const [breakHistory,setBreakHistory]=useState(()=>resumeState?.composite_breaks||[])
 const [finishPending,setFinishPending]=useState(false)
 const block=blocks[active]
 const reportBlock=useCallback(snapshot=>setResults(old=>{const prior=old[active];if(prior?.phase==='FULLFØRT'&&!['FULLFØRT','FERDIG','TIDSGRENSE'].includes(snapshot.phase))return old;return {...old,[active]:snapshot}}),[active])
 const advance=useCallback((autostart=false)=>{
  setInterlude(null)
  setAutoStartIndex(autostart?active+1:null)
  setActive(index=>Math.min(index+1,blocks.length-1))
 },[active,blocks.length])
 const beginTransition=useCallback(()=>{
  const mode=block?.transitionMode==='timed'?'timed':'manual'
  const seconds=compositeTransitionSeconds(block)
  if(mode==='timed'&&seconds>0){
   setInterlude({from:active,mode:'timed',startedAt:Date.now(),deadline:Date.now()+seconds*1000,seconds})
  } else advance(false)
 },[active,advance,block])
 const finishPart=useCallback(snapshot=>{
  setResults(old=>({...old,[active]:{...old[active],...snapshot}}))
  if(active===blocks.length-1)setFinishPending(true)
  else beginTransition()
 },[active,blocks.length,beginTransition,onFinish])
 // When a countdown finishes naturally, a preset pause begins without another click.
 useEffect(()=>{
  if(!block||active===blocks.length-1||interlude||block.transitionMode!=='timed')return
  const snapshot=results[active]
  if(snapshot?.hasStarted&&['FERDIG','TIDSGRENSE'].includes(snapshot.phase))beginTransition()
 },[active,block,interlude,results,beginTransition,blocks.length])
 useEffect(()=>{
  if(!interlude)return
  const refresh=()=>{
   const seconds=Math.max(0,Math.ceil((interlude.deadline-Date.now())/1000))
   setRemaining(seconds)
   if(seconds===0){
    setBreakHistory(current=>[...current,{from:interlude.from,planned_seconds:interlude.seconds,elapsed_seconds:Math.max(0,Math.round((Date.now()-interlude.startedAt)/1000))}])
    advance(true)
   }
  }
  refresh()
  const id=window.setInterval(refresh,250)
  document.addEventListener('visibilitychange',refresh)
  return ()=>{window.clearInterval(id);document.removeEventListener('visibilitychange',refresh)}
 },[interlude,advance])
 useEffect(()=>{
  const details=blocks.map((part,index)=>({
   index,id:part.id,title:part.title,format:part.format,scoreMode:part.scoreMode||'auto',combination_mode:part.combinationMode||null,
   source_wod_id:part.source_wod_id||null,source_wod_name:part.source_wod_name||null,
   source_wod_snapshot:part.source_wod_snapshot||null,
   benchmark_source_wod_id:equivalentLibraryWodSource(part),
   duration_seconds:part.duration_seconds,
   elapsed:Number(results[index]?.elapsed)||0,
   roundsCompleted:Number(results[index]?.roundsCompleted)||0,
   death_by_completed_rounds:results[index]?.death_by_completed_rounds??null,
   death_by_failed_round:results[index]?.death_by_failed_round??null,
   death_by_interval_seconds:results[index]?.death_by_interval_seconds??null,
   ladder_completed_rounds:results[index]?.ladder_completed_rounds??null,
   ladder_finished:results[index]?.ladder_finished??null,
   laps:results[index]?.laps||[],
   phase:results[index]?.phase||'Klar',
   completed:['FULLFØRT','FERDIG','TIDSGRENSE'].includes(results[index]?.phase)&&!(part.format==='Ladder'&&results[index]?.ladder_finished!==true)&&!(part.format==='For Time'&&Number(part.rounds)>0&&(Number(results[index]?.roundsCompleted)||0)<Number(part.rounds)),
   time_cap_reached:results[index]?.phase==='TIDSGRENSE'
  }))
  const current=results[active]||{}
  const amrap=details.filter(part=>part.format==='AMRAP'||(['Couplet','Triplet'].includes(part.format)&&part.combination_mode==='AMRAP')).slice(-1)[0]
  onSnapshot({...current,elapsed:details.reduce((a,b)=>a+b.elapsed,0),roundsCompleted:amrap?.roundsCompleted||0,laps:amrap?.laps||[],active_block_index:active,block_results:results,block_summary:details,composite_transition:interlude,composite_breaks:breakHistory,format:COMPOSITE_FORMAT})
 },[results,active,blocks,onSnapshot,interlude,breakHistory])
 // Make sure the last block result reaches the parent before opening result review.
 useEffect(()=>{if(!finishPending)return;onFinish();setFinishPending(false)},[finishPending,onFinish])
 if(!block)return <div className="training-state">Denne WOD-en manglar timerdelar. Kontroller WOD Builder.</div>
 const current=compositeBlockForTimer(block,active)
 const timerConfig=compositeTimerConfig(current)
 const nextTitle=blocks[active+1]?.title||'Neste del'
 return <section className="gg-composite-training" aria-label="Samansett WOD">
  <div className="gg-composite-progress"><strong>{wodName}</strong><span>Del {active+1} av {blocks.length}: {current.title} · {current.format}</span><small>{active<blocks.length-1?'Neste: '+nextTitle+' · '+blocks[active+1].format:'Siste del · avslutt og før resultata'}</small></div>
  {interlude?<section className="gg-composite-break" aria-label="Pause mellom øktdelar" role="timer">
    <span className="wod-classic-kicker">PAUSE MELLOM DELANE</span>
    <strong>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</strong>
    <p>Del {active+1} er ferdig. Neste: {nextTitle}. Klokka startar automatisk når pausa er over.</p>
    <button type="button" className="primary-button" onClick={()=>{setBreakHistory(old=>[...old,{from:active,planned_seconds:interlude.seconds,elapsed_seconds:Math.round((Date.now()-interlude.startedAt)/1000),skipped:true}]);advance(false)}}>Hopp over pausa · klargjer neste del</button>
   </section>
   :<Timer key={current.id||active} visible={visible} offline={offline} draftProtected={draftProtected} onBackground={onBackground}
    onCancelBeforeStart={active===0&&canLeavePreparedWod({block_results:results,composite_transition:interlude})?onCancelBeforeStart:null}
    resumeState={resumeState?.block_results?.[active]||null}
    autoStartOnMount={autoStartIndex===active}
    format={timerConfig.format} minutes={timerConfig.minutes} seconds={timerConfig.seconds}
    exerciseList={current.items||[]} previousLogs={previousLogs} prescriptionLevel={prescriptionLevel}
    timerSettings={timerConfig.timerSettings}
    onSnapshot={reportBlock} stop={stop} onFinish={finishPart}
    finishLabel={active<blocks.length-1?'Fullfør del · vidare':'Avslutt'}
    wodName={wodName+' · '+current.title} originLabel={current.participation&&current.participation!=='individual'?`${originLabel} · ${formatParticipation(current)}`:originLabel}/>}
  <div className="gg-composite-progress-foot"><strong>{current.title}</strong><span>{interlude?'Førehandsinnstilt pause tel ned.':active<blocks.length-1?'Manuell overgang eller planlagt pause til neste del.':'Lagre dei separate delresultata etterpå.'}</span></div>
 </section>
}

export default function Training({ memberId = '', launchWodId = null, launchClassSessionId = null, launchClassResult = false, launchAssignmentId = null, launchProgramSessionId = null, launchProgramSessionTitle = '', onLaunchConsumed, onTimerSnapshot, onBackground, onOpenWodLibrary = () => {}, onOpenTrainingPlan = () => {}, onOpenSchedule = () => {}, onOpenDailyWod = () => {}, onOpenHistory = () => {}, onOpenPR = () => {}, visible = true, simpleMode = false, quickStart = false, onQuickStartConsumed, quickManualEntry = false, onQuickManualEntryConsumed, onSaved, onDiscard }) {
  const savedDraft = useRef(restoreWorkoutDraft(memberId)).current
  const [offlineLibrary]=useState(()=>readOfflineLibrary(memberId))
  const [offline,setOffline]=useState(()=>isOffline())
  const [syncNotice,setSyncNotice]=useState('')
  const [draftProtected,setDraftProtected]=useState(true)
  const pendingSave=useRef(null)
  const saveLock=useRef(false)
  const retrySave=useRef(null)
  const [previousLogs,setPreviousLogs]=useState([])
  const [wods, setWods] = useState(()=>offlineLibrary?.wods||[])
  const [dailyWodId,setDailyWodId]=useState(null)
  const [exercises, setExercises] = useState(()=>offlineLibrary?.exercises||[])
  const [favoriteNames, setFavoriteNames] = useState([])
  const [favoriteWodIds, setFavoriteWodIds] = useState([])
  const [wodFavoritesOnly, setWodFavoritesOnly] = useState(false)
  const [wodSearch, setWodSearch] = useState('')
  const [expandedWodId, setExpandedWodId] = useState(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showResultIssues,setShowResultIssues]=useState(false)
  const flowConfirm=useFlowConfirm()
  const resultAlertRef=useRef(null)
  const resultCorrectionRef=useRef(null)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveToken, setSaveToken] = useState(() => savedDraft?.saveToken || crypto.randomUUID())
  const [mode, setMode] = useState(() => savedDraft?.mode || 'home')
  const [reviewOpen,setReviewOpen]=useState(false)
  const [finishOpen,setFinishOpen]=useState(()=>Boolean(savedDraft?.finishOpen))
  const [resultSummary,setResultSummary]=useState(()=>Boolean(savedDraft?.resultSummary))
  const [reviewedResults,setReviewedResults]=useState(()=>savedDraft?.reviewedResults||{})
  const [victoryNotice,setVictoryNotice]=useState([])
  const [victoryOverlay,setVictoryOverlay]=useState([])
  const resultBodyRef=useRef(null)
  const resultTouch=useRef(null)
  const [resultSetIndex,setResultSetIndex]=useState(()=>Number(savedDraft?.resultSetIndex)||0)
  const [flowDetailed,setFlowDetailed]=useState(()=>Boolean(savedDraft?.flowDetailed))
  const [manualEntry,setManualEntry]=useState(() => Boolean(savedDraft?.manualEntry))
  const [manualLibraryEntry,setManualLibraryEntry]=useState(()=>Boolean(savedDraft?.manualLibraryEntry))
  const [manualLocation,setManualLocation]=useState(()=>savedDraft?.manualLocation||'')
  const [manualCompleted,setManualCompleted]=useState(()=>savedDraft?.manualCompleted===true)
  const [retroQuery,setRetroQuery]=useState('')
  const [confirmedPlannedEmom,setConfirmedPlannedEmom]=useState(()=>Boolean(savedDraft?.confirmedPlannedEmom))
  const [sessionPrepared,setSessionPrepared]=useState(() => Boolean(savedDraft?.sessionPrepared))
  const [freeEditorOpen,setFreeEditorOpen]=useState(false)
  const [source, setSource] = useState(() => savedDraft?.source || null)
  const [wodLevel,setWodLevel]=useState(() => savedDraft?.wodLevel || 'rx')
  const [classSessionId, setClassSessionId] = useState(() => savedDraft?.classSessionId || null)
  const [launchLinkContext,setLaunchLinkContext]=useState(() => savedDraft?.launchLinkContext || emptyTrainingLaunchContext())
  const [title, setTitle] = useState(() => savedDraft?.title || '')
  const [workoutDate,setWorkoutDate]=useState(()=>savedDraft?.workoutDate || localDateISO())
  const [manualWodIds,setManualWodIds]=useState(() => savedDraft?.manualWodIds || [])
  const [manualWodSelect,setManualWodSelect]=useState('')
  const [manualWodPickerOpen,setManualWodPickerOpen]=useState(false)
  const [manualWodQuery,setManualWodQuery]=useState('')
  const exerciseSearchRef=useRef(null)
  const [format, setFormat] = useState(() => savedDraft?.format || 'Fri trening')
  const [duration, setDuration] = useState(() => savedDraft?.duration || '10')
  const [durationSeconds, setDurationSeconds] = useState(() => savedDraft?.durationSeconds || '0')
  const [note, setNote] = useState(() => savedDraft?.note || '')
  const [items, setItems] = useState(() => savedDraft?.items || [])
  const [query, setQuery] = useState('')
  const [scoreRounds, setScoreRounds] = useState(() => savedDraft?.scoreRounds || '')
  const [scoreReps, setScoreReps] = useState(() => savedDraft?.scoreReps || '')
  const [blockScores,setBlockScores]=useState(()=>savedDraft?.blockScores||{})
  const [scoreTime, setScoreTime] = useState(() => savedDraft?.scoreTime || '')
  const [scoreLoad, setScoreLoad] = useState(() => savedDraft?.scoreLoad || '')
  const [scoreCalories, setScoreCalories] = useState(() => savedDraft?.scoreCalories || '')
  const [scoreDistance, setScoreDistance] = useState(() => savedDraft?.scoreDistance || '')
  const [scoreUnit, setScoreUnit] = useState(() => savedDraft?.scoreUnit || 'm')
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(() => savedDraft?.activeExerciseIndex || 0)
  // Review results independently from the live timer; actual values stay in the existing draft.
  const previousFinishOpen=useRef(Boolean(savedDraft?.finishOpen))
  useEffect(()=>{const wasOpen=previousFinishOpen.current;previousFinishOpen.current=finishOpen;if(finishOpen&&!wasOpen){setActiveExerciseIndex(0);setResultSetIndex(0);setFlowDetailed(false);setResultSummary(items.length===0);setReviewedResults({});setConfirmedPlannedEmom(false)}},[finishOpen])
  useEffect(()=>{if(finishOpen&&resultBodyRef.current)resultBodyRef.current.scrollTop=0},[finishOpen,activeExerciseIndex,resultSetIndex,resultSummary])
  useEffect(()=>{if(finishOpen&&error)resultAlertRef.current?.focus()},[finishOpen,error])
  useEffect(()=>{const correction=resultCorrectionRef.current;if(!finishOpen||!correction)return;const field=typeof correction==='string'?correction:correction.field;const scoped=typeof correction==='object'&&correction.itemIndex!=null?resultBodyRef.current?.querySelector('[data-flow-item="'+correction.itemIndex+'"]'):null;const row=scoped&&correction.setIndex!=null&&scoped.dataset.flowSet!==String(correction.setIndex)?scoped.querySelector('[data-flow-set="'+correction.setIndex+'"]'):scoped;const target=(row||resultBodyRef.current)?.querySelector('[data-result-field="'+field+'"]')||resultBodyRef.current?.querySelector('[data-result-field="'+field+'"]');if(target){const details=target.closest('details');if(details)details.open=true;target.focus();target.scrollIntoView({block:'nearest'})}resultCorrectionRef.current=null},[finishOpen,activeExerciseIndex,resultSetIndex,resultSummary,flowDetailed,error])
  const resultItem=items[activeExerciseIndex]
  const flowSchema=source?.timer_settings?.workout_schema||{}
  const resultGroup=resultItem?flowItemGroup(resultItem,flowSchema,format):null
  const resultBlock=resultItem?flowBlockForItem(resultItem,flowSchema,format):null
  const resultGroupIndices=resultGroup?items.map((item,index)=>flowItemGroup(item,flowSchema,format).id===resultGroup.id?index:-1).filter(index=>index>=0):[]
  const flowCompact=Boolean(source)&&!flowDetailed&&resultGroup&&resultGroup.reporting!=='sets'
  const resultPages=source?items.reduce((pages,item,index)=>{const group=flowItemGroup(item,flowSchema,format);const existing=pages.find(page=>page.id===group.id);if(existing)existing.indices.push(index);else pages.push({...group,indices:[index]});return pages},[]):[]
  const resultPageIndex=resultPages.findIndex(page=>page.id===resultGroup?.id)
  const flowGrid=Boolean(source)&&!flowDetailed&&resultGroup?.reporting==='sets'&&resultGroupIndices.length>0
  const flowRecorded=flowCompletionRows(blockScores)
  const flowSessionStatus=blockScores.__flow_session?.status||''
  const flowCompletionOnly=Boolean(source)&&format!==COMPOSITE_FORMAT&&items.length>0&&items.every(item=>flowItemGroup(item,flowSchema,format).reporting==='done')
  const customComplexResult=resultItem?.is_complex&&resultItem?.complex_family==='custom'
  const entered=value=>value!==null&&value!==undefined&&String(value).trim()!==''
  const missingLoad=item=>!item?.is_rest&&item?.uses_load?(item.sets||[]).filter(set=>entered(set.reps)&&Number(set.reps)>0&&!entered(set.load_kg)).length:0
  const pendingWeightItems=items.filter(item=>missingLoad(item)>0)
  const reviewedCount=items.filter(item=>reviewedResults[item.key]||item.is_rest).length
  const resultReviews=items.map(item=>exerciseResultReview(item,Boolean(reviewedResults[item.key]),confirmedPlannedEmom,flowRecorded.find(part=>part.id===flowItemGroup(item,flowSchema,format).id)?.status))
  const unregisteredCount=resultReviews.filter(r=>['missing','partial','unconfirmed'].includes(r.status)).length
  function selectResult(index){setShowResultIssues(false);setResultSummary(false);setActiveExerciseIndex(index);setResultSetIndex(0);setFlowDetailed(false);setError('')}
  function nextFlowGroup(){const next=resultPages[resultPageIndex+1]?.indices[0];if(next!=null)selectResult(next);else{setResultSummary(true);setError('')}}
  async function markFlowGroup(status){
    if(!resultGroup||saving||saveLock.current)return
    const keys=new Set(resultGroupIndices.map(index=>items[index].key))
    if(items.some(item=>keys.has(item.key)&&(entered(item.rowValue)||(item.sets||[]).some(set=>hasMeasuredFlowSet(set,item.prescribed_sets_prefilled))))&&!await flowConfirm.ask({"title":"Berre utført?","message":"Dei innskrivne måleresultata i denne delen blir fjerna.","confirmLabel":"Marker utført","cancelLabel":"Behald tala","danger":true}))return
    setBlockScores(old=>({...old,[resultGroup.id]:resultBlock?.scoreMode==='completion'?{primary:status==='done'?'complete':status==='partial'?'partial':'failed'}:{},['flow:'+resultGroup.id]:{status,title:resultGroup.title}}))
    if(format!==COMPOSITE_FORMAT){setScoreRounds('');setScoreReps('');setScoreTime('');setScoreLoad('');setScoreCalories('');setScoreDistance('')}
    setItems(old=>old.map(item=>keys.has(item.key)?clearFlowItem(item):item))
    setReviewedResults(old=>({...old,...Object.fromEntries([...keys].map(key=>[key,true]))}));nextFlowGroup()
  }
  function moveResult(delta){if(saving||resultSummary||!resultItem)return;if(delta>0){nextResult();return}if(flowGrid||flowCompact){const previous=resultPages[resultPageIndex-1]?.indices[0];if(previous!=null)selectResult(previous);return}if(resultSetIndex>0){setResultSetIndex(n=>n-1);return}if(activeExerciseIndex>0){const previous=activeExerciseIndex-1;selectResult(previous);if(flowItemGroup(items[previous],flowSchema,format).reporting==='sets')setResultSetIndex(Math.max(0,items[previous].sets.length-1))}}
  async function markFlowSet(){if(!resultItem||saving)return;const set=resultItem.sets[resultSetIndex];if(!set)return;if(hasMeasuredFlowSet(set,resultItem.prescribed_sets_prefilled)&&!await flowConfirm.ask({"title":"Berre utført?","message":"Måleresultatet for dette settet blir fjerna.","confirmLabel":"Marker utført","cancelLabel":"Behald tala","danger":true}))return;updateSet(resultItem.key,resultSetIndex,{...emptyFlowSet(set),flow_status:'done'});nextResult(true)}
  function nextResult(skipValidation=false){
    if(flowGrid){const issue=resultIssues.find(issue=>!issue.score&&resultGroupIndices.includes(issue.itemIndex));if(issue){correctResultIssue(issue);return}setReviewedResults(old=>({...old,...Object.fromEntries(resultGroupIndices.map(index=>[items[index].key,true]))}));nextFlowGroup();return}
    if(skipValidation!==true){const issue=resultIssues.find(issue=>flowCompact?(issue.blockId===resultGroup?.id||format!==COMPOSITE_FORMAT&&resultGroup?.reporting==='score'&&issue.itemIndex==null&&!issue.blockId):!issue.score&&issue.itemIndex===activeExerciseIndex&&(issue.setIndex==null||issue.setIndex===resultSetIndex));if(issue){correctResultIssue(issue);return}}
    setError('')
    if(flowCompact){nextFlowGroup();return}
    if(resultItem&&!resultItem.is_rest&&!isErgExercise(resultItem)&&resultSetIndex<resultItem.sets.length-1){setResultSetIndex(n=>n+1);return}
    if(resultItem)setReviewedResults(old=>({...old,[resultItem.key]:true}))
    if(activeExerciseIndex<items.length-1){const continueDetails=flowDetailed&&flowItemGroup(items[activeExerciseIndex+1],flowSchema,format).id===resultGroup?.id;selectResult(activeExerciseIndex+1);if(continueDetails)setFlowDetailed(true)}
    else {setResultSummary(true);setError('')}
  }
  async function markGridSet(item,index){const set=item.sets[index];if(!set||saving)return;if(set.flow_status==='done'){updateSet(item.key,index,{flow_status:''});return}if(hasMeasuredFlowSet(set,item.prescribed_sets_prefilled)&&!await flowConfirm.ask({"title":"Berre utført?","message":"Måleresultatet for dette settet blir fjerna.","confirmLabel":"Marker utført","cancelLabel":"Behald tala","danger":true}))return;updateSet(item.key,index,{...emptyFlowSet(set),flow_status:'done'})}
  function changeComplexStatus(item,setIndex,status){
    const set=item.sets[setIndex];if(!set||saving)return
    const next=set.complex_status===status?'':status
    updateSet(item.key,setIndex,{complex_status:next,reps:next==='complete'?(Number(set.reps)>0?set.reps:String(plannedComplexCycles(item,wodLevel))):next?'0':''})
  }
  function copyGridWeight(item){const value=item.sets?.[0]?.load_kg;if(!entered(value))return;setReviewedResults(old=>({...old,[item.key]:false}));setConfirmedPlannedEmom(false);setItems(old=>old.map(row=>row.key===item.key?{...row,sets:row.sets.map(set=>entered(set.load_kg)||set.flow_status==='done'?set:{...set,load_kg:value})}:row))}
  function copyFirstWeight(){
    if(!resultItem||!entered(resultItem.sets?.[0]?.load_kg))return
    const value=resultItem.sets[0].load_kg
    setReviewedResults(old=>({...old,[resultItem.key]:false}));setConfirmedPlannedEmom(false)
    setItems(old=>old.map(item=>item.key===resultItem.key?{...item,sets:item.sets.map(set=>entered(set.load_kg)||set.flow_status==='done'?set:{...set,load_kg:value})}:item))
  }
  function confirmComplexWeights(){
    if(!customComplexResult)return
    setReviewedResults(old=>({...old,[resultItem.key]:false}));setConfirmedPlannedEmom(false)
    setItems(old=>old.map(item=>item.key===resultItem.key?{...item,sets:confirmWeightedComplexSets(item.sets,plannedComplexCycles(item,wodLevel))}:item))
  }
  const [timerSnapshot, setTimerSnapshot] = useState(() => savedDraft?.timerSnapshot || { elapsed: 0, laps: [], roundsCompleted: 0, phase: 'Klar', running: false })
  const [restoredTimerSnapshot,setRestoredTimerSnapshot] = useState(() => savedDraft?.timerSnapshot ? {...savedDraft.timerSnapshot,restored:true} : null)
  const [timerLaunchId, setTimerLaunchId] = useState(0)
  const loadSequence = useRef(0)
  const draftSnapshot = {
      mode, manualEntry, manualLibraryEntry, manualLocation, sessionPrepared, manualCompleted, source, wodLevel, classSessionId,
      launchLinkContext, title, workoutDate, manualWodIds, format, duration,
      durationSeconds, note, items, scoreRounds, scoreReps, blockScores, scoreTime, scoreLoad,
      scoreCalories, scoreDistance, scoreUnit, saveToken,
      activeExerciseIndex, resultSetIndex,flowDetailed,timerSnapshot, finishOpen,resultSummary,reviewedResults,confirmedPlannedEmom,
  }
  useEffect(() => {
    if (mode !== 'active') { pendingSave.current=null;setSyncNotice('');clearWorkoutDraft(memberId); return }
    setDraftProtected(saveWorkoutDraft(memberId,draftSnapshot))
    if(pendingSave.current&&pendingSave.current!==workoutSaveFingerprint(draftSnapshot)){
      pendingSave.current=null;setSyncNotice('Resultatet er endra. Trykk Lagre økt på nytt når du er klar.')
    }
  }, [memberId,mode,manualEntry,manualLibraryEntry,manualLocation,sessionPrepared,manualCompleted,source,wodLevel,classSessionId,launchLinkContext,title,workoutDate,manualWodIds,format,duration,durationSeconds,note,items,scoreRounds,scoreReps,blockScores,scoreTime,scoreLoad,scoreCalories,scoreDistance,scoreUnit,saveToken,activeExerciseIndex,resultSetIndex,flowDetailed,timerSnapshot,finishOpen,resultSummary,reviewedResults,confirmedPlannedEmom])
  useEffect(()=>{
    const retry=()=>{if(!isOffline()&&pendingSave.current&&!saveLock.current)retrySave.current?.()}
    window.addEventListener('online',retry)
    const interval=setInterval(retry,15000)
    return()=>{window.removeEventListener('online',retry);clearInterval(interval)}
  },[])
  useEffect(()=>{onTimerSnapshot?.({...timerSnapshot,title,format,sessionOpen:mode==='active',sessionPrepared})},[timerSnapshot,title,format,mode,sessionPrepared,onTimerSnapshot])
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

  useEffect(()=>{const sync=()=>setOffline(isOffline());window.addEventListener('online',sync);window.addEventListener('offline',sync);return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync)}},[])
  async function loadAll(silent=false) {
    if(isOffline()){
      const cached=readOfflineLibrary(memberId)
      if(cached){setWods(cached.wods);setExercises(cached.exercises)}
      setLoading(false);return
    }
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

      const [e,auth] = await Promise.all([
        supabase.from('exercises').select('id,name,category,equipment,description,video_url').eq('is_active', true).order('name'),
        supabase.auth.getUser()
      ])
      if(requestId!==loadSequence.current)return

      const failures=[]
      if(w.error)failures.push('WOD-bibliotek: '+w.error.message)
      else setWods(w.data||[])
      if(e.error)failures.push('Øvingsbibliotek: '+e.error.message)
      else setExercises(e.data||[])
      if(auth.error)failures.push('Innlogging: '+auth.error.message)

      const user=auth.data?.user
      if(user?.id===memberId){
        if(!w.error&&!e.error)writeOfflineLibrary(memberId,w.data||[],e.data||[])
        supabase.from('workout_logs').select('workout_date,workout_exercises(exercise_id,exercise_name,workout_sets(reps,load_kg,height_cm,time_seconds))').eq('member_id',memberId).order('workout_date',{ascending:false}).order('created_at',{ascending:false}).limit(60).then(({data,error})=>{if(!error&&requestId===loadSequence.current)setPreviousLogs(data||[])}).catch(()=>{})
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
    const reconnect=()=>loadAll(true);window.addEventListener('online',reconnect)
    return()=>{clearInterval(refresh);window.removeEventListener('online',reconnect);loadSequence.current++}
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
    if (!manualEntry && (format === 'AMRAP' || format===COMPOSITE_FORMAT || (['Couplet','Triplet'].includes(format) && source?.timer_settings?.workout_schema?.combination_mode === 'AMRAP'))) {
      setScoreRounds(String(timerSnapshot.roundsCompleted || 0))
    }
  }, [timerSnapshot.roundsCompleted, format, source, manualEntry])

  useEffect(() => {
    if (!launchWodId || loading) return
    const wod = wods.find(item => item.id === launchWodId)
    if (wod) {
      if(mode==='active') {setNotice('Du har allereie ei pågåande økt. Avslutt og lagre henne før du startar ei ny.');onLaunchConsumed?.();return}
      startWorkout(wod,{autoStart:!launchClassResult,forResult:launchClassResult&&wod.category!=='warmup'}); setClassSessionId(launchClassSessionId || null); setLaunchLinkContext(captureTrainingLaunchContext({launchAssignmentId,launchProgramSessionId})); onLaunchConsumed?.()
    }
  }, [launchWodId, loading, wods, launchClassSessionId, launchAssignmentId, launchProgramSessionId, mode])

  useEffect(() => {
    if (!launchProgramSessionId || launchWodId || loading) return
    if(mode==='active'){setNotice('Du har allereie ei pågåande økt. Avslutt og lagre henne først.');onLaunchConsumed?.();return}
    startWorkout()
    setTitle(launchProgramSessionTitle || 'Eigen PT-økt')
    setLaunchLinkContext(captureTrainingLaunchContext({launchProgramSessionId}))
    onLaunchConsumed?.()
  }, [launchProgramSessionId, launchWodId, loading, mode])

  useEffect(() => {
    if (!quickStart || loading) return
    if (mode === 'home') startWorkout(null, { autoStart: false })
    else setNotice('Du har allereie ei økt open. Fullfør eller forkast henne før du startar ei ny.')
    onQuickStartConsumed?.()
  }, [quickStart, loading, mode])

  useEffect(() => {
    if (!quickManualEntry || loading) return
    if (mode === 'home') {setRetroQuery('');setMode('retro-choose')}
    else setNotice('Du har allereie ei økt open. Fullfør eller forkast henne før du etterregistrerer.')
    onQuickManualEntryConsumed?.()
  }, [quickManualEntry, loading, mode])

  const activeWodEngine=normalizeWodEngine(source?.timer_settings?.workout_schema||{},{format:source?.format||format})
  const manualBlocks=manualLibraryEntry&&format===COMPOSITE_FORMAT?retrospectiveBlocks(source?.timer_settings?.workout_schema,activeWodEngine):[]
  const resultIssues=collectResultIssues({items,schema:flowSchema,format,blocks:format===COMPOSITE_FORMAT?activeWodEngine.blocks:[],blockScores,manualLibraryEntry,scoreRounds,scoreReps,scoreTime,scoreLoad,scoreCalories,scoreDistance})
  function correctResultIssue(issue){
    setShowResultIssues(false);setError(resultIssueLabel(issue)+': '+issue.message);resultCorrectionRef.current=issue
    if(issue.itemIndex!=null&&!issue.score){
      const item=items[issue.itemIndex],group=flowItemGroup(item,flowSchema,format),complex=item.is_complex&&item.complex_family==='custom'
      const gridField=issue.field==='rowValue'||issue.field==='load_kg'||issue.field==='height_cm'||issue.field==='time_seconds'||issue.field==='complex_status'&&complex||issue.field==='reps'&&!complex
      const scoreField=group.reporting==='score'&&issue.setIndex===0&&!complex&&['load_kg','height_cm'].includes(issue.field)
      setResultSummary(false);setActiveExerciseIndex(issue.itemIndex);setResultSetIndex(issue.setIndex??0);setFlowDetailed(!(source&&(group.reporting==='sets'&&gridField||scoreField)))
    }else if(issue.itemIndex!=null&&issue.score&&flowItemGroup(items[issue.itemIndex],flowSchema,format).reporting==='score'){
      setResultSummary(false);setActiveExerciseIndex(issue.itemIndex);setResultSetIndex(0);setFlowDetailed(false)
    }else if(source&&resultGroup?.reporting==='score'&&issue.itemIndex==null&&['scoreRounds','scoreReps','scoreTime'].includes(issue.field)){
      setResultSummary(false);setFlowDetailed(false)
    }else{setResultSummary(true)}
  }
  const explicitScoreBlocks=(manualLibraryEntry&&manualBlocks.length?manualBlocks:activeWodEngine.blocks).filter(block=>blockScoreDefinition(block.scoreMode).value!=='auto')
  const explicitScoreIds=new Set(explicitScoreBlocks.map(block=>block.id))
  const availableWods=wods.filter(wod=>wod.is_published&&!wod.is_archived)
  const manualWodOptions=wods.filter(wod=>!wod.is_archived)

  function returnToWorkoutTypes() {
    if(saveLock.current)return
    if (mode === 'active') {
      const hasUnsavedWorkout = sessionPrepared || manualEntry || timerSnapshot.elapsed > 0 || items.some(item=>item.exercise_name.trim())
      const untouchedWod=Boolean(source)&&!manualEntry&&canLeavePreparedWod(timerSnapshot)
      if (hasUnsavedWorkout && !untouchedWod && !window.confirm('Byta økttype? Den uferdige økta og registrerte rundar blir forkasta.')) return
      if(untouchedWod){stopPackAudio(sharedTrainingAudioContext);stopDirectAudio();clearWorkoutDraft(memberId);setLaunchLinkContext(emptyTrainingLaunchContext())}
      setFinishOpen(false)
      setRestoredTimerSnapshot(null)
      setSessionPrepared(false)
      setManualEntry(false)
      setSource(null)
      setClassSessionId(null)
      setItems([])
      setTimerSnapshot({elapsed:0,laps:[],roundsCompleted:0,phase:'Klar',running:false})
      clearTimerSnapshot()
    }
    setNotice('')
    setMode('home')
    window.scrollTo({top:0,behavior:'auto'})
  }


  const filteredExercises = useMemo(() => {const q=query.trim().toLowerCase();return exercises.filter(e=>(!favoritesOnly||favoriteNames.includes(e.name))&&[e.name,e.category,e.equipment,exerciseBrowseCategory(e)].some(value=>String(value||'').toLowerCase().includes(q)))}, [exercises,query,favoritesOnly,favoriteNames])

  async function cancelManualEntry() {
    if(!manualEntry||saving||saveLock.current)return
    const pending=Boolean(pendingSave.current)
    if(pending&&!await flowConfirm.ask({"title":"Lagring ikkje stadfesta","message":"Avbryt vidare lagringsforsøk og forkast lokal kladd? Ei økt som allereie er motteken av databasen blir ikkje sletta.","confirmLabel":"Forkast kladd","cancelLabel":"Behald kladd","danger":true}))return
    if(!pending&&hasManualEntryChanges(draftSnapshot,localDateISO())&&!await flowConfirm.ask({"title":"Avbryta registrering?","message":"Tala i kladden blir forkasta. WOD-malen blir behalden.","confirmLabel":"Forkast","cancelLabel":"Hald fram","danger":true}))return
    pendingSave.current=null;setSyncNotice('')
    clearWorkoutDraft(memberId)
    stopPackAudio(sharedTrainingAudioContext);stopDirectAudio()
    setFinishOpen(false);setResultSummary(false);setReviewedResults({});setReviewOpen(false)
    setManualEntry(false);setManualLibraryEntry(false);setManualCompleted(false);setManualLocation('')
    setRestoredTimerSnapshot(null);setSessionPrepared(false);setFreeEditorOpen(false);setSource(null);setClassSessionId(null)
    setLaunchLinkContext(emptyTrainingLaunchContext());setItems([]);setManualWodIds([]);setManualWodSelect('');setRetroQuery('')
    setScoreRounds('');setScoreReps('');setBlockScores({});setScoreTime('');setScoreLoad('');setScoreCalories('');setScoreDistance('');setScoreUnit('m');setNote('')
    setSaveToken(crypto.randomUUID());setTimerSnapshot({elapsed:0,laps:[],roundsCompleted:0,phase:'Klar',running:false})
    clearTimerSnapshot();setError('');setNotice('');setMode('retro-choose')
    window.scrollTo({top:0,behavior:'auto'})
  }

  async function leaveWorkout() {
    if(manualEntry){cancelManualEntry();return}
    if (saving || saveLock.current || !await flowConfirm.ask({"title":"Forkasta økta?","message":"Ingen resultat eller PR blir registrerte. WOD-malen blir behalden.","confirmLabel":"Forkast økt","cancelLabel":"Hald fram","danger":true})) return
    setFinishOpen(false); setMode('home'); setRestoredTimerSnapshot(null); setSource(null); setClassSessionId(null); setItems([])
    setTimerSnapshot({ elapsed: 0, laps: [], roundsCompleted: 0, phase: 'Klar', running: false })
    clearTimerSnapshot()
    onDiscard?.()
  }

  function startWorkout(wod = null, { autoStart = Boolean(wod), forResult = false, retrospective = false } = {}) {
    setRestoredTimerSnapshot(null)
    setManualEntry(forResult)
    setManualLibraryEntry(retrospective)
    setManualCompleted(false)
    setManualLocation('')
    setFinishOpen(false)
    setResultSummary(false)
    setReviewedResults({})
    setScoreLoad('');setScoreCalories('');setScoreDistance('');setScoreUnit('m')
    setConfirmedPlannedEmom(false)
    // A free session opens the same ready-to-start timer as a saved WOD.
    // Exercises and WOD blocks can be added without resetting the clock.
    setSessionPrepared(!forResult)
    setFreeEditorOpen(false)
    setTimerLaunchId(!forResult&&autoStart ? value => value + 1 : 0)
    setClassSessionId(null)
    setLaunchLinkContext(emptyTrainingLaunchContext())
    setSaveToken(crypto.randomUUID())
    setSource(wod)
    setWodLevel(wod?.timer_settings?.workout_schema?.prescription||'rx')
    setTitle(wod?.name || 'Fri trening')
    setManualWodIds(wod?.id?[wod.id]:[]);setManualWodSelect('')
    setWorkoutDate(localDateISO())
    setFormat(wod?.format || 'Fri trening')
    setDuration(String(wod?.timer_settings?.workout_schema?.duration_seconds ? Math.floor(wod.timer_settings.workout_schema.duration_seconds / 60) : (wod?.duration_minutes || 10)))
    setDurationSeconds(String(wod?.timer_settings?.workout_schema?.duration_seconds ? wod.timer_settings.workout_schema.duration_seconds % 60 : 0))
    setNote(retrospective?'':wod?.notes || '')
    setItems([])
    setActiveExerciseIndex(0)
    setTimerSnapshot({ elapsed: 0, laps: [], roundsCompleted: 0, phase: 'Klar', running: false })
    setScoreRounds(''); setScoreReps(''); setBlockScores({}); setScoreTime('')
    const schema = wod?.timer_settings?.workout_schema
    const orderedSchemaItems = sortWodItems(getWodSchemaItems(schema))
    const clearPlannedResults=forResult||wod?.format===COMPOSITE_FORMAT
    const selectedLevel=schema?.prescription||'rx'
    if(schema?.library_category==='warmup')orderedSchemaItems.sort((a,b)=>({specific_prep:0,movement_rehearsal:1}[a.warmup_phase||'specific_prep']??0)-({specific_prep:0,movement_rehearsal:1}[b.warmup_phase||'specific_prep']??0))
    if (orderedSchemaItems.length) {
      setItems(orderedSchemaItems.map((item,itemIndex) => {
        const customComplex=item.is_complex&&item.complex_family==='custom'
        const {autoFill:fillFixedEmom,reps:prescribedReps,sets:preparedSets}=plannedFixedEmomSets(item,schema?.composite_blocks,selectedLevel,forResult&&!customComplex&&!retrospective)
        const standaloneReps=Number(item.levels?.[selectedLevel]?.reps ?? item.reps)
        const standaloneSlots=(!forResult||customComplex||retrospective)&&isEmomFormat(wod?.format)&&wod?.format!==COMPOSITE_FORMAT?emomPrescribedSetCount({format:wod.format,interval:schema?.interval,durationSeconds:schema?.duration_seconds,minuteSlot:item.minute_slot,exerciseIndex:itemIndex,exerciseCount:orderedSchemaItems.length}):0
        const fillStandaloneEmom=standaloneSlots>0&&Number.isInteger(standaloneReps)&&standaloneReps>0&&!item.is_rest&&item.reps_mode!=='amrap'
        const setsForResult=fillStandaloneEmom?Array.from({length:standaloneSlots},(_,i)=>preparedSets[i]||preparedSets[0]||{}):preparedSets
        const plannedReps=fillStandaloneEmom?standaloneReps:prescribedReps
        return ({
        ...emptyExercise(),
        exercise_id: item.exercise_id || '',
        block_id:item.block_id||null,
        exercise_name: item.exercise_name || '',
        minute_slot: item.minute_slot ?? '',
        warmup_phase: item.warmup_phase || 'specific_prep',
        is_rest: !!item.is_rest,
        is_complex: !!item.is_complex,
        complex_family: item.complex_family || null,
        complex_planned_cycles:customComplex?plannedComplexCycles(item,selectedLevel):null,
        complex_steps: Array.isArray(item.complex_steps) ? item.complex_steps : [],
        rest_duration_seconds: item.rest_duration_seconds == null ? null : Number(item.rest_duration_seconds),
        reps_mode: item.reps_mode || 'fixed',
        prescription_levels: item.levels || null,
        side_mode: item.side_mode || null,
        prescription_label: doseLabel(item,selectedLevel),
        prescribed_sets_prefilled:!retrospective&&!customComplex&&(fillFixedEmom||fillStandaloneEmom),
        description: item.description || item.instructions || exercises.find(exercise=>exercise.id===item.exercise_id)?.description || '',
        rowValue:'',rowUnit:wodRowUnit(item,selectedLevel),workSeconds:'',
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
        sets: setsForResult.length ? setsForResult.map(set => ({
          reps: customComplex||retrospective?'':(fillFixedEmom||fillStandaloneEmom) ? String(Number(set.reps)>0?set.reps:plannedReps) : clearPlannedResults ? '' : set.reps == null ? '' : String(set.reps),
          load_kg: clearPlannedResults ? '' : customComplex ? '' : set.load_kg == null ? '' : String(set.load_kg),
          time_text: clearPlannedResults ? '' : set.tempo || '',
          time_seconds: '',
          rir:'',
          height_cm: clearPlannedResults ? '' : set.height_cm == null ? String(item.levels?.[wodLevel]?.heightCm ?? item.levels?.rx?.heightCm ?? Object.values(item.levels||{}).find(level=>level?.heightCm!=null)?.heightCm ?? item.height_cm ?? '') : String(set.height_cm),
        })) : [{
          reps: clearPlannedResults ? '' : customComplex ? '' : item.reps == null ? '' : String(item.reps),
          load_kg: clearPlannedResults ? '' : customComplex ? '' : item.load_kg == null ? '' : String(item.load_kg),
          time_text: '',
          time_seconds: '',
          rir:'',
          height_cm: clearPlannedResults ? '' : String(item.height_cm ?? item.levels?.[wodLevel]?.heightCm ?? item.levels?.rx?.heightCm ?? Object.values(item.levels||{}).find(level=>level?.heightCm!=null)?.heightCm ?? ''),
        }],
      })}))
    } else if (wod?.movements) {
      const names = wod.movements.split(/\n|,/).map(x => x.trim()).filter(Boolean)
      setItems(names.map(name => ({ ...emptyExercise(), exercise_name: name })))
    }
    setReviewOpen(false)
    setMode('active')
    if(retrospective)setFinishOpen(true)
    setError(''); setNotice('')
  }

  function startManualWorkout(){
    setRestoredTimerSnapshot(null)
    setManualEntry(true)
    setManualLibraryEntry(false);setManualCompleted(false);setManualLocation('');setScoreRounds('');setScoreReps('');setBlockScores({});setScoreTime('');setScoreLoad('');setScoreCalories('');setScoreDistance('');setScoreUnit('m');setResultSummary(false);setReviewedResults({});setConfirmedPlannedEmom(false)
    setSessionPrepared(false)
    setFreeEditorOpen(false)
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
    setItems(current => [...current, { ...emptyExercise(), exercise_id: exercise.id, exercise_name: exercise.name, equipment:exercise.equipment||'', description:exercise.description||'', uses_height:measurementFlags.usesHeight, uses_load:measurementFlags.usesLoad }])
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
      return {...emptyExercise(),manual_wod_id:wod.id,exercise_id:item.exercise_id||'',exercise_name:item.exercise_name||item.name||'',equipment,uses_height:measurementFlags.usesHeight,uses_load:measurementFlags.usesLoad,is_rest:!!item.is_rest,is_complex:!!item.is_complex,complex_family:item.complex_family||null,complex_steps:Array.isArray(item.complex_steps)?item.complex_steps:[],rest_duration_seconds:item.rest_duration_seconds??null,prescription_levels:item.levels||null,prescription_label:doseLabel(item,wodLevel),description:item.description||item.instructions||catalogExercise?.description||'',rowUnit:wodRowUnit(item,wodLevel)}
    }):(wod.movements||'').split(/\n|,/).map(name=>name.trim()).filter(Boolean).map(name=>{const flags=getExerciseMeasurementFlags({name});return {...emptyExercise(),manual_wod_id:wod.id,exercise_name:name,uses_height:flags.usesHeight,uses_load:flags.usesLoad}})
    if(!additions.length){setError('WOD-en har ingen registrerte øvingar å leggje til.');return}
    setItems(rows=>[...rows,...additions]);setManualWodIds(ids=>[...ids,wod.id]);setManualWodSelect('');setManualWodQuery('');setManualWodPickerOpen(false);setNotice('Øvingane frå '+wod.name+' er lagde til. Stoppeklokka held fram som før.')
  }

  function updateExercise(key, patch) {
    setReviewedResults(old=>({...old,[key]:false}));setConfirmedPlannedEmom(false)
    setItems(current => current.map(item => {
      if(item.key !== key)return item
      if(patch.exercise_name !== undefined && !item.exercise_id){
        const flags=getExerciseMeasurementFlags({...item,...patch,name:patch.exercise_name})
        return {...item,...patch,uses_height:flags.usesHeight,uses_load:flags.usesLoad}
      }
      return {...item,...patch}
    }))
  }
  function updateSet(key, index, patch) {
    setReviewedResults(old=>({...old,[key]:false}));setConfirmedPlannedEmom(false)
    setItems(current => current.map(item => item.key === key ? { ...item, sets: item.sets.map((s, i) => i === index ? { ...s, flow_status:'', ...patch } : s) } : item))
  }
  function addSet(key) {
    setReviewedResults(old=>({...old,[key]:false}));setConfirmedPlannedEmom(false)
    setItems(current => current.map(item => item.key === key ? { ...item, sets: [...item.sets, { reps: '', load_kg: '', time_text: '', time_seconds: '', height_cm: '' }] } : item))
  }

  async function saveWorkout(event, automatic=false) {
    event?.preventDefault()
    if (saving || saveLock.current || mode!=='active') return
    const fingerprint=workoutSaveFingerprint(draftSnapshot)
    if(automatic&&(!pendingSave.current||pendingSave.current!==fingerprint||isOffline()))return
    if(!automatic){pendingSave.current=null;setSyncNotice('')}
    if(finishOpen&&!resultSummary){nextResult();return}
    if(resultIssues.length){setShowResultIssues(true);setResultSummary(true);if(resultBodyRef.current)resultBodyRef.current.scrollTop=0;setError('Rett '+resultIssues.length+' felt før du lagrar. Trykk på feilen for å gå direkte dit.');return}
    if (!title.trim()) { setError('Gi økta eit namn før du lagrar.'); return }
    if(manualEntry&&(!workoutDate||workoutDate>localDateISO())){setError('Vel ein gyldig treningsdato.');return}
    if(manualLibraryEntry&&format==='AMRAP'&&scoreRounds.trim()===''&&scoreReps.trim()!==''){setError('Registrer også tal fullførte rundar.');return}
    const durationOnly = canSaveDurationOnlyWorkout({format,manualEntry,sourceWodId:source?.id,classSessionId,manualWodCount:manualWodIds.length,elapsedSeconds:timerSnapshot.elapsed})
    if ((!items.length && !durationOnly) || items.some(item => !item.exercise_name.trim())) {
      setError('Alle øvingane må ha namn.'); return
    }
    if (items.some(item => !Array.isArray(item.sets) || item.sets.length === 0)) {
      setError('Legg til minst eitt sett på kvar øving før du lagrar.'); return
    }
    if(!manualEntry&&items.some(item=>item.prescribed_sets_prefilled)&&!confirmedPlannedEmom){setError('Stadfest at du har kontrollert dei førehandsutfylte EMOM-setta, og rett eventuelle avvik før du lagrar.');resultCorrectionRef.current='confirmEmom';return}
    if(!automatic&&finishOpen&&pendingWeightItems.length&&!await flowConfirm.ask({title:'Vekt manglar',message:pendingWeightItems.map(item=>flowItemGroup(item,flowSchema,format).title+' · '+item.exercise_name+': sett '+item.sets.map((set,index)=>entered(set.reps)&&Number(set.reps)>0&&!entered(set.load_kg)?index+1:null).filter(Boolean).join(', ')).join('\n')+'\n\nDu kan lagra utan vekt eller retta første felt.',confirmLabel:'Lagra utan vekt',cancelLabel:'Rett vekt'})){const item=pendingWeightItems[0],itemIndex=items.indexOf(item),setIndex=item.sets.findIndex(set=>entered(set.reps)&&Number(set.reps)>0&&!entered(set.load_kg));correctResultIssue({itemIndex,setIndex,part:flowItemGroup(item,flowSchema,format).title,exercise:item.exercise_name,field:'load_kg',message:'Registrer faktisk vekt, eller vel å lagra utan vekt.'});return}
    const protectedDraft=saveWorkoutDraft(memberId,draftSnapshot)
    setDraftProtected(protectedDraft)
    saveLock.current=true
    // Unlock during the save gesture, not after the asynchronous database call.
    const victoryPrefs=readPRVictoryAudio()
    let victoryContext=null
    const verifiedRows=items.filter(item=>reviewedResults[item.key])
    if(victoryPrefs.enabled&&victoryPrefs.volume>0&&hasVictoryCandidate(verifiedRows)){
      try{const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(AudioContextClass){if(!sharedTrainingAudioContext||sharedTrainingAudioContext.state==='closed')sharedTrainingAudioContext=new AudioContextClass();victoryContext=sharedTrainingAudioContext;unlockSoundPack(victoryContext,victoryPrefs.profile).catch(()=>{})}}catch{}
    }
    setVictoryNotice([]);setVictoryOverlay([])
    setSaving(true); setError(''); setNotice('')
    let validated=false
    try {
      const normalizedFormat = format.toLowerCase()
      const combinationMode = source?.timer_settings?.workout_schema?.combination_mode
      const isAmrapScore = !flowCompletionOnly&&((!manualLibraryEntry&&normalizedFormat === COMPOSITE_FORMAT.toLowerCase()) || normalizedFormat === 'amrap' || (['couplet','triplet'].includes(normalizedFormat) && combinationMode === 'AMRAP'))
      const isDeathByScore = !flowCompletionOnly&&normalizedFormat === 'death by' && (!manualEntry||manualLibraryEntry)
      const isLadderScore = !flowCompletionOnly&&normalizedFormat === 'ladder' && (!manualEntry||manualLibraryEntry)
      const ladderWasCompleted = isLadderScore && (manualLibraryEntry?manualCompleted:timerSnapshot.ladder_finished===true)
      const retrospectiveTimed=manualLibraryEntry&&(['for time','chipper','ladder'].includes(normalizedFormat)||(['couplet','triplet'].includes(normalizedFormat)&&combinationMode==='For Time'))
      const isForTimeScore = !flowCompletionOnly&&(ladderWasCompleted || ['for time','chipper'].includes(normalizedFormat) || (['couplet','triplet'].includes(normalizedFormat) && combinationMode === 'For Time'))
      const elapsedSeconds = Number(timerSnapshot.elapsed)||0
      const parsedTime = scoreTime.trim() ? (()=>{
        const raw=scoreTime.trim()
        if(!/^\\d{1,3}:\\d{1,2}(?::\\d{1,2})?$/.test(raw))return NaN
        const parts=raw.split(':').map(Number)
        if(parts.some(value=>!Number.isInteger(value)||value<0)||parts.slice(1).some(value=>value>59))return NaN
        return parts.length===2?parts[0]*60+parts[1]:parts[0]*3600+parts[1]*60+parts[2]
      })() : ((isForTimeScore||durationOnly)&&elapsedSeconds>0?elapsedSeconds:null)
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
          if(String(set.rir??'').trim()!==''&&(!Number.isInteger(Number(set.rir))||Number(set.rir)<-1||Number(set.rir)>10))throw new Error('Opplevd RIR skal vera eit heiltal frå -1 til 10.')
        }
      }
      for(const item of items.filter(x=>x.is_complex&&x.complex_family==='custom')){
        for(const set of item.sets){
          if([set.reps,set.load_kg].some(value=>String(value??'').trim()!=='')&&!['complete','partial','failed'].includes(set.complex_status))throw new Error('Stadfest gjennomføringa av kvart registrerte kompleks: '+item.exercise_name)
          if(set.complex_status==='complete'&&(!Number.isInteger(Number(set.reps))||Number(set.reps)<1))throw new Error('Oppgi tal fullførte komplekssyklusar for '+item.exercise_name)
          if(['partial','failed'].includes(set.complex_status)&&Number(set.reps)>0)throw new Error('Delvise eller mislukka forsøk kan ikkje telja som godkjende komplekssyklusar.')
        }
      }
      const explicitResults=explicitBlockResults(explicitScoreBlocks,blockScores,items)
      const scoredBlocks=(manualLibraryEntry?retrospectiveBlockResults(manualBlocks,blockScores):compositeScoredBlocks(timerSnapshot.block_summary||[],blockScores)).map(block=>explicitScoreIds.has(block.id)?{...block,scoreMode:explicitScoreBlocks.find(part=>part.id===block.id)?.scoreMode||'auto'}:block)
      for(const block of scoredBlocks){
       if((block.format==='AMRAP'||(['Couplet','Triplet'].includes(block.format)&&block.combination_mode==='AMRAP'))&&(!Number.isInteger(block.roundsCompleted)||block.roundsCompleted<0||!Number.isInteger(block.extra_reps)||block.extra_reps<0))throw new Error('Registrer gyldige rundar og ekstra repetisjonar for '+block.title)
       if(!Number.isFinite(Number(block.elapsed))||Number(block.elapsed)<0)throw new Error('Ugyldig tid i '+block.title)
      }
      const finalAmrap=scoredBlocks.filter(part=>!flowRecorded.some(record=>record.id===part.id)&&!explicitScoreIds.has(part.id)&&(part.format==='AMRAP'||(['Couplet','Triplet'].includes(part.format)&&part.combination_mode==='AMRAP'))).slice(-1)[0]
      const effectiveScoreRounds=format===COMPOSITE_FORMAT&&finalAmrap?String(finalAmrap.roundsCompleted):isLadderScore?(scoreRounds!==''?scoreRounds:manualLibraryEntry?'':String(Number(timerSnapshot.ladder_completed_rounds)||0)):isDeathByScore?(scoreRounds!==''?scoreRounds:manualLibraryEntry?'':String(Number(timerSnapshot.death_by_completed_rounds)||0)):scoreRounds
      const effectiveScoreReps=format===COMPOSITE_FORMAT&&finalAmrap?String(finalAmrap.extra_reps):scoreReps
      const hasRecordedScore=(manualLibraryEntry&&scoredBlocks.length>0)||explicitResults.some(result=>result.value!==null)||[effectiveScoreRounds,effectiveScoreReps,scoreTime,scoreLoad,scoreCalories,scoreDistance].some(value=>String(value??'').trim()!=='')||parsedTime!==null||(isAmrapScore&&Number(timerSnapshot.roundsCompleted)>0)||items.some(item=>Number(item.rowValue)>0||item.sets?.some(set=>[set.reps,set.load_kg,set.height_cm,set.time_text,set.time_seconds].some(value=>String(value??'').trim()!=='')))
      if(manualEntry&&!hasRecordedScore&&flowSessionStatus!=='done'&&!flowRecorded.some(part=>part.status==='done'||part.status==='partial')&&!items.some(item=>item.sets?.some(set=>set.flow_status==='done')))throw new Error('Registrer minst eitt faktisk resultat – til dømes reps, kg, høgd, tid, distanse eller kaloriar – før du lagrar etterregistreringa.')
      if(classSessionId&&source?.category!=='warmup'&&!hasRecordedScore&&flowSessionStatus!=='done'&&!flowRecorded.some(part=>part.status==='done'||part.status==='partial')&&!items.some(item=>item.sets?.some(set=>set.flow_status==='done')))throw new Error('Hovud-WOD må ha minst eitt registrert resultat før du kan lagra.')
      const resultData = {
        version:3,flow_completion:flowRecorded,flow_completion_only:flowCompletionOnly,flow_session_status:flowSessionStatus||null,format,combination_mode:combinationMode||null,manual_entry:manualEntry,training_location:manualEntry?manualLocation.trim()||null:null,prescription_level:wodLevel,block_results:timerSnapshot.block_results||null,block_summary:scoredBlocks.length?scoredBlocks:null,composite_breaks:timerSnapshot.composite_breaks||[],wod_engine:source?.timer_settings?.workout_schema?.wod_engine||null,wod_ids:source?.id?[source.id]:manualWodIds,wod_names:(source?.id?[source.id]:manualWodIds).map(id=>wods.find(w=>w.id===id)?.name).filter(Boolean),elapsed_seconds:elapsedSeconds,timer_phase:timerSnapshot.phase,completion_status:timerSnapshot.phase==='TIDSGRENSE'?'time_cap':retrospectiveTimed&&!manualCompleted||isLadderScore&&!ladderWasCompleted?'incomplete':'completed',completed:!(retrospectiveTimed&&!manualCompleted||isLadderScore&&!ladderWasCompleted),time_cap_reached:timerSnapshot.phase==='TIDSGRENSE',time_cap_seconds:timerSnapshot.phase==='TIDSGRENSE'?elapsedSeconds:null,
        completed_rounds:(isAmrapScore||isDeathByScore||isLadderScore)?(effectiveScoreRounds===''?(manualLibraryEntry?null:Number(timerSnapshot.roundsCompleted)||0):Number(effectiveScoreRounds)):null,
        death_by:isDeathByScore?{completed_rounds:Number(effectiveScoreRounds)||0,failed_round:timerSnapshot.death_by_failed_round??null,interval_seconds:timerSnapshot.death_by_interval_seconds??source?.timer_settings?.workout_schema?.ladder?.interval_seconds??60}:null,
        ladder:isLadderScore?{completed_rounds:Number(effectiveScoreRounds)||0,planned_rounds:Number(source?.timer_settings?.workout_schema?.rounds)||5,finished:ladderWasCompleted}:null,
        extra_reps:(isAmrapScore||isDeathByScore)?(effectiveScoreReps===''?(manualLibraryEntry?null:0):Number(effectiveScoreReps)):null,
        split_seconds:Array.isArray(timerSnapshot.laps)?timerSnapshot.laps:[],
        score_time_seconds:parsedTime,
        load_kg:scoreLoad===''?null:Number(scoreLoad),
        calories:scoreCalories===''?null:Number(scoreCalories),
        distance:scoreDistance===''?null:Number(scoreDistance),distance_unit:scoreUnit,
        block_primary_results:explicitResults,
        complex_results:items.filter(item=>item.is_complex&&item.complex_family==='custom').map(item=>({block_id:item.block_id||null,name:item.exercise_name,steps:item.complex_steps,...complexResultSummary(item)})),
        exercise_results:items.map(item=>({block_id:item.block_id||null,exercise_name:item.exercise_name,side_mode:item.side_mode||null,is_complex:!!item.is_complex,complex_family:item.complex_family||null,complex_steps:Array.isArray(item.complex_steps)?item.complex_steps.map(step=>({exercise_id:step.exercise_id||null,name:step.name,reps:Number(step.reps)||1})):[],row_value:item.rowValue===''?null:Number(item.rowValue),row_unit:item.rowUnit||null,meters:item.rowUnit==='m'?Number(item.rowValue)||null:item.rowUnit==='km'?(Number(item.rowValue)||0)*1000||null:null,calories:item.rowUnit==='cal'?Number(item.rowValue)||null:null,work_seconds:item.rowUnit==='s'?Number(item.rowValue)||null:item.rowUnit==='min'?(Number(item.rowValue)||0)*60||null:null,sets:item.sets.map(s=>({flow_status:s.flow_status||null,complex_status:item.is_complex&&item.complex_family==='custom'?s.complex_status||null:null,reps:s.reps===''?null:Number(s.reps),load_kg:s.load_kg===''?null:Number(s.load_kg),time_seconds:s.time_seconds===''?null:Number(s.time_seconds),time_text:s.time_text||null,height_cm:s.height_cm===''?null:Number(s.height_cm),rir:s.rir===''||s.rir==null?null:Number(s.rir)}))}))
      }
      const payload = {
        member_id:memberId,save_token:saveToken,title:title.trim(),source_wod_id:source?.id||manualWodIds[0]||null,
        class_live_session_id:classSessionId||null,workout_date:workoutDate||localDateISO(),format,
        rounds:Math.max(1,(isAmrapScore||isDeathByScore||isLadderScore)?(effectiveScoreRounds===''?Number(timerSnapshot.roundsCompleted)||0:Number(effectiveScoreRounds)):Number(effectiveScoreRounds)||1),
        score_rounds:(isAmrapScore||isDeathByScore||isLadderScore)?(effectiveScoreRounds===''?(manualLibraryEntry?null:Number(timerSnapshot.roundsCompleted)||0):Number(effectiveScoreRounds)):effectiveScoreRounds===''?null:Number(effectiveScoreRounds),
        score_reps:effectiveScoreReps===''?((isAmrapScore||isDeathByScore)&&!manualLibraryEntry?0:null):Number(effectiveScoreReps),
        score_time_seconds:parsedTime,score_load_kg:scoreLoad===''?null:Number(scoreLoad),
        score_calories:scoreCalories===''?null:Number(scoreCalories),
        score_distance:scoreDistance===''?null:Number(scoreDistance),score_unit:scoreDistance===''?null:scoreUnit,
        result_data:resultData,
        note:[note.trim(),scoreTime?'Tid: '+scoreTime:'',manualEntry?'Manuelt etterregistrert':'',manualEntry&&manualLocation.trim()?'Treningsstad: '+manualLocation.trim():'',!manualEntry?`Timer: ${format} · ${clock(elapsedSeconds)} · ${timerSnapshot.phase}`:'',!manualEntry&&timerSnapshot.laps.length?'Mellomtider: '+timerSnapshot.laps.map((lap,i)=>`${i+1}: ${clock(lap)}`).join(', '):''].filter(Boolean).join('\\n')
      }
      payload.exercises=items.map((item,index)=>({
        exercise_id:item.exercise_id||null,exercise_name:item.exercise_name.trim(),sort_order:index+1,row_value:item.rowValue===''?null:Number(item.rowValue),row_unit:item.rowUnit||null,meters:item.rowUnit==='m'?Number(item.rowValue)||null:item.rowUnit==='km'?(Number(item.rowValue)||0)*1000||null:null,calories:item.rowUnit==='cal'?Number(item.rowValue)||null:null,work_seconds:item.rowUnit==='s'?Number(item.rowValue)||null:item.rowUnit==='min'?(Number(item.rowValue)||0)*60||null:null,
        sets:item.sets.map(s=>({reps:s.reps===''?null:Number(s.reps),load_kg:s.load_kg===''||(item.is_complex&&item.complex_family==='custom'&&s.complex_status!=='complete')?null:Number(s.load_kg),time_text:s.time_text.trim()||null,time_seconds:s.time_seconds===''?null:Number(s.time_seconds),height_cm:s.height_cm===''?null:Number(s.height_cm)}))
      }))
      validated=true
      if(isOffline()){
        pendingSave.current=fingerprint
        setSyncNotice(protectedDraft?'Resultatet er sikra på eininga. Ventar på nett for automatisk lagring.':'Lokal lagring feila. Hald appen open; prøver igjen når nettet kjem tilbake.')
        return
      }
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if(userError)throw userError
      if(!user||user.id!==memberId)throw new Error('Innlogginga kunne ikkje stadfestast. Kladden er framleis open.')
      let victories=[]
      // Only explicitly reviewed standard-lift sets; never infer PRs from timer
      // scores, planned weights, estimated 1RM, or combined partner results.
      try{if(!source||activeWodEngine.participation==='individual')victories=await checkPRVictories(supabase,user.id,verifiedRows)}catch{/* The actual workout remains saveable. */}
      if(victories.length)resultData.pr_victories=victories
      const {data:workoutId,error:saveError}=await supabase.rpc('save_workout_with_pt_links',{
        p_workout:payload,
        p_assignment_id:launchLinkContext.assignmentId,
        p_program_session_id:launchLinkContext.programSessionId
      })
      if(saveError)throw saveError
      if(!workoutId)throw new Error('Databasen returnerte ikkje ID for den lagra økta.')
      pendingSave.current=null;setSyncNotice('')
      const programSyncMessage = ''
      // PRs are derived from saved workout sets on Mi side. Older independent
      // personal_records remain visible in the archive but aren't duplicated.
      const prMessage = programSyncMessage+' Rekordoversikta blir oppdatert frå øvingane og resultata i treningsloggen.'
      setNotice('Økta er lagra i treningsloggen.' + prMessage)
      if(victories.length){setVictoryNotice(victories);setVictoryOverlay(victories);if(victoryContext&&readPRVictoryAudio().enabled){stopDirectAudio();playPackSignal(victoryContext,'pr',victoryPrefs.volume,victoryPrefs.profile).catch(()=>{})}}
      setFinishOpen(false); setMode('home'); setReviewOpen(false)
      clearTimerSnapshot()
      setSaveToken(crypto.randomUUID())
      await loadAll()
      onSaved?.({victories})
    } catch (err) {
      if(validated&&isRetryableWorkoutError(err,isOffline())){
        pendingSave.current=fingerprint
        setSyncNotice(protectedDraft?'Resultatet er sikra på eininga. Prøver lagring igjen når sambandet er tilbake.':'Lokal lagring feila. Hald appen open medan me prøver igjen.')
      }else{
        pendingSave.current=null;setSyncNotice('')
        setError(err.message || 'Kunne ikkje lagra økta. Kladden er framleis open.')
      }
    } finally {
      saveLock.current=false;setSaving(false)
    }
  }
  retrySave.current=()=>saveWorkout(null,true)
  if (loading && mode!=='active' && !offline) return <div className="training-state"><LoaderCircle className="spin" size={20}/> Hentar treningsdata …</div>

  return <div className={simpleMode && mode === "home" ? "training-module simple-mode" : "training-module"}>
    {offline&&<div className="auth-message" role="status">Nettutfall · {mode==='active'?'Økta held fram.':'Tilkoplinga kjem tilbake automatisk.'}</div>}
    {mode==='active'&&!draftProtected&&<div className="auth-error" role="alert">Lokal sikring feila. Hald appen open til økta er lagra på nett.</div>}
    {syncNotice&&!finishOpen&&<div className="auth-message" role="status">{syncNotice}</div>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    {notice && <div className="auth-message" role="status"><CheckCircle2 size={16}/> {notice}</div>}
    <FlowConfirmDialog dialog={flowConfirm.dialog} onClose={flowConfirm.finish}/>
    {victoryOverlay.length>0&&<PRVictoryOverlay victories={victoryOverlay} onClose={()=>setVictoryOverlay([])}/>}
    {victoryNotice.length>0&&<div className="gg-pr-victory-notice" role="status"><Trophy size={22}/><div><strong>Ny personleg rekord · The Big Seven</strong>{victoryNotice.map(p=><small key={p.name}>{p.label}: {p.previous_kg} → {p.load_kg} kg</small>)}</div><button type="button" aria-label="Lukk rekordmelding" onClick={()=>setVictoryNotice([])}><X size={18}/></button></div>}
    {mode === 'active' ? <form className="engine-form gg-training-session" onSubmit={saveWorkout} noValidate={finishOpen}>
      <div className="training-heading"><div><div className="section-kicker">{manualEntry?'RESULTAT · ETTERREGISTRERING':'TRENING · AKTIV ØKT'}</div><h3>{source?.name||'Fri trening'}</h3></div><button type="button" className="workout-return-types" disabled={saving} onClick={manualEntry?cancelManualEntry:returnToWorkoutTypes}>{manualEntry?'Avbryt':'← Vel økttype'}</button></div>
      {source&&activeWodEngine.participation!=='individual'&&<section className="wod-execution-partner"><div><strong>{formatParticipation(activeWodEngine)}</strong><span>{({free_split:'Del arbeidet fritt',you_go_i_go:'You go – I go',alternate:'Annankvar / vekselvis',synchronized:'Synkroniserte repetisjonar',parallel:'Parallelt arbeid'})[activeWodEngine.collaboration]||'Felles gjennomføring'}</span></div><small>Resultat blir lagra med partner-/teamoppsettet frå WOD-kortet. Scoring: {(activeWodEngine.scoring?.fields||[]).join(' + ')}</small></section>}
      {source?.timer_settings?.workout_schema?.items?.some(item=>item.levels)&&<section className="wod-execution-level"><strong>Vel doseringsnivå</strong><div className="hub-tabs" role="group" aria-label="Doseringsnivå">{[{id:'rx',label:'RX'},...(source.timer_settings.workout_schema.items.some(item=>item.levels?.intermediate)?[{id:'intermediate',label:'Intermediate'}]:[]),{id:'scaled',label:'Scaled'},{id:'foundation',label:'Foundation'}].map(level=><button type="button" key={level.id} className={wodLevel===level.id?'selected':''} aria-pressed={wodLevel===level.id} disabled={Boolean(timerSnapshot.hasStarted)} onClick={()=>{setWodLevel(level.id);setConfirmedPlannedEmom(false);setItems(rows=>rows.map(item=>{const levels=item.prescription_levels;if(!levels)return item;const dose=levels[level.id]||levels.rx||{};const n=Number(dose.reps);return {...item,prescription_label:doseLabel({levels},level.id),sets:item.prescribed_sets_prefilled&&Number.isInteger(n)&&n>0?item.sets.map(set=>({...set,reps:String(n)})):item.sets}}))}}>{level.label}</button>)}</div></section>}
      <div className="training-session-workspace">
      {!source&&freeEditorOpen&&<section className="free-session-editor-head"><div><span className="section-kicker">FRI TRENING · {timerSnapshot.running?'KLOKKA GÅR':timerSnapshot.hasStarted?'KLOKKA ER PAUSA':'KLAR TIL START'}</span><strong>Legg til øvingar eller WOD-ar</strong><small>Legg til øvingar når du vil. Medgått tid: {clock(timerSnapshot.elapsed)}</small></div><button type="button" className="primary-button" onClick={()=>setFreeEditorOpen(false)}><Play size={16}/> Tilbake til klokka</button></section>}
      {(!sessionPrepared||source||manualEntry||freeEditorOpen)&&<>
      {!source&&freeEditorOpen&&<div className="free-session-editor-actions"><button type="button" className="secondary-button" onClick={()=>{exerciseSearchRef.current?.focus();exerciseSearchRef.current?.scrollIntoView({behavior:'smooth',block:'center'})}}><Plus size={17}/> Legg til øving</button><button type="button" className="secondary-button" onClick={()=>{setManualWodPickerOpen(true);requestAnimationFrame(()=>document.querySelector('.manual-wod-picker')?.scrollIntoView({behavior:'smooth',block:'start'}))}}><Plus size={17}/> Legg til WOD</button></div>}
      <div className="engine-fields">
        <label>Namn på økta<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Til dømes Styrke A" required/></label>
        <div className="training-choice-field"><span>Treningsformat</span><GarageSelect label="Treningsformat" value={format} disabled={Boolean(timerSnapshot.hasStarted)||Boolean(source&&format===COMPOSITE_FORMAT)} options={[...(isEmomFormat(format)&&format!=='EMOM'?[{value:format,label:`${emomDisplayLabel(emomIntervalSeconds(format,source?.timer_settings?.workout_schema?.interval))} · eldre WOD`}]:[]),...FORMATS.map(name=>({value:name,label:name}))]} onChange={setFormat}/>{timerSnapshot.hasStarted&&<small>Formatet er låst medan økta pågår.</small>}</div>
        <label>Treningsdato<input type="date" value={workoutDate} max={localDateISO()} disabled={Boolean(classSessionId)} onChange={e=>setWorkoutDate(e.target.value)}/></label>{manualEntry&&!classSessionId&&<label>Treningsstad (valfritt)<input value={manualLocation} onChange={e=>setManualLocation(e.target.value)} placeholder="GarasjeGym, Hardingboksen eller annan stad" list="retro-locations"/><datalist id="retro-locations"><option value="GarasjeGym"/><option value="Hardingboksen"/></datalist></label>}
        {(['AMRAP','Nedteljing'].includes(format)||isEmomFormat(format)) && <label>Øktlengd (minutt)<input type="number" min="1" max="600" disabled={Boolean(timerSnapshot.hasStarted)} value={duration} onChange={e => setDuration(e.target.value)}/></label>}
      </div>
      {source?.timer_settings?.workout_schema?.library_category==='warmup'&&<section className="warmup-execution-guide" aria-label="Oppvarming i to delar"><header><span className="section-kicker">OPPVARMING · TO DELAR</span><strong>Førebu kroppen og finn arbeidsnivået</strong></header><div className="warmup-execution-columns"><article><span>1</span><div><strong>Felles oppvarming</strong><p>Gradvis spissing mot hovud-WOD sin stimulus og rørsleform.</p><ul>{items.filter(item=>item.warmup_phase!=='movement_rehearsal'&&!item.is_rest).map(item=><li key={item.key}>{item.exercise_name}</li>)}</ul></div></article><article><span>2</span><div><strong>Fri teknisk innøving</strong><p>Prøv hovudrørsla med lette vekter. Auk gradvis og finn ditt eige arbeidsnivå for WOD-en.</p><ul>{items.filter(item=>item.warmup_phase==='movement_rehearsal'&&!item.is_rest).map(item=><li key={item.key}>{item.exercise_name}</li>)}</ul></div></article></div></section>}
      </>}
       {manualEntry ? <section className="manual-entry-intro" aria-label="Manuell treningsregistrering"><div><span className="section-kicker">ETTERREGISTRERING</span><strong>Registrer ei økt du allereie har gjennomført</strong><p>Legg inn faktisk resultat frå økta. Kontroller eventuelle planlagde WOD-verdiar før du lagrar. Ingen timer blir starta.</p></div><button type="button" className="primary-button" onClick={()=>setFinishOpen(true)}>Kontroller og lagre</button></section> : sessionPrepared ? <><div style={{display:!source&&freeEditorOpen?'none':undefined}}>{format===COMPOSITE_FORMAT&&source?.timer_settings?.workout_schema?.wod_engine?.blocks?.length>1?<CompositeTimer offline={offline} draftProtected={draftProtected} schema={source.timer_settings.workout_schema} exerciseList={items} previousLogs={previousLogs} prescriptionLevel={wodLevel} wodName={source?.name||''} originLabel={classSessionId?'GRUPPETIME':launchAssignmentId?'TILDELT FRÅ PT':'EIGEN WOD'} visible={visible&&!freeEditorOpen} onBackground={onBackground} onCancelBeforeStart={source&&!manualEntry&&canLeavePreparedWod(timerSnapshot)?returnToWorkoutTypes:null} resumeState={restoredTimerSnapshot} onSnapshot={setTimerSnapshot} stop={finishOpen} onFinish={()=>setFinishOpen(true)}/>:<Timer offline={offline} draftProtected={draftProtected} visible={visible&&!freeEditorOpen} onBackground={onBackground} onCancelBeforeStart={source&&!manualEntry&&canLeavePreparedWod(timerSnapshot)?returnToWorkoutTypes:null} onEditWorkout={!source?()=>{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});setFreeEditorOpen(true)}:null} autoStartToken={timerLaunchId} resumeState={restoredTimerSnapshot} format={format} minutes={duration} seconds={durationSeconds} activeExercise={items[activeExerciseIndex]?.exercise_name || ''} nextExercise={items[activeExerciseIndex + 1]?.exercise_name || ''} exerciseList={items} previousLogs={previousLogs} prescriptionLevel={wodLevel} timerSettings={source?.timer_settings || null} onSnapshot={setTimerSnapshot} stop={finishOpen} onFinish={() => setFinishOpen(true)} wodName={source?.name||''} originLabel={classSessionId ? 'GRUPPETIME' : launchAssignmentId ? 'TILDELT FRÅ PT' : source ? 'EIGEN WOD' : 'EIGA ØKT'}/>}</div>{!freeEditorOpen&&<HeartRateTrainingPanel />}{!freeEditorOpen&&<div className="workout-finish-actions"><button type="button" className="primary-button" onClick={source&&canLeavePreparedWod(timerSnapshot)?returnToWorkoutTypes:()=>setFinishOpen(true)}>{source&&canLeavePreparedWod(timerSnapshot)?'Tilbake utan å starta':'Avslutt økta · gå til resultat'}</button></div>}</> : <section className="free-session-setup" aria-label="Førebu fri økt"><div><span className="section-kicker">STEG 1 AV 2 · FRI ØKT</span><strong>Vel øvingar før du startar klokka</strong><p>Søk i øvingsbiblioteket nedanfor, legg til øvingane du vil trene, og juster sett eller belastning. Timeren opnar først når du vel «Start økta».</p></div><button type="button" className="primary-button" onClick={()=>{setSessionPrepared(true);setTimerLaunchId(value=>value+1)}}><Play size={18}/> Start økta{items.filter(item=>item.exercise_name.trim()).length ? ` · ${items.filter(item=>item.exercise_name.trim()).length} øvingar` : ' utan øvingar'}</button></section>}
      {(!sessionPrepared||source||manualEntry||freeEditorOpen)&&<>
      {items.length > 0 && format!=='Stasjonssirkel' && <section className="engine-section">
        <div className="engine-section-title"><h4>{format==='Stasjonssirkel'?'Stasjonane i økta':'WOD / øvingsrekkjefølgje'}</h4><span>{format==='Stasjonssirkel'?'Alle stasjonar – roter etter eiga startplassering':'Vel øvinga du arbeider med'}</span></div>
        <div className={format==='Stasjonssirkel'?'timer-station-grid':'wod-list'}>{items.map((item, index) => format==='Stasjonssirkel' ? <article className="timer-station-card" key={item.key}><span>STASJON {index+1}</span><strong>{item.exercise_name||'Øving'}</strong><small>{item.reps_mode==='amrap'?'AMRAP · maks reps':item.reps?item.reps+' reps':'Valfritt tal reps'}</small></article> : <button type="button" key={item.key} className={index === activeExerciseIndex ? 'secondary-button active' : 'secondary-button'} onClick={() => setActiveExerciseIndex(index)}>{index + 1}. {item.is_rest?'⏸ Pause · '+clock(Number(item.rest_duration_seconds)||30):item.exercise_name || 'Ny øving'}</button>)}</div>
      </section>}
      {!source&&!manualEntry&&<section className="engine-section manual-wod-picker"><div className="engine-section-title"><h4>Legg til WOD i økta</h4><span>Øvingane frå WOD-en blir lagde inn i frie økta. Stoppeklokka held fram.</span></div><div className="manual-wod-picker-row"><button type="button" className="manual-wod-picker-toggle" aria-expanded={manualWodPickerOpen} onClick={()=>setManualWodPickerOpen(value=>!value)}><Search size={17}/><span>{manualWodOptions.find(wod=>wod.id===manualWodSelect)?.name||'Søk og vel WOD frå biblioteket'}</span><ChevronDown size={17}/></button><button type="button" className="secondary-button" disabled={!manualWodSelect} onClick={addManualWod}><Plus size={15}/> Legg til WOD</button></div>{manualWodPickerOpen&&<div className="manual-wod-picker-results"><label><Search size={16}/><input autoFocus value={manualWodQuery} onChange={event=>setManualWodQuery(event.target.value)} placeholder="Søk etter WOD eller format …"/></label><div className="manual-wod-picker-options">{manualWodOptions.filter(wod=>[wod.name,wod.format].some(value=>String(value||'').toLowerCase().includes(manualWodQuery.trim().toLowerCase()))).slice(0,30).map(wod=><button type="button" key={wod.id} className={manualWodSelect===wod.id?'is-selected':''} onClick={()=>{setManualWodSelect(wod.id);setManualWodPickerOpen(false)}}><strong>{wod.name}</strong><small>{wod.format} · {wod.duration_minutes||'–'} min</small></button>)}{!manualWodOptions.some(wod=>[wod.name,wod.format].some(value=>String(value||'').toLowerCase().includes(manualWodQuery.trim().toLowerCase())))&&<p>Ingen WOD-ar passar søket.</p>}</div></div>}{manualWodIds.length>0&&<div className="manual-wod-chips">{manualWodIds.map(id=>{const wod=manualWodOptions.find(item=>item.id===id);return <span key={id}>{wod?.name||'WOD'}<button type="button" aria-label={'Fjern '+(wod?.name||'WOD')} onClick={()=>{setManualWodIds(rows=>rows.filter(value=>value!==id));setItems(rows=>rows.filter(item=>item.manual_wod_id!==id))}}>×</button></span>})}</div>}</section>}
      <section className="engine-section">
        <div className="engine-section-title"><h4>Øvingar og sett</h4><span>Legg inn resultat per sett</span></div>
        <div className="exercise-search"><Search size={16}/><input ref={exerciseSearchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Søk i øvingsbiblioteket …"/></div>
        <button type="button" className={'secondary-button gg-exercise-favorite-filter'+(favoritesOnly?' active':'')} aria-pressed={favoritesOnly} onClick={()=>setFavoritesOnly(value=>!value)}><Star size={16}/> {favoritesOnly?'Vis alle øvingar':'Favorittøvingar'}</button>
        {(query||favoritesOnly)&&<div className="exercise-pick-list gg-exercise-pick-with-favorites">{filteredExercises.length?filteredExercises.slice(0,favoritesOnly?filteredExercises.length:24).map(ex=><div className="gg-exercise-pick-row" key={ex.id}><button type="button" onClick={()=>addExercise(ex)}><Plus size={14}/><span>{ex.name}</span><small>{ex.category}</small></button><button type="button" className={'gg-exercise-pick-star'+(favoriteNames.includes(ex.name)?' selected':'')} aria-label={favoriteNames.includes(ex.name)?'Fjern favoritt: '+ex.name:'Legg til favoritt: '+ex.name} aria-pressed={favoriteNames.includes(ex.name)} onClick={()=>toggleFavorite(ex)}><Star size={17} fill={favoriteNames.includes(ex.name)?'currentColor':'none'}/></button></div>):<small>{favoritesOnly?'Ingen favorittøvingar passar søket.':'Ingen øvingar passar søket.'}</small>}</div>}
        {items.map((item, index) => <article className="engine-exercise" key={item.key}>
          <div className="engine-exercise-head"><strong>{index + 1}. {item.exercise_name || 'Ny øving'}</strong>{item.is_complex&&<span className="training-complex-tag">COMPLEX</span>}<button type="button" className="danger-icon" aria-label="Fjern øving" onClick={() => setItems(current => current.filter(x => x.key !== item.key))}><Trash2 size={16}/></button></div>
          {item.is_complex&&Array.isArray(item.complex_steps)&&<div className="training-complex-sequence"><strong>Rørslesekvens</strong><ol>{item.complex_steps.map((step,stepIndex)=><li key={stepIndex}><span>{step.name}</span><b>{step.reps} ×</b></li>)}</ol></div>}
          {!item.exercise_id && <input aria-label="Namn på øving" value={item.exercise_name} onChange={e => updateExercise(item.key,{exercise_name:e.target.value})} placeholder="Namn på øving"/>}
          {isSideSelectableExercise({name:item.exercise_name,equipment:item.equipment})&&<div className="training-side-picker training-choice-field"><span>Arm/side</span><GarageSelect label={'Vel arm eller side for '+item.exercise_name} value={item.side_mode||''} options={WOD_SIDE_OPTIONS} onChange={value=>updateExercise(item.key,{side_mode:value})}/></div>}
          {item.prescription_levels&&<div className="wod-prescription-target"><strong>Planlagt dosering · {wodLevel.toUpperCase()}</strong><span>{doseLabel({levels:item.prescription_levels},wodLevel)||'Ikkje dosert på dette nivået'}</span></div>}{item.sets.map((set, i) => <div className={item.uses_height&&item.uses_load?"set-grid height-load-set-grid":item.uses_height?"set-grid height-set-grid":"set-grid"} key={i}>
            <span>{item.is_complex?`Syklus ${i+1}`:`Sett ${i+1}`}</span><input type="number" min="0" step="1" value={set.reps} onChange={e => updateSet(item.key,i,{reps:e.target.value})} placeholder={item.is_complex?"Syklusar":"Reps"}/>
            {item.uses_height&&<input type="number" min="1" step="1" value={set.height_cm||''} onChange={e=>updateSet(item.key,i,{height_cm:e.target.value})} placeholder="Høgd (cm)" aria-label={`Høgd i centimeter, sett ${i+1}`}/>}
            {item.uses_load&&<input type="number" min="0" step="0.5" value={set.load_kg} onChange={e => updateSet(item.key,i,{load_kg:e.target.value})} placeholder="Kg" aria-label={`Belastning i kilo, sett ${i+1}`}/>}
            {exerciseRecordType(item.exercise_name,item.sets)==='hold'?<input type="number" min="0" step="1" value={set.time_seconds} onChange={e => updateSet(item.key,i,{time_seconds:e.target.value})} placeholder="Sekund" aria-label={`Haldetid i sekund, sett ${i+1}`}/>:!item.uses_height&&<input value={set.time_text} onChange={e => updateSet(item.key,i,{time_text:e.target.value})} placeholder="Tid" aria-label={`Tid, sett ${i+1}`}/>}
          </div>)}
          <details className="exercise-extra-result"><summary>Registrer distanse, kaloriar eller tid</summary><div className="exercise-extra-result-grid"><label>Resultat<input type="number" min="0" step="0.1" value={item.rowValue??''} onChange={e=>updateExercise(item.key,{rowValue:e.target.value})} placeholder="T.d. 500"/></label><div className="training-choice-field"><span>Eining</span><GarageSelect label={'Eining for '+item.exercise_name} value={item.rowUnit||'m'} options={RESULT_UNITS} onChange={value=>updateExercise(item.key,{rowUnit:value})}/></div></div></details>
          <button type="button" className="text-button add-set" onClick={() => addSet(item.key)}><Plus size={14}/> Legg til sett</button>
        </article>)}
        <button type="button" className="secondary-button" onClick={() => setItems(current => [...current, emptyExercise()])}><Plus size={15}/> Legg til eiga øving</button>
      </section>
      {!manualEntry&&!sessionPrepared&&<div className="free-session-setup-bottom"><button type="button" className="primary-button" onClick={()=>{setSessionPrepared(true);setTimerLaunchId(value=>value+1)}}><Play size={18}/> Start økta{items.filter(item=>item.exercise_name.trim()).length ? ` med ${items.filter(item=>item.exercise_name.trim()).length} øvingar` : ' utan øvingar'}</button></div>}
      </>}
      </div>
      {finishOpen&&<div className="workout-finish-backdrop" role="presentation">
        <section className="workout-finish-dialog gg-result-wizard" role="dialog" aria-modal="true" aria-labelledby="finish-workout-title">
          <div className="workout-finish-head gg-result-header"><div><span className="section-kicker">RESULTAT</span><h3 id="finish-workout-title">{resultSummary?'Kontroller og lagre':((flowGrid||flowCompact)?resultGroup?.title:resultItem?.exercise_name)||title||'Treningsøkt'}</h3><small>{resultSummary?title:source&&resultPages.length?'Del '+(resultPageIndex+1)+' av '+resultPages.length+' · '+title:(items.length?'Øving '+(activeExerciseIndex+1)+' av '+items.length:'Resultat')}</small></div><button type="button" className="gg-result-close" aria-label="Tilbake til økta utan å lagra" onClick={()=>setFinishOpen(false)} title="Tilbake til økta" disabled={saving}><X size={20}/></button></div>
          <div className="gg-result-progress" aria-label="Framdrift">{source&&resultPages.length?resultPages.map((page,index)=><button type="button" key={page.id} className={(!resultSummary&&resultPageIndex===index?'current ':'')+(page.indices.every(i=>reviewedResults[items[i].key]||items[i].is_rest)?'reviewed':'')} aria-label={'Del '+(index+1)+': '+page.title} aria-current={!resultSummary&&resultPageIndex===index?'step':undefined} onClick={()=>selectResult(page.indices[0])}/>):items.map((item,index)=><button type="button" key={item.key} className={(!resultSummary&&activeExerciseIndex===index?'current ': '')+(reviewedResults[item.key]?'reviewed':'')} aria-label={'Øving '+(index+1)+': '+item.exercise_name} aria-current={!resultSummary&&activeExerciseIndex===index?'step':undefined} onClick={()=>selectResult(index)}/>)}</div>
          {error&&<div ref={resultAlertRef} tabIndex={-1} className="auth-error gg-result-error" role="alert"><strong>{resultSummary?'Kontroller registreringa':'Rett dette før du går vidare'}</strong><span>{error}</span></div>}
          <FlowEntryProvider key={String(resultSummary)+':'+activeExerciseIndex+':'+resultSetIndex+':'+flowDetailed}>
           <div ref={resultBodyRef} className="gg-result-body" onTouchStart={e=>{if(e.target.closest('input,select,textarea,button'))return;const t=e.touches[0];resultTouch.current={x:t.clientX,y:t.clientY}}} onTouchEnd={e=>{const start=resultTouch.current,t=e.changedTouches[0];resultTouch.current=null;if(!start||!t)return;const dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.7)moveResult(dx<0?1:-1)}}>
          {resultSummary&&showResultIssues&&resultIssues.length>0&&<section className="gg-result-issues" aria-label="Felt som må rettast">{resultIssues.map((issue,index)=><button type="button" key={index} className="secondary-button" onClick={()=>correctResultIssue(issue)}><span><strong>{resultIssueLabel(issue)}</strong><small>{issue.message}</small></span><span>Rett <ChevronRight size={16}/></span></button>)}</section>}
          {source&&<div className="gg-flow-level"><div className="gg-flow-level-buttons" role="group" aria-label="Faktisk doseringsnivå">{[{id:'rx',label:'RX'},...(items.some(item=>item.prescription_levels?.intermediate)?[{id:'intermediate',label:'Intermediate'}]:[]),{id:'scaled',label:'Scaled'},{id:'foundation',label:'Foundation'}].map(level=><button type="button" key={level.id} className={wodLevel===level.id?'selected':''} aria-pressed={wodLevel===level.id} onClick={()=>{setWodLevel(level.id);setItems(rows=>rows.map(item=>item.prescription_levels?{...item,prescription_label:doseLabel({levels:item.prescription_levels},level.id)}:item))}}>{level.label}</button>)}</div></div>}
          {!resultSummary&&resultItem?<section className="workout-result-entry">
            <details className="gg-result-jump" hidden={flowGrid||flowCompact}><summary>Alle øvingar · {reviewedCount} av {items.length} gjennomgått <ChevronDown size={16}/></summary>
              <div className="workout-result-tabs" role="tablist" aria-label="Vel øving for resultat">{items.map((item,index)=><button type="button" key={item.key} role="tab" aria-selected={activeExerciseIndex===index} className={activeExerciseIndex===index?'selected':''} title={item.exercise_name||'Øving '+(index+1)} onClick={()=>selectResult(index)}>{index+1}. {item.exercise_name||'Øving'} {reviewedResults[item.key]?'✓':''}</button>)}</div>
            </details>
            {flowGrid?<div className="gg-flow-grid" aria-label="Alle sett i denne delen">
 
 {resultGroupIndices.map(index=>{const item=items[index],complex=item.is_complex&&item.complex_family==='custom',hold=exerciseRecordType(item.exercise_name,item.sets)==='hold',columns=[...(complex?[]:!hold?[['reps','Reps','numeric','1']]:[['time_seconds','Sek','numeric','1']]),...(item.uses_load?[['load_kg','kg','decimal','any']]:[]),...(item.uses_height?[['height_cm','cm','numeric','1']]:[])];return <article key={item.key} className="gg-flow-grid-exercise" data-flow-item={index}>
  <div className="gg-flow-grid-name">{(resultGroupIndices.length>1||!String(resultGroup.title).includes(item.exercise_name))&&<strong>{item.exercise_name}</strong>}{item.prescription_label&&<details className="gg-flow-info"><summary>Planlagt · {item.sets.length} {isEmomFormat(resultBlock?.format)?'intervall':'sett'}</summary><small>{item.prescription_label}</small></details>}</div>
  {item.is_rest?<small>Pause · inga registrering nødvendig</small>:isErgExercise(item)?<div className="gg-flow-grid-erg"><label>Resultat<FlowNumberInput field="rowValue" data-result-field="rowValue" type="number" inputMode="decimal" min="0" step="any" value={item.rowValue??''} onChange={e=>updateExercise(item.key,{rowValue:e.target.value})} placeholder="–"/></label><GarageSelect label="Eining" value={item.rowUnit||'m'} options={RESULT_UNITS} onChange={value=>updateExercise(item.key,{rowUnit:value})}/></div>:<>
  <div className={"gg-flow-grid-table"+(complex?" gg-flow-complex-table":"")} style={{'--result-columns':columns.length}}>
    <div className="gg-flow-grid-row gg-flow-grid-labels"><span>{isEmomFormat(resultBlock?.format)?'Nr.':'Sett'}</span>{columns.map(([field,label])=><span key={field}>{label}</span>)}<span>{complex?'Gjennomføring':'Utført'}</span></div>
    {item.sets.map((set,setIndex)=><div className="gg-flow-grid-row" key={setIndex} data-flow-set={setIndex}><strong>{setIndex+1}</strong>{columns.map(([field,label,keyboard,step])=>{const issue=resultIssues.find(i=>i.itemIndex===index&&i.setIndex===setIndex&&i.field===field);return <FlowNumberInput key={field} field={field} data-result-field={field} type="number" inputMode={keyboard} min={field==='height_cm'?1:0} step={step} aria-label={item.exercise_name+' · sett '+(setIndex+1)+' · '+label} aria-invalid={Boolean(issue)} value={set[field]??''} disabled={set.flow_status==='done'} onChange={e=>updateSet(item.key,setIndex,{[field]:e.target.value})} placeholder="–" />})}{complex?<div className="gg-flow-complex-status" role="group" aria-label={item.exercise_name+' · sett '+(setIndex+1)+' gjennomføring'}>{[{id:'complete',label:'Fullført',symbol:'✓'},{id:'partial',label:'Delvis',symbol:'−'},{id:'failed',label:'Mislukka',symbol:'×'}].map(s=><button type="button" key={s.id} data-status={s.id} data-result-field="complex_status" aria-label={s.label+' · sett '+(setIndex+1)} title={s.label} aria-pressed={set.complex_status===s.id} onClick={()=>changeComplexStatus(item,setIndex,s.id)}>{s.symbol}</button>)}</div>:<button type="button" className={'gg-flow-grid-done'+(set.flow_status==='done'?' is-done':'')} aria-label={item.exercise_name+' sett '+(setIndex+1)+' berre utført'} aria-pressed={set.flow_status==='done'} onClick={()=>markGridSet(item,setIndex)}><CheckCircle2 size={20}/></button>}</div>)}
  </div>
  {complex&&<small className="gg-flow-complex-caption">✓ Fullført · − Delvis · × Mislukka{complexResultSummary(item).best_load_kg!=null?' · Beste '+complexResultSummary(item).best_load_kg+' kg':''}</small>}
   <div className="gg-flow-grid-tools">{item.uses_load&&item.sets.length>1&&<button type="button" className="secondary-button" disabled={!entered(item.sets[0]?.load_kg)||!item.sets.slice(1).some(set=>!entered(set.load_kg)&&set.flow_status!=='done')} onClick={()=>copyGridWeight(item)}>Same kg i tomme felt</button>}<button type="button" className="secondary-button" onClick={()=>addSet(item.key)}><Plus size={15}/> Sett</button><button type="button" className="text-button" onClick={()=>{setActiveExerciseIndex(index);setResultSetIndex(0);setFlowDetailed(true)}}>Meir info</button></div>
  </>}
 </article>})}
 <small className="gg-flow-grid-hint">{resultGroupIndices.some(index=>!(items[index].is_complex&&items[index].complex_family==='custom'))?'Haka betyr berre utført, utan måleresultat.':'Tomme sett blir ikkje registrerte.'}</small>
 </div>:flowCompact?<div className="gg-flow-part"><details className="gg-flow-info"><summary>Øvingar og opplegg</summary><p>{resultGroupIndices.map(index=>items[index].exercise_name).join(' · ')}</p></details>{flowRecorded.find(part=>part.id===resultGroup.id)&&<small role="status">Registrert: {flowRecorded.find(part=>part.id===resultGroup.id).status==='done'?'Utført':flowRecorded.find(part=>part.id===resultGroup.id).status==='partial'?'Delvis':'Ikkje utført'}</small>}{resultGroup.reporting==='done'?<div className="gg-flow-completion"><button type="button" className="primary-button" onClick={()=>markFlowGroup('done')}><CheckCircle2 size={18}/> Utført</button><button type="button" className="secondary-button" onClick={()=>markFlowGroup('partial')}>Delvis</button><button type="button" className="secondary-button" onClick={()=>markFlowGroup('skipped')}>Ikkje utført</button></div>:<>{(()=>{const b=resultBlock||{},root=format!==COMPOSITE_FORMAT,mode=b.combinationMode||b.combination_mode||flowSchema.combination_mode,amrap=b.format==='AMRAP'||['Couplet','Triplet'].includes(b.format)&&mode==='AMRAP',steps=['Death By','Ladder'].includes(b.format),timed=['For Time','Chipper','Ladder'].includes(b.format)||['Couplet','Triplet'].includes(b.format)&&mode==='For Time',definition=blockScoreDefinition(b.scoreMode),v=blockScores[b.id]||{},live=timerSnapshot.block_summary?.find(x=>x.id===b.id),change=patch=>setBlockScores(old=>({...old,[b.id]:{...old[b.id],...patch}}));if(!root&&definition.value!=='auto'&&!['none','completion','load'].includes(definition.value))return <label>{definition.label} ({definition.unit})<FlowNumberInput type="number" inputMode="decimal" min="0" step="any" data-result-field="primary" value={v.primary??''} onChange={e=>change({primary:e.target.value})}/></label>;return <>{(amrap||steps)&&<div className="gg-composite-score-fields"><label>{steps?'Fullførte trinn / rundar':'Fullførte rundar'}<FlowNumberInput type="number" inputMode="numeric" min="0" step="1" data-result-field={root?'scoreRounds':'rounds'} value={root?scoreRounds:v.rounds??(live?String(live.roundsCompleted??0):'')} onChange={e=>root?setScoreRounds(e.target.value):change({rounds:e.target.value})}/></label>{amrap&&<label>Ekstra reps<FlowNumberInput type="number" inputMode="numeric" min="0" step="1" data-result-field={root?'scoreReps':'extraReps'} value={root?scoreReps:v.extraReps??(live?String(live.extra_reps??0):'')} onChange={e=>root?setScoreReps(e.target.value):change({extraReps:e.target.value})}/></label>}</div>}{timed&&<><label>Sluttid (mm:ss)<FlowNumberInput kind="time" data-result-field={root?'scoreTime':'time'} value={root?scoreTime:v.time??(live?clock(Number(live.elapsed)||0):'')} onChange={e=>root?setScoreTime(e.target.value):change({time:e.target.value})} placeholder="mm:ss"/></label>{manualEntry&&<label><input type="checkbox" checked={root?manualCompleted:v.completed===true} onChange={e=>root?setManualCompleted(e.target.checked):change({completed:e.target.checked})}/> Fullført etter oppsettet</label>}</>}{!amrap&&!steps&&!timed&&<p>Bruk detaljregistrering eller hovudresultat i oppsummeringa.</p>}</>})()}{resultGroupIndices.some(index=>{const item=items[index];return !item.is_rest&&!isErgExercise(item)&&!(item.is_complex&&item.complex_family==='custom')&&(item.uses_load||item.uses_height)})&&<section className="gg-flow-score-load"><strong>Faktisk belastning</strong><small>Valfritt · første registrerte sett / arbeidsvekt. Reps blir ikkje lagde til automatisk.</small>{resultGroupIndices.map(index=>{const item=items[index];if(item.is_rest||isErgExercise(item)||item.is_complex&&item.complex_family==='custom'||!item.sets?.length||(!item.uses_load&&!item.uses_height))return null;return <div key={item.key} className="gg-flow-score-load-row" data-flow-item={index} data-flow-set={0}><span>{item.exercise_name}</span>{item.uses_load&&<label>kg<FlowNumberInput field="load_kg" data-result-field="load_kg" type="number" inputMode="decimal" min="0" step="any" aria-label={item.exercise_name+' arbeidsvekt kg'} value={item.sets[0].load_kg??''} onChange={e=>updateSet(item.key,0,{load_kg:e.target.value})} placeholder="–"/></label>}{item.uses_height&&<label>cm<FlowNumberInput field="height_cm" data-result-field="height_cm" type="number" inputMode="numeric" min="1" step="1" aria-label={item.exercise_name+' høgd cm'} value={item.sets[0].height_cm??''} onChange={e=>updateSet(item.key,0,{height_cm:e.target.value})} placeholder="–"/></label>}</div>})}</section>}</>}<button type="button" className="text-button" onClick={()=>{setFlowDetailed(true);setBlockScores(old=>{const next={...old};delete next['flow:'+resultGroup.id];return next})}}>Meir info og detaljregistrering</button></div>:<div className="workout-result-exercise gg-result-current" key={resultItem.key}>
              {previousExerciseResult(previousLogs,resultItem)&&<small className="gg-previous-result">Ditt sist lagra · {previousExerciseResult(previousLogs,resultItem).date}: {previousExerciseResult(previousLogs,resultItem).summary}</small>}
              {resultItem.prescription_label&&<div className="gg-result-plan"><span>PLANLAGT I WOD</span><strong>{resultItem.prescription_label}</strong></div>}
              {resultItem.is_rest?<p className="workout-finish-help">Pause · ingen resultat å registrera. Gå vidare.</p>:isErgExercise(resultItem)?<div className="workout-result-erg"><strong>Faktisk resultat</strong><div className="workout-result-erg-fields"><label>Resultat<FlowNumberInput type="number" inputMode="decimal" min="0" step="0.1" data-result-field="rowValue" value={resultItem.rowValue??''} onChange={e=>updateExercise(resultItem.key,{rowValue:e.target.value})} placeholder="Tast tal"/></label><div className="training-choice-field"><span>Eining</span><GarageSelect label="Eining for ro-/ergresultat" value={resultItem.rowUnit||'m'} options={RESULT_UNITS} onChange={value=>updateExercise(resultItem.key,{rowUnit:value})}/></div></div><small>Registrer faktisk resultat dersom du vil logga det.</small></div>:<>
                <div className="gg-result-instruction"><strong>{resultItem.uses_load?'Kva løfta du faktisk?':'Kva gjorde du faktisk?'}</strong><small>{customComplexResult?'Tast vekt og stadfest gjennomføringa. Registrer avvik berre når dei oppstod. Tomme felt blir ikkje registrerte.':<>{resultItem.uses_load?'Tast inn vekt i kg for kvart sett. ':''}Rett førehandsutfylte reps dersom du gjorde noko anna. Neste øving stadfestar verdiane du har kontrollert. Tomme felt betyr ikkje registrert.</>}</small></div>
                <div className="gg-result-set-list">{(resultItem.sets||[]).map((set,setIndex)=>setIndex===resultSetIndex&&<div className="gg-result-set-row" key={setIndex}>
                  <span className="gg-result-set-number">Sett {setIndex+1} av {resultItem.sets.length}</span>

                  <div className="gg-result-set-fields" data-load={resultItem.uses_load?'yes':'no'}>
                    {customComplexResult?<label>Gjennomføring<select aria-label={'Sett '+(setIndex+1)+' gjennomføring'} data-result-field="complex_status" value={set.complex_status||''} onChange={e=>{const status=e.target.value;updateSet(resultItem.key,setIndex,{complex_status:status,reps:status==='complete'?(Number(set.reps)>0?set.reps:String(plannedComplexCycles(resultItem,wodLevel))):status?'0':''})}}><option value="">Ikkje registrert</option><option value="complete">Fullført</option><option value="partial">Delvis</option><option value="failed">Mislukka</option></select></label>:<label>{resultItem.is_complex?'Fullførte syklusar':'Reps'}<FlowNumberInput aria-label={'Sett '+(setIndex+1)+' repetisjonar'} type="number" inputMode="numeric" min="0" step="1" data-result-field="reps" value={set.reps} onChange={e=>updateSet(resultItem.key,setIndex,{reps:e.target.value})} placeholder="Tast reps"/></label>}
                    {resultItem.uses_load&&<label className="gg-result-weight" data-empty={!entered(set.load_kg)}><span>Vekt (kg)</span><FlowNumberInput aria-label={'Sett '+(setIndex+1)+' vekt i kilo'} type="number" inputMode="decimal" min="0" step="0.5" data-result-field="load_kg" value={set.load_kg} onChange={e=>updateSet(resultItem.key,setIndex,{load_kg:e.target.value})} placeholder="Tast kg"/></label>}
                    {resultItem.uses_height&&<label>Høgd (cm)<FlowNumberInput aria-label={'Sett '+(setIndex+1)+' høgd i centimeter'} type="number" inputMode="numeric" min="1" step="1" data-result-field="height_cm" value={set.height_cm} onChange={e=>updateSet(resultItem.key,setIndex,{height_cm:e.target.value})} placeholder="Tast cm"/></label>}
                    {exerciseRecordType(resultItem.exercise_name,resultItem.sets)==='hold'&&<label>Tid (sek)<FlowNumberInput aria-label={'Sett '+(setIndex+1)+' haldetid i sekund'} type="number" inputMode="numeric" min="0" step="1" data-result-field="time_seconds" value={set.time_seconds} onChange={e=>updateSet(resultItem.key,setIndex,{time_seconds:e.target.value})} placeholder="Tast sek"/></label>}
                  </div>
                  {!customComplexResult&&!entered(set.reps)&&Number(resultItem.prescription_levels?.[wodLevel]?.reps)>0&&<button type="button" className="secondary-button" onClick={()=>updateSet(resultItem.key,setIndex,{reps:String(resultItem.prescription_levels[wodLevel].reps)})}>Utførte {resultItem.prescription_levels[wodLevel].reps} planlagde reps</button>}
                  {setIndex>0&&entered(resultItem.sets[setIndex-1]?.load_kg)&&resultItem.uses_load&&<button type="button" className="secondary-button" onClick={()=>updateSet(resultItem.key,setIndex,{load_kg:resultItem.sets[setIndex-1].load_kg})}>Same vekt som førre · {resultItem.sets[setIndex-1].load_kg} kg</button>}
                  <button type="button" className="text-button" onClick={markFlowSet}>{set.flow_status==='done'?'Utført · gå vidare':'Berre utført · neste'}</button>
                </div>)}</div>
                {customComplexResult&&resultItem.sets.some(set=>!set.complex_status&&entered(set.load_kg))&&<button type="button" className="secondary-button gg-result-copy" onClick={confirmComplexWeights}>Stadfest alle uavklarte sett med vekt som fullførte</button>}
                {customComplexResult&&resultItem.sets.some(set=>set.complex_status==='complete')&&<details className="gg-result-rir"><summary>Endra tal fullførte syklusar (valfritt)</summary><div>{resultItem.sets.map((set,i)=>set.complex_status==='complete'&&<label key={i}>Sett {i+1}<FlowNumberInput type="number" min="1" step="1" data-result-field={i===resultSetIndex?'reps':undefined} value={set.reps} onChange={e=>updateSet(resultItem.key,i,{reps:e.target.value})}/></label>)}</div></details>}
                {resultItem.is_complex&&resultItem.complex_family==='custom'&&<div className="gg-result-plan"><span>TYNGSTE GODKJENDE KOMPLEKS</span><strong>{complexResultSummary(resultItem).best_load_kg==null?'Ikkje registrert':complexResultSummary(resultItem).best_load_kg+' kg'}</strong><small>{complexResultSummary(resultItem).completed} fullførte · {complexResultSummary(resultItem).partial} delvise · {complexResultSummary(resultItem).failed} mislukka</small></div>}
                {resultItem.uses_load&&resultItem.sets?.length>1&&<button type="button" className="secondary-button gg-result-copy" disabled={!entered(resultItem.sets?.[0]?.load_kg)||!resultItem.sets.slice(1).some(set=>!entered(set.load_kg))} onClick={copyFirstWeight}>Bruk vekta frå sett 1 i tomme felt</button>}
                {resultItem.uses_load&&<details className="gg-result-rir"><summary>RIR (valfritt) · repetisjonar i reserve <ChevronDown size={16}/></summary><div>{(resultItem.sets||[]).map((set,i)=><label key={i}>Sett {i+1}<FlowNumberInput type="number" inputMode="numeric" aria-label={'Sett '+(i+1)+' RIR'} min="-1" max="10" step="1" data-result-field={i===resultSetIndex?'rir':undefined} value={set.rir??''} onChange={e=>updateSet(resultItem.key,i,{rir:e.target.value})} placeholder="RIR"/></label>)}</div></details>}
                <div className="workout-result-actions"><button type="button" className="secondary-button" onClick={()=>addSet(resultItem.key)}><Plus size={16}/> Legg til sett</button>{missingLoad(resultItem)>0&&<span className="gg-result-weight-note">{missingLoad(resultItem)} sett manglar vekt</span>}</div>
              </>}
            </div>}
          </section>:<>
          <p className="workout-finish-help">{manualEntry?'Registrer berre resultat du faktisk oppnådde. Tomme felt blir ikkje rekna som gjennomførte sett.':'Tid og rundar frå klokka er med automatisk. Trykk på ei øving for å kontrollera eller korrigera.'} Rekordar blir kontrollert ved lagring av stadfesta løft.</p>
          {manualEntry&&<div className="engine-fields"><label>Treningsdato<input type="date" value={workoutDate} max={localDateISO()} disabled={Boolean(classSessionId)} onChange={e=>setWorkoutDate(e.target.value)}/></label>{!classSessionId&&<label>Treningsstad (valfritt)<input value={manualLocation} onChange={e=>setManualLocation(e.target.value)} placeholder="GarasjeGym / Hardingboksen"/></label>}</div>}
          <label className="gg-flow-confirm"><input type="checkbox" checked={flowSessionStatus==='done'} onChange={e=>setBlockScores(old=>({...old,__flow_session:{status:e.target.checked?'done':''}}))}/> Økta er utført · også utan måleresultat</label>{flowRecorded.length>0&&<div className="gg-flow-summary">{flowRecorded.map(part=><small key={part.id}>{part.title} · {part.status==='done'?'Utført':part.status==='partial'?'Delvis':'Ikkje utført'}</small>)}</div>}
          {items.length>0&&<details className="gg-result-review-list gg-result-review-detailed" aria-label="Kontroller øvingar"><summary>Detaljar og øvingsresultat · {items.length} øvingar</summary><div className="gg-result-review-heading"><strong>Samla øvingsresultat</strong><small>{unregisteredCount?unregisteredCount+' av '+items.length+' manglar eller må kontrollerast':'Alle øvingar gjennomgått'}</small></div>{items.map((item,index)=>{const r=resultReviews[index],block=timerSnapshot.block_summary?.find(b=>b.id===item.block_id);return <button type="button" key={item.key} className={'gg-result-row '+r.status} onClick={()=>selectResult(index)}><span className="gg-result-status-dot" aria-hidden="true">{['recorded','planned','completion'].includes(r.status)?'✓':r.status==='rest'?'–':'!'}</span><span className="gg-result-row-text"><strong>{index+1}. {item.exercise_name||'Øving'}</strong>{block&&<small className="gg-result-block-name">{block.title||block.format}</small>}<small>{r.summary}</small></span><span className="gg-result-row-state">{r.label}</span><ChevronRight size={16}/></button>})}</details>}
          {pendingWeightItems.length>0&&<p className="gg-result-weight-warning">Nokre sett manglar vekt. Trykk på øvinga for å fylla inn kg, eller lagra utan vekta dersom ho ikkje skal registrerast.</p>}
          <div className="workout-finish-summary">
            <div><span>FORMAT</span><strong>{format}</strong></div>
            <div><span>{manualEntry?'REGISTRERING':'TID'}</span><strong>{manualEntry?'Manuell':clock(timerSnapshot.elapsed)}</strong></div>
            <div><span>ØVINGAR</span><strong>{items.length}</strong></div>
            {timerSnapshot.roundsCompleted>0&&<div><span>RUNDER</span><strong>{timerSnapshot.roundsCompleted}</strong></div>}
          </div>
          {explicitScoreBlocks.some(block=>!['none','load'].includes(block.scoreMode))&&<section className="gg-composite-result-review" aria-label="Programmerte hovudresultat"><h4>Hovudresultat per del</h4><p>Registrer berre faktiske resultat. Tomme felt blir ikkje registrerte som nullprestasjon.</p>{explicitScoreBlocks.filter(block=>!['none','load'].includes(block.scoreMode)).map(block=>{const definition=blockScoreDefinition(block.scoreMode);const value=blockScores[block.id]?.primary??'';const change=primary=>setBlockScores(old=>({...old,[block.id]:{...old[block.id],primary}}));return <article key={block.id}><strong>{block.title}</strong>{definition.value==='none'?<small>Ingen score</small>:definition.value==='load'?<small>Tyngste godkjende kompleks blir henta frå registrerte komplekssyklusar i denne delen.</small>:definition.value==='completion'?<label>Gjennomføring<select value={value} onChange={e=>change(e.target.value)}><option value="">Ikkje registrert</option><option value="complete">Gjennomført</option><option value="partial">Delvis</option><option value="failed">Ikkje gjennomført</option></select></label>:<label>{definition.label} ({definition.unit})<FlowNumberInput type="number" min="0" step={definition.value==='distance'?'any':'1'} inputMode="decimal" value={value} onChange={e=>change(e.target.value)} placeholder="Ikkje registrert"/></label>}</article>})}</section>}
          {manualLibraryEntry&&manualBlocks.some(b=>flowReporting(b,flowSchema)!=='done'&&['rounds','steps','time'].includes(retrospectiveScoreKind(b)))&&<section className="gg-composite-result-review"><h4>Resultat per del</h4><p>Oppgi faktiske resultat. Stadfest fullføring berre når delen vart gjennomført etter oppsettet.</p>{manualBlocks.filter(b=>flowReporting(b,flowSchema)!=='done'&&['rounds','steps','time'].includes(retrospectiveScoreKind(b))).map(b=>{const kind=retrospectiveScoreKind(b),v=blockScores[b.id]||{},change=patch=>setBlockScores(old=>({...old,[b.id]:{...old[b.id],...patch}}));return <article key={b.id}><strong>{b.title||b.format}</strong>{kind==='time'?<label>Sluttid (mm:ss)<FlowNumberInput kind="time" value={v.time??''} placeholder="Ikkje registrert" onChange={e=>change({time:e.target.value})}/></label>:<div className="gg-composite-score-fields"><label>{kind==='steps'?'Fullførte trinn':'Rundar'}<FlowNumberInput type="number" min="0" step="1" value={v.rounds??''} placeholder="–" onChange={e=>change({rounds:e.target.value})}/></label>{kind==='rounds'&&<label>Ekstra reps<FlowNumberInput type="number" min="0" step="1" value={v.extraReps??''} placeholder="–" onChange={e=>change({extraReps:e.target.value})}/></label>}</div>}<label><input type="checkbox" checked={v.completed===true} onChange={e=>change({completed:e.target.checked})}/> Fullført etter oppsettet</label></article>})}</section>}
          {!manualLibraryEntry&&format===COMPOSITE_FORMAT&&timerSnapshot.block_summary?.some(block=>!explicitScoreIds.has(block.id))&&<section className="gg-composite-result-review" aria-label="Resultat per øktdel"><h4>Resultat per del</h4><p>Klokka har lagra deltidene. Kontroller AMRAP-rundar og ekstra reps før du lagrar.</p>{timerSnapshot.block_summary.filter(block=>!explicitScoreIds.has(block.id)).map((block,index)=><article key={block.id||index}><div><strong>{index+1}. {block.title||block.format}</strong><small>{block.format} · {clock(Number(block.elapsed)||0)} · {block.completed?'Fullført':'Ikkje fullført'}</small></div>{(block.format==='AMRAP'||(['Couplet','Triplet'].includes(block.format)&&block.combination_mode==='AMRAP'))&&<div className="gg-composite-score-fields"><label>Rundar<FlowNumberInput type="number" min="0" step="1" value={blockScores[block.id]?.rounds??String(block.roundsCompleted||0)} onChange={e=>setBlockScores(v=>({...v,[block.id]:{...v[block.id],rounds:e.target.value}}))}/></label><label>Ekstra reps<FlowNumberInput type="number" min="0" step="1" value={blockScores[block.id]?.extraReps??'0'} onChange={e=>setBlockScores(v=>({...v,[block.id]:{...v[block.id],extraReps:e.target.value}}))}/></label></div>}{['Death By','Ladder'].includes(block.format)&&<label>{block.format==='Death By'?'Fullførte intervall':'Fullførte stigetrinn'}<FlowNumberInput type="number" min="0" step="1" value={blockScores[block.id]?.rounds??String(block.format==='Death By'?block.death_by_completed_rounds??block.roundsCompleted??0:block.ladder_completed_rounds??block.roundsCompleted??0)} onChange={e=>setBlockScores(v=>({...v,[block.id]:{...v[block.id],rounds:e.target.value}}))}/></label>}{(['For Time','Chipper','Ladder'].includes(block.format)||(['Couplet','Triplet'].includes(block.format)&&block.combination_mode!=='AMRAP'&&block.combination_mode!=='Open'))&&<label>Registrert sluttid (mm:ss)<FlowNumberInput kind="time" value={blockScores[block.id]?.time??clock(Number(block.elapsed)||0)} onChange={e=>setBlockScores(v=>({...v,[block.id]:{...v[block.id],time:e.target.value}}))} placeholder="mm:ss"/></label>}</article>)}</section>}
          <section className="workout-finish-results"><h4>Kontroller resultatet</h4><p>{manualEntry?'Fyll inn det du faktisk gjennomførte.':'Resultat frå klokka er med. Fyll berre inn eller korriger det du treng før du lagrar.'}</p>
            <div className="engine-fields three" hidden={flowCompletionOnly}>
              {format==='Ladder'&&<div className="workout-result-death-by"><strong>{manualLibraryEntry?'Registrer fullførte stigetrinn':(timerSnapshot.ladder_completed_rounds??0)+' stigetrinn fullførte'}</strong><small>{manualLibraryEntry?'Stadfest fullføring dersom alle trinn vart utførte.':timerSnapshot.ladder_finished?'Heile Ladder-opplegget er fullført. Tida blir lagra automatisk.':'Avslutta før alle stigetrinn var fullførte. Dette blir ikkje rekna som ein For Time-PR.'}</small><label>Korriger fullførte trinn<FlowNumberInput type="number" inputMode="numeric" min="0" step="1" data-result-field="scoreRounds" value={scoreRounds} onChange={e=>setScoreRounds(e.target.value)} placeholder={String(timerSnapshot.ladder_completed_rounds??0)}/></label></div>}
              {format==='Death By'&&<div className="workout-result-death-by"><strong>{manualLibraryEntry?'Registrer fullførte rundar':(timerSnapshot.death_by_completed_rounds??0)+' førebelse rundar'}</strong><small>{manualLibraryEntry?'Oppgi dei rundane du faktisk fullførte.':timerSnapshot.death_by_failed_round?`Stoppa i runde ${timerSnapshot.death_by_failed_round}`:'Klokka går automatisk vidare. Kontroller faktisk fullførte rundar før lagring'}</small><label>Korriger fullførte rundar<FlowNumberInput type="number" inputMode="numeric" min="0" step="1" data-result-field="scoreRounds" value={scoreRounds} onChange={e=>setScoreRounds(e.target.value)} placeholder={String(timerSnapshot.death_by_completed_rounds??0)}/></label><label>Ekstra reps<FlowNumberInput type="number" inputMode="numeric" min="0" step="1" data-result-field="scoreReps" value={scoreReps} onChange={e=>setScoreReps(e.target.value)} placeholder="0"/></label></div>}
              {(format==='AMRAP'||(['Couplet','Triplet'].includes(format)&&source?.timer_settings?.workout_schema?.combination_mode==='AMRAP'))&&<><label>Fullførte rundar<FlowNumberInput type="number" inputMode="numeric" min="0" data-result-field="scoreRounds" value={scoreRounds} onChange={e=>setScoreRounds(e.target.value)} placeholder={String(timerSnapshot.roundsCompleted||0)}/></label><label>Ekstra reps<FlowNumberInput type="number" inputMode="numeric" min="0" data-result-field="scoreReps" value={scoreReps} onChange={e=>setScoreReps(e.target.value)} placeholder="0"/></label></>}
              {(['For Time','Chipper'].includes(format)||manualLibraryEntry&&format==='Ladder'||(['Couplet','Triplet'].includes(format)&&source?.timer_settings?.workout_schema?.combination_mode==='For Time'))&&<label>Sluttid<FlowNumberInput kind="time" data-result-field="scoreTime" value={scoreTime} onChange={e=>setScoreTime(e.target.value)} placeholder={timerSnapshot.elapsed?clock(timerSnapshot.elapsed):'mm:ss'}/></label>}
              {manualLibraryEntry&&(['For Time','Chipper','Ladder'].includes(format)||(['Couplet','Triplet'].includes(format)&&source?.timer_settings?.workout_schema?.combination_mode==='For Time'))&&<label><input type="checkbox" checked={manualCompleted} onChange={e=>setManualCompleted(e.target.checked)}/> Fullført heile økta etter oppsettet</label>}
              {['Strength','Pyramid','Superset','Complex'].includes(format)&&<label>Tungaste løft (kg)<FlowNumberInput type="number" min="0" step="0.5" data-result-field="scoreLoad" value={scoreLoad} onChange={e=>setScoreLoad(e.target.value)} placeholder="Valfritt"/></label>}
              {['Row Intervals','Intervall','Tabata'].includes(format)&&<><label>Kaloriar<FlowNumberInput type="number" min="0" step="0.1" data-result-field="scoreCalories" value={scoreCalories} onChange={e=>setScoreCalories(e.target.value)} placeholder="Totalt"/></label><label>Avstand<FlowNumberInput type="number" inputMode="numeric" min="0" step="1" data-result-field="scoreDistance" value={scoreDistance} onChange={e=>setScoreDistance(e.target.value)} placeholder="Total distanse"/></label><div className="training-choice-field"><span>Eining</span><GarageSelect label="Eining for avstand" value={scoreUnit} options={RESULT_UNITS.filter(option=>option.value==='m'||option.value==='km')} onChange={setScoreUnit}/></div></>}
              {(isEmomFormat(format)||format==='Stasjonssirkel')&&<p className="workout-finish-help">{manualEntry?'Registrer faktiske sett, repetisjonar og vekter for dei intervalla du gjennomførte.':('Klokka har registrert '+(timerSnapshot.roundsCompleted||0)+' fullførte '+(isEmomFormat(format)?'EMOM-intervall':'stasjonsrundar')+'. Kontroller aktuelle sett og vekter ovanfor.')}</p>}
              {!isEmomFormat(format)&&!['Stasjonssirkel','AMRAP','Death By','Ladder','For Time','Chipper','Couplet','Triplet','Strength','Pyramid','Superset','Complex','Row Intervals','Intervall','Tabata',COMPOSITE_FORMAT].includes(format)&&<><label>Rundar<FlowNumberInput type="number" inputMode="numeric" min="0" data-result-field="scoreRounds" value={scoreRounds} onChange={e=>setScoreRounds(e.target.value)} placeholder="–"/></label><label>Reps<FlowNumberInput type="number" inputMode="numeric" min="0" data-result-field="scoreReps" value={scoreReps} onChange={e=>setScoreReps(e.target.value)} placeholder="–"/></label><label>Tid / sluttid<FlowNumberInput kind="time" data-result-field="scoreTime" value={scoreTime} onChange={e=>setScoreTime(e.target.value)} placeholder="mm:ss"/></label></>}
            </div>
            <label className="engine-note">Notat<textarea value={note} onChange={e=>setNote(e.target.value)} rows="2" placeholder="Kommentar eller dagsform …"/></label>
          </section>
          {items.some(item=>item.prescribed_sets_prefilled)&&!manualEntry&&<label className="workout-confirm-prescribed gg-result-confirm"><input type="checkbox" data-result-field="confirmEmom" checked={confirmedPlannedEmom} onChange={e=>{setConfirmedPlannedEmom(e.target.checked);setError('')}}/><span>Eg har kontrollert dei planlagde EMOM-setta og repetisjonane, retta avvik og lagt inn faktiske vekter der eg vil registrera dei.</span></label>}
          </>}
          </div>
          <FlowKeypad/>
           <div className="gg-result-footer">
            {(syncNotice||offline||!draftProtected)&&<p role="status" className="workout-finish-help">{syncNotice||(!draftProtected?'Lokal sikring feila. Hald appen open.':'Nettutfall · øktkladden blir sikra lokalt.')}</p>}
            {resultSummary?<button type="submit" className="primary-button gg-result-save" disabled={saving}><Save size={20}/>{saving?'Lagrar …':'Lagre økt'}</button>:<><div className="gg-result-nav"><button type="button" className="secondary-button" disabled={flowGrid||flowCompact?resultPageIndex===0:activeExerciseIndex===0&&resultSetIndex===0} onClick={()=>moveResult(-1)}>← Førre</button><button type="button" className="primary-button" onClick={nextResult} title="Stadfest resultata for denne øvinga">{flowGrid||flowCompact?(resultPageIndex<resultPages.length-1?'Neste del':'Kontroller resultat'):resultItem&&resultSetIndex<resultItem.sets.length-1?'Neste sett':activeExerciseIndex<items.length-1?'Neste øving':'Kontroller resultat'} <ChevronRight size={19}/></button></div><button type="button" className="text-button gg-result-skip" onClick={()=>setResultSummary(true)}>Gå til samla resultatkontroll</button></>}
            <button type="button" className="gg-result-discard" disabled={saving} onClick={leaveWorkout} aria-label={manualEntry?'Avbryt registrering · ikkje lagre':'Forkast økta · ikkje lagre'}><Trash2 size={16}/> Forkast</button>
          </div>
        </FlowEntryProvider>
         </section>
      </div>}
    </form> : <>
      {mode==='retro-choose'||mode==='retro-library'?<section className="training-choose-hub"><button type="button" className="text-button" onClick={()=>setMode(mode==='retro-library'?'retro-choose':'home')}>← Tilbake</button><div className="training-heading"><div><span className="section-kicker">ETTERREGISTRERING</span><h3>{mode==='retro-choose'?'Kva har du trena?':'Vel WOD frå biblioteket'}</h3><p>Registrer ei gjennomført økt utan timer.</p></div></div>{mode==='retro-choose'?<div className="training-choose-links"><button type="button" onClick={()=>{setRetroQuery('');setMode('retro-library')}}><List size={22}/><span><strong>WOD frå biblioteket</strong><small>Behald format, øktdelar og dosering</small></span><ChevronRight size={18}/></button><button type="button" onClick={startManualWorkout}><Dumbbell size={22}/><span><strong>Fri trening</strong><small>Registrer eigne øvingar, sett og repetisjonar</small></span><ChevronRight size={18}/></button></div>:<><label className="wod-search"><Search size={17}/><input value={retroQuery} onChange={e=>setRetroQuery(e.target.value)} placeholder="Søk etter WOD …"/></label><div className="training-choose-links">{manualWodOptions.filter(w=>[w.name,w.format].some(v=>String(v||'').toLowerCase().includes(retroQuery.trim().toLowerCase()))).map(w=><button type="button" key={w.id} onClick={()=>startWorkout(w,{autoStart:false,forResult:true,retrospective:true})}><List size={20}/><span><strong>{w.name}</strong><small>{w.format} · {w.duration_minutes||'–'} min</small></span><ChevronRight size={18}/></button>)}{!manualWodOptions.some(w=>[w.name,w.format].some(v=>String(v||'').toLowerCase().includes(retroQuery.trim().toLowerCase())))&&<p>Ingen WOD-ar passar søket.</p>}</div></>}</section>:mode==='choose' ? <section className="training-choose-hub">
        <button type="button" className="text-button" onClick={()=>setMode('home')}>← Tilbake til ØKT</button>
        <div className="training-heading"><div><span className="section-kicker">TRENING · OPPLEGG</span><h3>Vel WOD eller opplegg</h3><p>Alle vegar fører til den same treningsklokka.</p></div></div>
        <div className="training-choose-links">
          <button type="button" onClick={()=>{setMode('home');onOpenTrainingPlan()}}><CalendarDays size={22}/><span><strong>Min treningsplan</strong><small>PT-program og økter som er tildelte deg</small></span><ChevronDown size={17}/></button>
          <button type="button" onClick={()=>{setMode('home');onOpenWodLibrary()}}><List size={22}/><span><strong>WOD-bibliotek</strong><small>Dagens WOD, favorittar og publiserte økter</small></span><ChevronDown size={17}/></button>
          <button type="button" onClick={()=>{setMode('home');onOpenSchedule()}}><Clock3 size={22}/><span><strong>Timeplan</strong><small>PT og gruppetimar</small></span><ChevronDown size={17}/></button>
        </div>
      </section> : <>
        <div className="training-heading"><div><span className="section-kicker">ØKT · START TRENING</span><h3>Kva vil du trena?</h3></div>{!simpleMode&&<span className="count-pill">{RELEASE_NAME}</span>}</div>
        {offline&&<div className="gg-offline-wods">{availableWods.map(w=><button type="button" className="secondary-button" key={w.id} onClick={()=>startWorkout(w,{autoStart:false})}>{w.name} · {w.format}</button>)}</div>}
        <div className="gg-training-home-actions">
          {dailyWodId&&<button type="button" className="gg-training-daily-action" onClick={()=>onOpenDailyWod(dailyWodId)}><Activity size={23}/><span><strong>Dagens WOD</strong><small>{wods.find(w=>w.id===dailyWodId)?.name||'Opne dagens økt'}</small></span><ChevronRight size={18}/></button>}
          <button type="button" onClick={()=>onOpenWodLibrary()}><List size={23}/><span><strong>Vel WOD</strong><small>Bibliotek og favorittar</small></span><ChevronRight size={18}/></button>
          <button type="button" onClick={()=>startWorkout(null,{autoStart:false})}><Dumbbell size={23}/><span><strong>Fri trening</strong><small>Start eiga økt</small></span><ChevronRight size={18}/></button>
          <button type="button" onClick={()=>onOpenTrainingPlan()}><CalendarDays size={23}/><span><strong>Tildelte økter</strong><small>Treningsplan og PT</small></span><ChevronRight size={18}/></button>
          <button type="button" onClick={()=>onOpenSchedule()}><Clock3 size={23}/><span><strong>Timeplan</strong><small>PT og gruppetimar</small></span><ChevronRight size={18}/></button>
          <button type="button" className="training-afterregister-link" onClick={()=>{setRetroQuery('');setMode('retro-choose')}}><History size={23}/><span><strong>Etterregistrering</strong><small>Registrer ei gjennomført økt</small></span><ChevronRight size={18}/></button>
        </div>
        <div className="gg-training-home-shortcuts" aria-label="Snarvegar til Mi side">
          <button type="button" onClick={()=>onOpenHistory()}><History size={19}/><strong>Treningslogg</strong><ChevronRight size={16}/></button>
          <button type="button" onClick={()=>onOpenPR()}><Trophy size={19}/><strong>PR-senter</strong><ChevronRight size={16}/></button>
        </div>
      </>}
    </>}
  </div>
}
