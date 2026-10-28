import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

interface TelescopeViewProps {
  onClose: () => void
}

const MOUNTAIN_IMAGES = [
  `${import.meta.env.BASE_URL}mountains.jpg`,
  '/mountains.jpg',
  './mountains.jpg',
  `${import.meta.env.BASE_URL}telescope_mountains.jpg`,
  '/telescope_mountains.jpg',
]

/**
 * Optical Telescope View: Majestic Alpine Mountains
 * Features:
 * - Crystal-clear, high-definition glaciated alpine mountain peaks
 * - Automatic image resolution & fallback cascade with focusing ring
 * - Smooth interactive telescope panning with optical inertia
 * - Drifting valley clouds and anti-reflective lens coating sheen
 * - Precision brass telescope HUD with compass azimuth, altitude, and reticle crosshairs
 * - Inspirational ambition narrative: "Wanna reach these heights…"
 */
export function TelescopeView({ onClose }: TelescopeViewProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const mountainRef = useRef<HTMLDivElement>(null)
  const cloudCanvasRef = useRef<HTMLCanvasElement>(null)

  const [azimuthDeg, setAzimuthDeg] = useState(318)
  const [altMeters, setAltMeters] = useState(6852)
  const [imgIndex, setImgIndex] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  // Keyboard controls: press Esc or E to step away
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'escape' || k === 'e') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [onClose])

  // Fade-in modal animation
  useEffect(() => {
    if (overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out' }
      )
    }
  }, [])

  // Smooth Interactive Pan and Drifting Clouds Loop
  useEffect(() => {
    let mouse = { x: 0, y: 0 }
    let targetMouse = { x: 0, y: 0 }
    let reqId: number

    const onMouseMove = (e: MouseEvent) => {
      // Normalize mouse [-1, 1] relative to window center
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      targetMouse.x = Math.max(-1, Math.min(1, nx))
      targetMouse.y = Math.max(-1, Math.min(1, ny))

      setAzimuthDeg(Math.round(318 + targetMouse.x * 12))
      setAltMeters(Math.round(6852 - targetMouse.y * 240))
    }

    window.addEventListener('mousemove', onMouseMove)

    // Cloud Canvas setup
    const canvas = cloudCanvasRef.current
    const ctx = canvas ? canvas.getContext('2d') : null

    let cloudOffset = 0

    const render = () => {
      reqId = requestAnimationFrame(render)

      // Damped mouse follow
      mouse.x += (targetMouse.x - mouse.x) * 0.06
      mouse.y += (targetMouse.y - mouse.y) * 0.06

      // Pan the mountain vista inside the telescope eyepiece
      if (mountainRef.current) {
        const panX = -mouse.x * 55
        const panY = -mouse.y * 40
        mountainRef.current.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(1.32)`
      }

      // Draw drifting soft atmospheric clouds
      if (canvas && ctx) {
        cloudOffset += 0.22
        if (cloudOffset > canvas.width) cloudOffset = 0

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw soft cloud wisps across the mountain valley
        ctx.save()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)'
        for (let i = 0; i < 6; i++) {
          const x = ((i * 120 + cloudOffset) % (canvas.width + 160)) - 80
          const y = canvas.height * 0.58 + Math.sin((x + i * 40) * 0.015) * 14
          ctx.beginPath()
          ctx.ellipse(x, y, 75, 22, 0, 0, Math.PI * 2)
          try {
            if ('filter' in ctx) ctx.filter = 'blur(16px)'
          } catch {
            // gracefully fallback if canvas filter is unsupported
          }
          ctx.fill()
        }
        ctx.restore()
      }
    }

    render()

    return () => {
      cancelAnimationFrame(reqId)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <div className="telescope-scrim" onPointerDown={onClose}>
      <div
        className="telescope-modal"
        ref={overlayRef}
        onPointerDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Telescope Mountain View"
      >
        {/* Close Button */}
        <button className="telescope-close-btn" onClick={onClose} aria-label="Step away">
          Step away <kbd>E</kbd>
        </button>

        {/* Header Ribbon */}
        <div className="telescope-header">
          <p className="telescope-kicker">Ambitions · Optical Observation</p>
          <h2 className="telescope-title">Wanna reach these heights…</h2>
          <p className="telescope-subtitle">
            Distant summits piercing the morning clouds — rugged, towering, and sunlit.
          </p>
        </div>

        {/* Optical Telescope Viewport */}
        <div className="telescope-viewport-wrap">
          {/* Subtle celestial backdrop */}
          <div className="telescope-backdrop" />

          {/* High-Definition Alpine Mountain Vista with responsive multi-path fallback */}
          <div ref={mountainRef} className="telescope-mountain-layer">
            <img
              src={MOUNTAIN_IMAGES[imgIndex]}
              alt="Towering Alpine Mountain Summits"
              className={`telescope-mountain-img ${isLoaded ? 'is-loaded' : ''}`}
              loading="eager"
              decoding="async"
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                if (imgIndex + 1 < MOUNTAIN_IMAGES.length) {
                  setImgIndex((prev) => prev + 1)
                }
              }}
            />
          </div>

          {/* Focusing Lens Loading Ring */}
          {!isLoaded && (
            <div className="telescope-focusing-indicator">
              <div className="telescope-lens-spinner" />
              <span>Focusing optics…</span>
            </div>
          )}

          {/* Drifting Valley Cloud Layer */}
          <canvas ref={cloudCanvasRef} width={440} height={440} className="telescope-clouds-layer" />

          {/* Optical Anti-Reflective Lens Coating Sheen */}
          <div className="telescope-lens-sheen" />

          {/* Precision Brass Optical Reticle & Telemetry Overlay */}
          <div className="telescope-reticle" aria-hidden="true">
            {/* Center crosshairs */}
            <div className="reticle-center">
              <span className="ret-line-h" />
              <span className="ret-line-v" />
              <span className="ret-circle-inner" />
              <span className="ret-circle-outer" />
            </div>

            {/* Compass Azimuth */}
            <div className="reticle-compass-top">
              <span className="comp-mark">▲</span>
              <span className="comp-text">NW {azimuthDeg}°</span>
            </div>

            {/* Altitude & Elevation readings */}
            <div className="reticle-telemetry-left">
              <div className="tele-tag">PEAK SUMMIT</div>
              <div className="tele-val">{altMeters.toLocaleString()} m</div>
              <div className="tele-sub">RANGE: 14.8 km</div>
            </div>

            <div className="reticle-telemetry-right">
              <div className="tele-tag">MAGNIFICATION</div>
              <div className="tele-val">24× OPTICAL</div>
              <div className="tele-sub">FOCUS: ∞</div>
            </div>

            {/* Bottom elevation scale */}
            <div className="reticle-elevation-scale">
              <span>+10°</span>
              <span>·</span>
              <span>+15°</span>
              <span className="scale-active">▲ +16.4°</span>
              <span>+20°</span>
            </div>
          </div>
        </div>

        {/* Ambition Narrative Card */}
        <div className="telescope-footer">
          <div className="telescope-goal-pill">
            <span className="pill-dot" />
            <span>Aspiring High · Vision</span>
          </div>
          <p className="telescope-desc">
            "Wanna reach heights in my life — building intelligent systems, architecting software that creates meaningful impact, and climbing new summits with every challenge I take on."
          </p>
          <div className="telescope-hint">
            <span>Move cursor to pan across the summits</span>
            <span className="hint-sep">·</span>
            <span>Press <kbd>Esc</kbd> or <kbd>E</kbd> to step away</span>
          </div>
        </div>
      </div>
    </div>
  )
}
