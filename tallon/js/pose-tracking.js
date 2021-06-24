/**
 * A VideoHandTracker takes an HTMLVideoElement and a callback as initialization params.
 */
class VideoHandTracker {
  constructor(videoElement) {
    this.videoElement = videoElement;
    this.tracker = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });


    this.tracker.setOptions({
      maxNumHands: 2,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  setCallback(func) {
    this.tracker.onResults(func);
  }

  startTracking(){
    let lastVideoTime = 0;
    const updateVideo = () => {
      let onFrameResult = null;
      if (!this.videoElement.paused && lastVideoTime !== this.videoElement.currentTime) {
        lastVideoTime = this.videoElement.currentTime;

        onFrameResult = this.tracker.send({
          image: this.videoElement,
        });
      }
      if (onFrameResult === null) {
        window.requestAnimationFrame(updateVideo);
      } else {
        onFrameResult.then(() => window.requestAnimationFrame(updateVideo));
      }
    }

    window.requestAnimationFrame(updateVideo);
  }
}
