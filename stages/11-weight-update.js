import { getKernels, generateWeightUpdate } from '../utils/mock-cnn.js'

export function initWeightUpdate() {
  ScrollTrigger.create({
    trigger: document.getElementById('stage-11'),
    start: 'top 65%',
    onEnter: () => animateWeightUpdate(),
    once: true,
  })
}

function animateWeightUpdate() {
  const kernels = getKernels(1)
  const kernel = kernels[0] // Use Sobel-H kernel for demo
  const { old, gradients, delta, updated } = generateWeightUpdate(kernel, 0.001)

  const grid = document.getElementById('weight-grid')
  if (!grid) return

  // Render weight cells
  grid.innerHTML = ''
  old.forEach((w, i) => {
    const cell = document.createElement('div')
    cell.className = 'weight-cell'
    cell.id = `wcell-${i}`
    cell.innerHTML = `
      <div class="weight-old">${w.toFixed(3)}</div>
      <div class="weight-delta ${delta[i] >= 0 ? 'positive' : 'negative'}" id="wdelta-${i}" style="opacity:0">
        ${delta[i] >= 0 ? '▲' : '▼'} ${Math.abs(delta[i]).toFixed(5)}
      </div>
      <div class="weight-new" id="wnew-${i}" style="opacity:0">${updated[i].toFixed(3)}</div>
    `
    grid.appendChild(cell)
  })

  const tl = gsap.timeline()

  // Step 1: Reveal cells
  tl.to('.weight-cell', {
    opacity: 1, y: 0,
    stagger: 0.08,
    duration: 0.3,
    ease: 'power2.out',
  })

  // Step 2: Show deltas one by one
  tl.to(Array.from({ length: 9 }, (_, i) => `#wdelta-${i}`).join(','), {
    opacity: 1,
    stagger: 0.1,
    duration: 0.25,
  }, '+=0.2')

  // Step 3: Show new weights
  tl.to(Array.from({ length: 9 }, (_, i) => `#wnew-${i}`).join(','), {
    opacity: 1,
    stagger: 0.1,
    duration: 0.25,
  }, '+=0.2')

  // Step 4: Brief flash on updated kernel canvas
  tl.add(() => {
    const canvas = document.getElementById('canvas-kernel-updated')
    if (!canvas) return
    canvas.width = 110; canvas.height = 110
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#12121e'
    ctx.fillRect(0, 0, 110, 110)

    // Draw updated kernel
    const { drawKernel } = window.__canvasHelpers || {}
    if (!drawKernel) return
    drawKernel(ctx, updated, 5, 5, 28)

    // Glow pulse
    gsap.fromTo(canvas, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' })
  }, '+=0.3')

  // Show gradient formula
  const formulaEl = document.getElementById('weight-formula')
  if (formulaEl) {
    tl.to(formulaEl, { opacity: 1, duration: 0.4 }, '+=0.2')
  }
}
