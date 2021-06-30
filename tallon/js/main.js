const container = document.getElementById("example-container");

function main() {
	// set up the source video element
	const videoElement = document.createElement("video");
	videoElement.src = "https://media.istockphoto.com/videos/hand-waving-bye-video-id150487553";
	// videoElement.src = "https://media.istockphoto.com/videos/sign-language-as-a-way-for-communication-video-id1131657616";
	videoElement.crossOrigin = "anonymous";
	videoElement.controls = true;
	videoElement.loop = true;

	// add the source video element to the DOM for comparison purposes
	container.append(videoElement);

	// variables used for routing hand tracking data to the VideoFilterStack
	let lastHandData = new Array(42).fill([-1, -1, -1]);
	let handData = new Array(42).fill([-1, -1, -1]);

	// the actual hand tracking happens here
	const handTracker = new VideoHandTracker(videoElement);
	handTracker.setCallback((dat, pointDataOnly) => {
		for (let i = 0; i < handData.length; i++) {
			lastHandData[i] = handData[i];
			handData[i] = pointDataOnly[i];
		}

		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		/*
			If you want to do math on the tracking data, this would be the place to do so.
			I suggest putting all the actual math in a different file/function for readability, though.

			It's important that any variables you want to pass to the shaders should be declared outside of this callback,
			and later added to the filterStack using filterStack.registerExternalData
		*/
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	});
	handTracker.startTracking();


	// do filter stuff once the video is loaded
	videoElement.onloadedmetadata = () => {
		// auto-play as soon as possible? (this is important to have if using webcam input)
		// videoElement.play();

		const filterStack = new VideoFilterStack(videoElement);
		container.append(filterStack.getCanvas());

		// INFORMATION THAT YOU WANT TO PASS INTO TEXTURES/SHADERS
		filterStack.registerExternalData("lastPoseData", lastHandData);
		filterStack.registerExternalData("poseData", handData);

		// TEXTURE TYPES
		filterStack.addTextureGenerator("Nothing", tgNothing);
		filterStack.addTextureGenerator("Everything", tgEverything);
		filterStack.addTextureGenerator("Trails", tgTrails);
		filterStack.addTextureGenerator("Crazy Shapes", tgCrazyShapes);
		filterStack.addTextureGenerator("Sprinkles", tgSprinkles);
		filterStack.addTextureGenerator("Wireframe", tgWireframe);

		// ACTIVE FILTERS (this method of adding them is temporary)
		filterStack.addFilter(vfWobble);
		filterStack.addFilter(vfColor);
		filterStack.addFilter(vfRGBLevels);
		filterStack.addFilter(vfRGBLevels);

		
		filterStack.start();

		// add the menu to the DOM
		container.append(filterStack.getMenu());
	};
}

main();
