/**
 * Helper function for handling promises. 
 * 
 * If/When the promise succeeds, returns the result. 
 * 
 * If/When the promise fails, returns null.
 */
const _maybe = async (promise) => {
  try {
    return await promise;
  } catch {
    return null;
  }
}


/**
 * Acquires a MediaStream containing video and audio input if they exist. 
 * - If camera access cannot be acquired, `stream` will only be audio.
 * - If microphone access cannot be acquired, `stream` will only be video.
 * - If neither can be acquired, `stream` will be null.
 * 
 * Default video params are 1280x720, facing user
 * 
 * You should probably only use this once and cache the result.
 * @param {Object} videoConstraints 
 * @returns Promise<\{stream: MediaStream, hasVideo: boolean, hasAudio: boolean\}>
 * 
 * @example
 * getUserMedia()
 *  .then((data) => {
 *    if(data.hasVideo){
 *      doVideoThings(data.stream);
 *    }
 * 
 *    if(data.hasAudio){
 *      doAudioThings(data.stream);
 *    }
 *  });
 */
async function getUserMedia(videoConstraints = {
  facingMode: "user",
  width: 1280,
  height: 720
}) {
  const videoAndAudio = await _maybe(navigator.mediaDevices.getUserMedia({
    audio: true,
    video: videoConstraints,
  }));
  if (videoAndAudio !== null) {
    return {
      hasAudio: true,
      hasVideo: true,
      stream: videoAndAudio,
    };
  }

  const justVideo = await _maybe(navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
  }));
  if (justVideo !== null) {
    return {
      hasAudio: false,
      hasVideo: true,
      stream: justVideo,
    };
  }

  const justAudio = await _maybe(navigator.mediaDevices.getUserMedia({
    audio: true,
  }));
  if (justAudio !== null) {
    return {
      hasAudio: true,
      hasVideo: false,
      stream: justAudio,
    };
  }

  return {
    hasAudio: false,
    hasVideo: false,
    stream: null,
  };
}

/**
 * Returns a function that returns the approximate audio level [0,1] of a provided MediaStream.
 * 
 * Source: https://stackoverflow.com/a/64650826
 */
function getVolumeAnalyzer(audioStream) {
  const audioContext = new AudioContext();
  const audioSource = audioContext.createMediaStreamSource(audioStream);

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.minDecibels = -127;
  analyser.maxDecibels = 0;
  analyser.smoothingTimeConstant = 0.4;
  audioSource.connect(analyser);

  const volumes = new Uint8Array(analyser.frequencyBinCount);

  return () => {
    analyser.getByteFrequencyData(volumes);
    let volSum = 0;
    for (let i = 0; i < volumes.length; i++) {
      volSum += volumes[i];
    }
    return Math.min(volSum / volumes.length / 127, 1);
  };
};