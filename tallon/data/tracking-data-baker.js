const container = document.getElementById("main-container");
const textOutput = elem("code");

let text = "";

const bodyTracker = new VideoBodyTracker();
bodyTracker.setCallback((_, pointData) => {
	text += `${recordedVideo.currentTime}, ${pointData},\n`;
});

const recordedVideo = document.createElement("video");

recordedVideo.onloadeddata = () => {
	console.log("start");
	bodyTracker.setSourceVideo(recordedVideo);
	bodyTracker.startTracking();
};
recordedVideo.src = "./Left-720p.mp4";
recordedVideo.crossOrigin = "anonymous";
recordedVideo.controls = true;
recordedVideo.loop = false;
container.append(recordedVideo);

recordedVideo.onended = () => {
	console.log("asd");
	textOutput.innerText = text;
}

container.append(textOutput);