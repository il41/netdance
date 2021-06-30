/**
 * A minimal video filter that fills its shape with a solid color.
 * @type {VideoFilterType}
 */
const vfColor = new VideoFilterType(
	"Color",
	[
		{ name: "Shape", type: "enum", source: "Textures", default: "Trails" },
		{ name: "Red", type: "number", min: 0, max: 1, default: 1 },
		{ name: "Green", type: "number", min: 0, max: 1, default: 0 },
		{ name: "Blue", type: "number", min: 0, max: 1, default: 0 },
		{ name: "Opacity", type: "number", min: 0, max: 1, default: 0.5 },
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

/**
 * A video filter that adjusts RGB values.
 * @type {VideoFilterType}
 */
const vfRGBLevels = new VideoFilterType(
	"RGB Levels",
	[
		{ name: "Shape", type: "enum", source: "Textures", default: "Everything" },
		{ name: "Red", type: "number", min: 0, max: 2, default: 1 },
		{ name: "Green", type: "number", min: 0, max: 2, default: 1 },
		{ name: "Blue", type: "number", min: 0, max: 2, default: 1 },
		{ name: "Invert", type: "boolean", default: false },
	],
	() => {
		// linear interpolation between floats
		function lerp(a, b, x) {
			return a + x * (b - a);
		}

		// linear interpolation between vec3s, using a float as the factor
		function lerp3(a3, b3, x) {
			return [lerp(a3[0], b3[0], x), lerp(a3[1], b3[1], x), lerp(a3[2], b3[2], x), 1];
		}

		// linear interpolation between vec3s, using a vec3 as the factor
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

/**
 * A video filter that wobbles the image.
 * @type {VideoFilterType}
 */
const vfWobble = new VideoFilterType(
	"Wobble",
	[
		{ name: "Shape", type: "enum", source: "Textures", default: "Everything" },
		{ name: "Time", type: "number", source: "Time", hidden: true },
		{ name: "Speed", type: "number", min: -10, max: 10, default: 1 },
		{ name: "Frequency", type: "number", min: 0, max: 0.2, default: 0.05, step: 0.001 },
		{ name: "Intensity", type: "number", min: 0, max: 0.2, default: 0.02, step: 0.001 },
	],
	() => {
		// linear interpolation between floats
		function lerp(a, b, x) {
			return a + x * (b - a);
		}

		// clamping (can't call it "clamp" because gpu.js uses that already)
		function iclamp(a, min, max) {
			return Math.max(min, Math.min(a, max));
		}

		// linear interpolation between vec3s, using a vec3 as the factor
		function lerp3_3(a3, b3, x3) {
			return [lerp(a3[0], b3[0], x3[0]), lerp(a3[1], b3[1], x3[1]), lerp(a3[2], b3[2], x3[2]), 1];
		}

		// the actual shader function (note that it's written in JS, not HLSL)
		return gpu
			.createKernel(function (frame, mask, time, speed, frequency, intensity) {
				const x = this.thread.x;
				const y = this.thread.y;
				const w = this.constants.width;
				const h = this.constants.height;

				const xWobble = iclamp(x + Math.round(Math.sin(time * speed + y * frequency) * w) * intensity, 0, w);
				const yWobble = iclamp(y + Math.round(Math.cos(time * speed + x * frequency) * h) * intensity, 0, h);

				return lerp3_3(frame[y][x], frame[yWobble][xWobble], mask[yWobble][xWobble]);
			})
			.setFunctions([iclamp, lerp, lerp3_3]);
	}
);
