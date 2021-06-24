const gpu = new GPU();

const kernel = gpu.createKernel(function (frame) {
    // this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
    // const r = this.thread.y / this.thread.size;
    // const pixel = image[255];
    const pixel = frame[this.thread.y][this.thread.x];
    this.color(pixel[0], pixel[1], pixel[2], 1);
    // this.color(this.thread.x/255, this.thread.y/255, 0, 1);
  })
  .setGraphical(true)
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
  ctx.drawImage(videoElement, 0,0);
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
        ;
      };
    }
  });