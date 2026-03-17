import { appState } from '../main.js'
import { computeConvAt, drawKernel, drawHeatmap, viridisScale } from '../utils/canvas-helpers.js'
import { getKernels, generateFeatureMaps } from '../utils/mock-cnn.js'
import { showAnnotation } from '../utils/annotations.js'

const WORK_SIZE = 28 // post-pool1 size
const KERNEL_NAMES = ['Curve Detector', 'Corner Detector', 'Part Detector']

export function initConvLayer2() {
  const section = document.getElementById('stage-5')
  const state = {
    inputData: null,
    kernels: getKernels(2),
    outputBuffers: [null, null, null],
    lastIdx: -1,
    lastProgress: -1,
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: true,
    onEnter: () => prepareLayer2State(state),
    onUpdate: self => renderLayer2Frame(self.progress, state),
  })
}

function prepareLayer2State(state) {
  if (state.inputData) return
  // Generate plausible layer-1 feature map output as input to layer 2
  const maps = generateFeatureMaps(1, WORK_SIZE)
  const flatData = maps[0]

  // Convert to ImageData for convAt
  const canvas = document.createElement('canvas')
  canvas.width = WORK_SIZE; canvas.height = WORK_SIZE
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(WORK_SIZE, WORK_SIZE)
  for (let i = 0; i < WORK_SIZE * WORK_SIZE; i++) {
    const v = Math.round(Math.max(0, Math.min(1, flatData[i])) * 255)
    imgData.data[i*4] = v; imgData.data[i*4+1] = v; imgData.data[i*4+2] = v; imgData.data[i*4+3] = 255
  }
  ctx.putImageData(imgData, 0, 0)
  state.inputData = ctx.getImageData(0, 0, WORK_SIZE, WORK_SIZE)

  const OUT_W = WORK_SIZE - 2
  state.outputBuffers = state.kernels.map(() => new Float32Array(OUT_W * OUT_W))
  state.lastIdx = -1

  // Draw input canvas (feature map heatmap)
  const inputCanvas = document.getElementById('canvas-conv2-input')
  if (inputCanvas) {
    const SCALE = 6
    inputCanvas.width = WORK_SIZE * SCALE; inputCanvas.height = WORK_SIZE * SCALE
    const ictx = inputCanvas.getContext('2d')
    const vals = Array.from(flatData)
    const tmp = document.createElement('canvas')
    tmp.width = WORK_SIZE; tmp.height = WORK_SIZE
    const tctx = tmp.getContext('2d')
    // Draw viridis heatmap at small size, then scale up
    for (let y = 0; y < WORK_SIZE; y++) {
      for (let x = 0; x < WORK_SIZE; x++) {
        const t = Math.max(0, Math.min(1, flatData[y * WORK_SIZE + x]))
        const [r, g, b] = viridisScale(t)
        tctx.fillStyle = `rgb(${r},${g},${b})`
        tctx.fillRect(x, y, 1, 1)
      }
    }
    ictx.imageSmoothingEnabled = false
    ictx.drawImage(tmp, 0, 0, WORK_SIZE * SCALE, WORK_SIZE * SCALE)
    state.scaledInputCanvas = inputCanvas
  }
}

function renderLayer2Frame(progress, state) {
  if (!state.inputData) return
  if (Math.abs(progress - state.lastProgress) < 0.002) return
  state.lastProgress = progress

  const OUT_W = WORK_SIZE - 2 // 26
  const totalPositions = OUT_W * OUT_W
  const currentIdx = Math.floor(progress * totalPositions)
  const SCALE = 6

  // Incremental convolution
  const start = Math.max(0, state.lastIdx + 1)
  for (let idx = start; idx <= Math.min(currentIdx, totalPositions - 1); idx++) {
    const cy = Math.floor(idx / OUT_W)
    const cx = idx % OUT_W
    state.kernels.forEach((kernel, ki) => {
      state.outputBuffers[ki][idx] = Math.max(0, computeConvAt(state.inputData, cx, cy, kernel))
    })
  }
  state.lastIdx = Math.min(currentIdx, totalPositions - 1)

  // Draw output canvases using viridis colormap
  const visiblePx = Math.min(state.lastIdx + 1, totalPositions)
  state.kernels.forEach((_, ki) => {
    const outCanvas = document.getElementById(`canvas-conv2-out-${ki}`)
    if (!outCanvas) return
    outCanvas.width = OUT_W * SCALE; outCanvas.height = OUT_W * SCALE
    const ctx = outCanvas.getContext('2d')
    ctx.fillStyle = '#0a0a12'
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height)

    const buf = state.outputBuffers[ki]
    let max = 0
    for (let i = 0; i < visiblePx; i++) if (buf[i] > max) max = buf[i]
    if (max === 0) return

    const tmp = document.createElement('canvas')
    tmp.width = OUT_W; tmp.height = OUT_W
    const tctx = tmp.getContext('2d')
    const imgD = tctx.createImageData(OUT_W, OUT_W)
    for (let i = 0; i < visiblePx; i++) {
      const t = buf[i] / max
      const [r, g, b] = viridisScale(t)
      imgD.data[i*4] = r; imgD.data[i*4+1] = g; imgD.data[i*4+2] = b; imgD.data[i*4+3] = 255
    }
    tctx.putImageData(imgD, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, 0, 0, OUT_W * SCALE, OUT_W * SCALE)
  })

  // Kernel panels
  state.kernels.forEach((kernel, ki) => {
    const kCanvas = document.getElementById(`canvas-kernel2-${ki}`)
    if (!kCanvas) return
    kCanvas.width = 90; kCanvas.height = 90
    const ctx = kCanvas.getContext('2d')
    ctx.fillStyle = '#12121e'
    ctx.fillRect(0, 0, 90, 90)
    drawKernel(ctx, kernel, 5, 5, 22)
  })

  if (progress > 0.5) {
    const el = document.getElementById('stage-5')
    if (el) showAnnotation('conv2-abstract', el, 'right')
  }
}
