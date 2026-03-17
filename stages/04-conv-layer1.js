import { appState } from '../main.js'
import { computeConvAt, drawKernelOverlay, drawKernel, normalizeArray, floatArrayToImageData, viridisScale, divergingScale } from '../utils/canvas-helpers.js'
import { getKernels } from '../utils/mock-cnn.js'
import { showAnnotation } from '../utils/annotations.js'

const WORK_SIZE = 64 // working region size for performance
const KERNEL_NAMES = ['Horizontal Edges', 'Vertical Edges', 'Blur / Smooth']
const KERNEL_COLORS = ['#00d4ff', '#ff6b35', '#44ff88']

export function initConvLayer1() {
  const section = document.getElementById('stage-4')

  const state = {
    inputImageData: null,
    kernels: getKernels(1),
    outputBuffers: [null, null, null],
    lastProgress: -1,
    lastIdx: -1,
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: true,
    onEnter: () => prepareConvState(state),
    onUpdate: self => renderConvFrame(self.progress, state),
  })
}

function prepareConvState(state) {
  if (state.inputImageData) return // already prepared
  if (!appState.rawImageData) {
    // Use a fallback synthetic pattern if no image uploaded
    const canvas = document.createElement('canvas')
    canvas.width = 64; canvas.height = 64
    const ctx = canvas.getContext('2d')
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const v = Math.floor(128 + 127 * Math.sin(x * 0.3) * Math.cos(y * 0.3))
        ctx.fillStyle = `rgb(${v},${v},${v})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
    state.inputImageData = ctx.getImageData(0, 0, 64, 64)
  } else {
    // Crop 64x64 from center of preprocessed image
    const src = document.createElement('canvas')
    src.width = 64; src.height = 64
    const srcCtx = src.getContext('2d')
    const tmp = document.createElement('canvas')
    tmp.width = 224; tmp.height = 224
    tmp.getContext('2d').putImageData(appState.rawImageData, 0, 0)
    srcCtx.drawImage(tmp, 80, 80, 64, 64, 0, 0, 64, 64)
    state.inputImageData = srcCtx.getImageData(0, 0, 64, 64)
  }

  const outSize = (WORK_SIZE - 3 + 1) * (WORK_SIZE - 3 + 1) // 62*62 = 3844
  state.outputBuffers = state.kernels.map(() => new Float32Array(outSize))
  state.lastIdx = -1

  // Draw input canvas
  const inputCanvas = document.getElementById('canvas-conv1-input')
  if (inputCanvas) {
    inputCanvas.width = WORK_SIZE * 3; inputCanvas.height = WORK_SIZE * 3
    const ctx = inputCanvas.getContext('2d')
    const scaled = document.createElement('canvas')
    scaled.width = WORK_SIZE * 3; scaled.height = WORK_SIZE * 3
    const sCtx = scaled.getContext('2d')
    const tmp = document.createElement('canvas')
    tmp.width = 64; tmp.height = 64
    tmp.getContext('2d').putImageData(state.inputImageData, 0, 0)
    sCtx.imageSmoothingEnabled = false
    sCtx.drawImage(tmp, 0, 0, WORK_SIZE * 3, WORK_SIZE * 3)
    ctx.drawImage(scaled, 0, 0)
    state.scaledInputCanvas = scaled
  }
}

function renderConvFrame(progress, state) {
  if (!state.inputImageData) return
  if (Math.abs(progress - state.lastProgress) < 0.001) return
  state.lastProgress = progress

  const OUT_W = WORK_SIZE - 2 // 62
  const OUT_H = WORK_SIZE - 2
  const totalPositions = OUT_W * OUT_H // 3844
  const currentIdx = Math.floor(progress * totalPositions)
  const SCALE = 3

  // Compute convolution incrementally
  const start = Math.max(0, state.lastIdx + 1)
  for (let idx = start; idx <= Math.min(currentIdx, totalPositions - 1); idx++) {
    const cy = Math.floor(idx / OUT_W)
    const cx = idx % OUT_W
    state.kernels.forEach((kernel, ki) => {
      state.outputBuffers[ki][idx] = Math.max(0, computeConvAt(state.inputImageData, cx, cy, kernel))
    })
  }
  state.lastIdx = Math.min(currentIdx, totalPositions - 1)

  // Redraw input canvas with kernel overlay at current position
  const inputCanvas = document.getElementById('canvas-conv1-input')
  if (inputCanvas && state.scaledInputCanvas) {
    const ctx = inputCanvas.getContext('2d')
    ctx.drawImage(state.scaledInputCanvas, 0, 0)
    const cy = Math.floor(currentIdx / OUT_W)
    const cx = currentIdx % OUT_W
    drawKernelOverlay(ctx, cx * SCALE, cy * SCALE, 3 * SCALE)
  }

  // Update output canvases for all 3 kernels
  const visiblePx = Math.min(state.lastIdx + 1, totalPositions)
  state.kernels.forEach((_, ki) => {
    const outCanvas = document.getElementById(`canvas-conv1-out-${ki}`)
    if (!outCanvas) return
    outCanvas.width = OUT_W * SCALE; outCanvas.height = OUT_H * SCALE

    const ctx = outCanvas.getContext('2d')
    ctx.fillStyle = '#0a0a12'
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height)

    // Render computed pixels
    const buf = state.outputBuffers[ki]
    let max = 0
    for (let i = 0; i < visiblePx; i++) if (buf[i] > max) max = buf[i]
    if (max === 0) return

    const imgData = ctx.createImageData(OUT_W, OUT_H)
    for (let i = 0; i < visiblePx; i++) {
      const v = Math.min(255, Math.round((buf[i] / max) * 255))
      imgData.data[i * 4] = v
      imgData.data[i * 4 + 1] = v
      imgData.data[i * 4 + 2] = v
      imgData.data[i * 4 + 3] = 255
    }
    const tmp = document.createElement('canvas')
    tmp.width = OUT_W; tmp.height = OUT_H
    tmp.getContext('2d').putImageData(imgData, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, 0, 0, OUT_W * SCALE, OUT_H * SCALE)
  })

  // Show kernel visualization panels
  state.kernels.forEach((kernel, ki) => {
    const kCanvas = document.getElementById(`canvas-kernel-${ki}`)
    if (!kCanvas) return
    kCanvas.width = 100; kCanvas.height = 100
    const ctx = kCanvas.getContext('2d')
    ctx.fillStyle = '#12121e'
    ctx.fillRect(0, 0, 100, 100)
    drawKernel(ctx, kernel, 5, 5, 26)
  })

  // Show kernel name annotation at mid-progress
  if (progress > 0.45 && progress < 0.55) {
    const el = document.getElementById('canvas-conv1-input')
    if (el) showAnnotation('conv1-edge', el, 'right')
  }
}
