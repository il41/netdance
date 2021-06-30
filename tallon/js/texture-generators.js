const tgNone = (canvas, ctx, input, other) => {};

const tgAll = (canvas, ctx, input, other) => {
	ctx.fillStyle = "#fff";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const tgDots = (canvas, ctx, input, other) => {
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
};

const tgTrails = (canvas, ctx, input, other) => {
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
};

const tgCrazyShapes = (canvas, ctx, input, other) => {
	ctx.fillStyle = "#00000010";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = "#fff";
	ctx.lineCap = "square";
	ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 5);

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
};

const tgSprinkles = (canvas, ctx, input, other) => {
	ctx.fillStyle = "#00000008";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = "#fff";
	const rad = Math.floor(Math.min(canvas.width, canvas.height) / 100);

	const chaos = other.get("volume") ?? 0.1;
	const poseData = other.get("poseData");
	for (let i = 0; i < poseData.length; i++) {
		const [x, y, z] = poseData[i];
		if (x === -1) {
			continue;
		}
		for (let i = 0; i < 10; i++) {
			ctx.beginPath();
			ctx.arc(Math.floor((x + randNP(chaos)) * canvas.width), Math.floor((y + randNP(chaos)) * canvas.height), rad, 0, 7);
			ctx.fill();
		}
	}
};


const tgWireframe = (canvas, ctx, input, other) => {
	ctx.fillStyle = "#00000008";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = "#fff";
	ctx.lineCap = "round";
	ctx.lineWidth = Math.floor(Math.min(canvas.width, canvas.height) / 100);

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
};
