import { generateFeatureMaps } from '../utils/mock-cnn.js'
import { viridisScale } from '../utils/canvas-helpers.js'

const GRID = 14 // input grid size for demo
const CELL = 14 // px per cell

export function initPooling() {
  const section = document.getElementById('stage-6')
  const state = {
    inputData: null,
    outputData: null,
    lastProgress: -1,
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=200%',
    pin: true,
    scrub: 1,
    onEnter: () => preparePoolState(state),
    onUpdate: self => renderPoolFrame(self.progress, state),
  })
}

function preparePoolState(state) {
  if (state.inputData) return
  const maps = generateFeatureMaps(1, GRID)
  state.inputData = maps[0]
  state.outputData = new Float32Array((GRID / 2) * (GRID / 2))

  // Compute full max pooling result
  const halfGrid = GRID / 2
  for (let wy = 0; wy < halfGrid; wy++) {
    for (let wx = 0; wx < halfGrid; wx++) {
      let maxVal = -Infinity
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const v = state.inputData[(wy*2+dy) * GRID + (wx*2+dx)]
          if (v > maxVal) maxVal = v
        }
      }
      state.outputData[wy * halfGrid + wx] = maxVal
    }
  }
}

function renderPoolFrame(progress, state) {
  if (!state.inputData) return
  if (Math.abs(progress - state.lastProgress) < 0.003) return
  state.lastProgress = progress

  const inputCanvas = document.getElementById('canvas-pool-input')
  const outputCanvas = document.getElementById('canvas-pool-output')
  const arrowCanvas = document.getElementById('canvas-pool-arrows')
  if (!inputCanvas || !outputCanvas) return

  const GAP = 2
  const halfGrid = GRID / 2
  const OCELL = CELL * 2 + GAP // output cell is larger (fewer cells)

  // Set canvas sizes
  const inputW = GRID * (CELL + GAP)
  const inputH = GRID * (CELL + GAP)
  inputCanvas.width = inputW; inputCanvas.height = inputH
  outputCanvas.width = halfGrid * (OCELL + GAP); outputCanvas.height = halfGrid * (OCELL + GAP)
  if (arrowCanvas) {
    arrowCanvas.width = 80; arrowCanvas.height = inputH
  }

  const ictx = inputCanvas.getContext('2d')
  const octx = outputCanvas.getContext('2d')

  // Normalize input
  let min = Infinity, max = -Infinity
  for (const v of state.inputData) { if (v < min) min = v; if (v > max) max = v }
  const range = max - min || 1

  // Draw full input grid
  ictx.fillStyle = '#0a0a12'
  ictx.fillRect(0, 0, inputW, inputH)
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const t = (state.inputData[row * GRID + col] - min) / range
      const [r, g, b] = viridisScale(t)
      ictx.fillStyle = `rgb(${r},${g},${b})`
      ictx.fillRect(col * (CELL + GAP), row * (CELL + GAP), CELL, CELL)
    }
  }

  const totalWindows = halfGrid * halfGrid
  const currentWindow = Math.floor(progress * totalWindows)

  // Draw output grid (visible windows so far)
  octx.fillStyle = '#0a0a12'
  octx.fillRect(0, 0, outputCanvas.width, outputCanvas.height)

  for (let i = 0; i < currentWindow; i++) {
    const wy = Math.floor(i / halfGrid)
    const wx = i % halfGrid
    const t = (state.outputData[i] - min) / range
    const [r, g, b] = viridisScale(t)
    octx.fillStyle = `rgb(${r},${g},${b})`
    octx.fillRect(wx * (OCELL + GAP), wy * (OCELL + GAP), OCELL, OCELL)
  }

  // Highlight current pooling window on input canvas
  if (currentWindow < totalWindows) {
    const wy = Math.floor(currentWindow / halfGrid)
    const wx = currentWindow % halfGrid

    // Highlight all 4 cells in window
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const row = wy * 2 + dy
        const col = wx * 2 + dx
        const t = (state.inputData[row * GRID + col] - min) / range
        const [r, g, b] = viridisScale(t)
        ictx.fillStyle = `rgb(${r},${g},${b})`
        ictx.fillRect(col * (CELL + GAP), row * (CELL + GAP), CELL, CELL)

        // White border on selected
        ictx.strokeStyle = '#ffffff88'
        ictx.lineWidth = 1.5
        ictx.strokeRect(col * (CELL + GAP), row * (CELL + GAP), CELL, CELL)
      }
    }

    // Find max cell
    let maxVal = -Infinity, maxDy = 0, maxDx = 0
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const v = state.inputData[(wy*2+dy) * GRID + (wx*2+dx)]
        if (v > maxVal) { maxVal = v; maxDy = dy; maxDx = dx }
      }
    }

    // Gold border on max cell
    const mrow = wy * 2 + maxDy, mcol = wx * 2 + maxDx
    ictx.strokeStyle = '#ffd700'
    ictx.lineWidth = 2.5
    ictx.shadowColor = '#ffd700'
    ictx.shadowBlur = 6
    ictx.strokeRect(mcol * (CELL + GAP), mrow * (CELL + GAP), CELL, CELL)
    ictx.shadowBlur = 0

    // Window border
    ictx.strokeStyle = '#00d4ff'
    ictx.lineWidth = 2
    ictx.shadowColor = '#00d4ff'
    ictx.shadowBlur = 8
    ictx.strokeRect(wx * 2 * (CELL + GAP) - 1, wy * 2 * (CELL + GAP) - 1, 2 * (CELL + GAP) + 1, 2 * (CELL + GAP) + 1)
    ictx.shadowBlur = 0
  }

  // "Done" glow at 100%
  if (progress >= 0.98) {
    octx.strokeStyle = '#44ff88'
    octx.lineWidth = 3
    octx.shadowColor = '#44ff88'
    octx.shadowBlur = 12
    octx.strokeRect(1, 1, outputCanvas.width - 2, outputCanvas.height - 2)
    octx.shadowBlur = 0
  }
}
