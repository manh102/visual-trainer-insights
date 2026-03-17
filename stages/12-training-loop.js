import { generateLossCurve, generateValLossCurve, generateAccCurve } from '../utils/mock-cnn.js'

export function initTrainingLoop() {
  const section = document.getElementById('stage-12')
  const lossCurve = generateLossCurve(50)
  const valLossCurve = generateValLossCurve(lossCurve)
  const accCurve = generateAccCurve(50)

  const state = { drawProgress: 0 }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=500%',
    pin: true,
    scrub: 1,
    onUpdate: self => {
      state.drawProgress = self.progress
      renderTrainingLoop(state.drawProgress, lossCurve, valLossCurve, accCurve)
    },
    onLeave: () => showCompleteAnimation(),
  })
}

function renderTrainingLoop(progress, lossCurve, valLossCurve, accCurve) {
  const epochNum = Math.round(progress * 49)
  const accVal = accCurve[Math.min(epochNum, accCurve.length - 1)]

  // Update epoch counter
  const epochEl = document.getElementById('epoch-counter')
  if (epochEl) epochEl.textContent = epochNum

  // Update accuracy counter
  const accEl = document.getElementById('acc-counter')
  if (accEl) accEl.textContent = (accVal * 100).toFixed(1) + '%'

  // Draw loss curve
  const canvas = document.getElementById('canvas-loss-curve')
  if (canvas) {
    drawLossCurve(canvas, lossCurve, valLossCurve, progress)
  }
}

function drawLossCurve(canvas, trainLoss, valLoss, drawProgress) {
  const DPR = window.devicePixelRatio || 1
  const W = canvas.parentElement.offsetWidth || 600
  const H = 220

  if (canvas.dataset.lastW !== String(W)) {
    canvas.width = W * DPR; canvas.height = H * DPR
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
    canvas.dataset.lastW = String(W)
  }

  const ctx = canvas.getContext('2d')
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, W, H)

  const PAD_L = 55, PAD_B = 35, PAD_T = 20, PAD_R = 20
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_B - PAD_T
  const maxLoss = 2.5

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  for (let i = 1; i < 5; i++) {
    const y = PAD_T + (i / 5) * plotH
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke()
  }

  // Axes
  ctx.strokeStyle = '#333355'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, H - PAD_B); ctx.lineTo(W - PAD_R, H - PAD_B)
  ctx.stroke()

  // Axis labels
  ctx.fillStyle = '#666688'
  ctx.font = '10px Space Grotesk, sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const lossLabel = (maxLoss * (5 - i) / 5).toFixed(1)
    const y = PAD_T + (i / 5) * plotH
    ctx.fillText(lossLabel, PAD_L - 4, y + 3)
  }
  ctx.textAlign = 'center'
  const steps = [0, 10, 20, 30, 40, 49]
  steps.forEach(epoch => {
    const x = PAD_L + (epoch / 49) * plotW
    ctx.fillText(String(epoch), x, H - PAD_B + 14)
  })
  ctx.fillStyle = '#888'
  ctx.save(); ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2)
  ctx.fillText('Loss', 0, 0)
  ctx.restore()
  ctx.fillText('Epoch', W / 2, H - 2)

  const visibleCount = Math.max(2, Math.round(drawProgress * trainLoss.length))

  // Draw train loss curve
  drawCurve(ctx, trainLoss, visibleCount, PAD_L, PAD_T, plotW, plotH, maxLoss, '#00d4ff', 2.5, true)

  // Draw val loss curve (lighter)
  if (drawProgress > 0.1) {
    drawCurve(ctx, valLoss, visibleCount, PAD_L, PAD_T, plotW, plotH, maxLoss, 'rgba(255,107,53,0.6)', 1.5, false)
  }

  // Legend
  if (drawProgress > 0.05) {
    ctx.fillStyle = '#00d4ff'
    ctx.fillRect(PAD_L + 8, PAD_T + 8, 18, 3)
    ctx.fillStyle = '#ccc'
    ctx.font = '10px Space Grotesk, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Train loss', PAD_L + 30, PAD_T + 12)
    ctx.fillStyle = 'rgba(255,107,53,0.6)'
    ctx.fillRect(PAD_L + 8, PAD_T + 20, 18, 3)
    ctx.fillStyle = '#ccc'
    ctx.fillText('Val loss', PAD_L + 30, PAD_T + 24)
  }
}

function drawCurve(ctx, values, visibleCount, padL, padT, plotW, plotH, maxLoss, color, lineWidth, glow) {
  if (visibleCount < 2) return
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 8 }

  ctx.beginPath()
  for (let i = 0; i < visibleCount; i++) {
    const x = padL + (i / (values.length - 1)) * plotW
    const y = padT + (1 - Math.min(values[i] / maxLoss, 1)) * plotH
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  // Current point dot
  if (visibleCount > 1) {
    const i = visibleCount - 1
    const x = padL + (i / (values.length - 1)) * plotW
    const y = padT + (1 - Math.min(values[i] / maxLoss, 1)) * plotH
    ctx.fillStyle = color
    ctx.shadowColor = color; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  }
}

function showCompleteAnimation() {
  const badge = document.getElementById('complete-badge')
  if (!badge || badge._shown) return
  badge._shown = true

  gsap.to(badge, {
    opacity: 1, scale: 1,
    duration: 0.5,
    ease: 'back.out(1.7)',
  })

  // Draw checkmark SVG stroke
  const path = document.getElementById('check-path')
  if (path) {
    const len = path.getTotalLength?.() || 30
    gsap.fromTo(path,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out', delay: 0.3 }
    )
  }
}
