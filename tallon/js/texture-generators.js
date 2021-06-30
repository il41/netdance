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

const tgBlurryDots = (canvas, ctx, input, other) => {
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
