/**
 * Does hand tracking on a provided HTMLVideoElement.
 *
 * Starts tracking when the `start` method is called. Tracking results are sent to the provided callback function.
 *
 * Use `setCallback` to set the callback function.
 *
 * @example
 * const video = document.getElementById("my-video-element");
 * const tracker = new VideoHandTracker(video);
 * tracker.setCallback(console.log);
 * tracker.start();
 */

const _emptyMarker = [-1,-1,-1];

class VideoHandTracker {
	constructor(videoElement) {
		this._videoElement = videoElement;
		this._tracker = new Hands({
			locateFile: (file) => {
				return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
			},
		});

		this._tracker.setOptions({
			maxNumHands: 2,
			minDetectionConfidence: 0.5,
			minTrackingConfidence: 0.5,
		});
	}

	setCallback(func) {
		this._tracker.onResults((data) => {
			if(data.multiHandedness === undefined){
				return;
			}
			
			const pointDataOnly = new Array(42).fill(_emptyMarker);
			for (const handInfo of data.multiHandedness) {
				const markers = data.multiHandLandmarks[handInfo.index];
				if(markers === undefined){
					continue;
				}

				if (handInfo.label === "Left") {
          // left hand data
					for (let i = 0; i < 21; i++) {
						const marker = markers[i];
						pointDataOnly[i] = [marker.x, marker.y, marker.z];
					}
				} else if (handInfo.label === "Right") {
          // right hand data
          for (let i = 0; i < 21; i++) {
						const marker = markers[i];
						pointDataOnly[i * 2] = [marker.x, marker.y, marker.z];
					}
				}
			}

			func(data, pointDataOnly);
		});
	}

	startTracking() {
		let lastVideoTime = 0;
		const updateVideo = () => {
			let onFrameResult = null;
			if (!this._videoElement.paused && lastVideoTime !== this._videoElement.currentTime) {
				lastVideoTime = this._videoElement.currentTime;

				onFrameResult = this._tracker.send({
					image: this._videoElement,
				});
			}
			if (onFrameResult === null) {
				window.requestAnimationFrame(updateVideo);
			} else {
				onFrameResult.then(() => window.requestAnimationFrame(updateVideo));
			}
		};

		window.requestAnimationFrame(updateVideo);
	}
}
