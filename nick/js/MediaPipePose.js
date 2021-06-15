/* global Pose, Camera */
/*

    MyMediaPipe
    -----------
    by Nick Briz <nickbriz@protonmail.com>
    GNU GPLv3 - https://www.gnu.org/licenses/gpl-3.0.txt
    2021

    Modded by ilai to use the Pose model
    -----------
       info
    -----------
    A Helper class for abstracting the https://mediapipe.dev/ library
    for easier integration into creative web projcts, p5.js, etc.

    -----------
       usage
    -----------

    const MP = new MyMediaPipe()

    // optional options object can include...
    const MP = new MyMediaPipe({
      debug: true, // for logging
      upperBodyOnly: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      width: 1280,
      height: 720
    })

*/
class MyMediaPipe {
  constructor (opts) {
    this.opts = opts || {}
    this.dataPoints = []
    this.image = null
    this.debug = this.opts.debug
    this.dependencies = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'
    ]
    this.loadDependencies()
  }

  get width () {
    return this.camera.video.videoWidth
  }

  get height () {
    return this.camera.video.videoHeight
  }

  get scriptsLoaded () {
    return this.dependenciesLoaded === this.dependencies.length
  }

  _useOpts (prop, fallback) {
    return typeof this.opts[prop] === 'number' ? this.opts[prop] : fallback
  }

  // .....

  loadDependencies () {
    this.dependenciesLoaded = 0
    this.dependencies.forEach(url => {
      const s = document.createElement('script')
      s.setAttribute('src', url)
      s.setAttribute('crossorigin', 'anonymous')
      s.onload = () => {
        if (this.debug) console.log('MyMediaPipe: loaded: ', url)
        this.dependenciesLoaded++
        if (this.scriptsLoaded) this.setup()
      }
      document.body.appendChild(s)
    })
  }

  onResults (results) {
    if (results && results.multiHandLandmarks) {
      this.dataPoints = []
      for (const landmarks of results.multiHandLandmarks) {
        this.dataPoints.push(landmarks)
      }
    }
    if (results && results.image) {
      this.image = results.image
    }
    if (this.debug) console.log('MyMediaPipe: dataPoints:', this.dataPoints)
  }

  setup () {
    // video element
    this.video = document.createElement('video')
    // pose instance
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
      }
    })
    this.pose.setOptions({
      upperBodyOnly: this._useOpts('upperBodyOnly', true),
      smoothLandmarks: true,
      minDetectionConfidence: this._useOpts('minDetectionConfidence', 0.5),
      minTrackingConfidence: this._useOpts('minTrackingConfidence', 0.5)
    });
    this.pose.onResults((r) => this.onResults(r))
    // camera instance
    this.camera = new Camera(this.video, {
      onFrame: async () => {
        await this.pose.send({ image: this.video })
      },
      width: this._useOpts('width', 1280),
      height: this._useOpts('height', 720)
    })
    this.camera.start()
  }
}

window.MyMediaPipe = MyMediaPipe
