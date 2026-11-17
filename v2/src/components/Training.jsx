import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clock3, Dumbbell, LoaderCircle, Pause, Play, Plus, RotateCcw, Save, Search, Star, Heart, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { MusicMiniPlayer } from './Music.jsx'

const FORMATS = ['Fri trening', 'E1MOM', 'E2MOM', 'E3MOM', 'AMRAP', 'For Time', 'Chipper', 'Couplet', 'Triplet', 'Ladder', 'Death By', 'Tabata', 'Intervall', 'Row Intervals', 'Strength', 'Pyramid', 'Superset', 'Complex', 'Eigen økt', 'Stoppeklokke', 'Nedteljing', 'Tilpassa']
const emptyExercise = () => ({ key: crypto.randomUUID(), exercise_id: '', exercise_name: '', sets: [{ reps: '', load_kg: '', time_text: '', time_seconds: '' }] })
const pad = (n) => String(n).padStart(2, '0')
const clock = (seconds) => `${pad(Math.floor(Math.max(0, seconds) / 60))}:${pad(Math.max(0, seconds) % 60)}`
const localDateISO = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function Timer({ format, minutes, seconds = 0, activeExercise = '', exerciseList = [], timerSettings = null, onSnapshot = () => {} }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(1)
  const [workSeconds, setWorkSeconds] = useState(timerSettings?.work_seconds ?? timerSettings?.workout_schema?.interval?.work_seconds ?? (format === 'Tabata' ? 20 : 60))
  const [restSeconds, setRestSeconds] = useState(timerSettings?.rest_seconds ?? timerSettings?.workout_schema?.interval?.rest_seconds ?? (format === 'Tabata' ? 10 : 60))
  const [rounds, setRounds] = useState(timerSettings?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
  const [focused, setFocused] = useState(false)
  const [phase, setPhase] = useState('Klar')
  const [laps, setLaps] = useState([])
  const [soundOn, setSoundOn] = useState(true)
  const schema = timerSettings?.workout_schema
  const savedDuration = Number(schema?.duration_seconds) || 0
  const capDuration = Number(schema?.time_cap_seconds) || (Number(schema?.time_cap_minutes) || 0) * 60
  const isEMOM = ['EMOM', 'EMOM 1', 'EMOM 2', 'E1MOM', 'E2MOM', 'E3MOM'].includes(format)
  const emomEvery = Math.max(1, Number(schema?.interval?.work_every_minutes) || (format === 'E2MOM' || format === 'EMOM 2' ? 2 : format === 'E3MOM' ? 3 : 1))
  const emomCycle = emomEvery * 60
  const isTimedInterval = ['Tabata', 'Intervall', 'Tilpassa', 'Row Intervals'].includes(format)
  const isCountdown = ['AMRAP', 'Nedteljing'].includes(format) || (['Couplet', 'Triplet'].includes(format) && schema?.combination_mode === 'AMRAP')
  const isForTime = ['For Time', 'Chipper'].includes(format) || (['Couplet', 'Triplet'].includes(format) && schema?.combination_mode === 'For Time')
  const isDeathBy = format === 'Death By'
    const fallbackDuration = Math.max(1, (Number(minutes) || 10) * 60 + (Number(seconds) || 0))
  const target = Math.max(1, (isCountdown || isForTime) && capDuration ? capDuration : savedDuration || fallbackDuration)
  const cycle = Math.max(1, Number(workSeconds)) + Math.max(0, Number(restSeconds))
  const intervalTotal = cycle * Math.max(1, Number(rounds) || 1)
  const totalTarget = isTimedInterval ? intervalTotal : target
  const remainingTotal = Math.max(0, totalTarget - elapsed)
  const phaseElapsed = isTimedInterval ? elapsed % cycle : elapsed % emomCycle
  const inWorkPhase = phaseElapsed < Number(workSeconds)
  const phaseRemaining = isTimedInterval
    ? Math.max(0, (inWorkPhase ? Number(workSeconds) : cycle) - phaseElapsed)
    : Math.max(0, emomCycle - (elapsed % emomCycle || 0))
  const emomNextStart = elapsed % emomCycle === 0 ? 0 : emomCycle - (elapsed % emomCycle)
  const currentRound = isTimedInterval
    ? Math.min(Math.floor(elapsed / cycle) + 1, Math.max(1, Number(rounds) || 1))
    : isEMOM ? Math.floor(elapsed / emomCycle) + 1
    : isDeathBy ? Math.floor(elapsed / 60) + 1
    : Math.floor(elapsed / 60) + 1
  const currentPhase = isTimedInterval
    ? (inWorkPhase ? 'ARBEID' : 'KVILE')
    : isEMOM ? (elapsed === 0 || elapsed % emomCycle === 0 ? 'ARBEID' : 'TIL NESTE START')
    : isDeathBy ? 'NY RUNDE' : 'PÅGÅR'
  const primaryTime = isCountdown ? remainingTotal
    : isTimedInterval ? phaseRemaining
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
    setWorkSeconds(timerSettings?.work_seconds ?? timerSettings?.workout_schema?.interval?.work_seconds ?? (format === 'Tabata' ? 20 : 60))
    setRestSeconds(timerSettings?.rest_seconds ?? timerSettings?.workout_schema?.interval?.rest_seconds ?? (format === 'Tabata' ? 10 : 60))
    setRounds(timerSettings?.rounds ?? timerSettings?.workout_schema?.rounds ?? (format === 'Tabata' ? 8 : 5))
  }, [format, minutes, seconds, timerSettings?.work_seconds, timerSettings?.rest_seconds, timerSettings?.rounds, timerSettings?.workout_schema?.duration_seconds, timerSettings?.workout_schema?.time_cap_seconds])

  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => setElapsed(value => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => { onSnapshot({ elapsed, laps, roundsCompleted: isAmrap ? laps.length : round, phase, running }) }, [elapsed, laps, round, phase, running, isCountdown, onSnapshot])

  useEffect(() => {
    if (!running) return
    if ((isCountdown || isEMOM || isDeathBy || (isForTime && capDuration > 0)) && elapsed >= target) {
      setRunning(false); setPhase(isForTime ? 'TIDSGRENSE' : 'FERDIG'); cue(520, 0.5); return
    }
    if (isTimedInterval && elapsed >= intervalTotal) {
      setRunning(false); setPhase('FERDIG'); cue(520, 0.5); return
    }
    if ((isTimedInterval && (elapsed % cycle === 0 || elapsed % cycle === Number(workSeconds))) ||
      (isEMOM && elapsed > 0 && elapsed % emomCycle === 0) ||
      (isDeathBy && elapsed > 0 && elapsed % 60 === 0)) cue(1040, 0.12)
  }, [elapsed, running, target, isCountdown, isEMOM, isDeathBy, isForTime, isTimedInterval, intervalTotal, cycle, emomCycle, workSeconds])

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
  const showTimeCap = (isForTime || isDeathBy) && capDuration > 0
  const roundsShown = isTimedInterval ? Math.min(currentRound, Number(rounds)) : currentRound
  const completedRounds = isAmrap ? laps.length : round
  const lapAction = () => { setLaps(value => [...value, Math.max(0, elapsed - value.reduce((sum, lap) => sum + lap, 0))]); setRound(value => value + 1); cue(1200, 0.1) }
  return <div className={focused ? 'engine-timer timer-focused' : 'engine-timer'}>
    <div className="timer-caption"><Clock3 size={15}/> {format.toUpperCase()}</div>
    <div className="timer-dashboard timer-dashboard-reflow">
      <section className="timer-center">
        <div className="timer-phase">{phase}</div>
        <strong className="timer-main-clock">{clock(primaryTime)}</strong>
        <div className="timer-round-label">{isCountdown ? 'GJENSTÅANDE TID' : isEMOM ? 'TIL NESTE ARBEIDSSTART' : isTimedInterval ? 'TID I INTERVALLFASEN' : 'MEDGÅTT TID'}</div>
        {isAmrap ? <div className="timer-amrap-exercise-list"><span>ØVINGAR I WOD-EN</span>{exerciseList.length ? <ol>{exerciseList.map((exercise,index)=>{const setReps=(exercise.sets||[]).map(set=>String(set.reps??'').trim()).filter(Boolean);const uniqueReps=[...new Set(setReps)];const repsLabel=uniqueReps.length===1?(setReps.length>1?`${setReps.length} × ${uniqueReps[0]}`:uniqueReps[0]):uniqueReps.length>1?uniqueReps.join(' / '):String(exercise.reps??'').trim();return <li key={exercise.key||index}><b>{index+1}.</b><span>{repsLabel&&<strong className="timer-amrap-reps">{repsLabel} × </strong>}{exercise.exercise_name||'Øving utan namn'}</span></li>})}</ol> : <p>Ingen øvingar er lagde til.</p>}</div> : activeExercise && <div className="timer-active-under-clock"><span>GJELDANDE ØVING</span><b>{activeExercise}</b></div>}
        {isAmrap && <div className="timer-round-total"><span>RUNDER FULLFØRT</span><b>{completedRounds}</b></div>}
        <div className="timer-actions">
          <button type="button" className="secondary-button" onClick={() => { if (!running && phase === 'FERDIG') return; if (!running) setPhase('PÅGÅR'); setRunning(value => !value) }} disabled={phase === 'FERDIG' || phase === 'TIDSGRENSE'}>{running ? <><Pause size={14}/> Pause</> : <><Play size={14}/> Start</>}</button>
          {isAmrap && <button type="button" className="timer-lap-button" onClick={lapAction} disabled={!running && elapsed===0}>+ REGISTRER RUNDE</button>}
          <button type="button" className="secondary-button" onClick={() => { setRunning(false); setElapsed(0); setRound(1); setLaps([]); setPhase('Klar') }}><RotateCcw size={14}/> Nullstill</button>
          {(isStopwatch || isForTime) && <button type="button" className="secondary-button" onClick={() => setLaps(value => [...value, elapsed])}>Mellomtid</button>}
          <button type="button" className="secondary-button" onClick={() => setSoundOn(value => !value)}>{soundOn ? 'Lyd på' : 'Lyd av'}</button>
          <button type="button" className="secondary-button" onClick={toggleFocus}>{focused ? 'Avslutt stor klokke' : 'Stor klokke'}</button>
        </div>
      </section>
      <aside className="timer-side timer-side-left">
        <div className="timer-bottom-heading">ØKTINFORMASJON</div>
        <div className="timer-side-stat"><span>MEDGÅTT TID</span><b>{clock(elapsed)}</b></div>
        {isCountdown && <div className="timer-side-stat"><span>TID ATT</span><b>{clock(remainingTotal)}</b></div>}
        {isEMOM && <><div className="timer-side-stat"><span>GJENSTÅANDE ØKTTID</span><b>{clock(remainingTotal)}</b></div><div className="timer-side-stat"><span>NESTE ARBEIDSSTART</span><b>{clock(emomNextStart)}</b></div></>}
        {isTimedInterval && <><div className="timer-side-stat"><span>ØKTA ATT</span><b>{clock(remainingTotal)}</b></div><div className="timer-side-stat"><span>RUNDE</span><b>{roundsShown}/{rounds}</b></div></>}
        {isForTime && showTimeCap && <div className="timer-side-stat"><span>TIDSGRENSE</span><b>{clock(Math.max(0,target-elapsed))}</b></div>}
        {isDeathBy && <div className="timer-side-stat"><span>NESTE MINUTT</span><b>{clock(elapsed===0?60:60-(elapsed%60||0))}</b></div>}
        {isTimedInterval && !running && elapsed===0 && <div className="timer-settings-inline">
          <label>Arbeid sek.<input type="number" min="1" max="600" value={workSeconds} onChange={e=>setWorkSeconds(Math.max(1,Number(e.target.value)||1))}/></label>
          <label>Kvile sek.<input type="number" min="0" max="600" value={restSeconds} onChange={e=>setRestSeconds(Math.max(0,Number(e.target.value)||0))}/></label>
          <label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e=>setRounds(Math.max(1,Number(e.target.value)||1))}/></label>
        </div>}
      </aside>
      <aside className="timer-side timer-side-right">
        <div className="timer-lap-heading">RUNDETIDER <b>{laps.length}</b></div>
        {laps.length ? <ol className="timer-lap-list">{laps.map((lap,index)=><li key={index}><span>Runde {index+1}</span><b>{clock(lap)}</b></li>)}</ol> : <p className="timer-no-laps">Registrer kvar fullførte runde her.</p>}
      </aside>
    </div>
    <div className="timer-music-footer"><MusicMiniPlayer /></div>
    <small>{isTimedInterval ? 'Arbeid / kvile · samla økttid og tid att' : isCountdown ? 'AMRAP · registrer kvar fullførte runde' : isEMOM ? (emomEvery > 1 ? `E${emomEvery}MOM · arbeid kvart ${emomEvery}. minutt` : 'E1MOM · arbeid kvart minutt') : isDeathBy ? 'Aukande arbeid for kvar minutt' : isForTime ? 'Stoppeklokke med eventuell tidsgrense' : 'Stoppeklokke – tel medgått tid'}</small>
  </div>
}

export default function Training({ launchWodId = null, launchClassSessionId = null, onLaunchConsumed }) {
  const [wods, setWods] = useState([])
  const [exercises, setExercises] = useState([])
  const [favoriteNames, setFavoriteNames] = useState([])
  const [favoriteWodIds, setFavoriteWodIds] = useState([])
  const [wodFavoritesOnly, setWodFavoritesOnly] = useState(false)
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
  const [mode, setMode] = useState('home')
  const [source, setSource] = useState(null)
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
      .select('id,name,format,duration_minutes,movements,notes,audience,is_published,created_at,timer_settings')
      .order('created_at', { ascending: false })
    // Keep the WOD library usable while the optional timer-settings migration is staged.
    if (w.error && /timer_settings|column .* does not exist/i.test(w.error.message || '')) {
      w = await supabase.from('wods')
        .select('id,name,format,duration_minutes,movements,notes,audience,is_published,created_at')
        .eq('is_published', true).order('created_at', { ascending: false })
    }
    const [e, h, pr] = await Promise.all([
      supabase.from('exercises').select('id,name,category,equipment,description,video_url').eq('is_active', true).order('name'),
      supabase.from('workout_logs').select('id,title,workout_date,format,rounds,score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,score_distance,score_unit,result_data,note,created_at,workout_exercises(id,exercise_name,sort_order,workout_sets(id,set_number,reps,load_kg,time_text,time_seconds))').order('workout_date', { ascending: false }).limit(30),
      supabase.from('personal_records').select('id,exercise_name,result,unit,note,record_date').order('record_date', { ascending: false }).limit(50),
    ])
    if (w.error) setError(w.error.message); else setWods(w.data || [])
    if (e.error && !w.error) setError('Øvingsbibliotek: ' + e.error.message); else setExercises(e.data || [])
    if (h.error && !w.error && !e.error) setError('Treningslogg: ' + h.error.message); else setHistory(h.data || [])
    if (pr.error && !w.error && !e.error && !h.error) setError('Personlege rekordar: ' + pr.error.message); else setRecords(pr.data || [])
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const fav = await supabase.from('exercise_favorites').select('exercise_name').eq('user_id', user.id)
      if (!fav.error) setFavoriteNames((fav.data || []).map(x => x.exercise_name))
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

  const filteredExercises = useMemo(() => exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || (e.category || '').toLowerCase().includes(query.toLowerCase())), [exercises, query])

  function leaveWorkout() {
    if (window.confirm('Vil du avslutta økta? Resultata som ikkje er lagra, går tapt.')) {
      setMode('home'); setSource(null); setClassSessionId(null); setItems([])
    }
  }

  function startWorkout(wod = null) {
    setClassSessionId(null)
    setSource(wod)
    setTitle(wod?.name || '')
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
      const isAmrapScore = normalizedFormat === 'amrap'
      const isForTimeScore = ['for time','chipper','couplet','triplet'].includes(normalizedFormat)
      const elapsedSeconds = Number(timerSnapshot.elapsed)||0
      const parsedTime = scoreTime.trim() ? (()=>{const parts=scoreTime.trim().split(':').map(Number);return parts.length===2?parts[0]*60+parts[1]:parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:NaN})() : (isForTimeScore&&elapsedSeconds>0?elapsedSeconds:null)
      if(scoreTime.trim()&&!Number.isFinite(parsedTime))throw new Error('Tid må skrivast som mm:ss eller tt:mm:ss.')
      const resultData = {
        version:1,format,elapsed_seconds:elapsedSeconds,timer_phase:timerSnapshot.phase,
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
        member_id:user.id,title:title.trim(),source_wod_id:source?.id||null,
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
      const {data:log,error:logError}=await supabase.from('workout_logs').insert({
        member_id:payload.member_id,title:payload.title,source_wod_id:payload.source_wod_id,
        workout_date:payload.workout_date,format:payload.format,rounds:payload.rounds,
        score_rounds:payload.score_rounds,score_reps:payload.score_reps,
        score_time_seconds:payload.score_time_seconds,score_load_kg:payload.score_load_kg,
        score_calories:payload.score_calories,score_distance:payload.score_distance,
        score_unit:payload.score_unit,result_data:payload.result_data,note:payload.note
      }).select('id').single()
      if(logError)throw logError
      const workoutId=log.id
      try{
        const exerciseRows=payload.exercises=items.map((item,index)=>({
          exercise_id:item.exercise_id||null,exercise_name:item.exercise_name.trim(),sort_order:index+1,
          sets:item.sets.map(s=>({reps:s.reps===''?null:Number(s.reps),load_kg:s.load_kg===''?null:Number(s.load_kg),time_text:s.time_text.trim()||null,time_seconds:s.time_seconds===''?null:Number(s.time_seconds)}))
        }))
        if(exerciseRows.length){
          const {data:savedExercises,error:exerciseError}=await supabase.from('workout_exercises').insert(exerciseRows.map(x=>({workout_log_id:workoutId,exercise_id:x.exercise_id,exercise_name:x.exercise_name,sort_order:x.sort_order}))).select('id,sort_order')
          if(exerciseError)throw exerciseError
          const setRows=[]
          savedExercises.forEach(saved=>{const original=exerciseRows.find(x=>x.sort_order===saved.sort_order);original.sets.forEach((set,index)=>{if(set.reps!==null||set.load_kg!==null||set.time_text||set.time_seconds!==null)setRows.push({workout_exercise_id:saved.id,set_number:index+1,...set})})})
          if(setRows.length){const {error:setError}=await supabase.from('workout_sets').insert(setRows);if(setError)throw setError}
        }
      }catch(childError){await supabase.from('workout_logs').delete().eq('id',workoutId);throw new Error('Økta vart ikkje lagra fordi øvingsdetaljane feila: '+childError.message)}
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
        payload.exercises.forEach(exercise => {
          const loads = exercise.sets.map(set => set.load_kg).filter(value => Number.isFinite(value) && value > 0)
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
      setMode('home')
      await loadAll()
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

  return <div className="training-module">
    {error && <div className="auth-error" role="alert">{error}</div>}
    {notice && <div className="auth-message" role="status"><CheckCircle2 size={16}/> {notice}</div>}
    {mode === 'active' ? <form className="engine-form" onSubmit={saveWorkout}>
      <button type="button" className="text-button" onClick={leaveWorkout}>← Avslutt økta</button>
      <div className="training-heading"><div><div className="section-kicker">TRENING · AKTIV ØKT</div><h3>Bygg økta di</h3></div><span className="count-pill">{items.length} øvingar</span></div>
      <div className="engine-fields">
        <label>Namn på økta<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Til dømes Styrke A" required/></label>
        <label>Treningsformat<select value={format} onChange={e => setFormat(e.target.value)}>{FORMATS.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Varigheit (min)<input type="number" min="1" max="600" value={duration} onChange={e => setDuration(e.target.value)}/></label>
        <label>Ekstra sekund<input type="number" min="0" max="59" value={durationSeconds} onChange={e => setDurationSeconds(e.target.value)}/></label>
      </div>
      <Timer format={format} minutes={duration} seconds={durationSeconds} activeExercise={items[activeExerciseIndex]?.exercise_name || ''} exerciseList={items} timerSettings={source?.timer_settings || null} onSnapshot={setTimerSnapshot}/>
      {items.length > 0 && <section className="engine-section">
        <div className="engine-section-title"><h4>WOD / øvingsrekkjefølgje</h4><span>Vel øvinga du arbeider med</span></div>
        <div className="wod-list">{items.map((item, index) => <button type="button" key={item.key} className={index === activeExerciseIndex ? 'secondary-button active' : 'secondary-button'} onClick={() => setActiveExerciseIndex(index)}>{index + 1}. {item.exercise_name || 'Ny øving'}</button>)}</div>
      </section>}
      <section className="engine-section">
        <div className="engine-section-title"><h4>Øvingar og sett</h4><span>Legg inn resultat per sett</span></div>
        <div className="exercise-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Søk i øvingsbiblioteket …"/></div>
        {query && <div className="exercise-pick-list">{filteredExercises.slice(0,8).map(ex => <button type="button" key={ex.id} onClick={() => addExercise(ex)}><Plus size={14}/><span>{ex.name}</span><small>{ex.category}</small></button>)}</div>}
        {items.map((item, index) => <article className="engine-exercise" key={item.key}>
          <div className="engine-exercise-head"><strong>{index + 1}. {item.exercise_name || 'Ny øving'}</strong><button type="button" className="danger-icon" aria-label="Fjern øving" onClick={() => setItems(current => current.filter(x => x.key !== item.key))}><Trash2 size={16}/></button></div>
          {!item.exercise_id && <input aria-label="Namn på øving" value={item.exercise_name} onChange={e => updateExercise(item.key,{exercise_name:e.target.value})} placeholder="Namn på øving"/>}
          {item.sets.map((set, i) => <div className="set-grid" key={i}>
            <span>Sett {i + 1}</span><input type="number" min="0" step="1" value={set.reps} onChange={e => updateSet(item.key,i,{reps:e.target.value})} placeholder="Reps"/>
            <input type="number" min="0" step="0.5" value={set.load_kg} onChange={e => updateSet(item.key,i,{load_kg:e.target.value})} placeholder="Kg"/>
            <input value={set.time_text} onChange={e => updateSet(item.key,i,{time_text:e.target.value})} placeholder="Tid"/>
          </div>)}
          <button type="button" className="text-button add-set" onClick={() => addSet(item.key)}><Plus size={14}/> Legg til sett</button>
        </article>)}
        <button type="button" className="secondary-button" onClick={() => setItems(current => [...current, emptyExercise()])}><Plus size={15}/> Legg til eiga øving</button>
      </section>
      <section className="engine-section">
        <h4>Resultat frå økta</h4>
        <div className="engine-fields three">
          <label>Rundar<input type="number" min="0" value={scoreRounds} onChange={e => setScoreRounds(e.target.value)} placeholder="–"/></label>
          <label>Ekstra reps<input type="number" min="0" value={scoreReps} onChange={e => setScoreReps(e.target.value)} placeholder="–"/></label>
          <label>Tid / sluttid<input value={scoreTime} onChange={e => setScoreTime(e.target.value)} placeholder="t.d. 12:45"/></label>
        </div>
        <label className="engine-note">Notat<textarea value={note} onChange={e => setNote(e.target.value)} rows="3" placeholder="Belastning, dagsform eller kommentar …"/></label>
      </section>
      <button className="primary-button save-workout" disabled={saving} type="submit"><Save size={16}/> {saving ? 'Lagrar økta …' : 'Lagre treningsøkt'}</button>
    </form> : <>
      <div className="training-heading"><div><div className="section-kicker">TRENING · MOTOR</div><h3>Vel øktform</h3></div><span className="count-pill">STURMKOPF</span></div>
      <div className="engine-entry-grid">
        <button onClick={() => startWorkout()}><Dumbbell size={20}/><strong>Fri trening</strong><small>Bygg økta frå botnen</small></button>
        <button onClick={() => setMode('wods')}><Activity size={20}/><strong>Start ein WOD</strong><small>Vel ei publisert økt</small></button>
      </div>
      {mode === 'wods' && <section className="engine-section"><div className="engine-section-title"><h4>Publiserte WOD-ar</h4><button className="text-button" onClick={() => setMode('home')}>Lukk</button></div>
        <button type="button" className={wodFavoritesOnly?'secondary-button favorite-filter active':'secondary-button favorite-filter'} onClick={()=>setWodFavoritesOnly(v=>!v)}><Heart size={14} fill={wodFavoritesOnly?'currentColor':'none'}/>{wodFavoritesOnly?'Vis alle publiserte WOD-ar':'Mine favoritt-WOD-ar'}</button>
        {wods.filter(wod=>!wodFavoritesOnly||favoriteWodIds.includes(wod.id)).length ? <div className="wod-list">{wods.filter(wod=>!wodFavoritesOnly||favoriteWodIds.includes(wod.id)).map(wod => <article className="wod-card" key={wod.id}><div className="wod-top"><span>{wod.format}</span><span>{wod.duration_minutes ? wod.duration_minutes + ' MIN' : ''}</span></div><h4>{wod.name}</h4>{wod.movements && <p className="wod-movements">{wod.movements}</p>}{wod.notes && <p className="wod-note">{wod.notes}</p>}<div className="wod-card-actions"><button type="button" className="secondary-button" onClick={() => startWorkout(wod)}>Start WOD</button><button type="button" className={favoriteWodIds.includes(wod.id)?'favorite-star selected':'favorite-star'} onClick={()=>toggleWodFavorite(wod)} aria-label={favoriteWodIds.includes(wod.id)?'Fjern WOD-favoritt':'Merk WOD som favoritt'}><Heart size={17} fill={favoriteWodIds.includes(wod.id)?'currentColor':'none'}/></button></div></article>)}</div> : <div className="empty-state">{wodFavoritesOnly?'Du har ikkje merkt nokon WOD-ar som favoritt.':'Ingen publiserte WOD-ar enno.'}</div>}
       </section>}}
      <section className="engine-section">
        <div className="training-heading"><div><div className="section-kicker">HISTORIKK</div><h3>Siste økter</h3></div><span className="count-pill">{history.length} økter</span></div>
        {history.length ? <div className="history-list">{history.map(log => <article className="history-card" key={log.id}><div className="history-card-top"><strong>{log.title}</strong><span>{log.workout_date}</span></div><small>{log.format} · {log.workout_exercises?.length || 0} øvingar</small>{log.workout_exercises?.sort((a,b)=>a.sort_order-b.sort_order).map(ex => <div className="history-exercise" key={ex.id}><b>{ex.exercise_name}</b><span>{(ex.workout_sets || []).map(s => [s.reps ? s.reps+' reps' : '', s.load_kg ? s.load_kg+' kg' : '', s.time_text || ''].filter(Boolean).join(' · ')).filter(Boolean).join(' / ') || 'Ingen sett registrert'}</span></div>)}{log.note && <p>{log.note}</p>}</article>)}</div> : <div className="empty-state">Du har ikkje lagra økter enno.</div>}
      </section>
      <section className="engine-section">
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
      <section className="engine-section">
        <div className="training-heading"><div><div className="section-kicker">BIBLIOTEK</div><h3>Øvingsbibliotek</h3></div><span className="count-pill">{exercises.length} øvingar</span></div>
        {exercises.length ? <><div className="exercise-library-toolbar"><label className="exercise-library-search"><Search size={15}/><input value={libraryQuery} onChange={e => setLibraryQuery(e.target.value)} placeholder="Søk etter øving eller kategori …"/></label><button type="button" className={favoritesOnly ? 'secondary-button favorite-filter active' : 'secondary-button favorite-filter'} onClick={() => setFavoritesOnly(v => !v)}><Star size={14}/>{favoritesOnly ? 'Vis alle øvingar' : 'Favorittar'}</button></div>{(()=>{const q=libraryQuery.trim().toLowerCase();const filtered=exercises.filter(ex=>(!favoritesOnly||favoriteNames.includes(ex.name))&&(!q||[ex.name,ex.category,ex.equipment].some(v=>(v||'').toLowerCase().includes(q))));const categories=[...new Set(filtered.map(ex=>ex.category||'Anna'))].sort((a,b)=>a.localeCompare(b,'nn'));return <div className="exercise-library-groups">{categories.length?categories.map((category,index)=>{const group=filtered.filter(ex=>(ex.category||'Anna')===category);return <details className="exercise-library-group" key={category} open={!!q||index===0}><summary><strong>{category}</strong><span>{group.length} øvingar</span></summary><div className="exercise-list">{group.map(ex=><div className="exercise-row" key={ex.id}><Dumbbell size={16}/><div><strong>{ex.name}</strong><span>{[ex.category,ex.equipment].filter(Boolean).join(' · ')}</span></div><button type="button" className={favoriteNames.includes(ex.name)?'favorite-star selected':'favorite-star'} onClick={()=>toggleFavorite(ex)} aria-label={favoriteNames.includes(ex.name)?'Fjern favoritt':'Legg til favoritt'}><Star size={17} fill={favoriteNames.includes(ex.name)?'currentColor':'none'}/></button></div>)}</div></details>}) : <div className="empty-state">{favoritesOnly?'Du har ikkje merkt nokon øvingar som favoritt.':'Ingen øvingar passar søket.'}</div>}</div>})()}</> : <div className="empty-state">Øvingsbiblioteket er tomt. Øvingar kan leggjast inn av admin/manager.</div>}
      </section>
    </>}
  </div>
}
