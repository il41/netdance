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

		/**
		 * images that are regenerated every frame for use in filters
		 * @type {Map<String, TextureGeneratorInstance>}
		 */
		this._textures = new Map();

		this._menuComponents = createMenu("Filters", this._filters);
	}

	/**
	 * @returns {HTMLCanvasElement} Returns a canvas that shows results of all active filters. This is the main "output" of the VideoFilterStack.
	 */
	getCanvas() {
		return this._postFilter.canvas;
	}

	/**
	 * @returns {Object} Returns a collection of HTMLElements that form the menu. The outermost one is `root`.
	 */
	getMenu() {
		return this._menuComponents.root;
	}

	/**
	 * @param {String} name
	 * @param {TextureGeneratorType} textureGenType
	 * @returns {TextureGeneratorInstance} Returns the added instance of the provided texture generator
	 */
	addTextureGenerator(name, textureGenType) {
		const texGen = textureGenType.instantiate(this._vidCanvas, this._externalData);
		this._textures.set(name, texGen);
		return texGen;
	}

	_updateTextures() {
		for (const [textureName, texGen] of this._textures) {
			texGen.draw(this._externalData);
		}
	}

	/**
	 * 
	 * @param {String} name 
	 * @param {any} data 
	 */
	registerExternalData(name, data) {
		this._externalData.set(name, data);
	}

	/**
	 * This function is for programmatically creating a filter instance. It should be mostly removed later.
	 * @param {VideoFilterType} filterType 
	 * @returns VideoFilterInstance
	 */
	addFilter(filterType) {
		const filterInstance = filterType.instantiate(this._width, this._height, Array.from(this._textures.keys()));
		this._filters.push(filterInstance);

		this._menuComponents.list.append(filterInstance.getGuiRoot());
		return filterInstance;
	}

	start() {
		this._running = true;
		const updateShader = () => {
			if (this._requestedStop) {
				this._requestedStop = false;
				return;
			}

			if (this._videoElement.readyState >= 3) {
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
		this._filterParams = filterParams;
		this._name = name;
		this._kernelGenerationFunc = kernelGenerationFunc;
	}

	getName() {
		return this._name;
	}

	createKernel(w, h) {
		return this._kernelGenerationFunc().setOutput([w, h]).setPipeline(true).setConstants({
			width: w,
			height: h,
		});
	}

	instantiate(w, h, textureNames) {
		for (const paramInfo of this._filterParams) {
			if (paramInfo.type === "enum" && paramInfo.options === undefined) {
				if (paramInfo.source === "Textures") {
					paramInfo.options = textureNames;
				} else {
					console.error(`Unknown enum source "${paramInfo.source}"!`);
				}
			}
		}
		const { panelComponents, getValues } = createParameterPanel(this._name, this._filterParams);
		return new VideoFilterInstance(this, this._filterParams, panelComponents, getValues, this.createKernel(w, h));
	}

	getCanvas() {
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
	constructor(filterType, filterParams, panelComponents, getValues, kernelFunc) {
		this._filterType = filterType;
		this._kernelFunc = kernelFunc;
		this._filterParams = filterParams;
		this._panelComponents = panelComponents;
		this.getParamValues = getValues;
	}

	getGuiRoot() {
		return this._panelComponents.root;
	}

	/**
	 *
	 * @param {*} pipe
	 * @param {Map<String, TextureGeneratorInstance} textures
	 * @param {Object} otherData
	 * @returns
	 */
	process(pipe, textures, otherData) {
		const rawParamValues = this.getParamValues();

		const d = new Date();

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
								cleaned = (d.getTime() - startTime) / 1000;
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
				case "enum":
					if (paramInfo.source === "Textures") {
						cleaned = textures.get(paramValue).canvas;
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
