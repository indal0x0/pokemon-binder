'use client'

import { useMemo } from 'react'
import { useTheme, type BgAnimation } from './ThemeProvider'

// Deterministic pseudo-random helpers — no Math.random() for SSR safety
function drand(seed: number) { return ((seed * 9301 + 49297) % 233280) / 233280 }
function drandRange(seed: number, min: number, max: number) { return min + drand(seed) * (max - min) }

export function AnimatedBackground() {
  const { bgAnimation } = useTheme()

  const particles = useMemo(() => {
    if (bgAnimation === 'none' || bgAnimation === 'gradient') return []

    const configs: Record<BgAnimation, { count: number }> = {
      none:     { count: 0  },
      gradient: { count: 0  },
      sparkles: { count: 50 },
      fire:     { count: 40 },
      water:    { count: 35 },
      electric: { count: 20 },
      leaves:   { count: 30 },
      snow:     { count: 45 },
      stars:    { count: 60 },
    }

    const { count } = configs[bgAnimation]
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left:     drandRange(i * 7 + 1, 0, 100),
      top:      drandRange(i * 7 + 2, 0, 100),
      delay:    drandRange(i * 7 + 3, 0, 8),
      duration: drandRange(i * 7 + 4, 3, 12),
      size:     drandRange(i * 7 + 5, 0.4, 1.4),
      hue:      drandRange(i * 7 + 6, 0, 1),
    }))
  }, [bgAnimation])

  if (bgAnimation === 'none') return null

  const base = 'fixed inset-0 pointer-events-none overflow-hidden'

  if (bgAnimation === 'gradient') {
    return (
      <div className={base} style={{ zIndex: 0 }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, transparent 30%, var(--accent) 60%, transparent 80%, var(--ring) 100%)',
            backgroundSize: '400% 400%',
            opacity: 0.12,
            animation: 'bgGradientShift 10s ease infinite',
          }}
        />
      </div>
    )
  }

  if (bgAnimation === 'sparkles') {
    return (
      <div className={base} style={{ zIndex: 0 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              fontSize: `${8 + p.size * 8}px`,
              color: 'var(--primary)',
              opacity: 0,
              animation: `bgSparkleFloat ${p.duration}s ${p.delay}s ease-in-out infinite`,
            }}
          >
            ✦
          </div>
        ))}
      </div>
    )
  }

  if (bgAnimation === 'fire') {
    return (
      <div className={base} style={{ zIndex: 0 }}>
        {particles.map(p => {
          const hues = ['oklch(0.70 0.28 30)', 'oklch(0.75 0.25 50)', 'oklch(0.65 0.30 22)', 'oklch(0.80 0.22 65)']
          const color = hues[Math.floor(p.hue * hues.length)]
          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                bottom: 0,
                top: 'auto',
                width: `${4 + p.size * 6}px`,
                height: `${4 + p.size * 6}px`,
                borderRadius: '50% 50% 30% 30%',
                background: color,
                opacity: 0,
                animation: `bgParticleRise ${p.duration * 0.7}s ${p.delay}s ease-out infinite`,
              }}
            />
          )
        })}
      </div>
    )
  }

  if (bgAnimation === 'water') {
    return (
      <div className={base} style={{ zIndex: 0 }}>
        {particles.map(p => {
          const colors = ['oklch(0.72 0.18 195)', 'oklch(0.65 0.22 210)', 'oklch(0.80 0.14 185)', 'oklch(0.60 0.20 200)']
          const color = colors[Math.floor(p.hue * colors.length)]
          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                bottom: 0,
                top: 'auto',
                width: `${3 + p.size * 5}px`,
                height: `${3 + p.size * 5}px`,
                borderRadius: '50%',
                background: color,
                opacity: 0,
                animation: `bgParticleRise ${p.duration}s ${p.delay}s ease-in-out infinite`,
              }}
            />
          )
        })}
      </div>
    )
  }

  if (bgAnimation === 'electric') {
    return (
      <div className={base} style={{ zIndex: 0 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${20 + p.size * 40}px`,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, oklch(0.85 0.22 95), transparent)',
              transform: `rotate(${p.hue * 180 - 45}deg)`,
              opacity: 0,
              animation: `bgElectricFlash ${p.duration * 0.4 + 1}s ${p.delay}s linear infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  if (bgAnimation === 'leaves') {
    return (
      <div className={base} style={{ zIndex: 0 }}>
        {particles.map(p => {
          const colors = ['oklch(0.65 0.22 140)', 'oklch(0.70 0.20 130)', 'oklch(0.60 0.24 145)', 'oklch(0.75 0.18 115)']
          const color = colors[Math.floor(p.hue * colors.length)]
          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                top: '-10px',
                width: `${6 + p.size * 6}px`,
                height: `${6 + p.size * 6}px`,
                borderRadius: '0 50% 0 50%',
                background: color,
                opacity: 0,
                animation: `bgLeafFall ${p.duration}s ${p.delay}s linear infinite`,
              }}
            />
          )
        })}
      </div>
    )
  }

  if (bgAnimation === 'snow') {
    return (
      <div className={base} style={{ zIndex: 0 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: '-10px',
              width: `${3 + p.size * 5}px`,
              height: `${3 + p.size * 5}px`,
              borderRadius: '50%',
              background: 'oklch(0.92 0.02 200)',
              opacity: 0,
              animation: `bgSnowFall ${p.duration}s ${p.delay}s linear infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  if (bgAnimation === 'stars') {
    return (
      <div className={base} style={{ zIndex: 0 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${2 + p.size * 3}px`,
              height: `${2 + p.size * 3}px`,
              borderRadius: '50%',
              background: `oklch(0.90 ${0.05 + p.hue * 0.15} ${p.hue * 360})`,
              opacity: 0,
              animation: `bgStarTwinkle ${p.duration * 0.5 + 1}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  return null
}
