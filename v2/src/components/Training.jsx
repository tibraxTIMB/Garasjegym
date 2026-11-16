import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clock3, Dumbbell, LoaderCircle, Pause, Play, Plus, RotateCcw, Save, Search, Star, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const FORMATS = ['Fri trening', 'EMOM', 'AMRAP', 'For Time', 'Tabata', 'Intervall', 'Death By', 'Stoppeklokke', 'Nedteljing', 'Tilpassa']
const emptyExercise = () => ({ key: crypto.randomUUID(), exercise_id: '', exercise_name: '', sets: [{ reps: '', load_kg: '', time_text: '', time_seconds: '' }] })
const pad = (n) => String(n).padStart(2, '0')
const clock = (seconds) => `${pad(Math.floor(Math.max(0, seconds) / 60))}:${pad(Math.max(0, seconds) % 60)}`

function Timer({ format, minutes, activeExercise = '', timerSettings = null }) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(1)
  const [workSeconds, setWorkSeconds] = useState(timerSettings?.work_seconds ?? (format === 'Tabata' ? 20 : 60))
  const [restSeconds, setRestSeconds] = useState(timerSettings?.rest_seconds ?? (format === 'Tabata' ? 10 : 60))
  const [rounds, setRounds] = useState(timerSettings?.rounds ?? (format === 'Tabata' ? 8 : 5))
  const [focused, setFocused] = useState(false)
  const [phase, setPhase] = useState('Klar')
  const [laps, setLaps] = useState([])
  const [soundOn, setSoundOn] = useState(true)
  const target = Math.max(1, Number(minutes) || 10) * 60
  const isTimedInterval = ['Tabata', 'Intervall'].includes(format)
  const isCountdown = ['AMRAP', 'Nedteljing'].includes(format)
  const isEMOM = format === 'EMOM'
  const isDeathBy = format === 'Death By'
  const cycle = Math.max(1, Number(workSeconds)) + Math.max(0, Number(restSeconds))
  const roundLength = isTimedInterval ? cycle : 60
  const currentRound = isTimedInterval || isDeathBy ? Math.floor(elapsed / roundLength) + 1 : Math.floor(elapsed / 60) + 1
  const phaseElapsed = isTimedInterval ? elapsed % cycle : elapsed % 60
  const currentPhase = isTimedInterval ? (phaseElapsed < Number(workSeconds) ? 'ARBEID' : 'KVILE') : (isEMOM ? 'NYTT MINUTT' : isDeathBy ? 'NY RUNDE' : 'PÅGÅR')
  const intervalRemaining = isTimedInterval
    ? Math.max(0, (phaseElapsed < Number(workSeconds) ? Number(workSeconds) : cycle) - phaseElapsed)
    : Math.max(0, 60 - phaseElapsed)
  const display = isCountdown ? Math.max(0, target - elapsed)
    : isEMOM || isTimedInterval || isDeathBy ? intervalRemaining : elapsed

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
    setWorkSeconds(timerSettings?.work_seconds ?? (format === 'Tabata' ? 20 : 60))
    setRestSeconds(timerSettings?.rest_seconds ?? (format === 'Tabata' ? 10 : 60))
    setRounds(timerSettings?.rounds ?? (format === 'Tabata' ? 8 : 5))
  }, [format, minutes, timerSettings?.work_seconds, timerSettings?.rest_seconds, timerSettings?.rounds])

  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => setElapsed(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!running) return
    if (isCountdown && elapsed >= target) { setRunning(false); setPhase('FERDIG'); cue(520, 0.5); return }
    if (isTimedInterval && elapsed >= cycle * Math.max(1, Number(rounds))) { setRunning(false); setPhase('FERDIG'); cue(520, 0.5); return }
    if (isEMOM && elapsed >= target) { setRunning(false); setPhase('FERDIG'); cue(520, 0.5); return }
    if ((isTimedInterval && elapsed % cycle === 0) || (isTimedInterval && elapsed % cycle === Number(workSeconds)) || ((isEMOM || isDeathBy) && elapsed % 60 === 0)) cue(elapsed % 60 === 0 ? 1040 : 660, 0.12)
  }, [elapsed, running, target, isCountdown, isTimedInterval, cycle, rounds, isEMOM, isDeathBy, workSeconds])

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

  const roundsShown = isTimedInterval ? Math.min(currentRound, Number(rounds)) : currentRound
  return <div className={focused ? 'engine-timer timer-focused' : 'engine-timer'}>
    <div className="timer-caption"><Clock3 size={15}/> {format.toUpperCase()}</div>
    <div className="timer-phase">{phase}</div>
    <strong>{clock(display)}</strong>
    {activeExercise && <div className="timer-round-label">NO: {activeExercise}</div>}
    {(isEMOM || isTimedInterval || isDeathBy) && <div className="timer-round-label">RUNDE {roundsShown}{isTimedInterval ? ` / ${rounds}` : ''}</div>}
    {isTimedInterval && !running && elapsed === 0 && <div className="timer-settings-inline">
      <label>Arbeid sek.<input type="number" min="1" max="600" value={workSeconds} onChange={e => setWorkSeconds(Math.max(1, Number(e.target.value) || 1))}/></label>
      <label>Kvile sek.<input type="number" min="0" max="600" value={restSeconds} onChange={e => setRestSeconds(Math.max(0, Number(e.target.value) || 0))}/></label>
      <label>Rundar<input type="number" min="1" max="100" value={rounds} onChange={e => setRounds(Math.max(1, Number(e.target.value) || 1))}/></label>
    </div>}
    {format === 'AMRAP' && <div className="timer-round-label">RUNDAR FULLFØRT: {round}</div>}
    <div className="timer-actions">
      <button type="button" className="secondary-button" onClick={() => { if (!running && phase === 'FERDIG') return; if (!running) setPhase('PÅGÅR'); setRunning(v => !v) }} disabled={phase === 'FERDIG'}>{running ? <><Pause size={14}/> Pause</> : <><Play size={14}/> Start</>}</button>
      <button type="button" className="secondary-button" onClick={() => { setRunning(false); setElapsed(0); setRound(1); setLaps([]); setPhase('Klar') }}><RotateCcw size={14}/> Nullstill</button>
      {format === 'AMRAP' && <button type="button" className="secondary-button" onClick={() => setRound(r => r + 1)}>+ Runde</button>}
      {['Stoppeklokke','For Time','Tilpassa'].includes(format) && <button type="button" className="secondary-button" onClick={() => setLaps(v => [...v, elapsed])}>Mellomtid</button>}
      <button type="button" className="secondary-button" onClick={() => setSoundOn(v => !v)}>{soundOn ? 'Lyd på' : 'Lyd av'}</button>
      <button type="button" className="secondary-button" onClick={toggleFocus}>{focused ? 'Avslutt stor klokke' : 'Stor klokke'}</button>
    </div>
    {laps.length > 0 && <div className="timer-round-label">MELLOMTIDER: {laps.map((lap, i) => `${i + 1}: ${clock(lap)}`).join(' · ')}</div>}
    <small>{isTimedInterval ? 'Arbeid / kvile-intervall' : isCountdown ? 'Nedtelling' : isEMOM ? 'Eitt minutt per runde' : isDeathBy ? 'Aukande arbeid for kvar minutt' : format === 'For Time' ? 'Stoppeklokke – registrer sluttid når du er ferdig' : 'Stoppeklokke'}</small>
  </div>
}

export default function Training() {
  const [wods, setWods] = useState([])
  const [exercises, setExercises] = useState([])
  const [favoriteNames, setFavoriteNames] = useState([])
  const [favoritesOnly, setFavoritesOnly] = useState(false)
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
  const [title, setTitle] = useState('')
  const [format, setFormat] = useState('Fri trening')
  const [duration, setDuration] = useState('10')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [scoreRounds, setScoreRounds] = useState('')
  const [scoreReps, setScoreReps] = useState('')
  const [scoreTime, setScoreTime] = useState('')

  async function loadAll() {
    setLoading(true); setError('')
    const [w, e, h, pr] = await Promise.all([
      supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,audience,is_published,created_at').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('exercises').select('id,name,category,equipment,description,video_url').eq('is_active', true).order('name'),
      supabase.from('workout_logs').select('id,title,workout_date,format,rounds,score_rounds,score_reps,note,created_at,workout_exercises(id,exercise_name,sort_order,workout_sets(id,set_number,reps,load_kg,time_text,time_seconds))').order('workout_date', { ascending: false }).limit(30),
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
  useEffect(() => { loadAll() }, [])

  const filteredExercises = useMemo(() => exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || (e.category || '').toLowerCase().includes(query.toLowerCase())), [exercises, query])

  function startWorkout(wod = null) {
    setSource(wod)
    setTitle(wod?.name || '')
    setFormat(wod?.format || 'Fri trening')
    setDuration(String(wod?.duration_minutes || 10))
    setNote(wod?.notes || '')
    setItems([])
    setScoreRounds(''); setScoreReps(''); setScoreTime('')
    if (wod?.movements) {
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
      const payload = {
        title: title.trim(),
        source_wod_id: source?.id || null,
        workout_date: new Date().toLocaleDateString('en-CA'),
        format,
        rounds: Math.max(1, Number(scoreRounds) || 1),
        score_rounds: scoreRounds === '' ? null : Number(scoreRounds),
        score_reps: scoreReps === '' ? null : Number(scoreReps),
        note: [note.trim(), scoreTime ? 'Tid: ' + scoreTime : ''].filter(Boolean).join('\\n'),
        exercises: items.map(item => ({
          exercise_id: item.exercise_id || null,
          exercise_name: item.exercise_name.trim(),
          sets: item.sets.map(s => ({
            reps: s.reps === '' ? null : Number(s.reps),
            load_kg: s.load_kg === '' ? null : Number(s.load_kg),
            time_text: s.time_text.trim() || null,
            time_seconds: s.time_seconds === '' ? null : Number(s.time_seconds),
          })),
        })),
      }
      const { data, error: saveError } = await supabase.rpc('save_workout_atomic', { p_workout: payload })
      if (saveError) {
        if (saveError.message?.includes('save_workout_atomic')) {
          throw new Error('Den atomiske lagringsfunksjonen er ikkje installert i databasen enno. Økta er ikkje lagra. Sjå migreringa i v2/supabase/migrations.')
        }
        throw saveError
      }
      setNotice('Økta og alle setta er lagra samla i treningsloggen.')
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
      <button type="button" className="text-button" onClick={() => setMode('home')}>← Til treningsoversikta</button>
      <div className="training-heading"><div><div className="section-kicker">TRENING · AKTIV ØKT</div><h3>Bygg økta di</h3></div><span className="count-pill">{items.length} øvingar</span></div>
      <div className="engine-fields">
        <label>Namn på økta<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Til dømes Styrke A" required/></label>
        <label>Treningsformat<select value={format} onChange={e => setFormat(e.target.value)}>{FORMATS.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Varigheit / timer (min)<input type="number" min="1" max="240" value={duration} onChange={e => setDuration(e.target.value)}/></label>
      </div>
      <Timer format={format} minutes={duration} activeExercise={items[0]?.exercise_name || ''} timerSettings={source?.timer_settings || null}/>
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
        {wods.length ? <div className="wod-list">{wods.map(wod => <article className="wod-card" key={wod.id}><div className="wod-top"><span>{wod.format}</span><span>{wod.duration_minutes ? wod.duration_minutes + ' MIN' : ''}</span></div><h4>{wod.name}</h4>{wod.movements && <p className="wod-movements">{wod.movements}</p>}{wod.notes && <p className="wod-note">{wod.notes}</p>}<button type="button" className="secondary-button" onClick={() => startWorkout(wod)}>Start WOD</button></article>)}</div> : <div className="empty-state">Ingen publiserte WOD-ar enno.</div>}
      </section>}
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
        {exercises.length ? <><button type="button" className={favoritesOnly ? 'secondary-button favorite-filter active' : 'secondary-button favorite-filter'} onClick={() => setFavoritesOnly(v => !v)}><Star size={14}/>{favoritesOnly ? 'Vis alle øvingar' : 'Vis berre favorittar'}</button><div className="exercise-list">{exercises.filter(ex => !favoritesOnly || favoriteNames.includes(ex.name)).map(ex => <div className="exercise-row" key={ex.id}><Dumbbell size={16}/><div><strong>{ex.name}</strong><span>{[ex.category,ex.equipment].filter(Boolean).join(' · ')}</span></div><button type="button" className={favoriteNames.includes(ex.name) ? 'favorite-star selected' : 'favorite-star'} onClick={() => toggleFavorite(ex)} aria-label={favoriteNames.includes(ex.name) ? 'Fjern favoritt' : 'Legg til favoritt'}><Star size={17} fill={favoriteNames.includes(ex.name) ? 'currentColor' : 'none'}/></button></div>)}{favoritesOnly && !exercises.some(ex => favoriteNames.includes(ex.name)) && <div className="empty-state">Du har ikkje merkt øvingar som favoritt enno.</div>}</div></> : <div className="empty-state">Øvingsbiblioteket er tomt. Øvingar kan leggjast inn av admin/manager.</div>}
      </section>
    </>}
  </div>
}
