class Particle{
  constructor(i){
    this.pos = createVector(random(0,300), 100);
    this.newPos = this.pos;
    this.lerpTime = 0.9;

    this.size = 8;
    this.color = color(random(100), 100, 100);
  }
  update(newVector,dt){
    this.pos = this.pos.lerp(this.newPos, this.lerpTime);
    if(newVector){
      this.newPos=newVector
    }
  }
}
