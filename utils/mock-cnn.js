// ─── Mock CNN Data Generator ─────────────────────────────────────────────────
// Provides simulated data for all stages without a real backend.

/**
 * Generate mock loss curve for N epochs.
 * loss(e) = 2.3 * exp(-0.08*e) + 0.1 + noise
 */
export function generateLossCurve(epochs = 50, noiseAmp = 0.04) {
  const losses = []
  for (let e = 0; e < epochs; e++) {
    const noise = (Math.random() - 0.5) * noiseAmp
    losses.push(2.3 * Math.exp(-0.08 * e) + 0.1 + noise)
  }
  return losses
}

/**
 * Generate validation loss curve (starts following train, then diverges slightly).
 */
export function generateValLossCurve(trainLosses) {
  return trainLosses.map((v, i) => {
    const diverge = i > 30 ? (i - 30) * 0.008 : 0
    return v + 0.05 + diverge + (Math.random() - 0.5) * 0.06
  })
}

/**
 * Generate accuracy curve (0–1) for N epochs.
 * Starts near random (33% for 3-class) and rises to ~94%.
 */
export function generateAccCurve(epochs = 50) {
  return Array.from({ length: epochs }, (_, e) => {
    const noise = (Math.random() - 0.5) * 0.03
    return Math.min(0.98, 0.33 + (0.94 - 0.33) * (1 - Math.exp(-0.1 * e)) + noise)
  })
}

/**
 * Classify car image heuristically using ImageData.
 * Returns probabilities for [front, rear, interior].
 */
export function classifyCarImage(imageData) {
  if (!imageData) return { front: 0.60, rear: 0.25, interior: 0.15 }

  const { data, width, height } = imageData
  let totalR = 0, totalG = 0, totalB = 0
  let centerBrightness = 0
  const cx = Math.floor(width / 2), cy = Math.floor(height / 2)
  const sampleRadius = Math.floor(Math.min(width, height) / 4)

  // Sample pixels
  let sampleCount = 0
  for (let y = 0; y < height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4
      totalR += data[idx]
      totalG += data[idx + 1]
      totalB += data[idx + 2]
      // Check center region brightness
      if (Math.abs(x - cx) < sampleRadius && Math.abs(y - cy) < sampleRadius) {
        centerBrightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        sampleCount++
      }
    }
  }

  const pixelCount = (width / 4) * (height / 4)
  const avgR = totalR / pixelCount / 255
  const avgG = totalG / pixelCount / 255
  const avgB = totalB / pixelCount / 255
  const avgCenterBright = centerBrightness / sampleCount / 255

  // Heuristics:
  // - Interiors tend to have higher center brightness (dashboard/windshield) and more warm tones
  // - Front/rear tend to be more symmetric with darker centers (grille area)
  let frontScore = 0.4
  let rearScore = 0.3
  let interiorScore = 0.3

  // High center brightness → interior (reflected light from windows)
  if (avgCenterBright > 0.55) { interiorScore += 0.3; frontScore -= 0.1; rearScore -= 0.1 }

  // More red/warm tones → interior (leather, wood trim)
  if (avgR > avgB + 0.05) { interiorScore += 0.15; frontScore -= 0.05; rearScore -= 0.05 }

  // Very uniform blue tones → front (sky reflection on hood)
  if (avgB > avgR && avgB > avgG) { frontScore += 0.15; rearScore += 0.1; interiorScore -= 0.15 }

  // Normalize to sum to 1
  const total = frontScore + rearScore + interiorScore
  return {
    front: Math.max(0.05, frontScore / total),
    rear: Math.max(0.05, rearScore / total),
    interior: Math.max(0.05, interiorScore / total)
  }
}

/**
 * Generate simulated feature maps (random but plausible looking).
 * Returns a 2D array: [numMaps][mapSize * mapSize]
 */
export function generateFeatureMaps(numMaps, mapSize) {
  return Array.from({ length: numMaps }, () => {
    const data = new Float32Array(mapSize * mapSize)
    // Add some structure using sine waves (mimics edge detectors)
    const freqX = 1 + Math.random() * 3
    const freqY = 1 + Math.random() * 3
    const phase = Math.random() * Math.PI * 2
    for (let i = 0; i < mapSize * mapSize; i++) {
      const x = i % mapSize
      const y = Math.floor(i / mapSize)
      data[i] = Math.max(0,
        0.5 * Math.sin(freqX * x / mapSize * Math.PI * 2 + phase) +
        0.5 * Math.sin(freqY * y / mapSize * Math.PI * 2 + phase) +
        (Math.random() - 0.5) * 0.3
      )
    }
    return data
  })
}

/**
 * Generate mock kernel weights for a specific layer.
 * Layer 1: Sobel-like (edge detectors)
 * Layer 2: More complex patterns
 */
export function getKernels(layer = 1) {
  if (layer === 1) return [
    // Sobel horizontal (detects horizontal edges)
    [-1, -2, -1,  0,  0,  0,  1,  2,  1],
    // Sobel vertical (detects vertical edges)
    [-1,  0,  1, -2,  0,  2, -1,  0,  1],
    // Gaussian blur (smoothing)
    [1/16, 2/16, 1/16, 2/16, 4/16, 2/16, 1/16, 2/16, 1/16],
  ]
  // Layer 2: more abstract patterns
  return [
    [ 0, -1,  1, -1,  0,  1, -1,  1,  0],  // diagonal
    [ 1,  1, -1,  1, -2,  1, -1,  1,  1],  // center-surround
    [-1,  0,  1,  0,  0,  0,  1,  0, -1],  // corner detector
  ]
}

/**
 * Generate weight delta values for weight update visualization.
 * Returns { old: number[], delta: number[], new: number[] }
 */
export function generateWeightUpdate(kernelData, learningRate = 0.001) {
  const old = [...kernelData]
  const gradients = kernelData.map(() => (Math.random() - 0.5) * 2)
  const delta = gradients.map(g => -learningRate * g)
  const updated = old.map((w, i) => w + delta[i])
  return { old, gradients, delta, updated }
}

/**
 * Generate simulated node activations for FC layer.
 */
export function generateFCActivations(numNodes = 256) {
  return Array.from({ length: numNodes }, () => Math.max(0, Math.random()))
}
