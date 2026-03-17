import { appState } from '../main.js'
import { drawGlowLine } from '../utils/canvas-helpers.js'

// Layer definitions for the CNN architecture diagram
export const LAYERS = [
  { id: 'input',   label: 'Input\n224×224×3',  color: '#4444ff', w: 40, h: 80 },
  { id: 'conv1',   label: 'Conv1\n32 filters', color: '#00d4ff', w: 30, h: 70 },
  { id: 'relu1',   label: 'ReLU',              color: '#44ff88', w: 14, h: 60 },
  { id: 'pool1',   label: 'MaxPool\n112×112',  color: '#ff6b35', w: 22, h: 55 },
  { id: 'conv2',   label: 'Conv2\n64 filters', color: '#00d4ff', w: 30, h: 48 },
  { id: 'relu2',   label: 'ReLU',              color: '#44ff88', w: 14, h: 40 },
  { id: 'pool2',   label: 'MaxPool\n56×56',    color: '#ff6b35', w: 22, h: 36 },
  { id: 'conv3',   label: 'Conv3\n128 filters',color: '#00d4ff', w: 30, h: 30 },
  { id: 'gap',     label: 'GlobalAvgPool',     color: '#ff6b35', w: 22, h: 22 },
  { id: 'fc1',     label: 'FC\n256',           color: '#9966ff', w: 16, h: 60 },
  { id: 'fc2',     label: 'FC\n3',             color: '#9966ff', w: 14, h: 40 },
  { id: 'softmax', label: 'Softmax',           color: '#ffd700', w: 14, h: 38 },
]

export function initArchitecture() {
  const canvas = document.getElementById('canvas-arch')
  if (!canvas) return

  ScrollTrigger.create({
    trigger: document.getElementById('stage-3'),
    start: 'top 70%',
    onEnter: () => animateArchDiagram(canvas),
  })

  // Hover tooltips
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleX
    const hit = findHitLayer(mx, my, canvas._layerRects)
    canvas.style.cursor = hit ? 'pointer' : 'default'
    if (hit) showLayerTooltip(hit, e.clientX, e.clientY)
    else hideLayerTooltip()
  })
  canvas.addEventListener('mouseleave', hideLayerTooltip)
}

function animateArchDiagram(canvas) {
  const DPR = window.devicePixelRatio || 1
  const W = canvas.parentElement.offsetWidth
  const H = 200
  canvas.width = W * DPR; canvas.height = H * DPR
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(DPR, DPR)

  const positions = computePositions(W, H)
  canvas._layerRects = positions

  // Animate layers in one by one
  const tl = gsap.timeline()
  const state = { drawn: 0, progress: Array(LAYERS.length).fill(0) }

  LAYERS.forEach((layer, i) => {
    tl.to(state.progress, {
      [i]: 1,
      duration: 0.15,
      ease: 'power2.out',
      onUpdate: () => redrawArch(ctx, positions, state.progress, W, H),
    }, i * 0.08)
  })
}

function computePositions(W, H) {
  const gap = 18
  let totalW = LAYERS.reduce((s, l) => s + l.w + gap, 0) - gap
  let startX = (W - totalW) / 2
  const midY = H / 2

  return LAYERS.map(layer => {
    const x = startX
    const y = midY - layer.h / 2
    startX += layer.w + gap
    return { ...layer, x, y }
  })
}

function redrawArch(ctx, positions, progress, W, H) {
  ctx.clearRect(0, 0, W, H)

  // Draw connections first
  for (let i = 0; i < positions.length - 1; i++) {
    if (progress[i] < 0.5 || progress[i + 1] < 0.01) continue
    const a = positions[i], b = positions[i + 1]
    const ax = a.x + a.w, ay = a.y + a.h / 2
    const bx = b.x, by = b.y + b.h / 2
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
  }

  // Draw layer blocks
  positions.forEach((layer, i) => {
    const p = progress[i]
    if (p <= 0) return
    const drawH = layer.h * p
    const drawY = layer.y + layer.h - drawH // grow upward

    // 3D perspective side
    ctx.fillStyle = adjustColor(layer.color, -40)
    ctx.beginPath()
    ctx.moveTo(layer.x + layer.w, drawY)
    ctx.lineTo(layer.x + layer.w + 6, drawY - 4)
    ctx.lineTo(layer.x + layer.w + 6, drawY + drawH - 4)
    ctx.lineTo(layer.x + layer.w, drawY + drawH)
    ctx.closePath(); ctx.fill()

    // Top face
    if (p > 0.95) {
      ctx.fillStyle = adjustColor(layer.color, 30)
      ctx.beginPath()
      ctx.moveTo(layer.x, drawY)
      ctx.lineTo(layer.x + layer.w, drawY)
      ctx.lineTo(layer.x + layer.w + 6, drawY - 4)
      ctx.lineTo(layer.x + 6, drawY - 4)
      ctx.closePath(); ctx.fill()
    }

    // Front face
    ctx.fillStyle = layer.color + 'cc'
    ctx.fillRect(layer.x, drawY, layer.w, drawH)

    // Border
    ctx.strokeStyle = layer.color
    ctx.lineWidth = 1
    ctx.strokeRect(layer.x, drawY, layer.w, drawH)

    // Label (only when fully grown)
    if (p > 0.95) {
      ctx.fillStyle = '#fff'
      ctx.font = '9px Space Grotesk, sans-serif'
      ctx.textAlign = 'center'
      const lines = layer.label.split('\n')
      lines.forEach((line, li) => {
        ctx.fillText(line, layer.x + layer.w / 2, layer.y + layer.h + 14 + li * 11)
      })
    }
  })
}

function adjustColor(hex, delta) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  const clamp = v => Math.max(0, Math.min(255, v + delta))
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`
}

function findHitLayer(mx, my, positions) {
  if (!positions) return null
  return positions.find(l => mx >= l.x && mx <= l.x + l.w + 6 && my >= l.y && my <= l.y + l.h) || null
}

const tooltip = { el: null }

function showLayerTooltip(layer, cx, cy) {
  if (!tooltip.el) {
    tooltip.el = document.createElement('div')
    tooltip.el.className = 'annotation-bubble'
    tooltip.el.style.display = 'block'
    tooltip.el.style.pointerEvents = 'none'
    document.body.appendChild(tooltip.el)
  }
  const info = getLayerInfo(layer.id)
  tooltip.el.innerHTML = `<div class="ann-title">${layer.label.replace('\n', ' ')}</div>${info}`
  tooltip.el.style.left = (cx + 12) + 'px'
  tooltip.el.style.top = (cy - 20) + 'px'
  tooltip.el.style.display = 'block'
  tooltip.el.style.opacity = '1'
}

function hideLayerTooltip() {
  if (tooltip.el) tooltip.el.style.display = 'none'
}

function getLayerInfo(id) {
  const info = {
    input:   'Input tensor: <code>224×224×3</code> (RGB pixels normalized to [0,1])',
    conv1:   '32 filters of size <code>3×3</code>, stride 1, padding 1. Learns low-level features.',
    relu1:   'ReLU activation: <code>max(0, x)</code>. Introduces non-linearity.',
    pool1:   '2×2 max pooling, stride 2. Halves spatial dimensions.',
    conv2:   '64 filters of size <code>3×3</code>. Learns mid-level patterns.',
    relu2:   'ReLU activation on Conv2 output.',
    pool2:   '2×2 max pooling. Output: <code>56×56×64</code>.',
    conv3:   '128 filters. Learns high-level semantic features.',
    gap:     'Global Average Pooling — reduces each feature map to one value.',
    fc1:     'Fully connected: <code>128→256</code> with ReLU.',
    fc2:     'Output layer: <code>256→3</code> (one per class).',
    softmax: 'Converts raw scores to probabilities summing to 1.',
  }
  return info[id] || ''
}

/**
 * Update the "you are here" dot on the architecture canvas.
 * Called by each stage when it becomes active.
 */
export function updateHereDot(layerId) {
  const canvas = document.getElementById('canvas-arch')
  if (!canvas || !canvas._layerRects) return

  const layer = canvas._layerRects.find(l => l.id === layerId)
  if (!layer) return

  const dot = document.getElementById('arch-here-dot')
  if (!dot) return

  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width / canvas.width
  const x = rect.left + (layer.x + layer.w / 2) * scaleX + window.scrollX
  const y = rect.top + layer.y * scaleX + window.scrollY - 12

  gsap.to(dot, { left: x + 'px', top: y + 'px', duration: 0.5, ease: 'power2.inOut' })
  dot.style.display = 'block'
}
