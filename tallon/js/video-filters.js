// linear interpolation between floats
function lerp(a, b, x) {
	return a + x * (b - a);
}

// switch between x and (1-x) based on i
function toggleInvert(x, i) {
	return i * 1 - x * (i * 2 - 1);
}

// linear interpolation between vec3s, using a float as the factor
function lerp3(a3, b3, x) {
	return [lerp(a3[0], b3[0], x), lerp(a3[1], b3[1], x), lerp(a3[2], b3[2], x), 1];
}

// linear interpolation between vec3s, using a float as the factor, invertable
function lerp3i(a3, b3, x, invert) {
	x = toggleInvert(x, invert);
	return [lerp(a3[0], b3[0], xi), lerp(a3[1], b3[1], xi), lerp(a3[2], b3[2], xi), 1];
}

// linear interpolation between vec4s, using a float as the factor
function lerp4(a4, b4, x) {
	return [lerp(a4[0], b4[0], x), lerp(a4[1], b4[1], x), lerp(a4[2], b4[2], x), lerp(a4[3], b4[3], x)];
}

// linear interpolation between vec4s, using a vec3 as the factor
function lerp3_3(a3, b3, x3) {
	return [lerp(a3[0], b3[0], x3[0]), lerp(a3[1], b3[1], x3[1]), lerp(a3[2], b3[2], x3[2]), 1];
}

// linear interpolation between vec4s, using a vec3 as the factor, invertable
function lerp3_3i(a3, b3, x3, invert) {
	return [
		lerp(a3[0], b3[0], toggleInvert(x3[0], invert)),
		lerp(a3[1], b3[1], toggleInvert(x3[1], invert)),
		lerp(a3[2], b3[2], toggleInvert(x3[2], invert)),
		1,
	];
}

function add3(a3, x) {
	return [a3[0] + x, a3[1] + x, a3[2] + x];
}

function mult3(a3, x) {
	return [a3[0] * x, a3[1] * x, a3[2] * x];
}

function rotate(x, y, rot) {
	const co = Math.cos(rot);
	const si = Math.sin(rot);
	return [x * co - y * si, y * si + x * co];
}

// clamping (can't call it "clamp" because gpu.js uses that already)
function iclamp(a, min, max) {
	return Math.max(min, Math.min(a, max));
}

// clamping (can't call it "clamp" because gpu.js uses that already)
function min3(a3, min) {
	return [Math.min(a3[0], min), Math.min(a3[1], min), Math.min(a3[2], min)];
}

// force gpu.js to recognize that an array with 4 items is indeed an Array(4)
// ...y'know, maybe i should've stuck with GLSL
function repack4(a4) {
	const out = [a4[0], a4[1], a4[2], a4[3]];
	return out;
}

/**
 * A very minimal video filter that draws its shape texture
 * @type {VideoFilterType}
 */
const vfTexture = new VideoFilterType(
	"Just Texture",
	(owner) => [
		owner.shapeParameterCreator("Raw Video Frame", "Texture"),
		owner.shapeParameterCreator("Chaotic Rectangles"),
		{ name: "Invert Shape", type: "boolean", default: false },
	],
	() => {
		return gpu
			.createKernel(function (frame, texture, mask, invertMask) {
				const x = this.thread.x;
				const y = this.thread.y;

				return lerp3_3i(frame[y][x], texture[y][x], mask[y][x], invertMask);
			})
			.setFunctions([lerp, toggleInvert, lerp3_3i]);
	}
);

/**
 * A minimal video filter that fills its shape with a solid color.
 * @type {VideoFilterType}
 */
const vfColor = new VideoFilterType(
	"Color",
	(owner) => [
		owner.shapeParameterCreator("Trails"),
		{ name: "Invert Shape", type: "boolean", default: false },
		{ name: "Color", type: "color", default: "#f008", alpha: true },
	],
	() => {
		return gpu
			.createKernel(function (frame, mask, invertMask, color) {
				const x = this.thread.x;
				const y = this.thread.y;

				return lerp3_3i(frame[y][x], color, mult3(mask[y][x], color[3]), invertMask);
			})
			.setFunctions([lerp, toggleInvert, lerp3_3i, mult3]);
	}
);

/**
 * A video filter that fills its shape with a large rotating gradient.
 * @type {VideoFilterType}
 */
const vfGradient = new VideoFilterType(
	"Gradient",
	(owner) => [
		owner.shapeParameterCreator("Polygon"),
		{ name: "Invert Shape", type: "boolean", default: false },
		{ name: "Time", type: "number", source: "Time", hidden: true },
		{ name: "Speed", type: "number", min: 0, max: 10, default: 0.5, step: 0.1 },
		{ name: "Scale", type: "number", min: 1, max: 20, default: 1, step: 1 },
		{ name: "Color 1", type: "color", default: "#ffdb57", alpha: true },
		{ name: "Color 2", type: "color", default: "#9dff8a", alpha: true },
		{ name: "Color 3", type: "color", default: "#ff66c7", alpha: true },
		{ name: "Color 4", type: "color", default: "#61d0ff", alpha: true },
	],
	() => {
		return gpu
			.createKernel(function (frame, mask, invertMask, time, speed, scale, color1, color2, color3, color4) {
				// integer coords
				const x = this.thread.x;
				const y = this.thread.y;

				// float coords
				const fx = x / this.constants.width;
				const fy = y / this.constants.height;

				// rotated float coords
				const rotfx = rotate(fx - 0.5, fy - 0.5, time * speed)[0] * scale;

				// why? gpu.js is weird, that's why
				const color1a = [color1[0], color1[1], color1[2], color1[3]];
				const color2a = [color2[0], color2[1], color2[2], color2[3]];
				const color3a = [color3[0], color3[1], color3[2], color3[3]];
				const color4a = [color4[0], color4[1], color4[2], color4[3]];

				const gradientColor = lerp4(
					lerp4(color1a, color2a, (Math.sin(time * speed * 0.8) + 1) / 2),
					lerp4(color3a, color4a, (Math.cos(time * speed) + 1) / 2),
					(Math.cos(rotfx * 3 + time * speed * 0.7) + 1) / 2
				);

				return lerp3_3i(frame[y][x], gradientColor, mult3(mask[y][x], gradientColor[3]), invertMask);
			})
			.setFunctions([lerp, toggleInvert, lerp3_3i, lerp4, iclamp, rotate, mult3]);
	}
);

/**
 * A video filter that adjusts RGB values.
 * @type {VideoFilterType}
 */
const vfRGBLevels = new VideoFilterType(
	"RGB Levels",
	(owner) => [
		owner.shapeParameterCreator("Everything"),
		{ name: "Invert Shape", type: "boolean", default: false },
		{ name: "Color", type: "color", default: "#fff", alpha: false },
		{ name: "Invert Colors", type: "boolean", default: false },
	],
	() => {
		return gpu
			.createKernel(function (frame, mask, invertMask, color, invert) {
				const x = this.thread.x;
				const y = this.thread.y;
				const pixel = frame[y][x];

				return lerp3_3i(
					pixel,
					lerp3(
						[pixel[0] * color[0], pixel[1] * color[1], pixel[2] * color[2]],
						[1 - pixel[0] * color[0], 1 - pixel[1] * color[1], 1 - pixel[2] * color[2]],
						invert
					),
					mask[y][x],
					invertMask
				);
			})
			.setFunctions([lerp, toggleInvert, lerp3, lerp3_3i]);
	}
);

/**
 * A video filter that wobbles the image.
 * @type {VideoFilterType}
 */
const vfWobble = new VideoFilterType(
	"Wobble",
	(owner) => [
		owner.shapeParameterCreator("Everything"),
		{ name: "Invert Shape", type: "boolean", default: false },
		{ name: "Time", type: "number", source: "Time", hidden: true },
		{ name: "Speed", type: "number", min: -10, max: 10, default: 1 },
		{ name: "Frequency", type: "number", min: 0, max: 0.2, default: 0.05, step: 0.001 },
		{ name: "Intensity", type: "number", min: 0, max: 0.2, default: 0.02, step: 0.001 },
	],
	() => {
		return gpu
			.createKernel(function (frame, mask, invertMask, time, speed, frequency, intensity) {
				const x = this.thread.x;
				const y = this.thread.y;
				const w = this.constants.width;
				const h = this.constants.height;

				const maskPixel = mask[y][x];
				const maskVal = toggleInvert(maskPixel[0], invertMask);

				const xFactor = Math.sin(time * speed + y * frequency) * w * intensity * maskVal;
				const yFactor = Math.cos(time * speed + x * frequency) * h * intensity * maskVal;

				const xWobble = Math.round(iclamp(x + xFactor, 0, w));
				const yWobble = Math.round(iclamp(y + yFactor, 0, h));

				return frame[yWobble][xWobble];
			})
			.setFunctions([toggleInvert, iclamp]);
	}
);

/**
 * A video filter that mixes the current frame with the last output frame.
 * @type {VideoFilterType}
 */
const vfMotionBlur = new VideoFilterType(
	"Motion Blur",
	(owner) => [
		owner.shapeParameterCreator("Last Output Frame", "Last Frame", true),
		owner.shapeParameterCreator("Everything"),
		{ name: "Invert Shape", type: "boolean", default: false },
		{ name: "Intensity", type: "number", min: 0, max: 0.99, default: 0.8 },
	],
	() => {
		return gpu
			.createKernel(function (frame, lastFrame, mask, invertMask, amount) {
				const x = this.thread.x;
				const y = this.thread.y;
				return lerp3_3i(frame[y][x], lastFrame[y][x], mult3(mask[y][x], amount), invertMask);
			})
			.setFunctions([lerp, toggleInvert, lerp3_3i, mult3]);
	}
);

/**
 * A video filter that mixes the current frame with the last output frame.
 * @type {VideoFilterType}
 */
const vfZoomBlur = new VideoFilterType(
	"Zoom Blur",
	(owner) => [
		owner.shapeParameterCreator("Last Output Frame", "Last Frame", true),
		owner.shapeParameterCreator("Last Output Frame"),
		{ name: "Invert Shape", type: "boolean", default: false },
		{ name: "Intensity", type: "number", min: 0, max: 1, default: 0.75 },
		{ name: "Scale", type: "number", min: 0.8, max: 1.2, default: 0.95 },
	],
	() => {
		return gpu
			.createKernel(function (frame, lastFrame, mask, invertMask, amount, scale) {
				const x = this.thread.x;
				const y = this.thread.y;
				const w = this.constants.width;
				const h = this.constants.height;
				const xOffset = w / 2;
				const yOffset = h / 2;

				const x2 = ((x - xOffset) * scale + xOffset) % w;
				const y2 = ((y - yOffset) * scale + yOffset) % h;

				return lerp3_3i(frame[y][x], lastFrame[y2][x2], mult3(mask[y2][x2], amount), invertMask);
			})
			.setFunctions([lerp, toggleInvert, lerp3_3i, mult3]);
	}
);
