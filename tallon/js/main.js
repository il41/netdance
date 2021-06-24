/**
 * Input: MediaStream info acquired from the user's webcam/microphone
 * 
 * Output: That same data, along with an HTMLVideoElement added that shows the webcam's view.
 */
function andCreateVideo(streamData) {
  const isLoaded = [false];
  // route the video feed to a <video> element
  let cameraFeedVideo = document.createElement("video");
  if (streamData.hasVideo) {
    cameraFeedVideo.onloadedmetadata = () => {
      cameraFeedVideo.play();
      isLoaded[0] = true;
    };
    cameraFeedVideo.srcObject = streamData.stream;
  }

  return Object.assign(streamData, {
    cameraFeedVideo: cameraFeedVideo,
    isVideoLoaded: () => isLoaded[0],
  });
}

/**
 * Input: MediaStream info acquired from the user's webcam/microphone
 * 
 * Output: That same data, along with a function that returns the recorded volume level (from 0 to 1).
 */
function andCreateVolumeAnalyzer(streamData) {
  // create a function for getting mic input level
  let getMicLevel = () => 0;
  if (streamData.hasAudio) {
    getMicLevel = getVolumeAnalyzer(streamData.stream);
  }

  return Object.assign(streamData, {
    getMicLevel: getMicLevel,
  });
}

function andCreateHandTracker(streamData) {
  return Object.assign(streamData, {
    handTracker: new VideoHandTracker(streamData.cameraFeedVideo),
  });
}


// here's where stuff actually happens
getUserMedia()
  .then(andCreateVideo)
  .then(andCreateVolumeAnalyzer)
  .then(andCreateHandTracker)
  .then((streamData) => {
    const {
      getMicLevel,
      cameraFeedVideo,
      handTracker,
      isVideoLoaded,
    } = streamData;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // anything beyond this point is just for example purposes
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    const container = document.getElementById("example-container");


    // // hand stuff
    // handTracker.setCallback((dat) => {
    //   console.log(dat);
    // })

    // video display
    container.append(cameraFeedVideo);

    // mic volume display
    const micVolDisp = document.createElement("div");
    micVolDisp.style.fontSize = "50px";
    container.append(micVolDisp);


    // update stuff
    window.setInterval(() => {
      micVolDisp.innerText = `Volume: ${Math.round(getMicLevel() * 100)}%`;
    }, 20);

    // handTracker.setCallback(console.log);
    handTracker.startTracking();
  });