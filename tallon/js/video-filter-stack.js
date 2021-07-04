const gpu = new GPU();
const startTime = new Date().getTime();

/**
 * A VideoFilterStack provides a framework for parameterized, reorderable GPU-based effects on a video.
 */
class VideoFilterStack {
	/**
	 * @param {HTMLVideoElement} videoElement
	 */
	constructor(videoElement) {
		if (videoElement.readyState === 0) {
			console.error("Cannot create VideoStackFilter from HTMLVideoElement that hasn't loaded its metadata yet!");
		}

		/**
		 * @type {HTMLVideoElement}
		 */
		this._videoElement = videoElement;
		/**
		 * @type {number}
		 */
		this._width = videoElement.videoWidth;
		/**
		 * @type {number}
		 */
		this._height = videoElement.videoHeight;

		/**
		 * @type {boolean}
		 */
		this._requestedStop = false;
		/**
		 * @type {boolean}
		 */
		this._running = false;

		/**
		 * List of filter instances
		 *
		 * @type {[VideoFilterInstance]}
		 */
		this._filters = [];

		// converts image data into pipeline form
		this._preFilter = gpu
			.createKernel(function (frame) {
				return frame[this.thread.y][this.thread.x];
			})
			.setOutput([this._width, this._height])
			.setPipeline(true);

		// updates the canvas using the pipeline result
		this._postFilter = gpu
			.createKernel(function (frame) {
				const pixel = frame[this.thread.y][this.thread.x];
				this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
			})
			.setOutput([this._width, this._height])
			.setGraphical(true);

		/**
		 * non-visible canvas used for getting static images from a video
		 * @type {HTMLCanvasElement}
		 */
		this._vidCanvas = elem("canvas");
		this._vidCanvas.width = this._width;
		this._vidCanvas.height = this._height;
		this._vidContext = this._vidCanvas.getContext("2d");

		/**
		 * arbitrary data that can be used in texture functions or in filters
		 *
		 * @type {Map<String, any>}
		 */
		this._externalData = new Map();
		this._externalData.set("time", new Date().getTime() / 1000);

		/**
		 * images that are regenerated every frame for use in filters
		 * @type {Map<String, TextureGeneratorInstance>}
		 */
		this._textures = new Map();
		this._textureNameList = [];

		this._menu = new ParameterMenu("Filters", (inst) => {
			const t = inst.getType();
			return {
				paramsInfo: t.getParamsParams(),
				name: t.getName(),
				other: this._externalData,
			}
		});
		this._menu.registerSourcingData("Textures", this._textureNameList);
	}

	/**
	 * @returns {HTMLCanvasElement} Returns a canvas that shows results of all active filters. This is the main "output" of the VideoFilterStack.
	 */
	getCanvas() {
		return this._postFilter.canvas;
	}

	/**
	 * @returns {HTMLElement}
	 */
	getFilterMenuRoot() {
		return this._menu.getRoot();
	}

	/**
	 * @param {String} name
	 * @param {TextureGeneratorType} textureGenType
	 * @returns {TextureGeneratorInstance} Returns the added instance of the provided texture generator
	 */
	addTextureGenerator(name, textureGenType) {
		const texGen = textureGenType.instantiate(this._vidCanvas, this._externalData);
		this._textures.set(name, texGen);
		this._textureNameList.push(name);
		this._menu.sourcingDataChanged("Textures", {added: [name]});
		return texGen;
	}

	/**
	 *
	 * @param {VideoFilterType} filterType
	 */
	addFilter(filterType) {
		const filter = new VideoFilterInstance(filterType, this._width, this._height);
		const panel = this._menu.addItem(filter);
		filter.setParamValueGetter(panel.getValues);
	}

	_updateTextures() {
		for (const [, texGen] of this._textures) {
			texGen.draw(this._externalData);
		}
	}

	/**
	 * @param {String} name
	 * @param {any} data
	 */
	registerExternalData(name, data) {
		this._externalData.set(name, data);
	}

	start() {
		this._running = true;
		const updateShader = () => {
			if (this._requestedStop) {
				this._requestedStop = false;
				return;
			}

			if (this._videoElement.readyState >= 3) {
				// this is a bit of a hack to update the time, but it works
				this._externalData.set("time", new Date().getTime() / 1000);

				this._vidContext.drawImage(this._videoElement, 0, 0);
				this._updateTextures();
				this._process(this._vidCanvas, this._externalData);
			}

			// queue up the next update
			window.requestAnimationFrame(updateShader);
		};

		// queue the initial update
		window.requestAnimationFrame(updateShader);
	}

	stop() {
		this._requestedStop = true;
	}

	_process(imageData, externalData) {
		let pipe = this._preFilter(imageData);
		for (const filter of this._filters) {
			pipe = filter.process(pipe, this._textures, externalData);
		}
		this._postFilter(pipe);
	}
}

/**
 * Information about how a shader should work, what parameters it requires, and how those parameters should be exposed
 */
class VideoFilterType {
	/**
	 *
	 * @param {String} name
	 * @param {Object} filterParams
	 * @param {() => {GPUKernelFunction}} kernelGenerationFunc
	 * @example
	 *
	 * const vfRedShapes = new VideoFilterType(
	 * // name (the name of the shader)
	 * 	"Red Shapes",
	 * // filterParams (parameters that will be fed to the shader (order matters!))
	 * 	[
	 * 		{ name: "Shape", type: "enum", source: "Textures", default: "Nothing"},
	 * 		{ name: "Brightness", type: "number", min: 0, max: 1, default: 0.5 },
	 * 		{ name: "OutlineOnly", type: "boolean", default: false },
	 * 	],
	 * // kernelGenerationFunc (a function that returns the actual shader kernel)
	 * 	() => {
	 * 		const kernel = gpu.createKernel(function(frame, shape, brightness, outlineOnly){
	 * 			return ...
	 * 		});
	 * 	}
	 * );
	 */
	constructor(name, filterParams, kernelGenerationFunc) {
		this._filterParamsParams = filterParams;
		this._name = name;
		this._kernelGenerationFunc = kernelGenerationFunc;
		// this.processParamsParams();
	}

	getName() {
		return this._name;
	}

	getParamsParams() {
		return this._filterParamsParams;
	}

	createKernel(w, h) {
		return this._kernelGenerationFunc().setOutput([w, h]).setPipeline(true).setConstants({
			width: w,
			height: h,
		});
	}

	// processParamsParams() {
	// 	for (const paramInfo of this._filterParamsParams) {
	// 		if (paramInfo.type === "enum" && paramInfo.options === undefined) {
	// 			if (paramInfo.source === "Textures") {
	// 				paramInfo.options = textureNames;
	// 			} else {
	// 				console.error(`Unknown enum source "${paramInfo.source}"!`);
	// 			}
	// 		}
	// 	}
	// }

	getCanvas() {
		// NOTE: ctx.drawImage(this._postFilter.canvas,0,0) DOES NOT WORK.
		// this is because the filter's canvas is a webgl2 canvas that does not preserve its buffer.
		// most of the canvas's functions are also undefined for some reason?
		return this._kernel?.canvas;
	}
}

/**
 * These are handled by the `VideoFilterStack`. You should not interact with these directly.
 */
class VideoFilterInstance {
	/**
	 *
	 * @param {*} filterType
	 * @param {*} filterParams
	 * @param {Object} panelComponents
	 * @param {() => [any]} getValues
	 * @param {*} kernelFunc
	 */
	constructor(filterType, w, h) {
		this._filterType = filterType;
		this._kernelFunc = filterType.createKernel(w, h);
		this.getParamValues = null;
	}

	setParamValueGetter(getter) {
		this.getParamValues = getter;
	}

	getType() {
		return this._filterType;
	}

	/**
	 * @param {*} pipe
	 * @param {Map<String, TextureGeneratorInstance} textures
	 * @param {Object} otherData
	 * @returns
	 */
	process(pipe, textures, otherData) {
		const rawParamValues = this.getParamValues();

		const time = new Date().getTime();

		// process parameters before sending to shaders
		const cleanedParamValues = new Array(rawParamValues.length);
		for (let i = 0; i < this._filterParams.length; i++) {
			const paramInfo = this._filterParams[i];
			const paramValue = rawParamValues[i];

			let cleaned = paramValue;
			switch (paramInfo.type) {
				case "number":
					if (paramInfo.source !== undefined) {
						switch (paramInfo.source) {
							case "Time":
								cleaned = (time - startTime) / 1000;
								break;
							default:
								console.error(`Unknown enum source "${paramInfo.source}"!`);
								break;
						}
					}
					break;
				case "boolean":
					cleaned = paramValue ? 1 : 0;
					break;
				case "color":
					cleaned = hexToRGBAFloats(paramValue);
					break;
				case "enum":
					if (paramInfo.source === "Textures") {
						cleaned = textures.get(paramValue)?.canvas;
						if (cleaned === undefined) {
							console.error(`No texture exists with the name "${paramValue}"!`);
						}
					}
					break;
			}
			cleanedParamValues[i] = cleaned;
		}

		return this._kernelFunc(pipe, ...cleanedParamValues);
	}
}
