/* global p5, dat, MyMediaPipe, Particle */
const SETTINGS = {
  points_in_hand: 21,
  videoWidth: 720,
  videoHeight: 540,
  videoFlip: true,
  algoTypes: ['lerp', 'spring'],
  algorithm: 'lerp',
  smooth: 0.5, // for lerp
  drag: 0.55, // for spring
  strength: 0.1 // for spring
}

const particles = [[], []]

const P5 = p5
const gui = new dat.GUI()
const MP = new MyMediaPipe({
  width: SETTINGS.videoWidth,
  height: SETTINGS.videoHeight
  // debug: true
})

// SETUP GUI
// ----------------------

gui.add(SETTINGS, 'algorithm', SETTINGS.algoTypes)
  .name('Particle_Algorithm')

const lerpFolder = gui.addFolder('lerp params')
lerpFolder.add(SETTINGS, 'smooth').min(0).max(1).step(0.01)

const springFolder = gui.addFolder('spring params')
springFolder.add(SETTINGS, 'drag').min(0).max(1).step(0.01)
springFolder.add(SETTINGS, 'strength').min(0).max(1).step(0.01)

// SETUP P5
// ----------------------

window.main = new P5(p => {
  p.preload = () => {
    p.fbShader = p.loadShader('shaders/effect.vert', 'shaders/effect.frag')
  }

  p.setup = () => {
    p.canvas = p.createCanvas()
    p.particlesLayer = p.createGraphics(p.width, p.height)
    p.shaderLayer = p.createGraphics(p.width, p.height, p.WEBGL)
    p.copyLayer = p.createGraphics(p.width, p.height)
    for (let i = 0; i < SETTINGS.points_in_hand; i++) {
      particles[0].push(new Particle(P5, p, p.particlesLayer))
      particles[1].push(new Particle(P5, p, p.particlesLayer))
    }
  }

  p.draw = () => {
    // resize all canvases to match camera aspect ratio
    if (MP.width > 0 && MP.width !== p.canvas.width) {
      p.resizeCanvas(MP.width, MP.height) // resizes main canvas, ie. p.canvas
      p.particlesLayer.resizeCanvas(MP.width, MP.height)
      p.shaderLayer.resizeCanvas(MP.width, MP.height)
      p.copyLayer.resizeCanvas(MP.width, MP.height)
    }

    // update the particles (hand tracking)
    p.particlesLayer.clear()
    for (var h = 0; h < 2; h++) { // loop twice, left hand && right hand
      if (MP.dataPoints[h]) {
        /*
        MP.dataPoints.length > 1 // how many hands
        h == 0 // first hand
        h == 1 // second hand
        */
        MP.dataPoints[h].forEach((pts, i) => {
          const x = p.map(pts.x, 0, 1, 0, p.width)
          const y = p.map(pts.y, 0, 1, 0, p.height)
          // let z = p.map(pts.z, -1, 0, 0, 1)

          if (SETTINGS.algorithm === 'lerp') {
            particles[h][i].lerpUpdate(x, y, SETTINGS.smooth)
          } else if (SETTINGS.algorithm === 'spring') {
            particles[h][i].springUpdate(x, y, SETTINGS.drag, SETTINGS.strength)
          }

          particles[h][i].draw()
        })
      }
    }

    // update feedback shaders
    p.shaderLayer.shader(p.fbShader)
    p.fbShader.setUniform('tex0', p.particlesLayer)
    p.fbShader.setUniform('tex1', p.copyLayer)
    p.fbShader.setUniform('mouseDown', p.int(p.mouseIsPressed))
    p.fbShader.setUniform('time', p.frameCount * 0.01)
    p.shaderLayer.rect(0, 0, p.width, p.height)
    p.copyLayer.image(p.shaderLayer, 0, 0, p.width, p.height)
    p.image(p.shaderLayer, 0, 0, p.width, p.height)

    // draw video feed
    if (MP.image) {
      if (SETTINGS.videoFlip) {
        p.canvas.drawingContext.translate(MP.width, 0)
        p.canvas.drawingContext.scale(-1, 1)
      }
      p.canvas.drawingContext.globalAlpha = 0.4
      p.canvas.drawingContext.drawImage(MP.image, 0, 0)
      p.canvas.drawingContext.globalAlpha = 1
    }
  }
}, 'main')
