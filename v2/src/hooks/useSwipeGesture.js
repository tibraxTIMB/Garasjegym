import { useCallback, useRef } from 'react'
import { classifySwipe } from '../lib/gesture.js'

const INTERACTIVE = 'input, textarea, select, button, a, [contenteditable="true"], [data-gesture-ignore]'

export function useSwipeGesture({ axis = 'both', threshold = 48, axisRatio = 1.25, onSwipe, canStart } = {}) {
  const start = useRef(null)
  const onSwipeRef = useRef(onSwipe)
  const canStartRef = useRef(canStart)
  onSwipeRef.current = onSwipe
  canStartRef.current = canStart

  const onPointerDown = useCallback(event => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    if (event.target?.closest?.(INTERACTIVE)) return
    if (canStartRef.current && !canStartRef.current(event)) return
    start.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }, [])

  const finish = useCallback(event => {
    const origin = start.current
    if (!origin || origin.id !== event.pointerId) return
    start.current = null
    const direction = classifySwipe(event.clientX - origin.x, event.clientY - origin.y, { axis, threshold, axisRatio })
    if (direction) onSwipeRef.current?.(direction, { deltaX: event.clientX - origin.x, deltaY: event.clientY - origin.y, event })
  }, [axis, threshold, axisRatio])

  const onPointerCancel = useCallback(() => { start.current = null }, [])
  return { onPointerDown, onPointerUp: finish, onPointerCancel, onLostPointerCapture: onPointerCancel }
}
