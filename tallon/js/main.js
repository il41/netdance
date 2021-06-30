function exampleMultipleFilters() {
	// a weird filter that lets you control red/green channels or invert everything
	const exampleVideoFilter = new VideoFilterType(
		"RGB Levels",
		[
			{ name: "Red", type: "number", min: 0, max: 2, default: 1 },
			{ name: "Green", type: "number", min: 0, max: 2, default: 1 },
			{ name: "Blue", type: "number", min: 0, max: 2, default: 1 },
			{ name: "Invert", type: "boolean", default: false },
			{ name: "Mask", type: "texture", default: "BlurryDots" },
		],
		() => {
			// helper function for the shader
			function lerp(a, b, x) {
				return a + x * (b - a);
			}

			// helper function for the shader
			function lerp3(a, b, x) {
				return [lerp(a[0], b[0], x), lerp(a[1], b[1], x), lerp(a[2], b[2], x), 1];
			}

			// helper function for the shader
			function lerp3_3(a, b, x) {
				return [lerp(a[0], b[0], x[0]), lerp(a[1], b[1], x[1]), lerp(a[2], b[2], x[2]), 1];
			}

			// the actual shader function (note that it's written in JS, not HLSL)
			return gpu
				.createKernel(function (frame, redControl, greenControl, blueControl, invert, mask) {
					const x = this.thread.x;
					const y = this.thread.y;
					const pixel = frame[y][x];
					const maskPixel = mask[y][x];

					return lerp3_3(
						pixel,
						lerp3(
							[pixel[0] * redControl, pixel[1] * greenControl, pixel[2] * blueControl],
							[1 - pixel[0] * redControl, 1 - pixel[1] * greenControl, 1 - pixel[2] * blueControl],
							invert
						),
						maskPixel
					);
				})
				.setFunctions([lerp, lerp3, lerp3_3]);
		}
	);

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

		filterStack.addTextureGenerator("Dots", (canvas, ctx, input, other) => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.strokeStyle = "#fff";
			ctx.lineCap = "round";
			ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 25);

			const lastPoseData = other.get("lastPoseData");
			const poseData = other.get("poseData");
			for (let i = 0; i < poseData.length; i++) {
				const [x1, y1, z1] = lastPoseData[i];
				const [x2, y2, z2] = poseData[i];
				if (x1 === -1 || x2 === -1) {
					continue;
				}
				ctx.beginPath();
				ctx.moveTo(Math.floor(x1 * canvas.width), Math.floor(y1 * canvas.height));
				ctx.lineTo(Math.floor(x2 * canvas.width), Math.floor(y2 * canvas.height));
				ctx.stroke();
			}
		});

		filterStack.addTextureGenerator("BlurryDots", (canvas, ctx, input, other) => {
			ctx.fillStyle = "#00000005";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			ctx.strokeStyle = "#fff";
			ctx.lineCap = "round";
			ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 20);

			const lastPoseData = other.get("lastPoseData");
			const poseData = other.get("poseData");
			for (let i = 0; i < poseData.length; i++) {
				const [x1, y1, z1] = lastPoseData[i];
				const [x2, y2, z2] = poseData[i];
				if (x1 === -1 || x2 === -1) {
					continue;
				}
				ctx.beginPath();
				ctx.moveTo(Math.floor(x1 * canvas.width), Math.floor(y1 * canvas.height));
				ctx.lineTo(Math.floor(x2 * canvas.width), Math.floor(y2 * canvas.height));
				ctx.stroke();
			}
		});

		filterStack.addFilter(exampleVideoFilter);

		filterStack.start();

		container.append(filterStack.getMenu());
	};
}

exampleMultipleFilters();
