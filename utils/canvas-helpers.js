// ─── Color Scales ───────────────────────────────────────────────────────────

/**
 * Viridis approximation: dark blue → green → yellow
 * t: [0, 1]
 */
export function viridisScale(t) {
  const r = Math.round(68 + t * 187)
  const g = Math.round(1 + t * 222)
  const b = Math.round(84 + (t < 0.5 ? t * 80 : (1 - t) * 80))
  return [
    Math.min(255, Math.max(0, r)),
    Math.min(255, Math.max(0, g)),
    Math.min(255, Math.max(0, b))
  ]
}

/**
 * Diverging scale: blue (negative) → white (zero) → red (positive)
 * t: [0, 1], 0.5 = white
 */
export function divergingScale(t) {
  if (t < 0.5) {
    const s = t * 2
    return [Math.round(s * 255), Math.round(s * 255), 255]
  } else {
    const s = (t - 0.5) * 2
    return [255, Math.round((1 - s) * 255), Math.round((1 - s) * 255)]
  }
}

/**
 * Heat scale: black → red → yellow → white
 * t: [0, 1]
 */
export function heatScale(t) {
  if (t < 0.33) {
    const s = t / 0.33
    return [Math.round(s * 255), 0, 0]
  } else if (t < 0.66) {
    const s = (t - 0.33) / 0.33
    return [255, Math.round(s * 255), 0]
  } else {
    const s = (t - 0.66) / 0.34
    return [255, 255, Math.round(s * 255)]
  }
}

// ─── Drawing Primitives ──────────────────────────────────────────────────────

/**
 * Draw a heatmap grid on a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} data - flat array of values
 * @param {number} gridW - number of columns
 * @param {number} gridH - number of rows
 * @param {number} cellSize - pixel size of each cell
 * @param {function} colorScale - function(t: 0-1) => [r,g,b]
 * @param {number} [visibleCount] - how many cells to draw (for animation)
 */
export function drawHeatmap(ctx, data, gridW, gridH, cellSize, colorScale, visibleCount = Infinity) {
  const gap = 1
  let min = Infinity, max = -Infinity
  const count = Math.min(data.length, gridW * gridH)
  for (let i = 0; i < count; i++) {
    if (data[i] < min) min = data[i]
    if (data[i] > max) max = data[i]
  }
  const range = max - min || 1

  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const idx = row * gridW + col
      if (idx >= visibleCount) return
      const t = (data[idx] - min) / range
      const [r, g, b] = colorScale(Math.max(0, Math.min(1, t)))
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(col * (cellSize + gap), row * (cellSize + gap), cellSize, cellSize)
    }
  }
}

/**
 * Draw a 3x3 kernel visualization.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} kernelData - 9 values
 * @param {number} x - top-left x
 * @param {number} y - top-left y
 * @param {number} cellSize
 */
export function drawKernel(ctx, kernelData, x, y, cellSize) {
  const gap = 2
  let min = Infinity, max = -Infinity
  for (const v of kernelData) { if (v < min) min = v; if (v > max) max = v }
  const range = Math.max(Math.abs(min), Math.abs(max)) || 1

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const v = kernelData[row * 3 + col]
      const t = (v / range + 1) / 2 // normalize to [0,1], 0.5 = zero
      const [r, g, b] = divergingScale(t)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x + col * (cellSize + gap), y + row * (cellSize + gap), cellSize, cellSize)
      // value label
      ctx.fillStyle = Math.abs(v) > range * 0.5 ? '#fff' : '#333'
      ctx.font = `${Math.floor(cellSize * 0.3)}px JetBrains Mono, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(v.toFixed(1), x + col * (cellSize + gap) + cellSize / 2, y + row * (cellSize + gap) + cellSize / 2)
    }
  }

  // Glowing border
  ctx.strokeStyle = '#ffdd00'
  ctx.lineWidth = 2
  ctx.shadowColor = '#ffdd00'
  ctx.shadowBlur = 8
  ctx.strokeRect(x - 1, y - 1, 3 * (cellSize + gap) - gap + 2, 3 * (cellSize + gap) - gap + 2)
  ctx.shadowBlur = 0
}

/**
 * Draw a kernel overlay highlight on input canvas (no values, just border).
 */
export function drawKernelOverlay(ctx, x, y, size) {
  ctx.strokeStyle = '#ffdd00'
  ctx.lineWidth = 2
  ctx.shadowColor = '#ffdd00'
  ctx.shadowBlur = 10
  ctx.strokeRect(x, y, size, size)
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,221,0,0.15)'
  ctx.fillRect(x, y, size, size)
}

/**
 * Draw an arrow from (x1,y1) to (x2,y2).
 */
export function drawArrow(ctx, x1, y1, x2, y2, color = '#00d4ff', width = 2, headSize = 8) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

/**
 * Draw a glowing line segment.
 */
export function drawGlowLine(ctx, x1, y1, x2, y2, color, width = 1.5) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.shadowColor = color
  ctx.shadowBlur = 6
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.shadowBlur = 0
}

// ─── Math Utilities ──────────────────────────────────────────────────────────

export function lerp(a, b, t) { return a + (b - a) * t }
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
export function normalizeArray(arr) {
  let min = Infinity, max = -Infinity
  for (const v of arr) { if (v < min) min = v; if (v > max) max = v }
  const range = max - min || 1
  return arr.map(v => (v - min) / range)
}

/**
 * Convert a flat normalized float array to ImageData (grayscale).
 */
export function floatArrayToImageData(arr, w, h) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const v = Math.round(clamp(arr[i], 0, 1) * 255)
    data[i * 4] = v
    data[i * 4 + 1] = v
    data[i * 4 + 2] = v
    data[i * 4 + 3] = 255
  }
  return new ImageData(data, w, h)
}

/**
 * Compute convolution at position (cx, cy) in the imageData.
 * @param {ImageData} imageData
 * @param {number} cx - kernel top-left x
 * @param {number} cy - kernel top-left y
 * @param {number[]} kernel - 9-element array (3x3)
 * @param {number} channel - 0=R, 1=G, 2=B
 */
export function computeConvAt(imageData, cx, cy, kernel, channel = 0) {
  const { data, width } = imageData
  let sum = 0
  for (let ky = 0; ky < 3; ky++) {
    for (let kx = 0; kx < 3; kx++) {
      const px = (cy + ky) * width + (cx + kx)
      sum += (data[px * 4 + channel] / 255) * kernel[ky * 3 + kx]
    }
  }
  return sum
}
