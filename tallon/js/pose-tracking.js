const _emptyMarker = [-1, -1, -1];

/**
 * Does post tracking on a provided HTMLVideoElement.
 *
 * Starts tracking when the `start` method is called. Tracking results are sent to the provided callback function.
 *
 * Use `setCallback` to set the callback function.
 *
 * @example
 * const video = document.getElementById("my-video-element");
 * const tracker = new VideoHandTracker(video);
 * tracker.setCallback(console.log);
 * tracker.start(); // note that the video doesn't need to be loaded first
 */
class _VideoMotionTracker {
	constructor(videoElement, trackerCreator) {
		this._videoElement = videoElement;
		this._tracker = trackerCreator();
		this._isTracking = false;
		this._stopRequested = false;

		this._tracker.setOptions({
			maxNumHands: 2,
			minDetectionConfidence: 0.5,
			minTrackingConfidence: 0.5,
		});
	}

	/**
	 *
	 * @param {(data: Object, pointDataOnly: [[number, number, number]]) => void} func
	 */
	setCallback(func) {
		this._tracker.onResults((data) => {
			func(data, this.extractPointData(data));
		});
	}

	startTracking() {
		if(this._isTracking){
			return;
		}
		this._isTracking = true;

		let lastVideoTime = 0;
		const updateVideo = () => {
			if(this._stopRequested){
				this._isTracking = false;
				this._stopRequested = false;
				return;
			}
			
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
	
	/**
	 * 
	 * @returns {boolean} if the tracker is currently active
	 */
	isTracking(){
		return this._isTracking;
	}

	stopTracking() {
		if(this._isTracking){
			this._stopRequested = true;
		}
	}
}

class VideoHandTracker extends _VideoMotionTracker {
	constructor(videoElement) {
		super(videoElement, () => {
			const tracker = new Hands({
				locateFile: (file) => {
					return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
				},
			});

			tracker.setOptions({
				maxNumHands: 2,
				minDetectionConfidence: 0.5,
				minTrackingConfidence: 0.5,
			});

			return tracker;
		});
	}

	extractPointData(data) {
		const pointDataOnly = new Array(42).fill(_emptyMarker);

		if (data.multiHandedness === undefined) {
			return pointDataOnly;
		}

		for (const handInfo of data.multiHandedness) {
			const markers = data.multiHandLandmarks[handInfo.index];
			if (markers === undefined) {
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

		return pointDataOnly;
	}
}

const reorderedBodyMarkers = [
	29, 31, 27, 25, 23, 13, 15, 19, 21, 11, 9, 7, 3, 2, 1, 0, 4, 5, 6, 8, 10, 12, 22, 20, 18, 16, 14, 24, 26, 28, 32, 30,
];
class VideoBodyTracker extends _VideoMotionTracker {
	constructor(videoElement) {
		super(videoElement, () => {
			const tracker = new Pose({
				locateFile: (file) => {
					return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
				},
			});

			tracker.setOptions({
				modelComplexity: 1,
				smoothLandmarks: true,
				minDetectionConfidence: 0.5,
				minTrackingConfidence: 0.5,
			});

			return tracker;
		});
	}

	extractPointData(data) {
		const pointDataOnly = new Array(33).fill(_emptyMarker);
		// console.log(data.poseLandmarks);
		if (data.poseLandmarks === undefined) {
			return pointDataOnly;
		}

		for (let i = 0; i < data.poseLandmarks.length; i++) {
			const marker = data.poseLandmarks[reorderedBodyMarkers[i]];
			if(marker !== undefined){
				if (marker.visibility > 0.7) {
					pointDataOnly[i] = [marker.x, marker.y, marker.z];
				}
			}
		}

		return pointDataOnly;
	}
}
