/**
 * 
 */
class VideoHandTracker {
  constructor(videoElement, callback) {
    this.videoElement = videoElement;
    this.tracker = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    hands.setOptions({
      maxNumHands: 2,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    hands.onResults(callback);
  }

  async update(){
    await hands.send({
      image: videoElement,
    });
  }
}
