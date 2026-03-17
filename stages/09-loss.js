import { appState } from '../main.js'

export function initLoss() {
  ScrollTrigger.create({
    trigger: document.getElementById('stage-9'),
    start: 'top 65%',
    onEnter: () => animateLoss(),
    once: true,
  })
}

function animateLoss() {
  const probs = appState.probabilities || { front: 0.6, rear: 0.25, interior: 0.15 }
  const predictedClass = appState.predictedClass || 'front'
  const classKeys = ['front', 'rear', 'interior']
  const classLabels = { front: 'Mặt trước', rear: 'Mặt sau', interior: 'Nội thất' }

  // Ground truth (1 for correct class)
  const groundTruth = { front: 0, rear: 0, interior: 0 }
  groundTruth[predictedClass] = 1

  // Compute cross-entropy: L = -log(p_correct)
  const pCorrect = Math.max(1e-7, probs[predictedClass])
  const lossValue = -Math.log(pCorrect)

  const tl = gsap.timeline()

  // Step 1: Animate predicted bars
  const predState = { front: 0, rear: 0, interior: 0 }
  tl.to(predState, {
    front: probs.front, rear: probs.rear, interior: probs.interior,
    duration: 0.8,
    ease: 'power2.out',
    onUpdate: () => {
      classKeys.forEach(k => {
        const bar = document.getElementById(`loss-pred-${k}`)
        if (bar) bar.style.width = (predState[k] * 100).toFixed(1) + '%'
      })
    }
  })

  // Step 2: Animate ground truth bars
  const gtState = { front: 0, rear: 0, interior: 0 }
  tl.to(gtState, {
    ...groundTruth,
    duration: 0.6,
    ease: 'power2.out',
    onUpdate: () => {
      classKeys.forEach(k => {
        const bar = document.getElementById(`loss-gt-${k}`)
        if (bar) bar.style.width = (gtState[k] * 100).toFixed(1) + '%'
      })
    }
  }, '+=0.2')

  // Step 3: Show delta arrows and loss value
  tl.add(() => {
    const arrows = document.querySelectorAll('.loss-delta-arrow')
    gsap.fromTo(arrows, { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1, stagger: 0.1, duration: 0.3 })
  }, '+=0.3')

  // Step 4: Count up loss value
  const lossState = { v: 0 }
  tl.to(lossState, {
    v: lossValue,
    duration: 1.0,
    ease: 'power2.out',
    onUpdate: () => {
      const el = document.getElementById('loss-value-display')
      if (el) {
        el.textContent = lossState.v.toFixed(4)
        // Color: green (0) → orange (0.5) → red (1+)
        const t = Math.min(1, lossState.v)
        const r = Math.round(68 + t * 187)
        const g = Math.round(255 - t * 210)
        el.style.color = `rgb(${r},${g},50)`
      }
    }
  }, '-=0.5')

  // Step 5: Show formula
  tl.add(() => {
    const formula = document.getElementById('loss-formula-box')
    if (formula) {
      formula.innerHTML = `L = −log(p<sub>correct</sub>) = −log(${pCorrect.toFixed(4)}) = <strong>${lossValue.toFixed(4)}</strong>`
      gsap.fromTo(formula, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4 })
    }
  }, '+=0.2')
}
