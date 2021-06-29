const gpu = new GPU();

class VideoFilterStack {
	constructor(videoElement) {
		if (videoElement.readyState === 0) {
			console.error("Cannot create VideoStackFilter from HTMLVideoElement that hasn't loaded its metadata yet!");
		}

		this._videoElement = videoElement;
		this._width = videoElement.videoWidth;
		this._height = videoElement.videoHeight;

		this._requestedStop = false;
		this._running = false;

		this._filters = []; // list of filter instances (can contain duplicates)
		// // keeps track of filters that have already been instantiated for this stack (so those instances can be reused)
		// this._createdKernels = new Map(); // <filter type name, kernel function>

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

		// non-visible canvas used for getting static images from a video
		this._vidCanvas = elem("canvas");
		this._vidCanvas.width = this._width;
		this._vidCanvas.height = this._height;
		this._vidContext = this._vidCanvas.getContext("2d");

		// map of (mask names) to (canvases containing mask data)
		this._maskCanvases = new Map();

		this._menuComponents = createMenu("Filters", this._filters);
	}

	getCanvas() {
		return this._postFilter.canvas;
	}

	getMenu() {
		return this._menuComponents.root;
	}

	/**
	 * filter instances are created once per stack.
	 *
	 * They can be reused within the same stack (or anywhere where the image dimensions are always the same)
	 */
	addFilter(filterType) {
		// let kernelFunc = this._createdKernels.get(filterType.getName());
		// if (kernelFunc === undefined) {
		// 	kernelFunc = filterType.createKernel(this._width, this._height);
		// 	// this._createdKernels.set(filterType.getName(), kernelFunc);
		// }

		const filterInstance = filterType.instantiate(this._width, this._height);
		this._filters.push(filterInstance);

		this._menuComponents.list.append(filterInstance.getGuiRoot());
		return filterInstance;
	}

	start(otherData) {
		this._running = true;
		const updateShader = () => {
			if (this._requestedStop) {
				this._requestedStop = false;
				return;
			}

			if (this._videoElement.readyState >= 3) {
				this._vidContext.drawImage(this._videoElement, 0, 0);
				this._process(this._vidCanvas, otherData);
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

	_process(imageData, otherData) {
		let pipe = this._preFilter(imageData);
		for (const filter of this._filters) {
			pipe = filter.process(pipe, otherData);
		}
		this._postFilter(pipe);
	}
}

class VideoFilterType {
	/**
	 * `filterParams` takes an array of objects containing:
	 * - name: string,
	 * - type: string,
	 * - default: any,
	 * - min: number? = 0,
	 * - max: number? = 1,
	 * - hardMin: boolean = false,
	 * - hardMax: boolean = false,
	 * - step: number? = undefined
	 *
	 * The order of params in `filterParams` reflects the order of arguments to the kernel function
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
		return this._kernelGenerationFunc().setOutput([w, h]).setPipeline(true);
	}

	instantiate(w, h) {
		return new VideoFilterInstance(this, createParameterPanel(this._name, this._filterParams), this.createKernel(w, h));
	}

	getCanvas() {
		return this._kernel?.canvas;
	}
}

class VideoFilterInstance {
	constructor(filterType, { panelComponents, getValues }, kernelFunc) {
		this._filterType = filterType;
		this._kernelFunc = kernelFunc;
		this._panelComponents = panelComponents;
		this.getParamValues = getValues;
	}

	getGuiRoot() {
		return this._panelComponents.root;
	}

	process(pipe, otherData) {
		const params = this.getParamValues().map((a) => {
			if (a === true) {
				return 1;
			}
			if (a === false) {
				return 0;
			}
			return a;
		});
		return this._kernelFunc(pipe, ...params);
	}
}

function createTrackingTypeInput(stack, values, param) {
	// TODO
	values[param.name] = stack.getTrackingCanvas(e.target.value);
}
