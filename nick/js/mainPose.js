/* global p5, dat, MyMediaPipe, Particle */
//hex to rgba function from www.
let f=
s=>s.match(/../g).map((c,i)=>('0x'+c)/(i-3?1:255))
// console.log(f('00ff0080'));

const SETTINGS = {
  points_in_hand: 33,
  videoWidth: 720,
  videoHeight: 540,
  videoFlip: false,
  algoTypes: ['lerp', 'spring'],
  algorithm: 'lerp',
  size: 8,
  depth:0,
  color:"#ffffff",
  audioReactive:false,
  outlineOnly:false,
  smooth: 0.5, // for lerp
  drag: 0.55, // for spring
  strength: 0.1, // for spring
  zoom: 0.98, // shader uniform
  scale: 1.0 // shader uniform
}
const particles = [[], []]

const P5 = p5
const gui = new dat.GUI()
const MP = new MyMediaPipe({
  debug:true,
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

// const particleFolder = gui.addFolder('particle params')
gui.add(SETTINGS, 'size').min(0).max(20).step(0.01)
gui.add(SETTINGS, 'depth').min(0).max(20).step(0.01)
gui.addColor(SETTINGS, "color")
gui.add(SETTINGS, 'audioReactive')
gui.add(SETTINGS, 'outlineOnly')

const shaderFolder = gui.addFolder('shader unis')
shaderFolder.add(SETTINGS, 'zoom').min(0).max(2).step(0.01)
shaderFolder.add(SETTINGS, 'scale').min(-2.0).max(2.0).step(0.01)

// SETUP P5
// ----------------------

window.main = new P5(p => {
  p.preload = () => {
    p.fbShader = p.loadShader('shaders/effect.vert', 'shaders/effect.frag')
  }

  p.setup = () => {
    // p.mic= new p.AudioIn();
    // p.mic.start();
    p.canvas = p.createCanvas()
    p.particlesLayer = p.createGraphics(p.width, p.height)
    p.shaderLayer = p.createGraphics(p.width, p.height, p.WEBGL)
    p.copyLayer = p.createGraphics(p.width, p.height)
    for (let i = 0; i < SETTINGS.points_in_hand; i++) {
      particles[0].push(new Particle(P5, p, p.particlesLayer))
      // particles[1].push(new Particle(P5, p, p.particlesLayer))
    }
  }

  p.draw = () => {
    // p.vol = p.mic.getLevel();
    // resize all canvases to match camera aspect ratio
    if (MP.width > 0 && MP.width !== p.canvas.width) {
      p.resizeCanvas(MP.width, MP.height) // resizes main canvas, ie. p.canvas
      p.particlesLayer.resizeCanvas(MP.width, MP.height)
      p.shaderLayer.resizeCanvas(MP.width, MP.height)
      p.copyLayer.resizeCanvas(MP.width, MP.height)
    }

    // update the particles (hand tracking)
    p.particlesLayer.clear()
    for (var h = 0; h < 1; h++) { // loop twice, left hand && right hand
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
          let z = p.abs(pts.z*SETTINGS.depth)
          p.particlesLayer.strokeWeight(z)

          if (SETTINGS.algorithm === 'lerp') {
            particles[h][i].lerpUpdate(x, y, SETTINGS.smooth)
          } else if (SETTINGS.algorithm === 'spring') {
            particles[h][i].springUpdate(x, y, SETTINGS.drag, SETTINGS.strength)
          }
          p.particlesLayer.stroke(SETTINGS.depth)
          p.particlesLayer.fill(SETTINGS.color)

          if(SETTINGS.audioReactive){
            SETTINGS.size = 10+p.vol*400;
          }
          if(SETTINGS.outlineOnly){
            p.particlesLayer.noFill();
            p.particlesLayer.stroke('blue');
            let c = SETTINGS.color.split('#');
            c = c[1]
            c = f(c)
            p.particlesLayer.stroke(p.color(c[0],p.sin(i*5)*c[1],i*6*c[2]));
          }
          particles[h][i].draw(SETTINGS.size)
        })
      }
    }
    if (MP.image) {
      if (!SETTINGS.videoFlip) {
        p.canvas.drawingContext.translate(MP.width, 0)
        p.canvas.drawingContext.scale(-1, 1)
      }
      // p.canvas.drawingContext.globalAlpha = 0.4
      p.canvas.drawingContext.drawImage(MP.image, 0, 0)
      // p.canvas.drawingContext.globalAlpha = 1
    }

    // update feedback shaders
    p.shaderLayer.shader(p.fbShader)
    p.fbShader.setUniform('tex0', p.particlesLayer)
    p.fbShader.setUniform('tex1', p.copyLayer)
    p.fbShader.setUniform('mouseDown', p.int(p.mouseIsPressed))
    p.fbShader.setUniform('time', p.frameCount * 0.01)
    p.fbShader.setUniform('zoom', SETTINGS.zoom)
    p.fbShader.setUniform('scale', SETTINGS.scale)
    p.shaderLayer.rect(0, 0, p.width, p.height)
    p.copyLayer.image(p.shaderLayer, 0, 0, p.width, p.height)
    p.image(p.shaderLayer, 0, 0, p.width, p.height)
    p.image(p.particlesLayer, 0, 0, p.width, p.height)

    // draw video feed

  }
}, 'main')
