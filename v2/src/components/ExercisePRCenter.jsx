import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Dumbbell, Plus, Search, Trash2, Trophy, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { deriveBenchmarkRecords, deriveExerciseRecords } from '../lib/prMetrics.js'
import { STANDARD_PR_LIFTS, buildPRDirectory, bestLoad, defaultPRUnit, isValidManualPR, primaryPR } from '../lib/prDirectory.js'
import GarageSelect from './GarageSelect.jsx'
import './exercise-pr-center.css'

const dateLabel = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('nn-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ukjend dato'
const timeLabel = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.round(seconds % 60)).padStart(2, '0')}`
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` }
const RECORD_CATEGORIES = [{ key: 'load', label: 'Løft og vekt', hint: 'Stong, manualar og kettlebell' }, { key: 'reps', label: 'Repetisjonar', hint: 'Kroppsvekt og repetisjonar' }, { key: 'hold', label: 'Statiske hald', hint: 'Tid i ein posisjon' }, { key: 'height', label: 'Boks og høgd', hint: 'Hopp og høgder' }, { key: 'endurance', label: 'Kondisjon', hint: 'Tid, distanse og kaloriar' }]

export default function ExercisePRCenter({ history = [], legacyRecords = [], onOpenWorkout, onRecordAdded, onRecordDeleted }) {
  const derived = useMemo(() => deriveExerciseRecords(history), [history])
  const benchmarks = useMemo(() => deriveBenchmarkRecords(history), [history])
  const [catalogue, setCatalogue] = useState([])
  const [catalogueError, setCatalogueError] = useState('')
  const [category, setCategory] = useState('exercise')
  const [recordCategory, setRecordCategory] = useState(null)
  const [manualCategory, setManualCategory] = useState('load')
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ exerciseName: 'Bench press', value: '', unit: 'kg', date: today(), side: '', note: '' })
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const detailRef = useRef(null)

  useEffect(() => {
    let live = true
    supabase.from('exercises').select('id,name,category').eq('is_active', true).order('name').then(({ data, error }) => {
      if (!live) return
      if (error) setCatalogueError('Øvingsbiblioteket kunne ikkje lastast. Du kan framleis registrera PR på kjende øvingar.')
      else setCatalogue(data || [])
    })
    return () => { live = false }
  }, [])

  const directory = useMemo(() => buildPRDirectory(catalogue, derived, legacyRecords), [catalogue, derived, legacyRecords])
  const standards = STANDARD_PR_LIFTS.map(pin => ({ ...pin, entry: directory.find(item => item.key === pin.name.toLocaleLowerCase('nn-NO')) }))
  const selected = directory.find(item => item.key === selectedKey)
  const query = search.trim().toLocaleLowerCase('nn-NO')
  const visibleExercises = directory.filter(item => (query ? item.name.toLocaleLowerCase('nn-NO').includes(query) : recordCategory==='mine' ? item.sessions>0||item.saved.length>0 : recordCategory==='all' ? true : recordCategory===item.type))
  const visibleSlice = visibleExercises.slice(0,showAll ? visibleExercises.length : query ? 16 : 10)
  const hasExerciseSelection = Boolean(query||recordCategory)

  const openSource = id => { const log = history.find(row => row.id === id); if (log) onOpenWorkout?.(log) }
  function chooseExercise(key) {
    setSelectedKey(key)
    setNotice('')
    window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }
  function startManual(exercise) {
    const entry = exercise || directory.find(item => item.name === form.exerciseName) || directory[0]
    setManualCategory(entry?.type||'load')
    setForm({ exerciseName: entry?.name || 'Bench press', value: '', unit: defaultPRUnit(entry?.type || 'load'), date: today(), side: '', note: '' })
    setSaveError('')
    setEditing(true)
  }
  async function saveManual(event) {
    event.preventDefault()
    const exerciseName = form.exerciseName.trim() + (form.side ? ` · ${form.side}` : '')
    if (!isValidManualPR({ exerciseName, result: form.value, unit: form.unit })) { setSaveError('Vel ei øving og registrer eit positivt resultat med gyldig måleeining.'); return }
    setBusy(true); setSaveError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Logg inn på nytt.')
      const { data, error } = await supabase.from('personal_records').insert({ member_id: user.id, exercise_name: exerciseName, result: String(Number(String(form.value).replace(',', '.'))), unit: form.unit, record_date: form.date, note: form.note.trim() || null, workout_log_id: null }).select('id,exercise_name,result,unit,record_date,note,workout_log_id').single()
      if (error) throw error
      onRecordAdded?.(data)
      setSelectedKey(directory.find(item => item.name === form.exerciseName)?.key || null)
      setNotice('PR-en er registrert på profilen din.')
      setEditing(false)
    } catch (error) { setSaveError(error.message || 'Kunne ikkje lagra PR-en.') }
    finally { setBusy(false) }
  }
  async function deleteSaved(record) {
    if (deletingId || !window.confirm(`Sletta PR-noteringa «${record.exercise_name}: ${record.result} ${record.unit}»? Dette slettar ikkje sjølve treningsøkta.`)) return
    setDeletingId(record.id); setNotice(''); setSaveError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Logg inn på nytt.')
      const { data, error } = await supabase.from('personal_records').delete().eq('id', record.id).eq('member_id', user.id).select('id')
      if (error) throw error
      if (!data?.length) throw new Error('PR-en vart ikkje funnen eller kunne ikkje slettast.')
      onRecordDeleted?.(record.id)
      setNotice('PR-noteringa er sletta. Resultat frå treningsloggen blir framleis rekna automatisk.')
    } catch (error) { setSaveError(error.message || 'Kunne ikkje sletta PR-en.') }
    finally { setDeletingId(null) }
  }

  return <section className="exercise-pr-center">
    <header className="exercise-pr-intro"><span className="section-kicker">PERSONLEGE REKORDAR</span><div className="exercise-pr-title-row"><h3><Trophy size={23} /> PR-senter</h3><button type="button" className="primary-button exercise-pr-add" onClick={() => startManual(selected)}><Plus size={17} /> Registrer PR</button></div><p>Vel ei øving for rekordar og historikk. «Registrer PR» lagrar éin rekord, ikkje ei heil treningsøkt. Bruk «Etterregistrer» i ØKT for ei gjennomført økt.</p></header>
    {notice && <div className="auth-message" role="status"><CheckCircle2 size={16} /> {notice}</div>}
    {saveError && !editing && <div className="auth-error" role="alert">{saveError}</div>}
    <div className="exercise-pr-tabs" role="group" aria-label="Vel rekordtype"><button type="button" className={category === 'exercise' ? 'active' : ''} onClick={() => setCategory('exercise')}><Dumbbell size={17} /> Øvingar</button><button type="button" className={category === 'benchmark' ? 'active' : ''} onClick={() => setCategory('benchmark')}><Trophy size={17} /> Benchmark-WOD <span>{benchmarks.length}</span></button></div>

    {category === 'exercise' && <>
      {!selected&&<details className="exercise-pr-quick-lifts"><summary>Dei 7 klassiske styrkeløfta <span>mellom anna markløft</span></summary><div className="exercise-pr-featured">{standards.map(({ name, label, entry }) => { const value = bestLoad(entry); return <button type="button" className={selectedKey === entry?.key ? 'selected' : ''} key={name} onClick={() => chooseExercise(entry?.key)}><span>{label}</span><strong>{value ? `${value.toLocaleString('nn-NO')} kg` : '–'}</strong></button> })}</div></details>}

      {selected ? <div className="exercise-pr-detail" id="pr-ovingsdetaljar" ref={detailRef}>
        <div className="exercise-pr-detail-head"><button type="button" className="secondary-button" onClick={() => setSelectedKey(null)}><ArrowLeft size={16} /> Tilbake til kategoriar</button><button type="button" className="primary-button" onClick={() => startManual(selected)}><Plus size={16} /> Ny PR</button></div>
        <div className="exercise-pr-summary"><strong>{selected.name}</strong><span>{selected.sessions} registrerte økter</span></div>
        {selected.derived.some(group => group.records.length) ? <div className="exercise-pr-grid">{selected.derived.flatMap(group => group.records.map(item => <article className="exercise-pr-record" key={`${group.key}-${item.key}`}><small>{group.side ? `${group.label} · ` : ''}{item.label}</small><strong>{item.value.toLocaleString('nn-NO')} <span>{item.unit}</span></strong><p>{item.detail || 'Frå treningsloggen'}</p><footer><span>{dateLabel(item.date)}</span>{item.logId && <button type="button" onClick={() => openSource(item.logId)}>Sjå økta <ArrowRight size={14} /></button>}</footer></article>))}</div> : <div className="empty-state">Ingen PR frå treningsloggen enno. Du kan registrera resultatet manuelt.</div>}
        <div className="exercise-pr-manual-list"><h4>Registrerte PR-noteringar <span>{selected.saved.length}</span></h4>{selected.saved.length ? [...selected.saved].sort((a,b) => String(b.record_date).localeCompare(String(a.record_date))).map(record => <article key={record.id}><div><strong>{record.result} {record.unit}</strong><span>{record.exercise_name !== selected.name ? `${record.exercise_name} · ` : ''}{dateLabel(record.record_date)}</span>{record.note && <small>{record.note}</small>}<small>{record.workout_log_id ? 'Registrert frå ei økt' : 'Manuelt registrert'}</small></div><button type="button" className="exercise-pr-delete" disabled={Boolean(deletingId)} aria-label={`Slett PR ${record.exercise_name} ${record.result} ${record.unit}`} onClick={() => deleteSaved(record)}><Trash2 size={17} /> Slett</button></article>) : <p>Ingen tidlegare PR-noteringar på denne øvinga.</p>}</div>
        <p className="exercise-pr-explainer"><Activity size={14} /> Rekordar frå sett blir rekna på nytt frå treningsloggen. Sletting her fjernar ei PR-notering, ikkje økta eller rekna resultat frå henne.</p>
      </div> : <>
        <div className="exercise-pr-category-head"><strong>Vel kva slags rekord du vil sjå</strong><span>{directory.length} øvingar i biblioteket</span></div>
        <div className="exercise-pr-category-grid" role="group" aria-label="Vel PR-kategori">
          <button type="button" className={recordCategory==='mine'?'active':''} onClick={()=>{setRecordCategory('mine');setSearch('');setShowAll(false)}}><Trophy size={20}/><strong>Mine rekordar</strong><small>Øvingane du har registrert</small><span>{directory.filter(item=>item.sessions>0||item.saved.length>0).length}</span></button>
          {RECORD_CATEGORIES.map(option=><button type="button" key={option.key} className={recordCategory===option.key?'active':''} onClick={()=>{setRecordCategory(option.key);setSearch('');setShowAll(false)}}><Dumbbell size={20}/><strong>{option.label}</strong><small>{option.hint}</small><span>{directory.filter(item=>item.type===option.key).length}</span></button>)}
        </div>
        <div className="exercise-pr-filters"><label className="exercise-pr-search"><Search size={16}/><input value={search} onChange={event=>{setSearch(event.target.value);setShowAll(false)}} placeholder="Søk direkte etter ei øving …" aria-label="Søk etter PR-øving"/></label>{hasExerciseSelection&&<button type="button" className="exercise-pr-clear" onClick={()=>{setRecordCategory(null);setSearch('');setShowAll(false)}}>Til kategoriane</button>}</div>
        {hasExerciseSelection&&<div className="exercise-pr-list-head"><strong>{query?`Søkeresultat for «${search.trim()}»`:recordCategory==='mine'?'Mine øvingar':recordCategory==='all'?'Alle øvingar':RECORD_CATEGORIES.find(item=>item.key===recordCategory)?.label}</strong><span>{visibleExercises.length} øvingar</span></div>}
        {catalogueError && <small className="exercise-pr-note">{catalogueError}</small>}
        {hasExerciseSelection&&<div className="exercise-pr-exercise-list">{visibleSlice.map(entry => { const top = primaryPR(entry); return <button type="button" key={entry.key} onClick={() => chooseExercise(entry.key)}><span><strong>{entry.name}</strong><small>{entry.sessions ? `${entry.sessions} økter` : 'Ikkje registrert enno'}</small></span><b>{top ? `${top.value.toLocaleString('nn-NO')} ${top.unit}` : '–'}</b><ArrowRight size={17} /></button> })}</div>}
        {hasExerciseSelection&&!visibleSlice.length && <div className="empty-state">Ingen øvingar passar søket.</div>}
        {hasExerciseSelection && !showAll && visibleExercises.length > visibleSlice.length && <button type="button" className="secondary-button exercise-pr-more" onClick={() => setShowAll(true)}>Vis fleire ({visibleExercises.length-visibleSlice.length} til)</button>}
      </>}
    </>}

    {category === 'benchmark' && (benchmarks.length ? <div className="exercise-pr-benchmarks">{benchmarks.map(wod => <article className="exercise-pr-benchmark" key={wod.key}><div><strong>{wod.name}</strong><small>{wod.format.toUpperCase()} · {wod.level.toUpperCase()} · {wod.count} gjennomføringar</small></div><span>{wod.score.rounds != null ? `${wod.score.rounds} rundar + ${wod.score.reps} reps` : timeLabel(wod.score.value)}</span><footer><small>{dateLabel(wod.date)}</small><button type="button" onClick={() => openSource(wod.logId)}>Opne beste økt <ArrowRight size={14} /></button></footer></article>)}</div> : <div className="empty-state">Ingen benchmark-WOD-ar med samanliknbare resultat enno.</div>)}
    {category === 'benchmark' && <p className="exercise-pr-explainer">Benchmarkar blir samanlikna innan same WOD, format og nivå (RX/Scaled).</p>}

    {editing && <div className="exercise-pr-modal-backdrop" role="presentation" onClick={() => !busy && setEditing(false)}><form className="exercise-pr-modal" role="dialog" aria-modal="true" aria-label="Registrer personleg rekord" onClick={event => event.stopPropagation()} onSubmit={saveManual}><header><div><span className="section-kicker">PERSONLEG REKORD</span><h3>Registrer PR</h3></div><button type="button" aria-label="Lukk" onClick={() => setEditing(false)} disabled={busy}><X size={21} /></button></header><div className="exercise-pr-manual-picker"><span>Vel kategori</span><div className="exercise-pr-manual-categories">{RECORD_CATEGORIES.map(option=><button type="button" key={option.key} className={manualCategory===option.key?'active':''} onClick={()=>{setManualCategory(option.key);const first=directory.find(item=>item.type===option.key);setForm(current=>({...current,exerciseName:first?.name||'',unit:defaultPRUnit(option.key)}))}}>{option.label}</button>)}</div><label>Øving<GarageSelect label="Vel øving for PR" value={form.exerciseName} placeholder="Vel øving …" options={directory.filter(item=>item.type===manualCategory).map(item=>({value:item.name,label:item.name}))} onChange={name=>{const entry=directory.find(item=>item.name===name);setForm(value=>({...value,exerciseName:name,unit:defaultPRUnit(entry?.type)}))}}/></label></div><div className="exercise-pr-manual-fields"><label>Resultat<input type="number" min="0.01" step="any" inputMode="decimal" required value={form.value} onChange={event => setForm(value => ({ ...value, value: event.target.value }))} placeholder="Til dømes 60" /></label><label>Måleeining<select value={form.unit} onChange={event => setForm(value => ({ ...value, unit: event.target.value }))}>{[['kg','kg'],['reps','reps'],['cm','cm'],['sek','sekund'],['meter','meter'],['cal','kaloriar']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><div className="exercise-pr-manual-fields"><label>Dato<input type="date" required max={today()} value={form.date} onChange={event => setForm(value => ({ ...value, date: event.target.value }))} /></label><label>Side (valfritt)<select value={form.side} onChange={event => setForm(value => ({ ...value, side: event.target.value }))}><option value="">Begge / ikkje relevant</option><option value="Høgre">Høgre</option><option value="Venstre">Venstre</option></select></label></div><label>Notat (valfritt)<textarea maxLength={500} rows={2} placeholder="Til dømes 1RM, 5 reps eller teknikk" value={form.note} onChange={event => setForm(value => ({ ...value, note: event.target.value }))} /></label>{saveError && <p className="auth-error" role="alert">{saveError}</p>}<button type="submit" className="primary-button" disabled={busy}>{busy ? 'Lagrar …' : 'Lagra PR'}</button></form></div>}
  </section>
}
