const gpu = new GPU();

/**
 * Takes pipeline data and renders it to a canvas
 */
const postFilter = gpu.createKernel((frame) => {
  const pixel = frame[this.thread.y][this.thread.x];
  this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
});

class VideoFilterStack {
  constructor(videoElement) {
    this._videoElement = videoElement;
    this._width = videoElement.videoWidth;
    this._height = videoElement.videoHeight;

    this._requestedStop = false;
    this._running = false;

    this._filters = []; // list of filter instances (can contain duplicates)
    // keeps track of filters that have already been instantiated for this stack (so those instances can be reused)
    this._createdTypes = new Map(); // <filter type name, filter instance>

    // converts image data into pipeline form
    this._preFilter = gpu.createKernel((frame) => frame[this.thread.y][this.thread.x])
      .setOutput([this._width, this._height])
      .setPipeline(true);

    // updates the canvas using the pipeline result
    this._postFilter = gpu.createKernel((frame) => {
        const pixel = frame[this.thread.y][this.thread.x];
        this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
      })
      .setOutput([this._width, this._height])
      .setGraphical(true);

    // non-visible canvas used for getting static images from a video
    this._vidCanvas = document.createElement("canvas");
    this._vidCanvas.width = this._width;
    this._vidCanvas.height = this._height;
    this._vidContext = this._vidCanvas.getContext("2d");
  }

  getCanvas() {
    return this._postFilter.canvas;
  }

  /**
   * filter instances are created once per stack. 
   * 
   * They can be reused within the same stack (or anywhere where the image dimensions are always the same)
   */
  addFilter(filterType) {
    const existing = this._createdTypes.get(filterType.getName());
    if (existing !== undefined) {
      return existing;
    }

    const created = filterType.instantiate(this._width, this._height);
    this._createdTypes.set(filterType.getName(), created);
    return created;
  }

  start() {
    this._running = true;
    const updateShader = () => {
      if (this._requestedStop) {
        this._requestedStop = false;
        return;
      }

      if (this._videoElement.readyState >= 3) {
        this._vidContext.drawImage(this._videoElement, 0, 0);
        this._process(this._vidCanvas);
      }

      // queue up the next update
      window.requestAnimationFrame(updateShader);
    }

    // queue the initial update
    window.requestAnimationFrame(updateShader);
  }

  stop() {
    this._requestedStop = true;
  }

  _process(imageData, otherData) {
    let pipe = this._preFilter(imageData);
    for (const filter of this._filters) {
      pipe = filter.process(pipe);
    }
    this._postFilter(pipe);
  }
}

class VideoFilterType {
  constructor(name, filterParams, kernelGenerationFunc) {
    this._filterParams = filterParams;
    this._name = name;
    this._kernelGenerationFunc = kernelGenerationFunc;
  }

  getName() {
    return this.name;
  }

  instantiate(w, h) {
    return this._kernelGenerationFunc()
      .setOutput([w, h])
      .setPipeline(true);
  }

  getCanvas() {
    return this._kernel ? .canvas;
  }
}

class VideoFilterInstance {
  constructor(kernelFunc){
    this._kernelFunc = kernelFunc;
    this.filterParamValues
  }

  process(pipe){
    return this._kernelFunc(pipe);
  }
}

// const videoElement = document.createElement("video");
// videoElement.src = "https://media.istockphoto.com/videos/hand-waving-bye-video-id150487553";
// videoElement.crossOrigin = "anonymous";
// videoElement.controls = true;



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
        cvs.height = videoElement.videoHeight;
      };
    }
  });