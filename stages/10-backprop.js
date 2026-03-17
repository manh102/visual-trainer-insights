import { lerp, heatScale } from '../utils/canvas-helpers.js'
import { LAYERS } from './03-architecture.js'

// Layer sequence for backprop (reverse order of forward pass)
const BACKPROP_LAYERS = [
  { fromId: 'softmax', toId: 'fc2',    opacity: 1.0, color: '#ff8c00' },
  { fromId: 'fc2',     toId: 'fc1',    opacity: 0.9, color: '#ff7000' },
  { fromId: 'fc1',     toId: 'gap',    opacity: 0.75, color: '#e05500' },
  { fromId: 'gap',     toId: 'conv3',  opacity: 0.55, color: '#c04000' },
  { fromId: 'conv3',   toId: 'conv2',  opacity: 0.35, color: '#902010' },
  { fromId: 'conv2',   toId: 'conv1',  opacity: 0.20, color: '#600808' },
]

const PARTICLES_PER_WAVE = 5

export function initBackprop() {
  const section = document.getElementById('stage-10')

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=400%',
    pin: true,
    scrub: 0.5,
    onUpdate: self => renderBackprop(self.progress),
  })
}

function renderBackprop(progress) {
  const canvas = document.getElementById('canvas-backprop')
  if (!canvas) return

  const W = canvas.parentElement.offsetWidth || 600
  const H = 280
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, W, H)

  const positions = computeArchPositions(W, H)

  // Draw architecture layer blocks
  drawArchBlocks(ctx, positions, W, H)

  // Draw active gradient wave for current progress
  const waveIdx = Math.floor(progress * BACKPROP_LAYERS.length * 1.5)
  const waveProgress = (progress * BACKPROP_LAYERS.length * 1.5) % 1

  for (let wi = 0; wi <= Math.min(waveIdx, BACKPROP_LAYERS.length - 1); wi++) {
    const wave = BACKPROP_LAYERS[wi]
    const from = positions.find(p => p.id === wave.fromId)
    const to = positions.find(p => p.id === wave.toId)
    if (!from || !to) continue

    // Waves before current: show faded arrows along connection
    const pct = wi === waveIdx ? waveProgress : 1
    drawGradientWave(ctx, from, to, wave, pct, wi === waveIdx)
  }

  // "Vanishing gradient" annotation at end
  if (progress > 0.85) {
    const alpha = Math.min(1, (progress - 0.85) / 0.1)
    ctx.fillStyle = `rgba(96, 8, 8, ${alpha})`
    ctx.font = '11px Space Grotesk, sans-serif'
    ctx.textAlign = 'center'
    const conv1pos = positions.find(p => p.id === 'conv1')
    if (conv1pos) {
      ctx.fillText('Gradient rất nhỏ ở đây', conv1pos.cx, H - 15)
      ctx.fillText('(Vanishing Gradient)', conv1pos.cx, H - 4)
    }
  }
}

function computeArchPositions(W, H) {
  const gap = 14
  let totalW = LAYERS.reduce((s, l) => s + l.w + gap, 0) - gap
  let startX = (W - totalW) / 2
  const midY = H / 2 - 20

  return LAYERS.map(layer => {
    const x = startX
    const y = midY - layer.h / 2
    const cx = x + layer.w / 2
    const cy = midY
    startX += layer.w + gap
    return { ...layer, x, y, cx, cy }
  })
}

function drawArchBlocks(ctx, positions, W, H) {
  // Connections
  for (let i = 0; i < positions.length - 1; i++) {
    const a = positions[i], b = positions[i + 1]
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(a.x + a.w, a.cy); ctx.lineTo(b.x, b.cy)
    ctx.stroke()
  }
  // Layer blocks
  positions.forEach(layer => {
    ctx.fillStyle = layer.color + '44'
    ctx.strokeStyle = layer.color + '88'
    ctx.lineWidth = 1
    ctx.fillRect(layer.x, layer.y, layer.w, layer.h)
    ctx.strokeRect(layer.x, layer.y, layer.w, layer.h)
    // Label
    ctx.fillStyle = '#888'
    ctx.font = '8px Space Grotesk, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(layer.id.toUpperCase().slice(0, 5), layer.cx, layer.y + layer.h + 10)
  })
}

function drawGradientWave(ctx, from, to, wave, progress, isActive) {
  const numParticles = PARTICLES_PER_WAVE
  for (let i = 0; i < numParticles; i++) {
    // Particles travel from 'from' backwards to 'to' (right to left)
    const offset = i / numParticles
    const t = isActive
      ? Math.max(0, Math.min(1, progress - offset * 0.3))
      : 1 - offset * 0.2 // completed waves show faded trail

    if (t <= 0) continue

    // Particle moves from from.cx to to.cx (backwards)
    const x = lerp(from.cx, to.cx, t)
    const y = lerp(from.cy, to.cy, t)

    const alpha = wave.opacity * (isActive ? (1 - offset * 0.5) : 0.25)
    const size = isActive ? 4 - i * 0.5 : 2

    ctx.fillStyle = `rgba(${hexToRgb(wave.color)},${alpha})`
    ctx.shadowColor = wave.color
    ctx.shadowBlur = isActive ? 8 : 2

    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()

    // Arrowhead direction (pointing left = backwards)
    if (i === 0 && isActive && t < 0.9) {
      const angle = Math.atan2(to.cy - from.cy, to.cx - from.cx) + Math.PI
      ctx.fillStyle = wave.color
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6)
      ctx.lineTo(x + Math.cos(angle - 2.5) * 3, y + Math.sin(angle - 2.5) * 3)
      ctx.lineTo(x + Math.cos(angle + 2.5) * 3, y + Math.sin(angle + 2.5) * 3)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.shadowBlur = 0
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
