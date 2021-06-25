const container = document.getElementById("example-container");

function exampleTwoFilters(){
  const videoElement = document.createElement("video");
  videoElement.src = "https://media.istockphoto.com/videos/hand-waving-bye-video-id150487553";
  videoElement.crossOrigin = "anonymous";
  videoElement.controls = true;
  videoElement.loop = true;
  container.append(videoElement);
  
  // a weird filter that switches some colors 
  const exampleVideoFilter = new VideoFilterType(
    "Example",
    [{ name: "Red", min: 0, max: 2, default: 1}, { name: "Green", min: 0, max: 2, default: 1}],
    () =>
      gpu.createKernel(function (frame, trackingData, redControl, greenControl) {
        const pixel = frame[this.thread.y][this.thread.x];
        return [pixel[0] * redControl, pixel[1] * greenControl, pixel[2], pixel[3]];
      })
  );
  
  videoElement.onloadedmetadata = () => {
    videoElement.play();
  
    const filterStack = new VideoFilterStack(videoElement);
    container.append(filterStack.getCanvas());
    
    filterStack.addFilter(exampleVideoFilter);
    filterStack.addFilter(exampleVideoFilter);
  
    filterStack.start({
      trackingData: [1],
    });
  };
}