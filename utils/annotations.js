// ─── Annotation / Tooltip System ────────────────────────────────────────────
// GSAP-driven callout bubbles with connector lines drawn on a fixed overlay canvas.

let overlayCanvas, overlayCtx
const activeAnnotations = new Map() // id → { bubbleEl, targetEl, line }

export function initAnnotations() {
  overlayCanvas = document.getElementById('annotation-overlay')
  if (!overlayCanvas) return
  overlayCtx = overlayCanvas.getContext('2d')
  resizeOverlay()
  window.addEventListener('resize', resizeOverlay)
  // Redraw connector lines on scroll
  window.addEventListener('scroll', redrawLines, { passive: true })
}

function resizeOverlay() {
  if (!overlayCanvas) return
  overlayCanvas.width = window.innerWidth
  overlayCanvas.height = window.innerHeight
  redrawLines()
}

/**
 * Show an annotation bubble.
 * @param {string} id - unique identifier
 * @param {HTMLElement} targetEl - element the annotation points to
 * @param {string} position - 'right' | 'left' | 'top' | 'bottom'
 */
export function showAnnotation(id, targetEl, position = 'right') {
  const bubble = document.getElementById(`annotation-${id}`)
  if (!bubble) return
  bubble.style.display = 'block'

  positionBubble(bubble, targetEl, position)

  gsap.fromTo(bubble,
    { opacity: 0, scale: 0.8, transformOrigin: getTransformOrigin(position) },
    { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.7)' }
  )

  activeAnnotations.set(id, { bubbleEl: bubble, targetEl, position })
  redrawLines()
}

export function hideAnnotation(id) {
  const entry = activeAnnotations.get(id)
  if (!entry) return
  gsap.to(entry.bubbleEl, {
    opacity: 0, scale: 0.8, duration: 0.2, ease: 'power2.in',
    onComplete: () => { entry.bubbleEl.style.display = 'none' }
  })
  activeAnnotations.delete(id)
  redrawLines()
}

export function hideAllAnnotations() {
  activeAnnotations.forEach((_, id) => hideAnnotation(id))
}

function positionBubble(bubble, targetEl, position) {
  const rect = targetEl.getBoundingClientRect()
  const bw = bubble.offsetWidth || 200
  const bh = bubble.offsetHeight || 60

  let left, top
  if (position === 'right') {
    left = rect.right + 20
    top = rect.top + rect.height / 2 - bh / 2
  } else if (position === 'left') {
    left = rect.left - bw - 20
    top = rect.top + rect.height / 2 - bh / 2
  } else if (position === 'top') {
    left = rect.left + rect.width / 2 - bw / 2
    top = rect.top - bh - 20
  } else {
    left = rect.left + rect.width / 2 - bw / 2
    top = rect.bottom + 20
  }

  // Clamp to viewport
  left = Math.max(8, Math.min(left, window.innerWidth - bw - 8))
  top = Math.max(8, Math.min(top, window.innerHeight - bh - 8))

  bubble.style.left = left + 'px'
  bubble.style.top = top + 'px'
}

function getTransformOrigin(position) {
  const map = { right: 'left center', left: 'right center', top: 'bottom center', bottom: 'top center' }
  return map[position] || 'left center'
}

function redrawLines() {
  if (!overlayCtx) return
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

  activeAnnotations.forEach(({ bubbleEl, targetEl, position }) => {
    if (bubbleEl.style.display === 'none') return
    const tRect = targetEl.getBoundingClientRect()
    const bRect = bubbleEl.getBoundingClientRect()

    // Anchor points
    let tx, ty, bx, by
    if (position === 'right') {
      tx = tRect.right; ty = tRect.top + tRect.height / 2
      bx = bRect.left; by = bRect.top + bRect.height / 2
    } else if (position === 'left') {
      tx = tRect.left; ty = tRect.top + tRect.height / 2
      bx = bRect.right; by = bRect.top + bRect.height / 2
    } else if (position === 'top') {
      tx = tRect.left + tRect.width / 2; ty = tRect.top
      bx = bRect.left + bRect.width / 2; by = bRect.bottom
    } else {
      tx = tRect.left + tRect.width / 2; ty = tRect.bottom
      bx = bRect.left + bRect.width / 2; by = bRect.top
    }

    // Dashed line
    overlayCtx.setLineDash([4, 4])
    overlayCtx.strokeStyle = 'rgba(0, 212, 255, 0.5)'
    overlayCtx.lineWidth = 1.5
    overlayCtx.beginPath()
    overlayCtx.moveTo(tx, ty)
    overlayCtx.lineTo(bx, by)
    overlayCtx.stroke()
    overlayCtx.setLineDash([])

    // Dot at target
    overlayCtx.fillStyle = '#00d4ff'
    overlayCtx.beginPath()
    overlayCtx.arc(tx, ty, 3, 0, Math.PI * 2)
    overlayCtx.fill()
  })
}
