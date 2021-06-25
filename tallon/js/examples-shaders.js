const container = document.getElementById("example-container");

function exampleMultipleFilters() {
	// a weird filter that lets you control red/green channels or invert everything
	const exampleVideoFilter = new VideoFilterType(
		"Example",
		[
			{ name: "Red", min: 0, max: 2, default: 1 },
			{ name: "Green", min: 0, max: 2, default: 1 },
			{ name: "Invert", default: false },
		],
		() => {
      // helper function for the shader
			function lerp(a, b, x) {
				return a + x * (b - a);
			}

      // helper function for the shader
			function lerp4(a, b, x) {
				return [lerp(a[0], b[0], x), lerp(a[1], b[1], x), lerp(a[2], b[2], x), lerp(a[3], b[3], x)];
			}

      // the actual shader function (note that it's written in JS, not HLSL)
			return gpu
				.createKernel(function (frame, trackingData, redControl, greenControl, invert) {
          const x = this.thread.x;
          const y = this.thread.y;
					const pixel = frame[y][x];

					return lerp4(
						[pixel[0] * redControl, pixel[1] * greenControl, pixel[2], pixel[3]],
						[1 - pixel[0] * redControl, 1 - pixel[1] * greenControl, 1 - pixel[2], pixel[3]],
						invert
					);
				})
				.setFunctions([lerp, lerp4]);
		}
	);

	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// logic for layering 3 exampleVideoFilters onto a url-sourced video
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	const videoElement = document.createElement("video");
	videoElement.src = "https://media.istockphoto.com/videos/hand-waving-bye-video-id150487553";
	videoElement.crossOrigin = "anonymous";
	videoElement.controls = true;
	videoElement.loop = true;
	container.append(videoElement);

  // hand tracking stuff
  let handData = (new Array(42)).fill([0,0,0]);
	const handTracker = new VideoHandTracker(videoElement);
	handTracker.setCallback((dat, pointDataOnly) => {
    handData = pointDataOnly;
  });
	handTracker.startTracking();

  // do filter stuff once the video is loaded
	videoElement.onloadedmetadata = () => {
		videoElement.play();

		const filterStack = new VideoFilterStack(videoElement);
		container.append(filterStack.getCanvas());

		filterStack.addFilter(exampleVideoFilter);
		filterStack.addFilter(exampleVideoFilter);
		filterStack.addFilter(exampleVideoFilter);

		filterStack.start({
			trackingData: handData,
		});
	};
}
