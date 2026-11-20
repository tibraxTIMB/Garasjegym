import { useEffect, useState } from 'react'
import { Activity, HeartPulse } from 'lucide-react'
import { getHeartRateSnapshot, subscribeHeartRate } from '../lib/heartRate.js'

export default function HeartRateTrainingPanel({ enabled = false }) {
  const [sensor, setSensor] = useState(getHeartRateSnapshot())
  useEffect(() => subscribeHeartRate(setSensor), [])
  if (!enabled || sensor.status !== 'connected') return null
  const stale = !sensor.receivedAt || Date.now() - sensor.receivedAt > 10000
  return <section className="engine-section hr-training-panel" aria-live="polite">
    <div className="engine-section-title"><h4><HeartPulse size={17}/> Puls</h4><span><Activity size={13}/> {stale ? 'Vent på signal' : 'Live'}</span></div>
    <div className="hr-training-reading"><strong>{stale ? '–' : sensor.bpm ?? '–'}</strong><span>BPM</span></div>
    <div className="hr-training-foot"><span>{sensor.deviceName || 'Bluetooth-pulsbelte'}</span><span>{stale ? 'Ingen nye målingar' : 'Oppdaterer automatisk'}</span></div>
  </section>
}
