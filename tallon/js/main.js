const sidebar = document.getElementById("main-sidebar");
const vidContainer = document.getElementById("main-video-container");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingOverlayList = document.getElementById("loading-overlay-list");

let loadingRequests = new Set();
let trackingModeLoading = false;

const updateLoadingOverlay = () => {
	if (loadingRequests.size === 0) {
		loadingOverlay.classList.remove("visible");
	} else {
		loadingOverlay.classList.add("visible");
	}
};

function main() {
	/**
	 * false: body, true: hands
	 */
	let activeTracker = false;

	const videoSources = new Map([
		["Left Video", null],
		["Right Video", null],
		["Webcam", null],
	]);
	let activeVideoSource = null;

	// a hacky way for other code to keep a reference to the active video
	const activeVideoSourceRef = [null];

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
	const filterStack = new VideoFilterStack(
		[tgEverything, tgRawInput, tgPolygon, tgTrails, tgChaoticRectangles, tgSpikyMesh, tgSprinkles, tgLastOutputFrame],
		[vfShape, vfWobble, vfGradient, vfColor, vfMotionBlur, vfZoomBlur, vfRGBLevels]
	);

	// variables used for routing hand tracking data to the VideoFilterStack
	// hand tracking has 42 markers, and body tracking has 33; here we just use the larger
	const markerCount = 42;

	/**
	 * @type {[number, number, number]}
	 */
	const rawMotionData = new Array(markerCount);
	/**
	 * @type {[number, number, number]}
	 */
	const lastSmoothMotionData = new Array(markerCount);
	/**
	 * @type {[number, number, number]}
	 */
	const smoothMotionData = new Array(markerCount);

	/**
	 * @type {[Vector2D]}
	 */
	const motionDataVelocity = new Array(markerCount);

	for (let i = 0; i < markerCount; i++) {
		rawMotionData[i] = [-1, -1, -1];
		lastSmoothMotionData[i] = [-1, -1, -1];
		smoothMotionData[i] = [-1, -1, -1];
		motionDataVelocity[i] = new Vector2D(0, 0);
	}

	// the actual tracking happens here
	const handTracker = new VideoHandTracker();
	const bodyTracker = new VideoBodyTracker();

	bodyTracker.storeData("Left Video", trackingDataBodyLeft);
	bodyTracker.storeData("Right Video", trackingDataBodyRight);

	// this function is called whenever either tracker is updated
	const trackerCallback = (dat, pointDataOnly) => {
		for (let i = 0; i < pointDataOnly.length; i++) {
			rawMotionData[i] = pointDataOnly[i];
		}
	};

	handTracker.setCallback((dat, pointDataOnly) => {
		if (loadingRequests.delete("hand tracking")) {
			updateLoadingOverlay();
		}
		trackerCallback(dat, pointDataOnly);
	});
	bodyTracker.setCallback((dat, pointDataOnly) => {
		if (loadingRequests.delete("body tracking")) {
			updateLoadingOverlay();
		}
		trackerCallback(dat, pointDataOnly);
	});

	const updateTrackingMode = () => {
		trackingModeLoading = true;

		if (activeTracker === "Just Hands") {
			loadingRequests.add("hand tracking");
			updateLoadingOverlay();

			bodyTracker.stopTracking();
			handTracker.startTracking();
		} else {
			loadingRequests.add("body tracking");
			updateLoadingOverlay();

			handTracker.stopTracking();
			bodyTracker.startTracking();
		}
	};
	updateTrackingMode();

	/**
	 * Get prerecorded video and do stuff once it's loaded (or right away if it's already loaded)
	 * @param {(video: HTMLVideoElement) => void} callback
	 * @returns
	 */
	const requestRecordedVideo = (callback, name, path) => {
		const existing = videoSources.get(name);
		if (existing !== null) {
			callback(existing);
			return;
		}

		const recordedVideo = document.createElement("video");
		recordedVideo.src = path;
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

	const changeActiveSourceVideo = (newSourceName) => {
		if (activeVideoSource !== null) {
			activeVideoSource.pause();
		}

		const play = (newSource) => {
			activeVideoSource = newSource;
			activeVideoSourceRef[0] = newSource;
			filterStack.setSourceVideo(newSource);
			handTracker.setSourceVideo(newSource, newSourceName);
			bodyTracker.setSourceVideo(newSource, newSourceName);
			newSource.play();
		};

		/**
		 *
		 * @param {HTMLVideoElement} newSource
		 */
		const callback = (newSource) => {
			videoSources.set(newSourceName, newSource);

			loadingRequests.delete("video/webcam");
			updateLoadingOverlay();

			play(newSource);
		};

		let source = videoSources.get(newSourceName);
		if (source) {
			play(source);
		} else {
			loadingRequests.add("video/webcam");
			updateLoadingOverlay();

			switch (newSourceName) {
				case "Left Video":
					requestRecordedVideo(callback, newSourceName, "./Left-720p.mp4");
					break;
				case "Right Video":
					requestRecordedVideo(callback, newSourceName, "./Right-720p.mp4");
					break;
				case "Webcam":
					requestWebcamVideo(callback);
					break;
			}
		}
	};

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

	const generalMenu = new ParameterMenu("Controls", (panelInfo) => panelInfo, false);
	generalMenu.addItem({
		name: "Video",
		paramsInfo: [
			{
				name: "Source",
				type: "enum",
				options: ["Webcam", "Left Video", "Right Video"],
				default: "Left Video",
				callback: (val) => {
					changeActiveSourceVideo(val);
				},
			},
			{ name: "Recording", type: "record", canvas: outputCanvas, videoRef: activeVideoSourceRef },
		],
	});

	let smoothingMode = "Springy";
	let smoothingStrength = 0.2;
	let springDrag = 0.55;

	generalMenu.addItem({
		name: "Motion Tracking",
		paramsInfo: [
			{
				name: "Mode",
				type: "enum",
				options: ["Full Body", "Just Hands"],
				default: "Full Body",
				callback: (val) => {
					activeTracker = val;
					updateTrackingMode();
				},
			},
			{
				name: "Smoothing Mode",
				type: "enum",
				options: ["None", "Lerp", "Springy"],
				default: smoothingMode,
				callback: (val) => {
					smoothingMode = val;
				},
			},
			{
				name: "Smoothing Strength",
				type: "number",
				min: 0.01,
				max: 1,
				step: 0.01,
				default: smoothingStrength,
				callback: (val) => {
					smoothingStrength = val;
				},
			},
			{
				name: "Spring Drag",
				type: "number",
				min: 0,
				max: 1,
				step: 0.01,
				default: springDrag,
				callback: (val) => {
					springDrag = val;
				},
			},
			{
				name: "Time Delay",
				type: "number",
				min: -5,
				max: 5,
				default: 0,
				step: 0.1,
				callback: (val) => {
					bodyTracker.setStoreOffset(-val);
					handTracker.setStoreOffset(-val);
				},
			},
		],
	});

	sidebar.append(generalMenu.getRoot());
	sidebar.append(filterStack.getTextureMenuRoot());
	sidebar.append(filterStack.getFilterMenuRoot());

	// motion data smoothing stuff
	const smoothingFunc = () => {
		for (let i = 0; i < markerCount; i++) {
			lastSmoothMotionData[i] = smoothMotionData[i];
			// don't smooth if the coord is invalid or smoothing is disabled
			if (rawMotionData[i][0] === -1 || smoothingMode === "None") {
				smoothMotionData[i] = rawMotionData[i];
			} else {
				// if last point is invalid, just replace it with current point
				const lastSmoothMarker = lastSmoothMotionData[i][0] !== -1 ? lastSmoothMotionData[i] : rawMotionData[i];
				const lastSmooth2d = new Vector2D(lastSmoothMarker[0], lastSmoothMarker[1]);
				const raw2d = new Vector2D(rawMotionData[i][0], rawMotionData[i][1]);

				// actual smoothing
				switch (smoothingMode) {
					case "Lerp":
						{
							const newPos = lastSmooth2d.lerp(raw2d, smoothingStrength);
							smoothMotionData[i] = [newPos.x, newPos.y, rawMotionData[2]];
						}
						break;
					case "Springy":
						{
							motionDataVelocity[i] = motionDataVelocity[i]
								.multiplyScalar(springDrag)
								.add(raw2d.sub(lastSmooth2d).multiplyScalar(smoothingStrength));

							const newPos = lastSmooth2d.add(motionDataVelocity[i]);
							smoothMotionData[i] = [newPos.x, newPos.y, rawMotionData[2]];
						}
						break;
				}
			}
		}
		requestAnimationFrame(smoothingFunc);
	};

	requestAnimationFrame(smoothingFunc);

	// INFORMATION THAT YOU WANT TO PASS INTO TEXTURES
	filterStack.registerExternalData("lastMotionData", lastSmoothMotionData);
	filterStack.registerExternalData("motionData", smoothMotionData);
	filterStack.registerExternalData("lastOutputFrame", outputCanvas);

	filterStack.addFilter(vfGradient);

	filterStack.start();
}

main();
// console.log(trackingDataBodyLeft.length);
