const sidebar = document.getElementById("main-sidebar");
const vidContainer = document.getElementById("main-video-container");

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

	
	const generalMenu = new ParameterMenu("Controls", (panelInfo) => panelInfo, false);
	const getVideoSettings = generalMenu.addItem({name: "Video", paramsInfo: [
		{ name: "Source", type: "enum", options: ["Webcam", "Left Dance", "Right Dance"], default: "Left Dance" },
	]}).getValuesUnordered;

	const getTrackingSettings = generalMenu.addItem({name: "Motion Tracking", paramsInfo: [
		{ name: "Mode", type: "enum", options: ["Full Body", "Just Hands"], default: "Full Body" },
		{ name: "Smoothing", type: "enum", options: ["None", "Basic", "Springy"], default: "None" },
		{ name: "Time Offset", type: "number", min: -5, max: 5, default: 0, step: 0.1 },
	]}).getValuesUnordered;

	const getRecordingSettings = generalMenu.addItem({name: "Recording", paramsInfo: [
	]}).getValuesUnordered;

	/**
	 * handles all the visual effects stuff
	 * @type {VideoFilterStack}
	 */
	/**
	 * @type {VideoFilterStack}
	 */
	const filterStack = new VideoFilterStack(
		[tgEverything, tgRawInput, tgPolygon, tgTrails, tgChaoticRectangles, tgSpikyMesh, tgSprinkles, tgLastOutputFrame],
		[vfShape, vfWobble, vfGradient, vfColor, vfMotionBlur, vfZoomBlur, vfRGBLevels]
	);

	// variables used for routing hand tracking data to the VideoFilterStack
	// hand tracking has 42 markers, and body tracking has 33; here we just use the larger
	let lastMotionData = new Array(42).fill([-1, -1, -1]);
	let motionData = new Array(42).fill([-1, -1, -1]);

	// the actual tracking happens here
	const handTracker = new VideoHandTracker();
	const bodyTracker = new VideoBodyTracker();

	bodyTracker.storeData("Left", trackingDataBodyLeft);

	// this function is called whenever either tracker is updated
	const trackerCallback = (dat, pointDataOnly) => {
		for (let i = 0; i < pointDataOnly.length; i++) {
			lastMotionData[i] = motionData[i];
			motionData[i] = pointDataOnly[i];
		}

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
		recordedVideo.style.width = "20%";
		// vidContainer.append(recordedVideo);
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
		const callback = (requestedVid, sourceName) => {
			filterStack.setSourceVideo(requestedVid);
			handTracker.setSourceVideo(requestedVid, sourceName);
			bodyTracker.setSourceVideo(requestedVid, sourceName);
			requestedVid.play();
		};

		if (activeVideoSource) {
			if (recordedVideo !== null) {
				recordedVideo.pause();
			}
			requestWebcamVideo((vid) => callback(vid, "Webcam"));
		} else {
			if (webcamVideo !== null) {
				webcamVideo.pause();
			}
			requestRecordedVideo((vid) => callback(vid, "Left"));
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
	const outputCanvas = filterStack.getCanvas();
	vidContainer.append(outputCanvas);

	// css provides no way for a div to maintain its aspect ratio, so do that manually...
	const updateScreenRatio = (e) => {
		const vidRatio = outputCanvas.width / outputCanvas.height;
		const screenRatio = e[0].contentRect.width / e[0].contentRect.height;
		if (vidRatio > screenRatio) {
			outputCanvas.style.width = "100%";
			outputCanvas.style.height = "auto";
		} else {
			outputCanvas.style.width = "auto";
			outputCanvas.style.height = "100%";
		}
	};
	new ResizeObserver(updateScreenRatio).observe(vidContainer);


	sidebar.append(generalMenu.getRoot());
	sidebar.append(filterStack.getTextureMenuRoot());
	sidebar.append(filterStack.getFilterMenuRoot());

	// INFORMATION THAT YOU WANT TO PASS INTO TEXTURES
	filterStack.registerExternalData("lastMotionData", lastMotionData);
	filterStack.registerExternalData("motionData", motionData);
	filterStack.registerExternalData("lastOutputFrame", outputCanvas);

	filterStack.addFilter(vfGradient);

	// filterStack.start();

	updateSourceVideo();
}

main();
// console.log(trackingDataBodyLeft.length);
