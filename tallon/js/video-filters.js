const vfColor = new VideoFilterType(
	"Color",
	[
		{ name: "Shape", type: "enum", optionsSource: "Textures", default: "Trails" },
		{ name: "Red", type: "number", min: 0, max: 1, default: 1 },
		{ name: "Green", type: "number", min: 0, max: 1, default: 0 },
		{ name: "Blue", type: "number", min: 0, max: 1, default: 0 },
		{ name: "Opacity", type: "number", min: 0, max: 1, default: 1 },
	],
	() => {
		// helper function for the shader
		function lerp(a, b, x) {
			return a + x * (b - a);
		}

		function mult3(a3, x) {
			return [a3[0] * x, a3[1] * x, a3[2] * x];
		}

		// helper function for the shader
		function lerp3_3(a3, b3, x3) {
			return [lerp(a3[0], b3[0], x3[0]), lerp(a3[1], b3[1], x3[1]), lerp(a3[2], b3[2], x3[2]), 1];
		}

		// the actual shader function (note that it's written in JS, not HLSL)
		return gpu
			.createKernel(function (frame, mask, redControl, greenControl, blueControl, opacity) {
				const x = this.thread.x;
				const y = this.thread.y;

				return lerp3_3(frame[y][x], [redControl, greenControl, blueControl], mult3(mask[y][x], opacity));
			})
			.setFunctions([lerp, lerp3_3, mult3]);
	}
);

const vfRGBLevels = new VideoFilterType(
	"RGB Levels",
	[
		{ name: "Shape", type: "enum", optionsSource: "Textures", default: "Everything" },
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
		function lerp3(a3, b3, x) {
			return [lerp(a3[0], b3[0], x), lerp(a3[1], b3[1], x), lerp(a3[2], b3[2], x), 1];
		}

		// helper function for the shader
		function lerp3_3(a3, b3, x3) {
			return [lerp(a3[0], b3[0], x3[0]), lerp(a3[1], b3[1], x3[1]), lerp(a3[2], b3[2], x3[2]), 1];
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


const vfWobble = new VideoFilterType(
	"Wobble",
	[
		{ name: "Shape", type: "enum", optionsSource: "Textures", default: "Everything" },
		// { name: "Red", type: "number", min: 0, max: 1, default: 1 },
		// { name: "Green", type: "number", min: 0, max: 1, default: 0 },
		// { name: "Blue", type: "number", min: 0, max: 1, default: 0 },
		{ name: "Intensity", type: "number", min: 0, max: 5, default: 1 },
	],
	() => {
		// helper function for the shader
		function lerp(a, b, x) {
			return a + x * (b - a);
		}

		function mult3(a3, x) {
			return [a3[0] * x, a3[1] * x, a3[2] * x];
		}

		// helper function for the shader
		function lerp3_3(a3, b3, x3) {
			return [lerp(a3[0], b3[0], x3[0]), lerp(a3[1], b3[1], x3[1]), lerp(a3[2], b3[2], x3[2]), 1];
		}

		// the actual shader function (note that it's written in JS, not HLSL)
		return gpu
			.createKernel(function (frame, mask, redControl, greenControl, blueControl, opacity) {
				const x = this.thread.x + Math.sin();
				const y = this.thread.y;

				return lerp3_3(frame[y][x], [redControl, greenControl, blueControl], mult3(mask[y][x], opacity));
			})
			.setFunctions([lerp, lerp3_3, mult3]);
	}
);