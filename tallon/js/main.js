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
	let lastRawMotionData = new Array(42).fill([-1, -1, -1]);
	let rawMotionData = new Array(42).fill([-1, -1, -1]);
	let lastSmoothMotionData = new Array(42).fill([-1, -1, -1]);
	let smoothMotionData = new Array(42).fill([-1, -1, -1]);

	// the actual tracking happens here
	const handTracker = new VideoHandTracker();
	const bodyTracker = new VideoBodyTracker();

	bodyTracker.storeData("Left Video", trackingDataBodyLeft);
	bodyTracker.storeData("Right Video", trackingDataBodyRight);

	// this function is called whenever either tracker is updated
	const trackerCallback = (dat, pointDataOnly) => {
		for (let i = 0; i < pointDataOnly.length; i++) {
			lastRawMotionData[i] = rawMotionData[i];
			rawMotionData[i] = pointDataOnly[i];
		}
		//variables to be changed with global GUI object
		let smooth=true;
		let drag = 0.55;
		let strength = 0.1;
		let smoothness = 0.5;

		//vector smoothing algorithms (between smooth and spring)
		for (let i = 0; i < rawMotionData.length; i++) {

			//define vectors and velocity
			let vel = new Vector2D(0,0);
			let pos = new Vector2D(rawMotionData[i][0],rawMotionData[i][1]);
			let oldPos = new Vector2D(lastRawMotionData[i][0],lastRawMotionData[i][1]);

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

	const smoothingFunc = () => {
		for (let i = 0; i < rawMotionData.length; i++) {
			lastSmoothMotionData[i] = smoothMotionData[i];
			if(rawMotionData[i][0] === -1 || smoothingMode === "None"){
				smoothMotionData[i] = rawMotionData[i];
			}else{
				switch(smoothingMode){
					case "Lerp":
						smoothMotionData[i] = rawMotionData[i];
						break;
				}
			}
		}
		requestAnimationFrame(smoothingFunc);
	}

	requestAnimationFrame(smoothingFunc);

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
	}).getValuesUnordered;

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
			{ name: "Smoothing", type: "enum", options: ["None", "Basic", "Springy"], default: "None" },
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
	}).getValuesUnordered;

	sidebar.append(generalMenu.getRoot());
	sidebar.append(filterStack.getTextureMenuRoot());
	sidebar.append(filterStack.getFilterMenuRoot());

	// INFORMATION THAT YOU WANT TO PASS INTO TEXTURES
	filterStack.registerExternalData("lastMotionData", lastSmoothMotionData);
	filterStack.registerExternalData("motionData", smoothMotionData);
	filterStack.registerExternalData("lastOutputFrame", outputCanvas);

	filterStack.addFilter(vfGradient);

	filterStack.start();
}

main();
// console.log(trackingDataBodyLeft.length);
