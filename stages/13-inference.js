import { appState } from '../main.js'
import { classifyCarImage } from '../utils/mock-cnn.js'
import { viridisScale } from '../utils/canvas-helpers.js'

export function initInference() {
  const zone = document.getElementById('upload-zone-2')
  const fileInput = document.getElementById('file-input-2')
  const resetBtn = document.getElementById('reset-btn')

  if (!zone || !fileInput) return

  zone.addEventListener('click', () => fileInput.click())
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover') })
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'))
  zone.addEventListener('drop', e => {
    e.preventDefault()
    zone.classList.remove('dragover')
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) runInference(file)
  })
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) runInference(fileInput.files[0])
  })

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      gsap.to(window, { scrollTo: 0, duration: 1.2, ease: 'power2.inOut' })
    })
  }

  ScrollTrigger.create({
    trigger: document.getElementById('stage-13'),
    start: 'top 70%',
    onEnter: () => {
      gsap.fromTo('#stage-13 .upload-zone', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 })
    },
    once: true,
  })
}

async function runInference(file) {
  const url = URL.createObjectURL(file)

  // Load image
  const img = new Image()
  await new Promise(resolve => { img.onload = resolve; img.src = url })

  // Extract ImageData
  const canvas = document.createElement('canvas')
  canvas.width = 224; canvas.height = 224
  canvas.getContext('2d').drawImage(img, 0, 0, 224, 224)
  const imageData = canvas.getContext('2d').getImageData(0, 0, 224, 224)
  URL.revokeObjectURL(url)

  // Show uploaded image
  const previewEl = document.getElementById('inference-img-preview')
  if (previewEl) {
    previewEl.width = 180; previewEl.height = 135
    previewEl.getContext('2d').drawImage(img, 0, 0, 180, 135)
    previewEl.style.display = 'block'
  }

  // Hide upload zone, show replay strip
  gsap.to('#upload-zone-2', { opacity: 0, scale: 0.95, duration: 0.3, onComplete: () => {
    document.getElementById('upload-zone-2').style.display = 'none'
    runFastForwardReplay(imageData, img)
  }})
}

async function runFastForwardReplay(imageData, img) {
  const strip = document.getElementById('replay-strip')
  if (!strip) return
  strip.style.display = 'flex'
  gsap.fromTo(strip, { opacity: 0 }, { opacity: 1, duration: 0.3 })

  // Build mini canvases for each stage
  const stages = [
    { label: '① Input', draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h) },
    { label: '② Preprocess', draw: (ctx, w, h) => drawMiniPreprocess(ctx, imageData, w, h) },
    { label: '③ Conv1', draw: (ctx, w, h) => drawMiniFeatureMap(ctx, w, h, 1) },
    { label: '④ Conv2', draw: (ctx, w, h) => drawMiniFeatureMap(ctx, w, h, 2) },
    { label: '⑤ Pool', draw: (ctx, w, h) => drawMiniPool(ctx, w, h) },
    { label: '⑥ FC', draw: (ctx, w, h) => drawMiniFC(ctx, w, h) },
  ]

  const MINI_W = 80, MINI_H = 60

  // Clear strip
  strip.innerHTML = ''

  for (let i = 0; i < stages.length; i++) {
    // Arrow between stages
    if (i > 0) {
      const arrow = document.createElement('div')
      arrow.className = 'replay-arrow'
      arrow.textContent = '→'
      strip.appendChild(arrow)
    }

    const wrap = document.createElement('div')
    wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.alignItems = 'center'; wrap.style.gap = '4px'

    const c = document.createElement('canvas')
    c.width = MINI_W; c.height = MINI_H
    c.style.borderRadius = '6px'; c.style.border = '1px solid #1e1e35'
    stages[i].draw(c.getContext('2d'), MINI_W, MINI_H)

    const lbl = document.createElement('div')
    lbl.textContent = stages[i].label
    lbl.style.fontSize = '9px'; lbl.style.color = '#666688'; lbl.style.fontFamily = 'Space Grotesk, sans-serif'

    wrap.appendChild(c); wrap.appendChild(lbl)
    strip.appendChild(wrap)

    // Staggered appearance
    gsap.fromTo(wrap, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.2, delay: i * 0.15, ease: 'back.out(1.5)' })
    await sleep(150)
  }

  // Show final probabilities
  await sleep(300)
  const probs = classifyCarImage(imageData)
  showFinalResult(probs)
}

function showFinalResult(probs) {
  const resultsEl = document.getElementById('inference-results')
  if (!resultsEl) return
  resultsEl.style.display = 'block'
  gsap.fromTo(resultsEl, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 })

  const entries = [
    { key: 'front', label: 'Mặt trước xe' },
    { key: 'rear', label: 'Mặt sau xe' },
    { key: 'interior', label: 'Nội thất xe' },
  ]
  let winnerKey = entries.reduce((best, e) => probs[e.key] > probs[best.key] ? e : best, entries[0]).key

  const state = { front: 0, rear: 0, interior: 0 }
  gsap.to(state, {
    ...probs,
    duration: 1.2,
    ease: 'power2.out',
    onUpdate: () => {
      entries.forEach(e => {
        const bar = document.getElementById(`inf-bar-${e.key}`)
        const pct = document.getElementById(`inf-pct-${e.key}`)
        if (bar) bar.style.width = (state[e.key] * 100) + '%'
        if (pct) pct.textContent = Math.round(state[e.key] * 100) + '%'
      })
    },
    onComplete: () => {
      const winner = document.getElementById(`inf-bar-${winnerKey}`)
      if (winner) winner.classList.add('winner')
      const predEl = document.getElementById('inf-prediction')
      if (predEl) {
        const names = { front: 'Mặt trước xe', rear: 'Mặt sau xe', interior: 'Nội thất xe' }
        predEl.querySelector('.pred-value').textContent = names[winnerKey]
        gsap.to(predEl, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' })
      }
    }
  })
}

function drawMiniPreprocess(ctx, imageData, w, h) {
  const tmp = document.createElement('canvas')
  tmp.width = 224; tmp.height = 224
  tmp.getContext('2d').putImageData(imageData, 0, 0)
  ctx.drawImage(tmp, 0, 0, w, h)
  // Overlay grid
  ctx.strokeStyle = 'rgba(0,212,255,0.3)'
  ctx.lineWidth = 0.5
  for (let i = 1; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * w / 8, 0); ctx.lineTo(i * w / 8, h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * h / 8); ctx.lineTo(w, i * h / 8); ctx.stroke()
  }
}

function drawMiniFeatureMap(ctx, w, h, layer) {
  const colors = layer === 1 ? ['#808080', '#aaaa00', '#005080'] : ['#004488', '#008844', '#884400']
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, w, h)
  // Simple simulated feature map stripes
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = Math.max(0, Math.sin((x + y) * 0.3 + layer) * 0.5 + 0.5)
      const [r, g, b] = viridisScale(v)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

function drawMiniPool(ctx, w, h) {
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, w, h)
  const G = 7, CS = Math.floor(w / G) - 1
  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      const v = Math.max(0, Math.sin(r * 0.8) * Math.cos(c * 0.8))
      const [rr, gg, bb] = viridisScale(v)
      ctx.fillStyle = `rgb(${rr},${gg},${bb})`
      ctx.fillRect(c * (CS + 1), r * (CS + 1), CS, CS)
    }
  }
}

function drawMiniFC(ctx, w, h) {
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, w, h)
  const nNodes = 12
  for (let i = 0; i < nNodes; i++) {
    const y = 4 + i * (h - 8) / (nNodes - 1)
    const v = Math.random()
    const [r, g, b] = viridisScale(v)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.beginPath()
    ctx.arc(w / 2, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ['F', 'R', 'I'].forEach((lbl, i) => {
    const y = h * 0.25 + i * h * 0.25
    ctx.fillStyle = '#00d4ff'
    ctx.font = '8px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(lbl, w - 2, y + 3)
    ctx.beginPath()
    ctx.arc(w - 16, y, 4, 0, Math.PI * 2)
    ctx.fill()
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
