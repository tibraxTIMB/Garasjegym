import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clock3, Dumbbell, LoaderCircle, Pause, Play, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const FORMATS = ['Fri trening', 'EMOM', 'AMRAP', 'For Time', 'Tabata', 'Intervall', 'Stoppeklokke', 'Nedteljing', 'Tilpassa']
const emptyExercise = () => ({ key: crypto.randomUUID(), exercise_id: '', exercise_name: '', sets: [{ reps: '', load_kg: '', time_text: '', time_seconds: '' }] })
const pad = (n) => String(n).padStart(2, '0')
const clock = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`

function Timer({ format, minutes }) {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(1)
  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => setSeconds(s => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])
  useEffect(() => { setSeconds(0); setRunning(false); setRound(1) }, [format, minutes])
  const target = Math.max(1, Number(minutes) || 10) * 60
  const display = format === 'Nedteljing' ? Math.max(0, target - seconds) : seconds
  useEffect(() => { if (format === 'Nedteljing' && seconds >= target) setRunning(false) }, [seconds, target, format])
  return <div className="engine-timer">
    <div className="timer-caption"><Clock3 size={15}/> {format === 'Fri trening' ? 'STOPPEKLOKKE' : format.toUpperCase()}</div>
    <strong>{clock(display)}</strong>
    <div className="timer-actions">
      <button type="button" className="secondary-button" onClick={() => setRunning(v => !v)}>{running ? <><Pause size={14}/> Pause</> : <><Play size={14}/> Start</>}</button>
      <button type="button" className="secondary-button" onClick={() => { setRunning(false); setSeconds(0); setRound(1) }}><RotateCcw size={14}/> Nullstill</button>
      {format === 'EMOM' && <button type="button" className="secondary-button" onClick={() => setRound(r => r + 1)}>Runde {round} +</button>}
    </div>
    {format === 'Nedteljing' && <small>{seconds >= target ? 'Tida er ute' : `Mål: ${clock(target)}`}</small>}
  </div>
}

export default function Training() {
  const [wods, setWods] = useState([])
  const [exercises, setExercises] = useState([])
  const [history, setHistory] = useState([])
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
    const [w, e, h] = await Promise.all([
      supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,audience,is_published,created_at').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('exercises').select('id,name,category,equipment,description,video_url').eq('is_active', true).order('name'),
      supabase.from('workout_logs').select('id,title,workout_date,format,rounds,score_rounds,score_reps,note,created_at,workout_exercises(id,exercise_name,sort_order,workout_sets(id,set_number,reps,load_kg,time_text,time_seconds))').order('workout_date', { ascending: false }).limit(30),
    ])
    if (w.error) setError(w.error.message); else setWods(w.data || [])
    if (e.error && !w.error) setError('Øvingsbibliotek: ' + e.error.message); else setExercises(e.data || [])
    if (h.error && !w.error && !e.error) setError('Treningslogg: ' + h.error.message); else setHistory(h.data || [])
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
    if (!items.length) { setError('Legg til minst éi øving før du lagrar.'); return }
    setSaving(true); setError(''); setNotice('')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) { setError('Innlogginga er utgått. Logg inn på nytt.'); setSaving(false); return }
    const { data: log, error: logError } = await supabase.from('workout_logs').insert({
      member_id: user.id, source_wod_id: source?.id || null, title: title.trim(),
      workout_date: new Date().toLocaleDateString('en-CA'), format,
      rounds: Math.max(1, Number(scoreRounds) || 1),
      score_rounds: scoreRounds === '' ? null : Number(scoreRounds),
      score_reps: scoreReps === '' ? null : Number(scoreReps),
      note: [note.trim(), scoreTime ? 'Tid: ' + scoreTime : ''].filter(Boolean).join('\n'),
    }).select('id').single()
    if (logError) { setError(logError.message); setSaving(false); return }

    let failed = null
    for (let i = 0; i < items.length && !failed; i++) {
      const item = items[i]
      const { data: row, error: exError } = await supabase.from('workout_exercises').insert({
        workout_log_id: log.id, exercise_id: item.exercise_id || null,
        exercise_name: item.exercise_name.trim(), sort_order: i,
      }).select('id').single()
      if (exError) { failed = exError; break }
      const sets = item.sets.map((s, index) => ({
        workout_exercise_id: row.id, set_number: index + 1,
        reps: s.reps === '' ? null : Number(s.reps),
        load_kg: s.load_kg === '' ? null : Number(s.load_kg),
        time_text: s.time_text.trim() || null,
        time_seconds: s.time_seconds === '' ? null : Number(s.time_seconds),
      })).filter(s => s.reps !== null || s.load_kg !== null || s.time_text !== null || s.time_seconds !== null)
      if (sets.length) {
        const { error: setError } = await supabase.from('workout_sets').insert(sets)
        if (setError) failed = setError
      }
    }
    if (failed) {
      // Best-effort cleanup so a failed multi-step save does not leave a partial workout.
      await supabase.from('workout_logs').delete().eq('id', log.id).eq('member_id', user.id)
      setError('Økta vart ikkje lagra fullstendig. Systemet prøvde å rydde opp att. Detalj: ' + failed.message)
    } else {
      setNotice('Økta og øvingane er lagra i treningsloggen.')
      setMode('home')
      await loadAll()
    }
    setSaving(false)
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
      <Timer format={format} minutes={duration}/>
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
        <div className="training-heading"><div><div className="section-kicker">BIBLIOTEK</div><h3>Øvingsbibliotek</h3></div><span className="count-pill">{exercises.length} øvingar</span></div>
        {exercises.length ? <div className="exercise-list">{exercises.map(ex => <div className="exercise-row" key={ex.id}><Dumbbell size={16}/><div><strong>{ex.name}</strong><span>{[ex.category,ex.equipment].filter(Boolean).join(' · ')}</span></div></div>)}</div> : <div className="empty-state">Øvingsbiblioteket er tomt. Øvingar kan leggjast inn av admin/manager.</div>}
      </section>
    </>}
  </div>
}
