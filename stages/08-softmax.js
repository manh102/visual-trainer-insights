import { appState } from '../main.js'
import { classifyCarImage } from '../utils/mock-cnn.js'

export function initSoftmax() {
  ScrollTrigger.create({
    trigger: document.getElementById('stage-8'),
    start: 'top 65%',
    onEnter: () => animateSoftmax(),
    once: true,
  })
}

function animateSoftmax() {
  const probs = classifyCarImage(appState.rawImageData)
  appState.probabilities = probs

  const entries = [
    { key: 'front', label: 'Mặt trước xe', id: 'prob-front' },
    { key: 'rear', label: 'Mặt sau xe', id: 'prob-rear' },
    { key: 'interior', label: 'Nội thất xe', id: 'prob-interior' },
  ]

  // Find winner
  let winnerKey = 'front'
  entries.forEach(e => { if (probs[e.key] > probs[winnerKey]) winnerKey = e.key })
  appState.predictedClass = winnerKey

  const state = { front: 0, rear: 0, interior: 0 }
  gsap.to(state, {
    front: probs.front,
    rear: probs.rear,
    interior: probs.interior,
    duration: 1.5,
    ease: 'power2.out',
    onUpdate: () => {
      entries.forEach(e => {
        const fill = document.getElementById(`${e.id}-fill`)
        const pct = document.getElementById(`${e.id}-pct`)
        if (fill) fill.style.width = (state[e.key] * 100).toFixed(1) + '%'
        if (pct) pct.textContent = Math.round(state[e.key] * 100) + '%'
      })
    },
    onComplete: () => {
      // Highlight winner
      const winnerFill = document.getElementById(`prob-${winnerKey}-fill`)
      if (winnerFill) winnerFill.classList.add('winner')

      // Show prediction label
      const predLabel = document.getElementById('predicted-class-label')
      const predValue = document.getElementById('predicted-class-value')
      if (predLabel) {
        const names = { front: 'Mặt trước xe', rear: 'Mặt sau xe', interior: 'Nội thất xe' }
        predValue.textContent = names[winnerKey]
        gsap.to(predLabel, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' })
      }

      // Show softmax annotation
      const el = document.getElementById('stage-8')
      if (el) {
        setTimeout(() => {
          const bubble = document.getElementById('annotation-softmax')
          if (bubble) {
            bubble.style.display = 'block'
            gsap.fromTo(bubble, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' })
          }
        }, 400)
      }
    }
  })
}
