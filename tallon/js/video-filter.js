const gpu = new GPU();

class FilterSequence {
  constructor(videoElement) {
    this._filters = [];
    this._videoElement = videoElement;
  }

  pushFilter() {

  }
}

let filterIdCounter = 0;
class VideoFilter {
  constructor(name, kernelGenerationFunc, hidden = false) {
    this._filterId = ++filterIdCounter;
    this._name = name;
    this._kernelGenerationFunc = kernelGenerationFunc;
    this._kernel = null;
    this._hidden = hidden;
  }

  getName() {
    return this.name;
  }

  getId() {
    return this._filterId;
  }

  _initialize() {
    this._kernel = this._kernelGenerationFunc();
  }

  getCanvas(){
    return this._kernel?.canvas;
  }

  use(imageData, ...other) {
    if (this._kernel === null) {
      this._initialize();
    }
    return this._kernel(imageData, ...other);
  }
}

/**
 * Takes canvas data and routes it to a pipeline
 */
const preFilter = new VideoFilter("pre", () => gpu.createKernel((frame) => {
  return frame[this.thread.y][this.thread.x];
}), true);

/**
 * Takes pipeline data and renders it to a canvas
 */
const postFilter = new VideoFilter("post", () => gpu.createKernel((frame) => {
  const pixel = frame[this.thread.y][this.thread.x];
  this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
}), true);

const kernel = gpu.createKernel(function (frame) {
    // this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
    // const r = this.thread.y / this.thread.size;
    // const pixel = image[255];

    this.color(pixel[1], pixel[0], pixel[2], 1);
    // this.color(this.thread.x/255, this.thread.y/255, 0, 1);
  })
  .setPipeline(true)
  .setDynamicOutput(true);

const videoElement = document.createElement("video");
// videoElement.src = "https://media.istockphoto.com/videos/hand-waving-bye-video-id150487553";
// videoElement.crossOrigin = "anonymous";
// videoElement.controls = true;



// videoElement.onloadeddata = () => {
//   console.log(videoElement);
//   kernel.setOutput([videoElement.videoWidth, videoElement.videoHeight]);
//   kernel(videoElement);
//   // Result: colorful image

//   document.getElementById("example-container").append(kernel.canvas);
//   videoElement.play();
// };
document.getElementById("example-container").append(videoElement);
document.getElementById("example-container").append(kernel.canvas);
const cvs = document.createElement("canvas");
const ctx = cvs.getContext("2d");
const updateShader = () => {
  window.requestAnimationFrame(updateShader);
  ctx.drawImage(videoElement, 0, 0);
  kernel(cvs);
}

getUserMedia({
    // width: 256,
    // height: 256,
  })
  .then((streamData) => {
    // route webcam data to the video element
    if (streamData.hasVideo) {
      videoElement.srcObject = streamData.stream;
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        kernel.setOutput([videoElement.videoWidth, videoElement.videoHeight]);
        window.requestAnimationFrame(updateShader);
        cvs.width = videoElement.videoWidth;
        cvs.height = videoElement.videoHeight;;
      };
    }
  });