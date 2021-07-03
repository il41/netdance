const container = document.getElementById("main-container");

function main(videoElement) {
	/**
	 * false: body, true: hands
	 */
	let activeTracker = false;

	// variables used for routing hand tracking data to the VideoFilterStack
	// hand tracking has 42 markers, and body tracking has 33; here we just use the larger
	let lastMotionData = new Array(42).fill([-1, -1, -1]);
	let motionData = new Array(42).fill([-1, -1, -1]);

	// the actual tracking happens here
	const handTracker = new VideoHandTracker(videoElement);
	const bodyTracker = new VideoBodyTracker(videoElement);

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

	const updateTrackingSource = () => {
		if (activeTracker) {
			bodyTracker.stopTracking();
			handTracker.startTracking();
		} else {
			handTracker.stopTracking();
			bodyTracker.startTracking();
		}
	};
	updateTrackingSource();

	const trackingModeSwitch = document.getElementById("tracking-mode-switch");
	trackingModeSwitch.checked = activeTracker;
	trackingModeSwitch.addEventListener("change", (e) => {
		activeTracker = e.target.checked ? true : false;
		updateTrackingSource();
	});

	// do filter stuff once the video is loaded
	videoElement.onloadedmetadata = () => {
		// auto-play as soon as possible? (this is important to have if using webcam input)
		// videoElement.play();

		const filterStack = new VideoFilterStack(videoElement);
		container.append(filterStack.getCanvas());

		// INFORMATION THAT YOU WANT TO PASS INTO TEXTURES
		filterStack.registerExternalData("lastMotionData", lastMotionData);
		filterStack.registerExternalData("motionData", motionData);

		// TEXTURE TYPES
		filterStack.addTextureGenerator("Nothing", tgNothing);
		filterStack.addTextureGenerator("Everything", tgEverything);
		filterStack.addTextureGenerator("Input Video", tgRawInput);
		filterStack.addTextureGenerator("Trails", tgTrails);
		filterStack.addTextureGenerator("Crazy Shapes", tgCrazyShapes);
		filterStack.addTextureGenerator("Sprinkles", tgSprinkles);
		filterStack.addTextureGenerator("Spiky Mess", tgSpikyMess);
		filterStack.addTextureGenerator("Polygon", tgPolygon);

		// ACTIVE FILTERS (this method of adding them is temporary)

		// filterStack.addFilter(vfShape);
		// filterStack.addFilter(vfWobble);
		filterStack.addFilter(vfGradient);
		// filterStack.addFilter(vfColor);
		filterStack.addFilter(vfRGBLevels);
		// filterStack.addFilter(vfRGBLevels);

		filterStack.start();

		// add the menu to the DOM
		container.append(filterStack.getMenu());
	};
}

// getUserMedia().then((data) => {
// 	if (data.hasVideo) {
const videoElement = document.createElement("video");
// videoElement.srcObject = data.stream;
// set up the source video element
// // videoElement.src = "https://media.istockphoto.com/videos/hand-waving-bye-video-id150487553";
// videoElement.src = "https://media.istockphoto.com/videos/wave-your-hands-in-the-air-video-id650558060";
// // videoElement.src = "https://media.istockphoto.com/videos/sign-language-as-a-way-for-communication-video-id1131657616";
videoElement.src = "https://media.istockphoto.com/videos/senior-men-dancing-in-front-of-the-laptop-video-id1196458672";
// videoElement.src = "./JolieLaide_LeftCam_720p.mp4";
videoElement.crossOrigin = "anonymous";
videoElement.controls = true;
videoElement.loop = true;

// add the source video element to the DOM for comparison purposes
container.append(videoElement);
main(videoElement);
// 	}
// });
