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

const tgDots = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
		ctx.strokeStyle = "#fff";
		ctx.lineCap = "round";
		ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 25);
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {
		ctx.clearRect(0, 0, canvas.width, canvas.height);

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
		const lastPoseData = other.get("lastPoseData");
		const poseData = other.get("poseData");
		for (let i = 0; i < poseData.length; i++) {
			const [x1, y1, z1] = lastPoseData[i];
			const [x2, y2, z2] = poseData[i];
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
		const poseData = other.get("poseData");
		ctx.fillStyle = "#fff";
		for (let i = 0; i < poseData.length; i++) {
			const [x, y, z] = poseData[i];
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

const tgWireframe = new TextureGeneratorType({
	initFunc: (selfData, canvas, ctx, input, other) => {
		ctx.fillStyle = "#00000008";

		ctx.strokeStyle = "#fff";
		ctx.lineCap = "round";
		ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 100);
	},
	drawFunc: (selfData, canvas, ctx, input, other) => {
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		const poseDataScrambled = shuffleArray(other.get("poseData").slice());

		ctx.beginPath();
		for (let i = 0; i < poseDataScrambled.length; i++) {
			const [x, y, z] = poseDataScrambled[i];
			if (x === -1) {
				continue;
			}
			ctx.lineTo(Math.floor(x * canvas.width), Math.floor(y * canvas.height));
		}
		ctx.stroke();
	},
});
