import { appState } from '../main.js'
import { drawHeatmap, viridisScale } from '../utils/canvas-helpers.js'
import { showAnnotation } from '../utils/annotations.js'

export function initPreprocessing() {
  const section = document.getElementById('stage-2')
  const canvasOrig = document.getElementById('canvas-preproc-orig')
  const canvasResized = document.getElementById('canvas-preproc-resized')
  const canvasHeatmap = document.getElementById('canvas-normalize')

  // ScrollTrigger: pin + scrub
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=200%',
    pin: true,
    scrub: 1,
    onUpdate: self => renderPreprocessing(self.progress, canvasOrig, canvasResized, canvasHeatmap),
    onEnter: () => {
      // Draw original image once
      if (appState.rawImageData) {
        const ctx = canvasOrig.getContext('2d')
        canvasOrig.width = 224; canvasOrig.height = 224
        ctx.putImageData(appState.rawImageData, 0, 0)
      }
    }
  })
}

function renderPreprocessing(progress, canvasOrig, canvasResized, canvasHeatmap) {
  if (!appState.rawImageData) return

  // Phase 0-0.3: show original
  if (progress < 0.05) {
    gsap.set('#preproc-label-orig', { opacity: Math.min(1, progress / 0.05) })
    return
  }

  // Phase 0.3-0.6: resize animation
  if (progress < 0.6) {
    const p = (progress - 0.05) / 0.55
    gsap.set('#preproc-label-resize', { opacity: Math.min(1, p * 3) })
    drawResizeAnimation(canvasResized, appState.rawImageData, p)
    return
  }

  // Phase 0.6-1.0: normalization heatmap
  {
    const p = (progress - 0.6) / 0.4
    gsap.set('#preproc-label-norm', { opacity: Math.min(1, p * 3) })
    drawResizeAnimation(canvasResized, appState.rawImageData, 1)
    drawNormalizationHeatmap(canvasHeatmap, appState.rawImageData, p)

    if (p > 0.9) {
      const el = document.getElementById('preproc-norm-canvas-wrap')
      if (el) showAnnotation('imagenet-norm', el, 'right')
    }
  }
}

function drawResizeAnimation(canvas, imageData, progress) {
  canvas.width = 224; canvas.height = 224
  const ctx = canvas.getContext('2d')

  // Draw the 224x224 preprocessed image
  const src = document.createElement('canvas')
  src.width = 224; src.height = 224
  src.getContext('2d').putImageData(imageData, 0, 0)

  // Animate: grid reveal from top-left
  if (progress >= 1) {
    ctx.drawImage(src, 0, 0)
    return
  }

  const gridSize = 16 // 16x16 grid of tiles
  const tileW = 224 / gridSize
  const tileH = 224 / gridSize
  const totalTiles = gridSize * gridSize
  const visibleTiles = Math.floor(progress * totalTiles)

  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, 224, 224)

  for (let i = 0; i < visibleTiles; i++) {
    const row = Math.floor(i / gridSize)
    const col = i % gridSize
    ctx.drawImage(src, col * tileW, row * tileH, tileW, tileH, col * tileW, row * tileH, tileW, tileH)
  }
}

function drawNormalizationHeatmap(canvas, imageData, progress) {
  const GRID = 28
  canvas.width = GRID * 9; canvas.height = GRID * 9
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0a0a12'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Sample 28x28 from green channel, normalize
  const { data, width, height } = imageData
  const stepX = Math.floor(width / GRID)
  const stepY = Math.floor(height / GRID)
  const values = []

  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const px = Math.min(gy * stepY, height - 1) * width + Math.min(gx * stepX, width - 1)
      // ImageNet normalization: (x/255 - 0.456) / 0.224
      const normalized = (data[px * 4 + 1] / 255 - 0.456) / 0.224
      // Map from [-2, 2] to [0, 1] for display
      values.push((normalized + 2) / 4)
    }
  }

  const visibleCount = Math.floor(progress * GRID * GRID)
  drawHeatmap(ctx, values, GRID, GRID, 8, viridisScale, visibleCount)
}
