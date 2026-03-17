import { appState } from '../main.js'

export function initInput() {
  const zone = document.getElementById('upload-zone')
  const fileInput = document.getElementById('file-input')
  const previewCanvas = document.getElementById('canvas-input-preview')
  const previewCtx = previewCanvas.getContext('2d')

  // Drag-and-drop
  zone.addEventListener('dragover', e => {
    e.preventDefault()
    zone.classList.add('dragover')
  })
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'))
  zone.addEventListener('drop', e => {
    e.preventDefault()
    zone.classList.remove('dragover')
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) loadFile(file)
  })

  zone.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadFile(fileInput.files[0])
  })

  // Sample image buttons
  document.querySelectorAll('.sample-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      loadSampleImage(btn.dataset.sample)
    })
  })

  function loadFile(file) {
    const url = URL.createObjectURL(file)
    loadImageFromURL(url)
  }

  function loadSampleImage(type) {
    // Generate a synthetic placeholder canvas image for each car type
    const offscreen = document.createElement('canvas')
    offscreen.width = 224; offscreen.height = 224
    const ctx = offscreen.getContext('2d')
    drawSyntheticCar(ctx, type, 224, 224)
    offscreen.toBlob(blob => loadFile(blob))
  }

  function loadImageFromURL(url) {
    const img = new Image()
    img.onload = () => {
      // Draw into preview canvas (fit to 300x225)
      const W = 300, H = 225
      previewCanvas.width = W; previewCanvas.height = H
      previewCtx.drawImage(img, 0, 0, W, H)

      // Extract raw ImageData at 224x224 for processing
      const offscreen = document.createElement('canvas')
      offscreen.width = 224; offscreen.height = 224
      offscreen.getContext('2d').drawImage(img, 0, 0, 224, 224)
      appState.rawImageData = offscreen.getContext('2d').getImageData(0, 0, 224, 224)
      appState.imageLoaded = true

      showPreview()
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  function showPreview() {
    const wrap = document.getElementById('input-preview-wrap')
    wrap.style.display = 'block'
    gsap.fromTo(wrap, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })

    // Show proceed indicator
    const hint = document.getElementById('stage1-scroll-hint')
    if (hint) gsap.to(hint, { opacity: 1, duration: 0.4, delay: 0.4 })
  }
}

/**
 * Draw a synthetic car illustration for demo purposes.
 */
function drawSyntheticCar(ctx, type, w, h) {
  // Background sky/road
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#87ceeb')
  grad.addColorStop(0.6, '#d4e8f5')
  grad.addColorStop(0.6, '#555')
  grad.addColorStop(1, '#333')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  if (type === 'front') {
    // Car body
    ctx.fillStyle = '#c0392b'
    ctx.beginPath()
    ctx.roundRect(30, 90, 164, 80, 10)
    ctx.fill()
    // Roof
    ctx.fillStyle = '#a93226'
    ctx.beginPath()
    ctx.moveTo(60, 90); ctx.lineTo(80, 50); ctx.lineTo(144, 50); ctx.lineTo(164, 90)
    ctx.closePath()
    ctx.fill()
    // Windshield
    ctx.fillStyle = 'rgba(135,206,235,0.7)'
    ctx.beginPath()
    ctx.moveTo(65, 88); ctx.lineTo(82, 55); ctx.lineTo(142, 55); ctx.lineTo(159, 88)
    ctx.closePath()
    ctx.fill()
    // Headlights
    ctx.fillStyle = '#fff5c0'
    ctx.shadowColor = 'rgba(255,255,200,0.8)'
    ctx.shadowBlur = 15
    ctx.fillRect(35, 110, 30, 18)
    ctx.fillRect(159, 110, 30, 18)
    ctx.shadowBlur = 0
    // Grille
    ctx.fillStyle = '#222'
    ctx.fillRect(70, 130, 84, 30)
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 2
    for (let gx = 74; gx < 150; gx += 10) { ctx.beginPath(); ctx.moveTo(gx, 132); ctx.lineTo(gx, 158); ctx.stroke() }
    // Wheels
    ctx.fillStyle = '#222'
    ctx.beginPath(); ctx.arc(65, 170, 22, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(159, 170, 22, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#888'
    ctx.beginPath(); ctx.arc(65, 170, 12, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(159, 170, 12, 0, Math.PI * 2); ctx.fill()
  } else if (type === 'rear') {
    // Car body
    ctx.fillStyle = '#2980b9'
    ctx.beginPath(); ctx.roundRect(30, 90, 164, 80, 10); ctx.fill()
    // Rear window
    ctx.fillStyle = 'rgba(135,206,235,0.6)'
    ctx.beginPath()
    ctx.moveTo(65, 88); ctx.lineTo(82, 55); ctx.lineTo(142, 55); ctx.lineTo(159, 88)
    ctx.closePath(); ctx.fill()
    // Taillights
    ctx.fillStyle = '#ff2222'
    ctx.shadowColor = 'rgba(255,50,50,0.7)'
    ctx.shadowBlur = 12
    ctx.fillRect(35, 110, 28, 20)
    ctx.fillRect(161, 110, 28, 20)
    ctx.shadowBlur = 0
    // License plate
    ctx.fillStyle = '#fff'
    ctx.fillRect(85, 145, 54, 22)
    ctx.fillStyle = '#222'
    ctx.font = '11px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('ABC 123', 112, 160)
    // Wheels
    ctx.fillStyle = '#222'
    ctx.beginPath(); ctx.arc(65, 170, 22, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(159, 170, 22, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#888'
    ctx.beginPath(); ctx.arc(65, 170, 12, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(159, 170, 12, 0, Math.PI * 2); ctx.fill()
  } else {
    // Interior
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, w, h)
    // Dashboard
    ctx.fillStyle = '#2c2c2c'
    ctx.beginPath(); ctx.roundRect(10, 100, 204, 80, 6); ctx.fill()
    // Steering wheel
    ctx.strokeStyle = '#555'
    ctx.lineWidth = 8
    ctx.beginPath(); ctx.arc(80, 155, 32, 0, Math.PI * 2); ctx.stroke()
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(80, 123); ctx.lineTo(80, 155); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(48, 155); ctx.lineTo(80, 155); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(112, 155); ctx.lineTo(80, 155); ctx.stroke()
    // Speedometer
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(160, 135, 25, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#fff5c0'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('120', 160, 138)
    ctx.fillText('km/h', 160, 148)
    // Seats
    ctx.fillStyle = '#3a2f2f'
    ctx.beginPath(); ctx.roundRect(20, 175, 80, 50, 6); ctx.fill()
    ctx.beginPath(); ctx.roundRect(124, 175, 80, 50, 6); ctx.fill()
    // Windshield sky visible
    ctx.fillStyle = 'rgba(135,206,235,0.3)'
    ctx.fillRect(20, 10, 184, 80)
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(20, 10); ctx.lineTo(0, 0); ctx.moveTo(204, 10); ctx.lineTo(224, 0)
    ctx.stroke()
  }
}
