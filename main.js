// ─── Global App State ────────────────────────────────────────────────────────
export const appState = {
  rawImageData: null,       // ImageData 224×224 from upload
  imageLoaded: false,
  probabilities: null,      // { front, rear, interior }
  predictedClass: null,
}

// ─── GSAP Setup ──────────────────────────────────────────────────────────────
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

ScrollTrigger.defaults({
  markers: false,
})

// ─── Stage Imports ────────────────────────────────────────────────────────────
import { initInput } from './stages/01-input.js'
import { initPreprocessing } from './stages/02-preprocessing.js'
import { initArchitecture } from './stages/03-architecture.js'
import { initConvLayer1 } from './stages/04-conv-layer1.js'
import { initConvLayer2 } from './stages/05-conv-layer2.js'
import { initPooling } from './stages/06-pooling.js'
import { initFCLayers } from './stages/07-fc-layers.js'
import { initSoftmax } from './stages/08-softmax.js'
import { initLoss } from './stages/09-loss.js'
import { initBackprop } from './stages/10-backprop.js'
import { initWeightUpdate } from './stages/11-weight-update.js'
import { initTrainingLoop } from './stages/12-training-loop.js'
import { initInference } from './stages/13-inference.js'
import { initAnnotations } from './utils/annotations.js'
import { drawKernel } from './utils/canvas-helpers.js'

// Expose drawKernel globally for weight update stage
window.__canvasHelpers = { drawKernel }

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  initAnnotations()
  initInput()
  initPreprocessing()
  initArchitecture()
  initConvLayer1()
  initConvLayer2()
  initPooling()
  initFCLayers()
  initSoftmax()
  initLoss()
  initBackprop()
  initWeightUpdate()
  initTrainingLoop()
  initInference()

  // Progress indicator: highlight nav dots as user scrolls
  setupProgressNav()

  // Hero enter animation
  gsap.timeline()
    .fromTo('.hero-content h1', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' })
    .fromTo('.hero-subtitle', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
    .fromTo('.scroll-cta', { opacity: 0 }, { opacity: 1, duration: 0.5 }, '-=0.2')
}

function setupProgressNav() {
  const dots = document.querySelectorAll('.nav-dot')
  const stages = document.querySelectorAll('.stage[id]')

  stages.forEach((stage, i) => {
    ScrollTrigger.create({
      trigger: stage,
      start: 'top center',
      end: 'bottom center',
      onEnter: () => setActiveDot(i),
      onEnterBack: () => setActiveDot(i),
    })
  })

  function setActiveDot(i) {
    dots.forEach((d, di) => {
      d.classList.toggle('active', di === i)
    })
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const target = stages[i]
      if (target) gsap.to(window, { scrollTo: target, duration: 0.8, ease: 'power2.inOut' })
    })
  })
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
