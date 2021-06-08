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
    // for later
  }

  p.setup = () => {
    p.canvas = p.createCanvas()
    for (let i = 0; i < SETTINGS.points_in_hand; i++) {
      particles[0].push(new Particle(P5, p))
      particles[1].push(new Particle(P5, p))
    }
  }

  p.draw = () => {
    if (MP.width > 0 && MP.width !== p.canvas.width) {
      p.resizeCanvas(MP.width, MP.height)
    }

    if (MP.image) {
      if (SETTINGS.videoFlip) {
        p.canvas.drawingContext.translate(MP.width, 0)
        p.canvas.drawingContext.scale(-1, 1)
      }
      p.canvas.drawingContext.drawImage(MP.image, 0, 0)
    }

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
  }
}, 'main')
