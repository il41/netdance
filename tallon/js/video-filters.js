/**
 * A very minimal video filter that draws its shape texture
 * @type {VideoFilterType}
 */
 const vfShape = new VideoFilterType(
	"Just Shape",
	[
		{ name: "Shape", type: "enum", source: "Textures", default: "Trails" },
	],
	() => {
		// the actual shader function
		return gpu
			.createKernel(function (frame, mask) {
				const x = this.thread.x;
				const y = this.thread.y;

				return mask[y][x];
			});
	}
);

/**
 * A minimal video filter that fills its shape with a solid color.
 * @type {VideoFilterType}
 */
const vfColor = new VideoFilterType(
	"Color",
	[
		{ name: "Shape", type: "enum", source: "Textures", default: "Trails" },
		{ name: "Color", type: "color", default: "#fff8", alpha: true },
	],
	() => {
		// linear interpolation between floats
		function lerp(a, b, x) {
			return a + x * (b - a);
		}

		// linear interpolation between vec3s, using a float as the factor
		function lerp3_3(a3, b3, x3) {
			return [lerp(a3[0], b3[0], x3[0]), lerp(a3[1], b3[1], x3[1]), lerp(a3[2], b3[2], x3[2]), 1];
		}

		// multiply a vec3 by a float
		function mult3(a3, x) {
			return [a3[0] * x, a3[1] * x, a3[2] * x];
		}

		// the actual shader function
		return gpu
			.createKernel(function (frame, mask, color) {
				const x = this.thread.x;
				const y = this.thread.y;

				return lerp3_3(frame[y][x], color, mult3(mask[y][x], color[3]));
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
		{ name: "Color", type: "color", default: "#fff", alpha: false },
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

		// the actual shader function
		return gpu
			.createKernel(function (frame, mask, color, invert) {
				const x = this.thread.x;
				const y = this.thread.y;
				const pixel = frame[y][x];
				const maskPixel = mask[y][x];

				return lerp3_3(
					pixel,
					lerp3(
						[pixel[0] * color[0], pixel[1] * color[1], pixel[2] * color[2]],
						[1 - pixel[0] * color[0], 1 - pixel[1] * color[1], 1 - pixel[2] * color[2]],
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
		// clamping (can't call it "clamp" because gpu.js uses that already)
		function iclamp(a, min, max) {
			return Math.max(min, Math.min(a, max));
		}

		// multiply a vec3 by a float
		function mult3(a3, x) {
			return [a3[0] * x, a3[1] * x, a3[2] * x];
		}

		// the actual shader function
		return gpu
			.createKernel(function (frame, mask, time, speed, frequency, intensity) {
				const x = this.thread.x;
				const y = this.thread.y;
				const w = this.constants.width;
				const h = this.constants.height;

				const maskPixel = mask[y][x];

				const xFactor = Math.sin(time * speed + y * frequency) * w * intensity * maskPixel[0];
				const yFactor = Math.cos(time * speed + x * frequency) * h * intensity * maskPixel[0];

				const xWobble = Math.round(iclamp(x + xFactor, 0, w));
				const yWobble = Math.round(iclamp(y + yFactor, 0, h));

				return frame[yWobble][xWobble];
			})
			.setFunctions([iclamp]);
	}
);
