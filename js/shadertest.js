//from https://itp-xstory.github.io/p5js-shaders/#/./docs/examples/image_effects
//with chroma key addition from https://stackoverflow.com/questions/60767805/chromakey-glsl-shader-with-transparent-background


// a shader variable
let theShader;
let cam;
let canv2;
let gl;

const RGBAToCC = (r, g, b) => {
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    return [(b - y) * 0.565, (r - y) * 0.713];
};
const keyRGBA = [0.0, 0.0, 0.0, 1];  // the green from your code
const range = [0.0, 0.5];             // A guess at the range needed
const keyCC = RGBAToCC(...keyRGBA);

function preload(){
  // load the shader
  theShader = loadShader('assets/webcam.vert', 'assets/webcam.frag');
}





function setup() {
  canv2 = createElement('div');
  canv2.addClass('behind');
  // document.body.appendChild(canv2);
  canv2.parent(document.body);

  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();


  cam = createCapture(VIDEO);
  cam.size(windowWidth, windowHeight);

  cam.hide();
  gl = this._renderer.GL;
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function draw() {

  // shader() sets the active shader with our shader
  shader(theShader);

  // passing cam as a texture
  theShader.setUniform('tex0', cam);
  // theShader.setUniform('tex1', img);
  theShader.setUniform('iResolution', [width, height]);
  theShader.setUniform('backgroundAlpha', 0);

  // rect gives us some geometry on the screen
  rect(0,0,width,height);

}
