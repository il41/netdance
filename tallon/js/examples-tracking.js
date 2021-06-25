const container = document.getElementById("example-container");

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EXAMPLE: Tracking a video from a regular url
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function exampleTrackFromUrl() {
  const videoElement = document.createElement("video");
  videoElement.src = "https://media.istockphoto.com/videos/hand-waving-bye-video-id150487553";
  videoElement.crossOrigin = "anonymous";
  videoElement.controls = true;

  // this line adds the video to the DOM. 
  // this is just for example purposes; the video does not need to be on the DOM to be tracked.
  container.append(videoElement);

  const handTracker = new VideoHandTracker(videoElement);
  handTracker.setCallback(console.log); // the callback can be anything; console.log is used here for example purposes
  handTracker.startTracking();
}



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EXAMPLE: Tracking a video from the webcam
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function exampleTrackFromWebcam() {
  const videoElement = document.createElement("video");

  // this line adds the video to the DOM. 
  // this is just for example purposes; the video does not need to be on the DOM to be tracked.
  container.append(videoElement);

  const handTracker = new VideoHandTracker(videoElement);
  handTracker.setCallback(console.log); // the callback can be anything; console.log is used here for example purposes
  handTracker.startTracking();
  
  getUserMedia()
    .then((streamData) => {
      // route webcam data to the video element
      if (streamData.hasVideo) {
        videoElement.srcObject = streamData.stream;
        videoElement.onloadedmetadata = () => {
          videoElement.play();
        };
      }
    });
}



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// EXAMPLE: Tracking a video from the webcam, with bonus mic level indicator
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function exampleTrackFromWebcamWithMicLevel() {
  const videoElement = document.createElement("video");

  // this line adds the video to the DOM. 
  // this is just for example purposes; the video does not need to be on the DOM to be tracked.
  container.append(videoElement);

  const handTracker = new VideoHandTracker(videoElement);
  handTracker.setCallback(console.log); // the callback can be anything; console.log is used here for example purposes
  handTracker.startTracking();

  // this function just returns 0 until the media stream is acquired
  let getMicLevel = () => 0;

  getUserMedia()
    .then((streamData) => {
      // route webcam data to the video element
      if (streamData.hasVideo) {
        videoElement.srcObject = streamData.stream;
        videoElement.onloadedmetadata = () => {
          videoElement.play();
        };
      }

      // get mic level info
      if (streamData.hasAudio) {
        getMicLevel = getVolumeAnalyzer(streamData.stream);
      }
    });


  // mic level display
  // this is not at all necessary for the example, but i figured i might as well show it off here
  const micVolDisp = document.createElement("div");
  micVolDisp.style.fontSize = "50px";
  container.append(micVolDisp);

  window.setInterval(() => {
    micVolDisp.innerText = `Volume: ${Math.round(getMicLevel() * 100)}%`;
  }, 20);
}
