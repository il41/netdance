const container = document.getElementById("main-container");

function main() {
	/**
	 * false: body, true: hands
	 */
	let activeTracker = false;

	/**
	 * false: video, true: webcam
	 */
	let activeVideoSource = false;

	/**
	 * a video element that contains the prerecorded dance video. null until later
	 * @type {HTMLVideoElement}
	 */
	let recordedVideo = null;

	/**
	 * a video element that contains the webcam input. null until webcam is enabled by user
	 * @type {HTMLVideoElement}
	 */
	let webcamVideo = null;

	/**
	 * handles all the visual effects stuff
	 * @type {VideoFilterStack}
	 */
	/**
	 * @type {VideoFilterStack}
	 */
	 const filterStack = new VideoFilterStack([
		tgEverything,
		tgRawInput,
		tgPolygon,
		tgTrails,
		tgChaoticRectangles,
		tgSpikyMesh,
		tgSprinkles,
		tgLastOutputFrame,
	 ], [
		vfShape,
		vfWobble,
		vfGradient,
		vfColor,
		vfMotionBlur,
		vfZoomBlur,
		vfRGBLevels,
	]);

	// variables used for routing hand tracking data to the VideoFilterStack
	// hand tracking has 42 markers, and body tracking has 33; here we just use the larger
	let lastMotionData = new Array(42).fill([-1, -1, -1]);
	let motionData = new Array(42).fill([-1, -1, -1]);
	let smoothMotionData = new Array(42).fill([-1, -1, -1]);

	// the actual tracking happens here
	const handTracker = new VideoHandTracker();
	const bodyTracker = new VideoBodyTracker();

	// this function is called whenever either tracker is updated
	const trackerCallback = (dat, pointDataOnly) => {
		for (let i = 0; i < pointDataOnly.length; i++) {
			lastMotionData[i] = motionData[i];
			motionData[i] = pointDataOnly[i];
		}
		//variables to be changed with global GUI object
		let smooth=true;
		let drag = 0.55;
		let strength = 0.1;
		let smoothness = 0.5;

		//vector smoothing algorithms (between smooth and spring)
		for (let i = 0; i < motionData.length; i++) {

			//define vectors and velocity
			let vel = new Vector2D(0,0);
			let pos = new Vector2D(motionData[i][0],motionData[i][1]);
			let oldPos = new Vector2D(lastMotionData[i][0],lastMotionData[i][1]);

			if(smooth){
				//lerp
				pos = oldPos.lerp(pos,smoothness);
			} else {
				//spring
				let vec = pos
				let force = pos.sub(pos, oldPos)
				force = force.multiplyScalar(strength)
				vel = vel.multiply(drag);
				vel = vel.add(force);
				pos = pos.add(vel);
			}
			smoothMotionData[i] = [pos.x, pos.y, 0];
			// smoothMotionData[i] = [pos.x, pos.y, motionData[i][2]];

		}
		// console.log(smoothMotionData)
		// motionData = smoothMotionData
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		/*
			If you want to do math on the tracking data, this would be the place to do so.
			I suggest putting all the actual math in a different file/function for readability, though.

			It's important that any variables you want to pass to the shaders should be declared outside of this callback,
			and later added to the filterStack using filterStack.registerExternalData
		*/
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	};
	handTracker.setCallback(trackerCallback);
	bodyTracker.setCallback(trackerCallback);

	const updateTrackingMode = () => {
		if (activeTracker) {
			bodyTracker.stopTracking();
			handTracker.startTracking();
		} else {
			handTracker.stopTracking();
			bodyTracker.startTracking();
		}
	};
	updateTrackingMode();

	// allow changing tracking mode via an html checkbox
	const trackingModeSwitch = document.getElementById("tracking-mode-switch");
	trackingModeSwitch.checked = activeTracker;
	trackingModeSwitch.addEventListener("change", (e) => {
		activeTracker = e.target.checked ? true : false;
		updateTrackingMode();
	});

	/**
	 * Get prerecorded video and do stuff once it's loaded (or right away if it's already loaded)
	 * @param {(video: HTMLVideoElement) => void} callback
	 * @returns
	 */
	const requestRecordedVideo = (callback) => {
		if (recordedVideo !== null) {
			callback(recordedVideo);
			return;
		}

		recordedVideo = document.createElement("video");
		recordedVideo.src = "./Left-720p.mp4";
		recordedVideo.crossOrigin = "anonymous";
		recordedVideo.controls = true;
		recordedVideo.loop = true;

		recordedVideo.onloadedmetadata = () => {
			callback(recordedVideo);
		};
	};

	/**
	 * Get webcam video and do stuff once it's loaded (or right away if it's already loaded)
	 * @param {(video: HTMLVideoElement) => void} callback
	 * @returns
	 */
	const requestWebcamVideo = (callback) => {
		if (webcamVideo !== null) {
			callback(webcamVideo);
			return;
		}

		getUserMedia().then((data) => {
			if (data.hasVideo) {
				webcamVideo = document.createElement("video");
				webcamVideo.srcObject = data.stream;
				webcamVideo.onloadedmetadata = () => {
					callback(webcamVideo);
				};
			}
		});
	};

	const updateSourceVideo = () => {
		/**
		 *
		 * @param {HTMLVideoElement} requestedVid
		 */
		const callback = (requestedVid) => {
			filterStack.setSourceVideo(requestedVid);
			handTracker.setSourceVideo(requestedVid);
			bodyTracker.setSourceVideo(requestedVid);
			requestedVid.play();
		}

		if (activeVideoSource) {
			if(recordedVideo !== null){
				recordedVideo.pause();
			}
			requestWebcamVideo(callback);
		} else {
			if(webcamVideo !== null){
				webcamVideo.pause();
			}
			requestRecordedVideo(callback);
		}
	};

	// allow changing source video via an html checkbox
	const sourceVideoSwitch = document.getElementById("source-video-switch");
	sourceVideoSwitch.checked = activeTracker;
	sourceVideoSwitch.addEventListener("change", (e) => {
		activeVideoSource = e.target.checked ? true : false;
		updateSourceVideo();
	});

	// add the output canvas & menu to the DOM
	container.append(filterStack.getTextureMenuRoot());
	container.append(filterStack.getFilterMenuRoot());
	container.append(filterStack.getCanvas());

	// INFORMATION THAT YOU WANT TO PASS INTO TEXTURES
	filterStack.registerExternalData("lastMotionData", lastMotionData);
	filterStack.registerExternalData("motionData", motionData);
	// filterStack.registerExternalData("smoothMotionData", smoothMotionData);
	filterStack.registerExternalData("lastOutputFrame", filterStack.getCanvas());

	filterStack.start();

	updateSourceVideo();
}

main();
