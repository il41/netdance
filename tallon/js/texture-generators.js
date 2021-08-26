const tgLastOutputFrame = new TextureGeneratorType("Last Output Frame", [], {
	initFunc: (selfData, canvas, ctx, input, params, other) => {},
	drawFunc: (selfData, canvas, ctx, input, params, other) => {
		ctx.drawImage(other.get("lastOutputFrame"), 0, 0);
	},
});

const tgEverything = new TextureGeneratorType("Everything", [], {
	initFunc: (selfData, canvas, ctx, input, params, other) => {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	},
	drawFunc: (selfData, canvas, ctx, input, params, other) => {},
});

const tgRawInput = new TextureGeneratorType("Raw Video Frame", [], {
	initFunc: (selfData, canvas, ctx, input, params, other) => {},
	drawFunc: (selfData, canvas, ctx, input, params, other) => {
		ctx.drawImage(input, 0, 0);
	},
});

const tgTrails = new TextureGeneratorType(
	"Trails",
	[
		{ name: "Thickness", type: "number", min: 0.1, max: 10, default: 1, step: 0.1 },
		{ name: "Fade", type: "number", min: 0, max: 1, default: 0.02, step: 0.01 },
		{ name: "Blur", type: "number", min: 0, max: 5, default: 0, step: 1 },
	],
	{
		initFunc: (selfData, canvas, ctx, input, params, other) => {
			ctx.strokeStyle = "#fff";
			ctx.lineCap = "round";

			// change thickness when parameter changes
			selfData.updateThickness = (force) => {
				const varName = "Thickness";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) * 0.01 * newVal);
				}
			};
			selfData.updateThickness(true);

			// change fade when parameter changes
			selfData.updateFade = (force) => {
				const varName = "Fade";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					ctx.fillStyle = `rgb(0, 0, 0, ${newVal})`;
				}
			};
			selfData.updateFade(true);

			// change blur when parameter changes
			selfData.updateBlur = (force) => {
				const varName = "Blur";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					if(newVal > 0){
						ctx.filter = `blur(${newVal}px)`;
					}else{
						ctx.filter = "none";
					}
				}
			};
			selfData.updateBlur(true);
		},
		drawFunc: (selfData, canvas, ctx, input, params, other) => {
			selfData.updateFade(false);
			selfData.updateThickness(false);
			selfData.updateBlur(false);

			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// ctx.globalAlpha = 1;
			const lastMotionData = other.get("lastMotionData");
			const motionData = other.get("motionData");
			for (let i = 0; i < motionData.length; i++) {
				const [x1, y1] = lastMotionData[i];
				const [x2, y2] = motionData[i];
				if (x1 === -1 || x2 === -1) {
					continue;
				}
				ctx.beginPath();
				ctx.moveTo(Math.floor(x1 * canvas.width), Math.floor(y1 * canvas.height));
				ctx.lineTo(Math.floor(x2 * canvas.width), Math.floor(y2 * canvas.height));
				ctx.stroke();
			}
		},
	}
);

const tgChaoticRectangles = new TextureGeneratorType(
	"Chaotic Rectangles",
	[
		{ name: "Thickness", type: "number", min: 0.1, max: 10, default: 5, step: 0.1 },
		{ name: "Fade", type: "number", min: 0, max: 1, default: 0.06, step: 0.01 },
		{ name: "Blur", type: "number", min: 0, max: 5, default: 0, step: 1 },
	],
	{
		initFunc: (selfData, canvas, ctx, input, params, other) => {
			ctx.strokeStyle = "#fff";
			ctx.lineCap = "square";

			// change thickness when parameter changes
			selfData.updateThickness = (force) => {
				const varName = "Thickness";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) * 0.01 * newVal);
				}
			};
			selfData.updateThickness(true);

			// change Fade when parameter changes
			selfData.updateFade = (force) => {
				const varName = "Fade";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					ctx.fillStyle = `rgb(0, 0, 0, ${newVal})`;
				}
			};
			selfData.updateFade(true);

			// change blur when parameter changes
			selfData.updateBlur = (force) => {
				const varName = "Blur";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					if(newVal > 0){
						ctx.filter = `blur(${newVal}px)`;
					}else{
						ctx.filter = "none";
					}
				}
			};
			selfData.updateBlur(true);
		},
		drawFunc: (selfData, canvas, ctx, input, params, other) => {
			selfData.updateThickness(false);
			selfData.updateFade(false);
			selfData.updateBlur(false);

			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const chaos = other.get("volume") ?? 0.1;
			const lastMotionData = other.get("lastMotionData");
			const motionData = other.get("motionData");
			for (let i = 0; i < motionData.length; i++) {
				const [x1, y1, z1] = lastMotionData[i];
				const [x2, y2, z2] = motionData[i];
				if (x1 === -1 || x2 === -1) {
					continue;
				}
				ctx.beginPath();
				ctx.moveTo(Math.floor((x1 + randNP(chaos)) * canvas.width), Math.floor((y1 + randNP(chaos)) * canvas.height));
				ctx.lineTo(Math.floor((x2 + randNP(chaos)) * canvas.width), Math.floor((y2 + randNP(chaos)) * canvas.height));
				ctx.stroke();
			}
		},
	}
);

const tgSprinkles = new TextureGeneratorType(
	"Sprinkles",
	[
		{ name: "Size", type: "number", min: 0.2, max: 2, default: 0.4, step: 0.1 },
		{ name: "Randomness", type: "number", min: 0, max: 0.2, default: 0.02, step: 0.01 },
		{ name: "Fade", type: "number", min: 0, max: 1, default: 0.03, step: 0.01 },
		{ name: "Blur", type: "number", min: 0, max: 5, default: 0, step: 1 },
	],
	{
		initFunc: (selfData, canvas, ctx, input, params, other) => {
			// change size when parameter changes
			selfData.updateSize = (force) => {
				const varName = "Size";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					selfData.radius = Math.floor(Math.min(canvas.width, canvas.height) * 0.01 * newVal);
				}
			};
			selfData.updateSize(true);

			// change blur when parameter changes
			selfData.updateBlur = (force) => {
				const varName = "Blur";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					if(newVal > 0){
						ctx.filter = `blur(${newVal}px)`;
					}else{
						ctx.filter = "none";
					}
				}
			};
			selfData.updateBlur(true);
		},
		drawFunc: (selfData, canvas, ctx, input, params, other) => {
			selfData.updateSize(false);
			selfData.updateBlur(false);

			ctx.fillStyle = `rgba(0,0,0,${params["Fade"]})`;
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const chaos = other.get("volume") ?? params["Randomness"];
			const motionData = other.get("motionData");
			ctx.fillStyle = "#fff";
			for (let i = 0; i < motionData.length; i++) {
				const [x, y, z] = motionData[i];
				if (x === -1) {
					continue;
				}
				for (let i = 0; i < 1; i++) {
					ctx.beginPath();
					ctx.arc(
						Math.floor((x + randNP(chaos)) * canvas.width),
						Math.floor((y + randNP(chaos)) * canvas.height),
						selfData.radius,
						0,
						7
					);
					ctx.fill();
				}
			}
		},
	}
);

const tgSpikyMesh = new TextureGeneratorType(
	"Spiky Mesh",
	[
		{ name: "Thickness", type: "number", min: 0.1, max: 10, default: 0.2, step: 0.1 },
		{ name: "Fade", type: "number", min: 0, max: 1, default: 0.03, step: 0.01 },
		{ name: "Blur", type: "number", min: 0, max: 5, default: 0, step: 1 },
	],
	{
		initFunc: (selfData, canvas, ctx, input, params, other) => {
			ctx.strokeStyle = "#fff";
			ctx.lineCap = "round";

			// change thickness when parameter changes
			selfData.updateThickness = (force) => {
				const varName = "Thickness";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) * 0.01 * newVal);
				}
			};
			selfData.updateThickness(true);

			// change Fade when parameter changes
			selfData.updateFade = (force) => {
				const varName = "Fade";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					ctx.fillStyle = `rgb(0, 0, 0, ${newVal})`;
				}
			};
			selfData.updateFade(true);

			// change blur when parameter changes
			selfData.updateBlur = (force) => {
				const varName = "Blur";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					if(newVal > 0){
						ctx.filter = `blur(${newVal}px)`;
					}else{
						ctx.filter = "none";
					}
				}
			};
			selfData.updateBlur(true);
		},
		drawFunc: (selfData, canvas, ctx, input, params, other) => {
			selfData.updateThickness(false);
			selfData.updateFade(false);
			selfData.updateBlur(false);

			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const motionDataScrambled = shuffleArray(other.get("motionData").slice());

			ctx.beginPath();
			for (let i = 0; i < motionDataScrambled.length; i++) {
				const [x, y, z] = motionDataScrambled[i];
				if (x === -1) {
					continue;
				}
				ctx.lineTo(Math.floor(x * canvas.width), Math.floor(y * canvas.height));
			}
			ctx.stroke();
		},
	}
);

const tgPolygon = new TextureGeneratorType(
	"Polygon",
	[
		{ name: "Drift", type: "number", min: 0, max: 2, default: 0, step: 0.1 },
		{ name: "Thickness", type: "number", min: 0.1, max: 10, default: 0.5, step: 0.1 },
		{ name: "Fade", type: "number", min: 0, max: 1, default: 1, step: 0.01 },
		{ name: "Blur", type: "number", min: 0, max: 5, default: 0, step: 1 },
	],
	{
		initFunc: (selfData, canvas, ctx, input, params, other) => {
			selfData.particles = new Array(42);
			selfData.lastTick = 0;
			selfData.lastI = 0;
			// create the particles' initial states
			for (let i = 0; i < selfData.particles.length; i++) {
				selfData.particles[i] = {
					visible: false,
					x: -1,
					y: -1,
					vx: 0,
					vy: 0,
				};
			}

			ctx.strokeStyle = "#fff";

			// change drift when parameter changes
			selfData.updateDrift = (force) => {
				const varName = "Drift";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					selfData.velocityFactor = Math.max(canvas.width, canvas.height) * 0.01 * newVal;
				}
			};
			selfData.updateDrift(true);

			// change thickness when parameter changes
			selfData.updateThickness = (force) => {
				const varName = "Thickness";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) * 0.01 * newVal);
				}
			};
			selfData.updateThickness(true);

			// change Fade when parameter changes
			selfData.updateFade = (force) => {
				const varName = "Fade";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					ctx.fillStyle = `rgb(0, 0, 0, ${newVal})`;
				}
			};
			selfData.updateFade(true);

			selfData.updateBlur = (force) => {
				const varName = "Blur";
				const newVal = params[varName];
				if (force || newVal !== selfData[varName]) {
					selfData[varName] = newVal;
					if(newVal > 0){
						ctx.filter = `blur(${newVal}px)`;
					}else{
						ctx.filter = "none";
					}
				}
			};
			selfData.updateBlur(true);
		},
		drawFunc: (selfData, canvas, ctx, input, params, other) => {
			selfData.updateDrift(false);
			selfData.updateThickness(false);
			selfData.updateFade(false);
			selfData.updateBlur(false);

			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const time = other.get("time");
			if (time > 0.0 + selfData.lastTick) {
				selfData.lastTick = time;

				const motionData = other.get("motionData");

				const count = 8;
				for (let n = 0; n < count; n++) {
					const i = (selfData.lastI + n) % motionData.length;
					const [x, y] = motionData[i];

					const particle = selfData.particles[i];
					if (x !== -1) {
						particle.vx = randNP(selfData.velocityFactor);
						particle.vy = randNP(selfData.velocityFactor);
						particle.x = x * canvas.width;
						particle.y = y * canvas.height;
					}
				}

				selfData.lastI = (selfData.lastI + count) % motionData.length;

				for (const particle of selfData.particles) {
					if (particle.x !== -1) {
						particle.vx *= 0.9;
						particle.vy *= 0.9;
						particle.x += particle.vx;
						particle.y += particle.vy;
					}
				}
			}

			ctx.beginPath();
			for (const particle of selfData.particles) {
				if (particle.x === -1) {
					continue;
				}
				ctx.lineTo(Math.floor(particle.x), Math.floor(particle.y));
			}
			ctx.closePath();
			ctx.stroke();
		},
	}
);
