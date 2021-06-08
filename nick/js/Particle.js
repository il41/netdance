/*
  -----------
     usage
  -----------

  const p = new Particle(P5Library, p5Instance)
  // first arg is a referance to the p5 library
  // second arg is a reference to an instance of p5

*/
class Particle {
  constructor (P5, p5) {
    this.P5 = P5
    this.p5 = p5
    this.vel = this.p5.createVector(0, 0)
    this.pos = this.p5.createVector(this.p5.random(0, 300))
    this.newPos = this.pos
    this.lerpTime = 0.5

    this.size = 8
    this.color = this.p5.color(this.p5.random(100), 100, 100)
  }

  lerpUpdate (x, y, smooth) {
    const vec = this.p5.createVector(x, y)
    this.pos = this.pos.lerp(vec, smooth)
  }

  springUpdate (x, y, drag = 0.55, strength = 0.1) {
    const vec = this.p5.createVector(x, y)
    let force = this.P5.Vector.sub(vec, this.pos)
    force = force.mult(strength)
    this.vel = this.vel.mult(drag)
    this.vel = this.vel.add(force)
    this.pos = this.pos.add(this.vel)
  }

  draw () {
    this.p5.ellipse(this.pos.x, this.pos.y, this.size)
  }
}

window.Particle = Particle
