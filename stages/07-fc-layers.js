import { generateFCActivations, generateFeatureMaps } from '../utils/mock-cnn.js'
import { viridisScale } from '../utils/canvas-helpers.js'

export function initFCLayers() {
  const section = document.getElementById('stage-7')

  ScrollTrigger.create({
    trigger: section,
    start: 'top 70%',
    onEnter: () => animateFCLayers(),
    once: true,
  })
}

function animateFCLayers() {
  animateFlatten()
}

function animateFlatten() {
  const canvas = document.getElementById('canvas-flatten')
  if (!canvas) return
  const W = 320, H = 180
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  const NUM_MAPS = 6
  const MAP_SIZE = 7 // small representation
  const CELL = 4

  const maps = generateFeatureMaps(NUM_MAPS, MAP_SIZE)
  const state = { progress: 0 }

  // Phase 1: Show stacked feature maps
  // Phase 2: Animate collapsing to a 1D vector
  const tl = gsap.timeline({ delay: 0.2 })

  tl.to(state, {
    progress: 0.5,
    duration: 0.8,
    ease: 'power2.inOut',
    onUpdate: () => drawFlattenFrame(ctx, maps, state.progress, W, H),
  })
  .to(state, {
    progress: 1,
    duration: 1.2,
    ease: 'power2.inOut',
    onUpdate: () => drawFlattenFrame(ctx, maps, state.progress, W, H),
    onComplete: () => animateFCConnections(),
  })
}

function drawFlattenFrame(ctx, maps, progress, W, H) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, W, H)

  const NUM_MAPS = maps.length
  const MAP_SIZE = Math.sqrt(maps[0].length)
  const CELL = 4, GAP = 2

  if (progress < 0.5) {
    // Show stacked maps
    const p = progress / 0.5
    maps.forEach((map, mi) => {
      const ox = 10 + mi * (MAP_SIZE * (CELL + GAP) + 8)
      const oy = 20
      for (let row = 0; row < MAP_SIZE; row++) {
        for (let col = 0; col < MAP_SIZE; col++) {
          const t = Math.max(0, Math.min(1, map[row * MAP_SIZE + col]))
          const [r, g, b] = viridisScale(t)
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.globalAlpha = p
          ctx.fillRect(ox + col * (CELL + GAP), oy + row * (CELL + GAP), CELL, CELL)
        }
      }
    })
    ctx.globalAlpha = 1
    // Label
    ctx.fillStyle = `rgba(136,136,170,${p})`
    ctx.font = '10px Space Grotesk, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Feature Maps (7×7×6)', W / 2, H - 12)
  } else {
    // Collapse animation: maps squish to right side
    const p = (progress - 0.5) / 0.5
    const targetX = W - 24
    const totalVec = NUM_MAPS * MAP_SIZE * MAP_SIZE
    const vecH = Math.min(H - 30, totalVec * 1.5)

    maps.forEach((map, mi) => {
      const srcX = 10 + mi * (MAP_SIZE * (CELL + GAP) + 8)
      const srcY = 20
      const curX = srcX + (targetX - srcX) * p
      const curCellW = Math.max(0.5, CELL * (1 - p * 0.95))
      const curCellH = curCellW

      for (let row = 0; row < MAP_SIZE; row++) {
        for (let col = 0; col < MAP_SIZE; col++) {
          const t = Math.max(0, Math.min(1, map[row * MAP_SIZE + col]))
          const [r, g, b] = viridisScale(t)
          const idx = mi * MAP_SIZE * MAP_SIZE + row * MAP_SIZE + col
          const vecY = 15 + (idx / totalVec) * vecH * p + srcY * (1 - p)
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect(
            curX + col * (curCellW + GAP) * (1 - p),
            vecY,
            Math.max(1, curCellW),
            Math.max(1, curCellH * 0.6)
          )
        }
      }
    })

    // Vector label
    ctx.fillStyle = `rgba(0,212,255,${p})`
    ctx.font = '10px Space Grotesk, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('1D Vector (294)', W - 4, H / 2)
  }
}

function animateFCConnections() {
  const canvas = document.getElementById('canvas-fc')
  if (!canvas) return

  const W = 320, H = 200
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  const activations256 = generateFCActivations(32) // show 32 of 256 for clarity
  const outputActivations = [0.72, 0.19, 0.09] // mock softmax

  const nodeR = 4
  const x1 = 60, x2 = W - 60
  const spacing1 = (H - 20) / (activations256.length - 1)
  const spacing2 = (H - 20) / (outputActivations.length - 1)

  const nodes1 = activations256.map((v, i) => ({ x: x1, y: 10 + i * spacing1, v }))
  const nodes2 = outputActivations.map((v, i) => ({ x: x2, y: 10 + i * spacing2, v }))

  const state = { progress: 0 }
  gsap.to(state, {
    progress: 1,
    duration: 1.5,
    ease: 'power2.out',
    delay: 0.3,
    onUpdate: () => {
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0a0a12'
      ctx.fillRect(0, 0, W, H)

      // Connections
      nodes1.forEach(n1 => {
        nodes2.forEach(n2 => {
          const alpha = Math.abs(n1.v - 0.5) * 0.4 * state.progress
          ctx.strokeStyle = `rgba(153,102,255,${alpha})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(n1.x + nodeR, n1.y)
          ctx.lineTo(n2.x - nodeR, n2.y)
          ctx.stroke()
        })
      })

      // Hidden layer nodes
      nodes1.forEach(n => {
        const [r, g, b] = viridisScale(n.v)
        ctx.fillStyle = `rgba(${r},${g},${b},${state.progress})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeR, 0, Math.PI * 2)
        ctx.fill()
      })

      // Output nodes (3 classes)
      const labels = ['Front', 'Rear', 'Interior']
      nodes2.forEach((n, i) => {
        ctx.fillStyle = i === 0 ? `rgba(255,215,0,${state.progress})` : `rgba(0,212,255,${state.progress})`
        ctx.beginPath()
        ctx.arc(n.x, n.y, nodeR + 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(224,224,240,${state.progress})`
        ctx.font = '11px Space Grotesk, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(labels[i], n.x + nodeR + 6, n.y + 4)
      })

      // Labels
      ctx.fillStyle = `rgba(136,136,170,${state.progress})`
      ctx.font = '10px Space Grotesk, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('FC 256', x1, H - 4)
      ctx.fillText('FC 3', x2, H - 4)
    }
  })
}
