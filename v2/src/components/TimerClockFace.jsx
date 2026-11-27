import React from 'react'
// Shared display only: the existing Timer or Synchron projection owns time.
export default function TimerClockFace({value}){
 const seconds=Math.max(0,Math.floor(Number(value)||0))
 return <strong className="timer-main-clock" style={{fontVariantNumeric:'tabular-nums'}}>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong>
}
