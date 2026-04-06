'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  twinkleSpeed: number
  twinklePhase: number
  color: string
}

const COLORS = [
  'rgba(255, 255, 255',
  'rgba(200, 220, 255',
  'rgba(255, 220, 200',
  'rgba(220, 255, 220',
  'rgba(220, 200, 255',
]

function createStars(count: number, width: number, height: number): Star[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = i * 6791 + 1
    const r1 = ((seed * 9301 + 49297) % 233280) / 233280
    const r2 = (((seed + 1) * 9301 + 49297) % 233280) / 233280
    const r3 = (((seed + 2) * 9301 + 49297) % 233280) / 233280
    const r4 = (((seed + 3) * 9301 + 49297) % 233280) / 233280
    const r5 = (((seed + 4) * 9301 + 49297) % 233280) / 233280
    const r6 = (((seed + 5) * 9301 + 49297) % 233280) / 233280
    const colorIndex = Math.floor(r6 * COLORS.length)
    return {
      x: r1 * width,
      y: r2 * height,
      vx: (r3 - 0.5) * 0.28,
      vy: (r4 - 0.5) * 0.20,
      radius: 0.5 + r5 * 2.2,
      opacity: 0.4 + r3 * 0.6,
      twinkleSpeed: 0.005 + r4 * 0.015,
      twinklePhase: r5 * Math.PI * 2,
      color: COLORS[colorIndex],
    }
  })
}

export function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const rafRef = useRef<number>(0)
  const timeRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      starsRef.current = createStars(480, canvas.width, canvas.height)
    }

    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(document.documentElement)

    function draw(ts: number) {
      if (!canvas || !ctx) return
      const dt = Math.min(ts - timeRef.current, 50) // cap delta to avoid jumps
      timeRef.current = ts

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const star of starsRef.current) {
        star.x += star.vx * (dt / 16)
        star.y += star.vy * (dt / 16)
        star.twinklePhase += star.twinkleSpeed * (dt / 16)

        // Wrap around edges
        if (star.x < -2) star.x = canvas.width + 2
        if (star.x > canvas.width + 2) star.x = -2
        if (star.y < -2) star.y = canvas.height + 2
        if (star.y > canvas.height + 2) star.y = -2

        const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase)
        const alpha = star.opacity * (0.3 + 0.7 * twinkle)

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `${star.color}, ${alpha})`
        ctx.fill()

        // Glow for larger stars
        if (star.radius > 1.2) {
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.radius * 2.5, 0, Math.PI * 2)
          const grd = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 2.5)
          grd.addColorStop(0, `${star.color}, ${alpha * 0.3})`)
          grd.addColorStop(1, `${star.color}, 0)`)
          ctx.fillStyle = grd
          ctx.fill()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame((ts) => { timeRef.current = ts; rafRef.current = requestAnimationFrame(draw) })

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
