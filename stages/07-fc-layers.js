import { generateFCActivations, generateFeatureMaps } from '../utils/mock-cnn.js'
import { viridisScale } from '../utils/canvas-helpers.js'

let _flattenMaps = null

export function initFCLayers() {
  const section = document.getElementById('stage-7')

  ScrollTrigger.create({
    trigger: section,
    start: 'top 70%',
    onEnter: () => animateFCLayers(),
    once: true,
  })

  const replayBtn = document.getElementById('btn-replay-flatten')
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      replayBtn.disabled = true
      replayBtn.textContent = '…'
      animateFlatten(true).then(() => {
        replayBtn.disabled = false
        replayBtn.textContent = '↺ Replay'
      })
    })
  }
}

function animateFCLayers() {
  animateFlatten(false)
}

// ─── HiDPI canvas setup ────────────────────────────────────────────────────
function setupCanvas(canvas, displayW, displayH) {
  const dpr = window.devicePixelRatio || 1
  canvas.width  = displayW * dpr
  canvas.height = displayH * dpr
  canvas.style.width  = displayW + 'px'
  canvas.style.height = displayH + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  return ctx
}

// ─── FLATTEN ANIMATION ────────────────────────────────────────────────────
function animateFlatten(isReplay = false) {
  const canvas = document.getElementById('canvas-flatten')
  if (!canvas) return Promise.resolve()

  const displayW = Math.max(320, canvas.parentElement.offsetWidth || 660)
  const displayH = 280
  const ctx = setupCanvas(canvas, displayW, displayH)
  const W = displayW, H = displayH

  if (!_flattenMaps) _flattenMaps = generateFeatureMaps(6, 7)
  const maps = _flattenMaps
  const state = { progress: 0 }

  return new Promise(resolve => {
    const tl = gsap.timeline({ delay: isReplay ? 0 : 0.2 })

    tl.to(state, {
      progress: 0.5,
      duration: 2.8,
      ease: 'power1.inOut',
      onUpdate: () => drawFlattenFrame(ctx, maps, state.progress, W, H),
    })
    .to(state, {
      progress: 1,
      duration: 3.5,
      ease: 'power1.inOut',
      onUpdate: () => drawFlattenFrame(ctx, maps, state.progress, W, H),
      onComplete: () => {
        if (!isReplay) animateFCConnections()
        resolve()
      },
    })
  })
}

function drawFlattenFrame(ctx, maps, progress, W, H) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, W, H)

  const NUM_MAPS  = maps.length   // 6
  const MAP_SIZE  = Math.sqrt(maps[0].length)  // 7
  const CELL      = Math.floor((W - 80) / (NUM_MAPS * MAP_SIZE + NUM_MAPS - 1)) // dynamic
  const GAP       = 2
  const MAP_PX    = MAP_SIZE * (CELL + GAP) - GAP  // pixel width/height of one map
  const MAP_GAP   = Math.max(8, Math.floor((W - 40 - NUM_MAPS * MAP_PX) / (NUM_MAPS - 1)))
  const totalW    = NUM_MAPS * MAP_PX + (NUM_MAPS - 1) * MAP_GAP
  const startX    = (W - totalW) / 2
  const mapTopY   = 28
  const LABEL_H   = 18

  if (progress <= 0.5) {
    // ── Phase 1: fade-in the stacked feature maps ──
    const alpha = Math.min(1, (progress / 0.5) * 1.4)

    // section title
    ctx.fillStyle = `rgba(136,136,170,${alpha * 0.7})`
    ctx.font = '11px Space Grotesk, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Feature Maps (7×7×6)', W / 2, 16)

    maps.forEach((map, mi) => {
      const ox = startX + mi * (MAP_PX + MAP_GAP)
      const oy = mapTopY + LABEL_H

      // map label
      ctx.fillStyle = `rgba(100,100,140,${alpha})`
      ctx.font = `9px Space Grotesk, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`Map ${mi + 1}`, ox + MAP_PX / 2, mapTopY + LABEL_H - 4)

      for (let row = 0; row < MAP_SIZE; row++) {
        for (let col = 0; col < MAP_SIZE; col++) {
          const t = Math.max(0, Math.min(1, map[row * MAP_SIZE + col]))
          const [r, g, b] = viridisScale(t)
          ctx.globalAlpha = alpha
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect(
            ox + col * (CELL + GAP),
            oy + row * (CELL + GAP),
            CELL, CELL
          )
        }
      }
    })
    ctx.globalAlpha = 1

  } else {
    // ── Phase 2: collapse maps into 1D vector on right ──
    const p = (progress - 0.5) / 0.5   // 0→1

    const VEC_WIDTH = Math.max(22, Math.floor(W * 0.06))
    const VEC_X     = W - 30 - VEC_WIDTH / 2
    const VEC_TOP   = 28
    const VEC_BOT   = H - 28
    const VEC_H     = VEC_BOT - VEC_TOP
    const TOTAL_CELLS = NUM_MAPS * MAP_SIZE * MAP_SIZE  // 294

    // Arrow hint
    if (p > 0.3) {
      const arrowAlpha = Math.min(1, (p - 0.3) / 0.4)
      ctx.strokeStyle = `rgba(0,212,255,${arrowAlpha * 0.5})`
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      const arrowX = VEC_X - VEC_WIDTH / 2 - 10
      ctx.moveTo(arrowX, VEC_TOP + VEC_H / 2 - 6)
      ctx.lineTo(arrowX + 8, VEC_TOP + VEC_H / 2)
      ctx.lineTo(arrowX, VEC_TOP + VEC_H / 2 + 6)
      ctx.stroke()
      ctx.setLineDash([])
    }

    maps.forEach((map, mi) => {
      const srcOx = startX + mi * (MAP_PX + MAP_GAP)
      const srcOy = mapTopY + LABEL_H

      // interpolated x position
      const curOx = srcOx + (VEC_X - VEC_WIDTH / 2 - srcOx) * p
      const curW  = Math.max(1, CELL * (1 - p * 0.85))
      const curGap = GAP * (1 - p * 0.9)

      for (let row = 0; row < MAP_SIZE; row++) {
        for (let col = 0; col < MAP_SIZE; col++) {
          const idx = mi * MAP_SIZE * MAP_SIZE + row * MAP_SIZE + col
          const t   = Math.max(0, Math.min(1, map[row * MAP_SIZE + col]))
          const [r, g, b] = viridisScale(t)

          // y: lerp from grid position to vector position
          const srcY  = srcOy + row * (CELL + GAP) + col * 0 // src row y
          const vecY  = VEC_TOP + (idx / TOTAL_CELLS) * VEC_H
          const curY  = srcY + (vecY - srcY) * p
          const curH  = Math.max(0.8, (CELL * (1 - p * 0.85) * 0.6))

          ctx.globalAlpha = 1
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect(
            curOx + col * (curW + curGap),
            curY,
            Math.max(1, curW),
            Math.max(0.8, curH)
          )
        }
      }
    })
    ctx.globalAlpha = 1

    // Draw final vector column when mostly done
    if (p > 0.6) {
      const vAlpha = Math.min(1, (p - 0.6) / 0.3)
      // outline
      ctx.strokeStyle = `rgba(0,212,255,${vAlpha * 0.6})`
      ctx.lineWidth = 1
      ctx.strokeRect(VEC_X - VEC_WIDTH / 2 - 1, VEC_TOP - 1, VEC_WIDTH + 2, VEC_H + 2)

      // label
      ctx.fillStyle = `rgba(0,212,255,${vAlpha})`
      ctx.font = 'bold 11px Space Grotesk, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('1D Vector', VEC_X, VEC_BOT + 18)
      ctx.fillStyle = `rgba(136,136,170,${vAlpha})`
      ctx.font = '10px Space Grotesk, sans-serif'
      ctx.fillText('(294)', VEC_X, VEC_BOT + 30)
    }
  }
}

// ─── FC CONNECTIONS ANIMATION ─────────────────────────────────────────────
function animateFCConnections() {
  const canvas = document.getElementById('canvas-fc')
  if (!canvas) return

  const displayW = Math.max(320, canvas.parentElement.offsetWidth || 660)
  const displayH = 280
  const ctx = setupCanvas(canvas, displayW, displayH)
  const W = displayW, H = displayH

  const activations = generateFCActivations(36)  // show 36 of 256
  const outputActs  = [0.72, 0.19, 0.09]

  const nodeR1 = 5
  const nodeR2 = 10
  const x1 = Math.floor(W * 0.22)
  const x2 = Math.floor(W * 0.78)

  const vPad = 24
  const spacing1 = (H - vPad * 2) / (activations.length - 1)
  const spacing2 = (H - vPad * 2) / (outputActs.length - 1)

  const nodes1 = activations.map((v, i) => ({ x: x1, y: vPad + i * spacing1, v }))
  const nodes2 = outputActs.map((v, i) => ({ x: x2, y: vPad + i * spacing2, v }))

  const labels   = ['Front', 'Rear', 'Interior']
  const colors   = ['#ffd700', '#00d4ff', '#a78bfa']
  const state    = { progress: 0 }

  gsap.to(state, {
    progress: 1,
    duration: 2.0,
    ease: 'power2.out',
    delay: 0.4,
    onUpdate: () => {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0a0a12'
      ctx.fillRect(0, 0, W, H)

      const pr = state.progress

      // ── connections ──
      nodes1.forEach(n1 => {
        nodes2.forEach(n2 => {
          const alpha = Math.abs(n1.v - 0.5) * 0.55 * pr
          ctx.strokeStyle = `rgba(153,102,255,${alpha})`
          ctx.lineWidth = 0.9
          ctx.beginPath()
          ctx.moveTo(n1.x + nodeR1, n1.y)
          ctx.lineTo(n2.x - nodeR2 - 2, n2.y)
          ctx.stroke()
        })
      })

      // ── hidden nodes ──
      nodes1.forEach(n => {
        const [r, g, b] = viridisScale(n.v)
        ctx.fillStyle = `rgba(${r},${g},${b},${pr})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeR1, 0, Math.PI * 2)
        ctx.fill()
      })

      // dotted "256 more" hint
      if (pr > 0.5) {
        const hintAlpha = Math.min(1, (pr - 0.5) / 0.3) * 0.45
        ctx.fillStyle = `rgba(136,136,170,${hintAlpha})`
        ctx.font = '9px Space Grotesk, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('· · · 256 neurons total · · ·', x1, H - 8)
      }

      // ── output nodes ──
      nodes2.forEach((n, i) => {
        const hex = colors[i]
        ctx.fillStyle = hexAlpha(hex, pr)
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeR2, 0, Math.PI * 2)
        ctx.fill()

        // glow ring for top class
        if (i === 0 && pr > 0.6) {
          const glowAlpha = Math.min(1, (pr - 0.6) / 0.4) * 0.3
          ctx.strokeStyle = hexAlpha(hex, glowAlpha)
          ctx.lineWidth = 5
          ctx.beginPath()
          ctx.arc(n.x, n.y, nodeR2 + 6, 0, Math.PI * 2)
          ctx.stroke()
        }

        // label
        ctx.fillStyle = `rgba(224,224,240,${pr})`
        ctx.font = `bold 13px Space Grotesk, sans-serif`
        ctx.textAlign = 'left'
        ctx.fillText(labels[i], n.x + nodeR2 + 10, n.y - 3)
        ctx.font = `11px Space Grotesk, sans-serif`
        ctx.fillStyle = hexAlpha(hex, pr)
        ctx.fillText(`${(n.v * 100).toFixed(0)}%`, n.x + nodeR2 + 10, n.y + 12)
      })

      // column labels
      ctx.fillStyle = `rgba(136,136,170,${pr * 0.8})`
      ctx.font = '11px Space Grotesk, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('FC 256', x1, vPad - 12)
      ctx.fillText('Output', x2, vPad - 12)
    }
  })
}

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
