'use client'

import { useMemo } from 'react'
import { useTheme, type BgAnimation } from './ThemeProvider'

// Deterministic pseudo-random helpers — no Math.random() for SSR safety
function drand(seed: number) { return ((seed * 9301 + 49297) % 233280) / 233280 }
function drandRange(seed: number, min: number, max: number) { return min + drand(seed) * (max - min) }

const COUNTS: Record<BgAnimation, number> = {
  none:      0,
  gradient:  0,
  sparkles:  120,
  fire:      90,
  water:     80,
  electric:  50,
  leaves:    70,
  snow:      110,
  stars:     150,
  rain:      130,
  fireflies: 60,
  aurora:    8,
  pokeballs: 30,
  matrix:    40,
  bubbles:   70,
  galaxy:    180,
  waves:     12,
  confetti:  90,
  fog:       10,
}

function makeParticles(anim: BgAnimation) {
  const count = COUNTS[anim]
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left:     drandRange(i * 7 + 1, 0, 100),
    top:      drandRange(i * 7 + 2, 0, 100),
    delay:    drandRange(i * 7 + 3, 0, 10),
    duration: drandRange(i * 7 + 4, 3, 14),
    size:     drandRange(i * 7 + 5, 0.3, 1.6),
    hue:      drandRange(i * 7 + 6, 0, 1),
    extra:    drandRange(i * 7 + 7, 0, 1),
  }))
}

export function AnimatedBackground() {
  const { bgAnimation } = useTheme()

  const particles = useMemo(() => {
    if (bgAnimation === 'none' || bgAnimation === 'gradient') return []
    return makeParticles(bgAnimation)
  }, [bgAnimation])

  if (bgAnimation === 'none') return null

  const base = 'fixed inset-0 pointer-events-none overflow-hidden'

  if (bgAnimation === 'gradient') {
    return (
      <div className={base} style={{ zIndex: -1 }}>
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
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              fontSize: `${6 + p.size * 10}px`,
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
      <div className={base} style={{ zIndex: -1 }}>
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
                width: `${3 + p.size * 7}px`,
                height: `${3 + p.size * 7}px`,
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
      <div className={base} style={{ zIndex: -1 }}>
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
                width: `${2 + p.size * 6}px`,
                height: `${2 + p.size * 6}px`,
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
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${30 + p.size * 60}px`,
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
      <div className={base} style={{ zIndex: -1 }}>
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
                width: `${5 + p.size * 7}px`,
                height: `${5 + p.size * 7}px`,
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
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: '-10px',
              width: `${2 + p.size * 5}px`,
              height: `${2 + p.size * 5}px`,
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
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${1 + p.size * 4}px`,
              height: `${1 + p.size * 4}px`,
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

  if (bgAnimation === 'rain') {
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: '-10px',
              width: '1px',
              height: `${8 + p.size * 14}px`,
              background: 'oklch(0.70 0.10 210)',
              borderRadius: '1px',
              opacity: 0,
              animation: `bgRainFall ${p.duration * 0.4 + 0.5}s ${p.delay}s linear infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  if (bgAnimation === 'fireflies') {
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${3 + p.size * 5}px`,
              height: `${3 + p.size * 5}px`,
              borderRadius: '50%',
              background: `oklch(0.85 0.22 ${80 + p.hue * 40})`,
              boxShadow: `0 0 ${6 + p.size * 8}px ${3 + p.size * 4}px oklch(0.80 0.25 ${80 + p.hue * 40} / 0.5)`,
              opacity: 0,
              animation: `bgFireflyFloat ${p.duration + 4}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  if (bgAnimation === 'aurora') {
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => {
          const colors = [
            'oklch(0.75 0.22 160)',
            'oklch(0.70 0.25 200)',
            'oklch(0.65 0.20 280)',
            'oklch(0.75 0.18 140)',
            'oklch(0.72 0.20 220)',
            'oklch(0.68 0.22 300)',
            'oklch(0.78 0.15 170)',
            'oklch(0.70 0.24 240)',
          ]
          const color = colors[p.id % colors.length]
          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.left - 10}%`,
                top: `${5 + p.hue * 40}%`,
                width: '40%',
                height: `${60 + p.size * 80}px`,
                background: `linear-gradient(180deg, ${color} 0%, transparent 100%)`,
                borderRadius: '50%',
                filter: 'blur(30px)',
                opacity: 0,
                animation: `bgAuroraShift ${p.duration + 8}s ${p.delay}s ease-in-out infinite`,
              }}
            />
          )
        })}
      </div>
    )
  }

  if (bgAnimation === 'pokeballs') {
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              fontSize: `${12 + p.size * 18}px`,
              opacity: 0,
              userSelect: 'none',
              animation: `bgPokeballFloat ${p.duration + 3}s ${p.delay}s ease-in-out infinite`,
            }}
          >
            ⚽
          </div>
        ))}
      </div>
    )
  }

  if (bgAnimation === 'matrix') {
    const cols = Array.from({ length: COUNTS.matrix }, (_, i) => i)
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {cols.map(i => {
          const p = particles[i]
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                top: '-20px',
                fontSize: `${8 + p.size * 6}px`,
                fontFamily: 'monospace',
                color: `oklch(0.70 0.28 ${120 + p.hue * 40})`,
                opacity: 0,
                writingMode: 'vertical-lr',
                animation: `bgMatrixFall ${p.duration + 2}s ${p.delay}s linear infinite`,
                letterSpacing: '2px',
              }}
            >
              {Array.from({ length: 8 }, (_, j) =>
                String.fromCharCode(0x30A0 + Math.floor(drand(i * 7 + j) * 96))
              ).join('')}
            </div>
          )
        })}
      </div>
    )
  }

  if (bgAnimation === 'bubbles') {
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              bottom: `${p.extra * 20}%`,
              width: `${8 + p.size * 20}px`,
              height: `${8 + p.size * 20}px`,
              borderRadius: '50%',
              border: `1.5px solid oklch(0.75 0.15 ${200 + p.hue * 60} / 0.6)`,
              background: `oklch(0.80 0.10 ${200 + p.hue * 60} / 0.08)`,
              opacity: 0,
              animation: `bgBubbleRise ${p.duration + 3}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  if (bgAnimation === 'galaxy') {
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${1 + p.size * 3}px`,
              height: `${1 + p.size * 3}px`,
              borderRadius: '50%',
              background: `oklch(0.88 ${0.08 + p.hue * 0.25} ${p.hue * 360})`,
              opacity: 0,
              animation: `bgGalaxyTwinkle ${p.duration * 0.4 + 0.8}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  if (bgAnimation === 'waves') {
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map((p, i) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: '-5%',
              top: `${8 + i * (84 / COUNTS.waves)}%`,
              width: '110%',
              height: `${1 + p.size}px`,
              background: `linear-gradient(90deg, transparent 0%, oklch(0.70 0.18 ${200 + p.hue * 60} / 0.5) 30%, oklch(0.75 0.20 ${210 + p.hue * 60} / 0.6) 50%, oklch(0.70 0.18 ${200 + p.hue * 60} / 0.5) 70%, transparent 100%)`,
              borderRadius: '50%',
              animation: `bgWaveMove ${p.duration + 4}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  if (bgAnimation === 'confetti') {
    const confettiColors = [
      'oklch(0.72 0.28 30)',
      'oklch(0.75 0.25 85)',
      'oklch(0.70 0.26 140)',
      'oklch(0.68 0.28 200)',
      'oklch(0.72 0.28 260)',
      'oklch(0.70 0.30 320)',
    ]
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => {
          const color = confettiColors[Math.floor(p.hue * confettiColors.length)]
          return (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.left}%`,
                top: '-10px',
                width: `${4 + p.size * 6}px`,
                height: `${6 + p.size * 4}px`,
                background: color,
                borderRadius: '1px',
                opacity: 0,
                animation: `bgConfettiFall ${p.duration}s ${p.delay}s linear infinite`,
              }}
            />
          )
        })}
      </div>
    )
  }

  if (bgAnimation === 'fog') {
    return (
      <div className={base} style={{ zIndex: -1 }}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left - 20}%`,
              top: `${p.top}%`,
              width: `${200 + p.size * 300}px`,
              height: `${80 + p.size * 120}px`,
              background: 'oklch(0.80 0.02 210)',
              borderRadius: '50%',
              filter: 'blur(40px)',
              opacity: 0,
              animation: `bgFogDrift ${p.duration + 10}s ${p.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    )
  }

  return null
}
