function testing() {
	// a weird filter that lets you control red/green channels or invert everything
	const videoElement = document.createElement("video");
	// videoElement.src = "https://media.istockphoto.com/videos/hand-waving-bye-video-id150487553";
	videoElement.src = "https://media.istockphoto.com/videos/sign-language-as-a-way-for-communication-video-id1131657616";
	videoElement.crossOrigin = "anonymous";
	videoElement.controls = true;
	videoElement.loop = true;
	container.append(videoElement);

	// hand tracking stuff
	let lastHandData = new Array(42).fill([-1, -1, -1]);
	let handData = new Array(42).fill([-1, -1, -1]);

	const handTracker = new VideoHandTracker(videoElement);
	handTracker.setCallback((dat, pointDataOnly) => {
		for (let i = 0; i < handData.length; i++) {
			lastHandData[i] = handData[i];
			handData[i] = pointDataOnly[i];
		}
	});
	handTracker.startTracking();

	// do filter stuff once the video is loaded
	videoElement.onloadedmetadata = () => {
		// videoElement.play();

		const filterStack = new VideoFilterStack(videoElement);
		container.append(filterStack.getCanvas());

		filterStack.registerExternalData("lastPoseData", lastHandData);
		filterStack.registerExternalData("poseData", handData);

		filterStack.addTextureGenerator("All", tgAll);
		filterStack.addTextureGenerator("Blurry Dots", tgBlurryDots);
		filterStack.addTextureGenerator("Crazy Shapes", tgCrazyShapes);

		filterStack.addFilter(vfRGBLevels);
		filterStack.addFilter(vfRGBLevels);

		filterStack.start();

		container.append(filterStack.getMenu());
	};
}

testing();