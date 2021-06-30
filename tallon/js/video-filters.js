const vfColor = new VideoFilterType(
	"Color",
	[
		{ name: "Mask", type: "enum", optionsSource: "Textures", default: "Trails" },
		{ name: "Red", type: "number", min: 0, max: 1, default: 1 },
		{ name: "Green", type: "number", min: 0, max: 1, default: 0 },
		{ name: "Blue", type: "number", min: 0, max: 1, default: 0 },
	],
	() => {
		// helper function for the shader
		function lerp(a, b, x) {
			return a + x * (b - a);
		}

		// helper function for the shader
		function lerp3_3(a, b, x) {
			return [lerp(a[0], b[0], x[0]), lerp(a[1], b[1], x[1]), lerp(a[2], b[2], x[2]), 1];
		}

		// the actual shader function (note that it's written in JS, not HLSL)
		return gpu
			.createKernel(function (frame, mask, redControl, greenControl, blueControl) {
				const x = this.thread.x;
				const y = this.thread.y;

				return lerp3_3(frame[y][x], [redControl, greenControl, blueControl], mask[y][x]);
			})
			.setFunctions([lerp, lerp3, lerp3_3]);
	}
);

const vfRGBLevels = new VideoFilterType(
	"RGB Levels",
	[
		{ name: "Mask", type: "enum", optionsSource: "Textures", default: "All" },
		{ name: "Red", type: "number", min: 0, max: 2, default: 1 },
		{ name: "Green", type: "number", min: 0, max: 2, default: 1 },
		{ name: "Blue", type: "number", min: 0, max: 2, default: 1 },
		{ name: "Invert", type: "boolean", default: false },
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
			.createKernel(function (frame, mask, redControl, greenControl, blueControl, invert) {
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
