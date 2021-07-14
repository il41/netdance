const _emptyMarker = [-1, -1, -1];

/**
 * Does post tracking on a provided HTMLVideoElement.
 *
 * Starts tracking when the `start` method is called. Tracking results are sent to the provided callback function.
 *
 * Use `setCallback` to set the callback function.
 *
 * @example
 * const tracker = new VideoHandTracker(video);
 * tracker.setSourceVideo(document.getElementById("my-video-element"));
 * tracker.setCallback(console.log);
 * tracker.start(); // note that the video doesn't need to be loaded first
 */
class _VideoMotionTracker {
	constructor(trackerCreator, markerCount) {
		/**
		 * @type {number}
		 * number of tracking markers
		 */
		this._markerCount = markerCount;
		/**
		 * @type {number}
		 * length of 1 row of stored data
		 */
		this._storeChunkSize = markerCount * 3;

		this._videoElement = null;
		this._currentSourceName = null;
		/**
		 * @type {Map<String, Float32Array>}
		 */
		this._storedData = new Map();
		/**
		 * @type {null | Float32Array}
		 */
		this._activeStore = null;
		this._lastStoreTimeIndex = 0;
		/**
		 * @type {number}
		 * index offset for accessing cached data; positive numbers mean the tracking data is "from the future"
		 */
		this._storeGranularity = 10;
		this._storeOffset = 20;

		this._tracker = trackerCreator();
		this._isTracking = false;
		this._stopRequested = false;

		this._tracker.setOptions({
			maxNumHands: 2,
			minDetectionConfidence: 0.5,
			minTrackingConfidence: 0.5,
		});

		this._callback = Function.prototype;
	}

	/**
	 *
	 * @param {String} sourceName
	 * @param {Float32Array} data For body tracking: Every 97th number (including 0) is the time stamp. The 96 numbers that follow are the 32 x/y/z coordinates.
	 */
	storeData(sourceName, data) {
		this._storedData.set(sourceName, data);
		if (sourceName === this._currentSourceName) {
			this._activeStore = data;
			console.log(data.length);
		}
	}

	/**
	 * @param {HTMLVideoElement} vid
	 * @param {String} sourceName
	 */
	setSourceVideo(vid, sourceName = null) {
		this._videoElement = vid;
		this._currentSourceName = sourceName;
		const stored = this._storedData.get(this._currentSourceName);

		if (stored !== undefined) {
			this._activeStore = stored;
		}
	}

	/**
	 *
	 * @param {(data: Object, pointDataOnly: [[number, number, number]]) => void} func
	 */
	setCallback(func) {
		this._callback = func;
		this._tracker.onResults((data) => {
			this._callback(data, this.extractPointData(data));
		});
	}

	startTracking() {
		if (this._isTracking) {
			return;
		}
		this._isTracking = true;

		let lastVideoTime = 0;
		const updateVideo = () => {
			if (this._stopRequested) {
				this._isTracking = false;
				this._stopRequested = false;
				return;
			}

			if (this._videoElement === null) {
				window.requestAnimationFrame(updateVideo);
				return;
			}

			let onFrameResult = null;
			const vidTime = this._videoElement.currentTime;
			if (!this._videoElement.paused && lastVideoTime !== vidTime) {
				lastVideoTime = this._videoElement.currentTime;

				if (this._activeStore !== null) {
					const chunkI = (Math.floor(vidTime * this._storeGranularity) + this._storeOffset) * this._storeChunkSize;
					const chunk = this._activeStore.subarray(chunkI, chunkI + this._storeChunkSize);
					let avg = 0;
					const processedChunk = new Array(this._markerCount);
					for (let i = 0; i < this._markerCount; i++) {
						const i3 = i * 3;
						processedChunk[i] = [chunk[i3], chunk[i3 + 1], chunk[i3 + 2]];
						avg += chunk[i3] + chunk[i3 + 1] + chunk[i3 + 2];
					}

					// console.log(processedChunk);

					this._callback(null, processedChunk);
				} else {
					onFrameResult = this._tracker.send({
						image: this._videoElement,
					});
				}
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
	isTracking() {
		return this._isTracking;
	}

	stopTracking() {
		if (this._isTracking) {
			this._stopRequested = true;
		}
	}
}

class VideoHandTracker extends _VideoMotionTracker {
	constructor() {
		super(() => {
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
		}, 42);
	}

	extractPointData(data) {
		const pointDataOnly = new Array(42).fill(_emptyMarker);

		if (data.multiHandedness === undefined) {
			return pointDataOnly;
		}

		let i = 0;

		for (const handInfo of data.multiHandedness) {
			console.log(handInfo);
			const markers = data.multiHandLandmarks[handInfo.index];
			if (markers === undefined) {
				continue;
			}

			for (let j = 0; j < 21; j++) {
				const marker = markers[j];
				pointDataOnly[i] = [marker.x, marker.y, marker.z];
				i++;
			}

			// if (handInfo.label === "Left") {
			// 	// left hand data
			// 	for (let i = 0; i < 21; i++) {
			// 		const marker = markers[i];
			// 		pointDataOnly[i] = [marker.x, marker.y, marker.z];
			// 	}
			// } else if (handInfo.label === "Right") {
			// 	// right hand data
			// 	for (let i = 0; i < 21; i++) {
			// 		const marker = markers[i];
			// 		pointDataOnly[i * 2] = [marker.x, marker.y, marker.z];
			// 	}
			// }
		}

		return pointDataOnly;
	}
}

const reorderedBodyMarkers = [
	29, 31, 27, 25, 23, 13, 15, 19, 21, 11, 9, 7, 3, 2, 1, 0, 4, 5, 6, 8, 10, 12, 22, 20, 18, 16, 14, 24, 26, 28, 32, 30,
];
class VideoBodyTracker extends _VideoMotionTracker {
	constructor() {
		super(() => {
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
		}, 33);
	}

	extractPointData(data) {
		const pointDataOnly = new Array(33).fill(_emptyMarker);
		// console.log(data.poseLandmarks);
		if (data.poseLandmarks === undefined) {
			return pointDataOnly;
		}

		for (let i = 0; i < data.poseLandmarks.length; i++) {
			const marker = data.poseLandmarks[reorderedBodyMarkers[i]];
			if (marker !== undefined) {
				if (marker.visibility > 0.7) {
					pointDataOnly[i] = [marker.x, marker.y, marker.z];
				}
			}
		}

		return pointDataOnly;
	}
}
