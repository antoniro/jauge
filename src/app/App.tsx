// The app. One screen: everything happens on the map (docs/design/behaviour.md).
import '@fontsource-variable/big-shoulders'
import '@fontsource-variable/instrument-sans'
import { MotionConfig } from 'motion/react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import './styles/base.css'
import { useJauge } from './state'

// the map library is most of the weight: load it after the page itself is on screen
const MainScreen = lazy(() => import('./MainScreen'))

/** From this width on, the list sits beside the map instead of under it. */
const WIDE = 900

export default function App() {
  const j = useJauge({ keep: 'jauge' })
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const scheme = matchMedia('(prefers-color-scheme: dark)')
    const follow = () => setDark(scheme.matches)
    scheme.addEventListener('change', follow)
    return () => scheme.removeEventListener('change', follow)
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.dataset.accent = 'cone'
  }, [dark])
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const wide = size.w >= WIDE
  return (
    <MotionConfig reducedMotion="user">
      <div ref={box} className="fb-phone">
        <Suspense fallback={null}>
          <MainScreen key={wide ? 'wide' : 'phone'} j={j} dark={dark} accent="cone" h={size.h} wide={wide} />
        </Suspense>
      </div>
    </MotionConfig>
  )
}
