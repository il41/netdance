const tgNothing = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {},
});

const tgEverything = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {},
});

const tgRawInput = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {},
	drawFunc: (selfData, canvas, ctx, input, other) => {
		ctx.drawImage(input, 0, 0);
	},
});

const tgDots = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
		ctx.strokeStyle = "#fff";
		ctx.lineCap = "round";
		ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 25);
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const lastMotionData = other.get("lastMotionData");
		const motionData = other.get("motionData");
		for (let i = 0; i < motionData.length; i++) {
			const [x1, y1, z1] = lastMotionData[i];
			const [x2, y2, z2] = motionData[i];
			if (x1 === -1 || x2 === -1) {
				continue;
			}
			ctx.beginPath();
			ctx.moveTo(Math.floor(x1 * canvas.width), Math.floor(y1 * canvas.height));
			ctx.lineTo(Math.floor(x2 * canvas.width), Math.floor(y2 * canvas.height));
			ctx.stroke();
		}
	},
});

const tgTrails = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
		ctx.fillStyle = "#00000005";

		ctx.strokeStyle = "#fff";
		ctx.lineCap = "round";
		ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 20);
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		const lastMotionData = other.get("lastMotionData");
		const motionData = other.get("motionData");
		for (let i = 0; i < motionData.length; i++) {
			const [x1, y1, z1] = lastMotionData[i];
			const [x2, y2, z2] = motionData[i];
			if (x1 === -1 || x2 === -1) {
				continue;
			}
			ctx.beginPath();
			ctx.moveTo(Math.floor(x1 * canvas.width), Math.floor(y1 * canvas.height));
			ctx.lineTo(Math.floor(x2 * canvas.width), Math.floor(y2 * canvas.height));
			ctx.stroke();
		}
	},
});

const tgCrazyShapes = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
		ctx.fillStyle = "#00000010";

		ctx.strokeStyle = "#fff";
		ctx.lineCap = "square";
		ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 5);
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {
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
});

const tgSprinkles = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
		selfData.rad = Math.floor(Math.min(canvas.width, canvas.height) / 100);
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {
		ctx.fillStyle = "#00000008";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		const chaos = other.get("volume") ?? 0.1;
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
					selfData.rad,
					0,
					7
				);
				ctx.fill();
			}
		}
	},
});

const tgSpikyMess = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
		ctx.fillStyle = "#00000008";

		ctx.strokeStyle = "#fff";
		ctx.lineCap = "round";
		ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 100);
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {
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
});

const tgPolygon = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
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
		ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 100);

		selfData.velocityFactor = Math.max(canvas.width, canvas.height) / 100;
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const time = other.get("time");
		if (time > 0.0 + selfData.lastTick) {
			selfData.lastTick = time;

			const motionData = other.get("motionData");

			const count = 8;
			for (let n = 0; n < count; n++) {
				const i = (selfData.lastI + n) % motionData.length;
				const [x, y, z] = motionData[i];

				if (x !== -1) {
					const particle = selfData.particles[i];
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
});
