import { useEffect, useState } from 'react'
import { Activity, HeartPulse } from 'lucide-react'
import { getHeartRateSnapshot, subscribeHeartRate } from '../lib/heartRate.js'
import { supabase } from '../lib/supabase.js'
import './heart-rate.css'

export default function HeartRateTrainingPanel() {
  const [sensor, setSensor] = useState(getHeartRateSnapshot())
  const [optedIn, setOptedIn] = useState(false)
  const [, setClockNow] = useState(Date.now())
  useEffect(() => subscribeHeartRate(setSensor), [])
  useEffect(() => {
    if (sensor.status !== 'connected') return undefined
    const interval = setInterval(() => setClockNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [sensor.status])
  useEffect(() => {
    let live = true
    if (!supabase) return () => { live = false }
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data?.user) return
      const { data: preferences, error: preferenceError } = await supabase.from('member_preferences').select('hr_enabled').eq('user_id', data.user.id).maybeSingle()
      if (live && !preferenceError) setOptedIn(Boolean(preferences?.hr_enabled))
    }).catch(() => {})
    return () => { live = false }
  }, [])
  if (!optedIn || sensor.status !== 'connected') return null
  const stale = !sensor.receivedAt || Date.now() - sensor.receivedAt > 10000
  return <section className="engine-section hr-training-panel" aria-live="polite">
    <div className="engine-section-title"><h4><HeartPulse size={17}/> Puls</h4><span><Activity size={13}/> {stale ? 'Vent på signal' : 'Live'}</span></div>
    <div className="hr-training-reading"><strong>{stale ? '–' : sensor.bpm ?? '–'}</strong><span>BPM</span></div>
    <div className="hr-training-foot"><span>{sensor.deviceName || 'Bluetooth-pulskjelde'}</span><span>{stale ? 'Ingen nye målingar' : 'Oppdaterer automatisk'}</span></div>
  </section>
}
