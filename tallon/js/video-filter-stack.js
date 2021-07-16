const gpu = new GPU();
const startTime = new Date().getTime();

/**
 * A VideoFilterStack provides a framework for parameterized, reorderable GPU-based effects on a video.
 */
class VideoFilterStack {
	/**
	 * @param {VideoFilterType} filterTypes
	 */
	constructor(textureTypes, filterTypes) {
		this._dimensionsSet = false;

		/**
		 * @type {HTMLVideoElement}
		 */
		this._videoElement = null;

		/**
		 * @type {number}
		 */
		this._width = null;
		/**
		 * @type {number}
		 */
		this._height = null;

		/**
		 * @type {boolean}
		 */
		this._requestedStop = false;
		/**
		 * @type {boolean}
		 */
		this._running = false;

		// converts image data into pipeline form
		this._preFilter = gpu
			.createKernel(function (frame) {
				return frame[this.thread.y][this.thread.x];
			})
			.setDynamicOutput(true)
			.setPipeline(true);

		// updates the canvas using the pipeline result
		this._postFilter = gpu
			.createKernel(function (frame) {
				const pixel = frame[this.thread.y][this.thread.x];
				this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
			})
			.setDynamicOutput(true)
			.setGraphical(true);

		/**
		 * non-visible canvas used for getting static images from a video
		 * @type {HTMLCanvasElement}
		 */
		this._vidCanvas = elem("canvas");
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

		this._filterTypes = new Map();
		for (const type of filterTypes) {
			this._filterTypes.set(type.getName(), type);
		}

		this._filterMenu = new ParameterMenu(
			"Filters",
			(inst) => {
				const t = inst.getType();
				return {
					paramsInfo: t.getParamsParams(),
					name: t.getName(),
					otherPanelArgs: {
						deletable: true,
					},
				};
			},
			true,
			"Add Filter",
			filterTypes.map((t) => t.getName()),
			{
				addMenuUsed: (e, menu, option) => {
					this.addFilter(this._filterTypes.get(option));
				},
			}
		);
		this._filterMenu.registerSourcingData("Textures", this._textureNameList);

		this._textureTypes = new Map();
		for (const type of textureTypes) {
			this._textureTypes.set(type.getName(), type);
		}

		this._textureMenu = new ParameterMenu(
			"Shapes",
			(inst) => {
				const t = inst.getType();
				return {
					paramsInfo: t.getParamsParams(),
					name: t.getName(),
					otherPanelArgs: {
						deletable: false,
					},
				};
			},
			false,
			"Add Shape",
			[],
			{}
		);

		for (const type of textureTypes) {
			this.addTextureGenerator(type.getName(), type);
		}

		/**
		 * List of filter instances
		 *
		 * @type {{item: VideoFilterInstance, panel: ParamPanel}}
		 */
		this._filters = this._filterMenu.getItemsList();
	}

	/**
	 *
	 * @param {number} w
	 * @param {number} h
	 */
	setDimensions(w, h) {
		this._width = w;
		this._height = h;
		this._dimensionsSet = true;
		this._dimensionsUpdated();
	}

	_dimensionsUpdated() {
		if (!this._dimensionsSet) {
			console.error("Video filter stack dimensions have not been set yet!");
			return;
		}

		this._vidCanvas.width = this._width;
		this._vidCanvas.height = this._height;

		this._preFilter.setOutput([this._width, this._height]);
		this._postFilter.setOutput([this._width, this._height]);

		for (const f of this._filters) {
			/**
			 * @type {VideoFilterInstance}
			 */
			const filter = f.item;
			filter.setDimensions(this._width, this._height);
		}

		for (const texGen of this._textures.values()) {
			texGen.updateDimensions();
		}
	}

	/**
	 * @param {HTMLVideoElement} video
	 */
	setSourceVideo(video) {
		this._videoElement = video;
		this.setDimensions(video.videoWidth, video.videoHeight);
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
	getTextureMenuRoot() {
		return this._textureMenu.getRoot();
	}

	/**
	 * @returns {HTMLElement}
	 */
	getFilterMenuRoot() {
		return this._filterMenu.getRoot();
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
		this._filterMenu.sourcingDataChanged("Shapes", { added: [name] });

		if (textureGenType.getParamsParams().length === 0) {
			texGen.setParamValueGetter(() => ({}));
		} else {
			const panel = this._textureMenu.addItem(texGen);
			texGen.setParamValueGetter(panel.getValuesUnordered);
		}

		texGen.updateDimensions();

		return texGen;
	}

	/**
	 *
	 * @param {VideoFilterType} filterType
	 */
	addFilter(filterType) {
		const filter = new VideoFilterInstance(filterType);
		filter.setDimensions(this._width, this._height);
		const panel = this._filterMenu.addItem(filter);
		filter.setParamValueGetter(panel.getValuesOrdered);
	}

	_updateTextures() {
		for (const [, texGen] of this._textures) {
			texGen.draw();
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

			if (this._dimensionsSet && this._videoElement !== null && this._videoElement.readyState >= 3) {
				// this is a bit of a hack to update the time, but it works
				this._externalData.set("time", new Date().getTime() / 1000);
				this._vidContext.drawImage(this._videoElement, 0, 0);
				// this._vidContext.drawImage(
				// 	this._videoElement,
				// 	0,
				// 	0,
				// 	this._videoElement.videoWidth,
				// 	this._videoElement.videoHeight,
				// 	0,
				// 	0,
				// 	this._width,
				// 	this._height
				// );
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
			pipe = filter.item.process(pipe, this._textures, externalData);
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

	createKernel() {
		return this._kernelGenerationFunc().setDynamicOutput(true).setPipeline(true);
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
	 * @param {VideoFilterType} filterType
	 */
	constructor(filterType) {
		this._filterType = filterType;
		this._kernelFunc = filterType.createKernel();
		this.getParamValues = null;
		this._dimensionsSet = false;
	}

	/**
	 *
	 * @param {number} w
	 * @param {number} h
	 */
	setDimensions(w, h) {
		this._kernelFunc.setOutput([w, h]).setConstants({
			width: w,
			height: h,
		});
		this._dimensionsSet = true;
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
		if (!this._dimensionsSet) {
			console.error("Cannot use kernel before dimensions have been set!");
		}
		const rawParamValues = this.getParamValues();

		const time = new Date().getTime();

		// process parameters before sending to shaders
		const cleanedParamValues = new Array(rawParamValues.length);
		const paramsParams = this._filterType.getParamsParams();
		for (let i = 0; i < paramsParams.length; i++) {
			const paramInfo = paramsParams[i];
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
						const texGen = textures.get(paramValue);
						if (texGen === undefined) {
							console.error(`No texture exists with the name "${paramValue}"!`);
						}
						cleaned = texGen.getCanvas();
					}
					break;
			}
			cleanedParamValues[i] = cleaned;
		}

		return this._kernelFunc(pipe, ...cleanedParamValues);
	}
}
