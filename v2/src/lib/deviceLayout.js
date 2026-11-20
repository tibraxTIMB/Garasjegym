import { useEffect, useState } from 'react'

export function readDeviceProfile() {
  if (typeof window === 'undefined') {
    return { width: 1024, height: 768, orientation: 'landscape', device: 'tablet', touch: false, layout: 'tablet-landscape' }
  }
  // Use the layout viewport: the on-screen keyboard can shrink visualViewport and must not change device class or orientation.
  const width = Math.max(1, Math.round(window.innerWidth || document.documentElement.clientWidth))
  const height = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight))
  const shortSide = Math.min(width, height)
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches || false
  const touch = coarsePointer || (navigator.maxTouchPoints || 0) > 0
  const screenOrientation = window.screen?.orientation?.type
  const orientation = screenOrientation
    ? (screenOrientation.startsWith('landscape') ? 'landscape' : 'portrait')
    : (window.matchMedia?.('(orientation: landscape)').matches ? 'landscape' : 'portrait')
  const device = shortSide < 600 || width < 600
    ? 'mobile'
    : (touch || width < 1100)
      ? 'tablet'
      : 'desktop'
  return { width, height, orientation, device, touch, layout: `${device}-${orientation}` }
}

export function useDeviceProfile() {
  const [profile, setProfile] = useState(readDeviceProfile)

  useEffect(() => {
    let frame = 0
    const update = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        const next = readDeviceProfile()
        const root = document.documentElement
        root.dataset.ggDevice = next.device
        root.dataset.ggOrientation = next.orientation
        root.dataset.ggTouch = next.touch ? 'true' : 'false'
        root.dataset.ggLayout = next.layout
        root.style.setProperty('--gg-vh', `${next.height * 0.01}px`)
        setProfile(current =>
          current.width === next.width &&
          current.height === next.height &&
          current.orientation === next.orientation &&
          current.device === next.device &&
          current.touch === next.touch
            ? current
            : next
        )
      })
    }

    update()
    window.addEventListener('resize', update, { passive: true })
    window.addEventListener('orientationchange', update, { passive: true })
    const orientation = window.screen?.orientation
    orientation?.addEventListener?.('change', update)
    const coarse = window.matchMedia?.('(pointer: coarse)')
    coarse?.addEventListener?.('change', update)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      orientation?.removeEventListener?.('change', update)
      coarse?.removeEventListener?.('change', update)
    }
  }, [])

  return profile
}
