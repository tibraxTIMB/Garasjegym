import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, Dumbbell, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

export default function Training() {
  const [wods, setWods] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState('')
  const [scoreRounds, setScoreRounds] = useState('')
  const [scoreReps, setScoreReps] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const [wodResult, exerciseResult] = await Promise.all([
        supabase.from('wods').select('id,name,format,duration_minutes,movements,notes,audience,is_published,created_at').eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('exercises').select('id,name,category,equipment,description,video_url').eq('is_active', true).order('name'),
      ])
      if (cancelled) return
      if (wodResult.error) setError(wodResult.error.message)
      else setWods(wodResult.data || [])
      if (exerciseResult.error && !wodResult.error) setError('Øvingsbibliotek: ' + exerciseResult.error.message)
      else setExercises(exerciseResult.data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function saveResult(event) {
    event.preventDefault()
    if (!selected || !supabase) return
    setSaving(true)
    setError('')
    setDone('')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError('Innlogginga er utgått. Logg inn på nytt.')
      setSaving(false)
      return
    }
    const { error: insertError } = await supabase.from('workout_logs').insert({
      member_id: user.id,
      source_wod_id: selected.id,
      title: selected.name,
      workout_date: new Date().toISOString().slice(0, 10),
      format: selected.format || 'WOD',
      rounds: Math.max(1, Number(scoreRounds) || 1),
      score_rounds: scoreRounds === '' ? null : Number(scoreRounds),
      score_reps: scoreReps === '' ? null : Number(scoreReps),
      note: note.trim(),
    })
    if (insertError) setError(insertError.message)
    else {
      setDone('Resultatet er lagra i treningsloggen.')
      setSelected(null)
      setScoreRounds('')
      setScoreReps('')
      setNote('')
    }
    setSaving(false)
  }

  if (loading) return <div className="training-state"><LoaderCircle className="spin" size={20} /> Hentar treningsdata …</div>

  return (
    <div className="training-module">
      {error && <div className="auth-error" role="alert">{error}</div>}
      {done && <div className="auth-message" role="status"><CheckCircle2 size={16} /> {done}</div>}
      {selected ? (
        <form className="result-form" onSubmit={saveResult}>
          <button type="button" className="text-button" onClick={() => setSelected(null)}>← Tilbake til WOD</button>
          <div className="eyebrow"><Activity size={14} /> REGISTRER RESULTAT</div>
          <h3>{selected.name}</h3>
          <p>{selected.format} {selected.duration_minutes ? '· ' + selected.duration_minutes + ' min' : ''}</p>
          <label>Rundar<input type="number" min="0" step="1" value={scoreRounds} onChange={(e) => setScoreRounds(e.target.value)} placeholder="Til dømes 5" /></label>
          <label>Repetisjonar<input type="number" min="0" step="1" value={scoreReps} onChange={(e) => setScoreReps(e.target.value)} placeholder="Til dømes 12" /></label>
          <label>Notat<textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3" placeholder="Korleis gjekk økta?" /></label>
          <button className="primary-button" disabled={saving} type="submit">{saving ? 'Lagrar …' : 'Lagre resultat'}</button>
        </form>
      ) : (
        <>
          <div className="training-heading"><div><div className="section-kicker">TRENING · WOD</div><h3>Publiserte økter</h3></div><span className="count-pill">{wods.length} WOD</span></div>
          {wods.length === 0 ? <div className="empty-state">Ingen publiserte WOD-ar enno.</div> : (
            <div className="wod-list">
              {wods.map((wod) => (
                <article className="wod-card" key={wod.id}>
                  <div className="wod-top"><span>{wod.format || 'WOD'}</span>{wod.duration_minutes ? <span>{wod.duration_minutes} MIN</span> : null}</div>
                  <h4>{wod.name}</h4>
                  {wod.movements && <p className="wod-movements">{wod.movements}</p>}
                  {wod.notes && <p className="wod-note">{wod.notes}</p>}
                  <button className="secondary-button" onClick={() => setSelected(wod)}>Registrer resultat</button>
                </article>
              ))}
            </div>
          )}
          <div className="training-heading exercise-heading"><div><div className="section-kicker">BIBLIOTEK</div><h3>Øvingar</h3></div><span className="count-pill">{exercises.length} øvingar</span></div>
          {exercises.length === 0 ? <div className="empty-state">Øvingsbiblioteket er tomt. Øvingar kan leggjast inn av admin/manager.</div> : (
            <div className="exercise-list">
              {exercises.map((exercise) => <div className="exercise-row" key={exercise.id}><Dumbbell size={16}/><div><strong>{exercise.name}</strong><span>{[exercise.category, exercise.equipment].filter(Boolean).join(' · ')}</span></div></div>)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
