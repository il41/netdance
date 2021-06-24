/**
 * Input: MediaStream info acquired from the user's webcam/microphone
 * 
 * Output: That same data, along with an HTMLVideoElement added that shows the webcam's view.
 */
function andCreateVideo(streamData) {
  // route the video feed to a <video> element
  let cameraFeedVideo = document.createElement("video");
  if (streamData.hasVideo) {
    cameraFeedVideo.onloadedmetadata = () => {
      cameraFeedVideo.play();
    }
    cameraFeedVideo.srcObject = streamData.stream;
  }

  return Object.assign(streamData, {
    cameraFeedVideo: cameraFeedVideo,
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


// here's where stuff actually happens
getUserMedia()
  .then(andCreateVideo)
  .then(andCreateVolumeAnalyzer)
  .then((streamData) => {
    const {
      getMicLevel,
      cameraFeedVideo,
    } = streamData;

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // anything beyond this point is just for example purposes
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    const container = document.getElementById("example-container");
    
    // video display
    container.append(cameraFeedVideo);

    // mic volume display
    const micVolDisp = document.createElement("div");
    micVolDisp.style.fontSize = "50px";
    window.setInterval(() => {
      micVolDisp.innerText = `Volume: ${Math.round(getMicLevel() * 100)}%`;
    }, 100);
    container.append(micVolDisp);
  });
